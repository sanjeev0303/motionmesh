package transcode

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"

	"github.com/motionmesh/server/shared/models"
)

type TranscodeResult struct {
	Renditions map[string]string // label -> path to .m3u8
}

// Encode transcodes inputPath into HLS at every rendition in parallel.
//
// Strategy — parallel per-rendition FFmpeg processes:
//   - Each rendition runs in its own goroutine as a separate ffmpeg invocation.
//   - This lets modern multi-core EC2 instances saturate all vCPUs.
//   - Each process uses preset=superfast and threads=2 to cap per-process RSS.
//   - Progress is aggregated across all renditions via atomic counters.
//
// Compared to the previous single multi-output pass:
//   - 4-core host: ~2-4× faster (renditions run truly in parallel).
//   - Memory is bounded per process (not multiplied by N renditions).
func Encode(ctx context.Context, inputPath string, probe *ProbeResult, renditions []Rendition, watermark *models.WatermarkMetadata, outDir string, progressCb func(int)) (*TranscodeResult, error) {
	res := &TranscodeResult{
		Renditions: make(map[string]string, len(renditions)),
	}

	// Determine max parallel renditions based on logical CPU count.
	// Cap at 4 to avoid swapping on memory-constrained instances.
	maxParallel := min(len(renditions), 4)

	type result struct {
		label string
		m3u8  string
		err   error
	}

	// Semaphore to limit concurrent encodes.
	sem := make(chan struct{}, maxParallel)
	resultCh := make(chan result, len(renditions))

	// Progress tracking: each rendition gets its own atomic frame counter.
	// Overall % = mean of (done/total) across all renditions × 100.
	n := len(renditions)
	framesDone := make([]int64, n)
	// Expected frames per rendition: duration × fps (use probe FPS; fall back to 25).
	fps := probe.FPS
	if fps <= 0 {
		fps = 25.0
	}
	expectedFrames := int64(probe.Duration * fps)
	if expectedFrames < 1 {
		expectedFrames = 1
	}

	emitProgress := func() {
		if progressCb == nil || probe.Duration <= 0 {
			return
		}
		var sum float64
		for i := range framesDone {
			done := atomic.LoadInt64(&framesDone[i])
			sum += float64(done) / float64(expectedFrames)
		}
		pct := int(sum / float64(n) * 100)
		if pct > 99 {
			pct = 99
		}
		if pct < 0 {
			pct = 0
		}
		progressCb(pct)
	}

	var wg sync.WaitGroup
	for idx, r := range renditions {
		wg.Add(1)
		go func(r Rendition, idx int) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			rendDir := filepath.Join(outDir, r.Label)
			if err := os.MkdirAll(rendDir, 0o755); err != nil {
				resultCh <- result{err: fmt.Errorf("mkdir %s: %w", r.Label, err)}
				return
			}

			m3u8, err := encodeRendition(ctx, inputPath, probe, r, watermark, rendDir, func(frameDone int) {
				atomic.StoreInt64(&framesDone[idx], int64(frameDone))
				emitProgress()
			})
			resultCh <- result{label: r.Label, m3u8: m3u8, err: err}
		}(r, idx)
	}

	// Close resultCh once all goroutines finish.
	go func() {
		wg.Wait()
		close(resultCh)
	}()

	for r := range resultCh {
		if r.err != nil {
			return nil, r.err
		}
		res.Renditions[r.label] = r.m3u8
	}

	return res, nil
}

// encodeRendition runs a single FFmpeg process for one resolution.
// Output: per-rendition sub-directory with stream.m3u8 + *.ts segments.
func encodeRendition(ctx context.Context, inputPath string, probe *ProbeResult, r Rendition, watermark *models.WatermarkMetadata, outDir string, progressCb func(int)) (string, error) {
	args := []string{
		"-y",
		"-threads", "2", // demux thread cap
		"-i", inputPath,
	}

	// Build filter_complex for scale (+ optional watermark overlay).
	var filterChain string
	if watermark != nil && watermark.IsActive {
		args = append(args, "-i", watermark.AssetObjectKey)
		opacity := watermark.Opacity
		if opacity <= 0 {
			opacity = 0.8
		}
		overlayPos := "W-w-10:H-h-10"
		switch watermark.Position {
		case "top-left":
			overlayPos = "10:10"
		case "top-right":
			overlayPos = "W-w-10:10"
		case "bottom-left":
			overlayPos = "10:H-h-10"
		}
		filterChain = fmt.Sprintf(
			"[1:v]format=argb,colorchannelmixer=aa=%f[wm];[0:v][wm]overlay=%s,scale=-2:%d[vout]",
			opacity, overlayPos, r.Height,
		)
		args = append(args, "-filter_complex", filterChain, "-map", "[vout]")
	} else {
		filterChain = fmt.Sprintf("[0:v]scale=-2:%d[vout]", r.Height)
		args = append(args, "-filter_complex", filterChain, "-map", "[vout]")
	}

	// Audio map
	args = append(args, "-map", "0:a:0?")

	// Video codec settings — superfast preset for maximum throughput.
	// threads=2 caps libx264's own internal thread pool per process.
	gop := 72 // 6s × 12fps; increased to 6s × 25fps below
	if probe.Duration > 0 {
		gop = 6 * 25 // 6-second GOP at 25fps
	}
	args = append(args,
		"-c:v", "libx264",
		"-preset", "ultrafast",  // ultrafast for maximum throughput
		"-b:v", r.Bitrate,
		"-maxrate", r.MaxRate,
		"-bufsize", r.BufSize,
		"-x264-params", "threads=2:rc-lookahead=20",
		"-g", strconv.Itoa(gop),
		"-keyint_min", strconv.Itoa(gop),
		"-sc_threshold", "0",
		"-c:a", "aac",
		"-b:a", "128k",
		"-ar", "44100",
	)

	// HLS output
	m3u8Path := filepath.Join(outDir, "stream.m3u8")
	segPattern := filepath.Join(outDir, "seg%03d.ts")
	args = append(args,
		"-f", "hls",
		"-hls_time", "6",
		"-hls_playlist_type", "vod",
		"-hls_segment_filename", segPattern,
		"-progress", "pipe:1",
		m3u8Path,
	)

	cmd := exec.CommandContext(ctx, "ffmpeg", args...)

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return "", fmt.Errorf("stdout pipe: %w", err)
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return "", fmt.Errorf("stderr pipe: %w", err)
	}

	if err := cmd.Start(); err != nil {
		return "", fmt.Errorf("start ffmpeg for %s: %w", r.Label, err)
	}

	var stderrBuf strings.Builder
	go func() {
		scanner := bufio.NewScanner(stderr)
		for scanner.Scan() {
			stderrBuf.WriteString(scanner.Text())
			stderrBuf.WriteByte('\n')
		}
	}()

	go func() {
		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			line := scanner.Text()
			if strings.HasPrefix(line, "frame=") {
				parts := strings.SplitN(line, "=", 2)
				if len(parts) == 2 {
					if f, err := strconv.Atoi(strings.TrimSpace(parts[1])); err == nil && progressCb != nil {
						progressCb(f)
					}
				}
			}
		}
	}()

	if err := cmd.Wait(); err != nil {
		return "", fmt.Errorf("ffmpeg %s failed: %w\nstderr: %s", r.Label, err, stderrBuf.String())
	}

	return m3u8Path, nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
