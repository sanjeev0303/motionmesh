package transcode

type Rendition struct {
	Height  int
	Bitrate string
	MaxRate string // VBV max (≈ 1.1× target)
	BufSize string // VBV buffer (≈ 2× target)
	Label   string
}

// allRenditions is the full ladder from 144p to 2160p.
// Bitrates are tuned for H.264 @ these resolutions with a 6-second GOP.
var allRenditions = []Rendition{
	{Height: 2160, Bitrate: "15000k", MaxRate: "16500k", BufSize: "30000k", Label: "2160p"},
	{Height: 1440, Bitrate: "9000k", MaxRate: "9900k", BufSize: "18000k", Label: "1440p"},
	{Height: 1080, Bitrate: "5000k", MaxRate: "5500k", BufSize: "10000k", Label: "1080p"},
	{Height: 720, Bitrate: "2800k", MaxRate: "3080k", BufSize: "5600k", Label: "720p"},
	{Height: 480, Bitrate: "1400k", MaxRate: "1540k", BufSize: "2800k", Label: "480p"},
	{Height: 360, Bitrate: "800k", MaxRate: "880k", BufSize: "1600k", Label: "360p"},
	{Height: 240, Bitrate: "400k", MaxRate: "440k", BufSize: "800k", Label: "240p"},
	{Height: 144, Bitrate: "150k", MaxRate: "165k", BufSize: "300k", Label: "144p"},
}

// BuildLadder generates renditions that don't upscale the source.
// It always includes at least one rendition (the lowest resolution).
func BuildLadder(sourceHeight int) []Rendition {
	var ladder []Rendition
	for _, r := range allRenditions {
		if r.Height <= sourceHeight {
			ladder = append(ladder, r)
		}
	}
	// Always include at least the lowest rendition.
	if len(ladder) == 0 {
		ladder = []Rendition{allRenditions[len(allRenditions)-1]}
	}
	return ladder
}
