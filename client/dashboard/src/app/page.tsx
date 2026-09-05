import type { Metadata } from "next";
import { Navbar } from "@/components/landing/Navbar";
import { MeshAnimation } from "@/components/landing/MeshAnimation";
import { PipelineSection } from "@/components/landing/PipelineSection";
import { AbrLadder } from "@/components/landing/AbrLadder";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { DemoPlayer } from "@/components/landing/DemoPlayer";
import { PricingSection } from "@/components/landing/PricingSection";
import { BuiltWithBand } from "@/components/landing/BuiltWithBand";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, BookOpen, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "MotionMesh — Open-source video infrastructure",
  description:
    "Upload, store, transcode, stream, and deliver video at scale. Self-hosted video infrastructure for developers — S3 storage, FFmpeg transcoding, ABR/HLS streaming, and AI captions.",
};

const HERO_STATS = [
  { value: "1080p–240p", label: "Automatic ABR ladder" },
  { value: "90+", label: "Caption languages (Whisper)" },
  { value: "MIT", label: "Fully open source" },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative pt-24 pb-28 overflow-hidden">
          {/* Ambient background: gradient orbs + grid */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#232838_1px,transparent_1px),linear-gradient(to_bottom,#232838_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,#000_50%,transparent_100%)] opacity-30" />
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[46rem] h-[46rem] rounded-full bg-accent-motion/10 blur-[120px]" />
            <div className="absolute top-1/3 -left-40 w-[30rem] h-[30rem] rounded-full bg-accent-mesh/10 blur-[120px]" />
            <div className="absolute bottom-0 -right-40 w-[30rem] h-[30rem] rounded-full bg-accent-motion/5 blur-[120px]" />
          </div>

          <div className="relative container mx-auto px-4 flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-borderSubtle bg-surface/60 backdrop-blur mb-8 text-sm text-text-muted">
              <Sparkles className="w-3.5 h-3.5 text-accent-mesh" />
              Open-source video infrastructure for developers
            </div>

            <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tighter mb-6 max-w-4xl leading-[1.05]">
              Store once.{" "}
              <span className="bg-gradient-to-r from-accent-motion to-accent-motion/60 bg-clip-text text-transparent">
                Transcode once.
              </span>
              <br className="hidden md:block" />
              <span className="bg-gradient-to-r from-accent-mesh to-accent-motion bg-clip-text text-transparent">
                Stream everywhere.
              </span>
            </h1>

            <p className="text-xl text-text-muted mb-12 max-w-2xl leading-relaxed">
              Developer-controlled video infrastructure. Fast, reliable, and entirely yours to
              manage — go from raw file to adaptive HLS streaming in minutes.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-16">
              <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base font-semibold group" asChild>
                <Link href="/signup">
                  Get Started
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="w-full sm:w-auto h-12 px-8 text-base" asChild>
                <Link href="/docs">
                  <BookOpen className="w-4 h-4" />
                  View Docs
                </Link>
              </Button>
            </div>

            {/* Signature Mesh Animation */}
            <MeshAnimation />

            {/* Stats row */}
            <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-px overflow-hidden rounded-xl border border-borderSubtle bg-borderSubtle w-full max-w-3xl">
              {HERO_STATS.map((stat) => (
                <div key={stat.label} className="bg-surface/80 backdrop-blur px-6 py-5">
                  <div className="font-display text-2xl md:text-3xl font-bold text-text-primary mb-1">
                    {stat.value}
                  </div>
                  <div className="text-xs text-text-muted leading-snug">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <BuiltWithBand />
        <PipelineSection />
        <AbrLadder />
        <FeaturesSection />
        <DemoPlayer />
        <PricingSection />
        <CTASection />
      </main>

      <Footer />
    </div>
  );
}