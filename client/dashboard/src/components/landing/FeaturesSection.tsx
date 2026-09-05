import { HardDrive, Clapperboard, Captions } from "lucide-react";

const FEATURES = [
  {
    category: "Object Storage",
    note: "S3-compatible storage for any file type — not only video. Use it as a standalone object store, or feed files directly into Media Convert.",
    items: [
      "S3-compatible API",
      "Multi-region replication",
      "Instant read-after-write",
      "No egress fees for transcode",
    ],
    icon: HardDrive,
    accentFrom: "from-accent-motion/20",
    textAccent: "text-accent-motion",
  },
  {
    category: "Media Convert",
    note: "FFmpeg-powered transcoding with automatic ABR ladder generation, hardware acceleration, and first-class HLS/CMAF output.",
    items: [
      "H.264 & H.265 (HEVC)",
      "Automatic ABR ladder generation",
      "Hardware-accelerated encoding",
      "VTT & WebVTT caption support",
    ],
    icon: Clapperboard,
    accentFrom: "from-accent-mesh/20",
    textAccent: "text-accent-mesh",
  },
  {
    category: "AI Subtitles & Player",
    note: "Whisper-powered captions and chapters, delivered through a premium drop-in player with token-authenticated playback.",
    items: [
      "Auto-generated Whisper captions",
      "Chapter marker extraction",
      "Customizable HTML5 player",
      "Token-authenticated playback",
    ],
    icon: Captions,
    accentFrom: "from-accent-motion/20",
    textAccent: "text-accent-motion",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-24 border-t border-borderSubtle bg-base">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-display font-semibold mb-4">
            Infrastructure,{" "}
            <span className="bg-gradient-to-r from-accent-motion to-accent-mesh bg-clip-text text-transparent">
              not apps.
            </span>
          </h2>
          <p className="text-lg text-text-muted max-w-2xl mx-auto">
            Composable primitives for storage, encoding, and playback — wire them into your own
            stack.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.category}
                className="group relative p-8 rounded-2xl border border-borderSubtle bg-surface overflow-hidden transition-all duration-300 hover:border-accent-mesh/40 hover:-translate-y-1"
              >
                {/* Hover glow */}
                <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-accent-mesh/0 blur-[60px] transition-colors duration-500 group-hover:bg-accent-mesh/10" />

                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.accentFrom} to-transparent border border-borderSubtle flex items-center justify-center mb-6`}
                >
                  <Icon className={`w-5 h-5 ${feature.textAccent}`} />
                </div>

                <h3 className="font-display text-xl font-semibold mb-2 text-text-primary">
                  {feature.category}
                </h3>
                {feature.note && (
                  <p className="text-sm text-text-primary/80 mb-6 leading-relaxed">{feature.note}</p>
                )}
                <ul className="space-y-3.5">
                  {feature.items.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-accent-motion to-accent-mesh mt-2 flex-shrink-0" />
                      <span className="text-text-muted">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}