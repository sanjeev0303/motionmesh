"use client";

import { motion, useReducedMotion } from "framer-motion";

const LADDER = [
  { res: "1080p", bitrate: "4500-6000 kbps", format: "H.264", pct: 100 },
  { res: "720p", bitrate: "2500-4000 kbps", format: "H.264", pct: 78 },
  { res: "480p", bitrate: "1000-2000 kbps", format: "H.264", pct: 54 },
  { res: "360p", bitrate: "600-1000 kbps", format: "H.264", pct: 36 },
  { res: "240p", bitrate: "300-500 kbps", format: "H.264", pct: 22 },
];

export function AbrLadder() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="py-24 border-t border-borderSubtle bg-surface">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center gap-16">
        <div className="md:w-1/2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-borderSubtle bg-base/60 text-xs font-mono text-accent-mesh mb-6">
            HLS · CMAF
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-semibold mb-6">
            Adaptive Bitrate,{" "}
            <span className="bg-gradient-to-r from-accent-motion to-accent-mesh bg-clip-text text-transparent">
              built in.
            </span>
          </h2>
          <p className="text-text-muted text-lg leading-relaxed mb-8">
            Stop stitching together generic transcode services. Every video is automatically
            encoded into an optimal ABR ladder, ensuring smooth playback on a 4K TV or a 3G
            connection.
          </p>
          <ul className="space-y-3 text-sm text-text-muted">
            {["Automatic resolution switching", "Hardware-accelerated encoding", "Live quality-switch controls"].map(
              (item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-mesh mt-1.5 flex-shrink-0" />
                  {item}
                </li>
              )
            )}
          </ul>
        </div>

        <div className="md:w-1/2 w-full flex flex-col items-start px-4 md:px-0 relative">
          {/* Subtle grid background for the staircase */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#232838_1px,transparent_1px),linear-gradient(to_bottom,#232838_1px,transparent_1px)] bg-[size:1rem_1rem] opacity-30" />

          <div className="relative z-10 w-full space-y-3">
            {LADDER.map((tier, i) => (
              <motion.div
                key={tier.res}
                initial={shouldReduceMotion ? false : { opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="group"
                style={{ marginLeft: `${i * 9}%` }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-10 bg-surface-raised border border-borderSubtle flex items-center justify-center font-mono text-sm shadow-sm shrink-0 transition-colors group-hover:border-accent-mesh/50">
                    {tier.res}
                  </div>
                  {/* Bitrate bar */}
                  <div className="flex-1 h-10 bg-base border border-borderSubtle/60 rounded-r overflow-hidden relative">
                    <motion.div
                      initial={shouldReduceMotion ? false : { width: 0 }}
                      whileInView={{ width: `${tier.pct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.7, delay: 0.2 + i * 0.08, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-accent-motion/40 to-accent-mesh/40 group-hover:from-accent-motion/60 group-hover:to-accent-mesh/60 transition-colors"
                    />
                    <div className="absolute inset-0 flex items-center justify-between px-3">
                      <span className="hidden sm:block font-mono text-xs text-text-muted">
                        {tier.bitrate}
                      </span>
                      <span className="px-2 py-0.5 bg-base/80 border border-borderSubtle rounded-sm font-mono text-[10px] text-text-muted">
                        {tier.format}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}