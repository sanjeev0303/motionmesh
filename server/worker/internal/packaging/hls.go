package packaging

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"path/filepath"

	"github.com/motionmesh/server/worker/internal/transcode"
)

// GenerateMasterPlaylist writes the master.m3u8 containing all renditions and subtitle tracks.
// Rendition URIs use the label sub-directory produced by the parallel encoder:
//   e.g.  1080p/stream.m3u8
func GenerateMasterPlaylist(ctx context.Context, renditions []transcode.Rendition, captionLangs []string, outDir string) (string, error) {
	outPath := filepath.Join(outDir, "master.m3u8")

	var buf bytes.Buffer
	buf.WriteString("#EXTM3U\n")
	buf.WriteString("#EXT-X-VERSION:3\n")

	// Subtitle tracks
	for _, lang := range captionLangs {
		buf.WriteString(fmt.Sprintf(
			"#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID=\"subs\",NAME=\"%s\",DEFAULT=NO,AUTOSELECT=YES,FORCED=NO,LANGUAGE=\"%s\",URI=\"%s.m3u8\"\n",
			lang, lang, lang,
		))
	}

	// Video renditions — ordered highest → lowest quality
	for _, r := range renditions {
		subtitles := ""
		if len(captionLangs) > 0 {
			subtitles = ",SUBTITLES=\"subs\""
		}

		bandwidth := 1000000
		fmt.Sscanf(r.Bitrate, "%dk", &bandwidth)
		bandwidth *= 1000

		buf.WriteString(fmt.Sprintf(
			"#EXT-X-STREAM-INF:BANDWIDTH=%d,RESOLUTION=%dx%d,NAME=\"%s\"%s\n",
			bandwidth, calculateWidth(r.Height), r.Height, r.Label, subtitles,
		))
		// URI matches the sub-directory written by encodeRendition
		buf.WriteString(fmt.Sprintf("%s/stream.m3u8\n", r.Label))
	}

	if err := os.WriteFile(outPath, buf.Bytes(), 0644); err != nil {
		return "", fmt.Errorf("failed to write master playlist: %w", err)
	}
	return outPath, nil
}


// GenerateCaptionPlaylist creates a simple m3u8 wrapper for a VTT file.
func GenerateCaptionPlaylist(ctx context.Context, lang string, outDir string) (string, error) {
	outPath := filepath.Join(outDir, fmt.Sprintf("%s.m3u8", lang))

	var buf bytes.Buffer
	buf.WriteString("#EXTM3U\n")
	buf.WriteString("#EXT-X-TARGETDURATION:10000\n") // arbitrary large duration
	buf.WriteString("#EXT-X-VERSION:3\n")
	buf.WriteString("#EXT-X-MEDIA-SEQUENCE:0\n")
	buf.WriteString("#EXTINF:10000.0,\n")
	buf.WriteString(fmt.Sprintf("%s.vtt\n", lang))
	buf.WriteString("#EXT-X-ENDLIST\n")

	if err := os.WriteFile(outPath, buf.Bytes(), 0644); err != nil {
		return "", fmt.Errorf("failed to write caption playlist: %w", err)
	}

	return outPath, nil
}

func calculateWidth(height int) int {
	return (height * 16) / 9
}
