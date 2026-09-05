"use client";

import { motion, useReducedMotion } from "framer-motion";
import { UploadCloud, Clapperboard, Radio } from "lucide-react";

const STEPS = [
  {
    num: "01",
    title: "Upload",
    desc: "Files land in S3-compatible object storage — usable standalone for any asset type.",
    icon: UploadCloud,
    accent: "text-accent-motion",
    glow: "rgba(255,138,61,0.15)",
  },
  {
    num: "02",
    title: "Transcode",
    desc: "FFmpeg generates an optimized ABR ladder instantly — H.264, HLS/CMAF, thumbnails, and captions.",
    icon: Clapperboard,
    accent: "text-accent-mesh",
    glow: "rgba(77,217,232,0.15)",
  },
  {
    num: "03",
    title: "Stream",
    desc: "Delivered directly via adaptive HLS or DASH streaming with minimal latency.",
    icon: Radio,
    accent: "text-accent-motion",
    glow: "rgba(255,138,61,0.15)",
  },
];

export function PipelineSection() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="py-24 border-t border-borderSubtle bg-base">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-display font-semibold mb-4">
            A pipeline that just works.
          </h2>
          <p className="text-lg text-text-muted max-w-2xl mx-auto">
            From raw file to global playback — MotionMesh handles the entire video lifecycle.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.num}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="relative group"
              >
                {/* Connector line for desktop */}
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-[80%] right-[-20%] h-px bg-gradient-to-r from-borderSubtle to-accent-mesh/40" />
                )}

                <div className="relative flex items-center gap-5 mb-6">
                  <div
                    className="w-12 h-12 rounded-xl border border-borderSubtle bg-surface flex items-center justify-center transition-all duration-300 group-hover:shadow-lg"
                    style={{ boxShadow: "0 0 12px var(--glow, transparent)" }}
                  >
                    <Icon className={`w-5 h-5 ${step.accent}`} />
                  </div>
                  <div
                    className={`font-mono text-4xl font-bold select-none bg-gradient-to-b from-text-primary/25 to-transparent bg-clip-text text-transparent`}
                  >
                    {step.num}
                  </div>
                </div>

                <h3 className="font-display text-2xl font-semibold mb-3">{step.title}</h3>
                <p className="text-text-muted leading-relaxed">{step.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}