"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, Maximize, Settings, Captions as CaptionsIcon } from "lucide-react";

export function DemoPlayer() {
  const [resolution, setResolution] = useState("1080p");
  const [captions, setCaptions] = useState("Off");
  const [isPlaying, setIsPlaying] = useState(false);

  // In a real app, this would use hls.js and switch the manifest level.
  // For the landing page demo, we simulate the UI interaction.

  return (
    <section className="py-24 border-t border-borderSubtle bg-surface">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-borderSubtle bg-base/60 text-xs font-mono text-accent-motion mb-6">
            @motionmesh/player
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-semibold mb-4">
            Feel the control.
          </h2>
          <p className="text-text-muted text-lg">
            Interact with the player to see how fast quality switches happen.
          </p>
        </div>

        <div className="rounded-2xl overflow-hidden border border-borderSubtle bg-base shadow-2xl shadow-black/40 relative aspect-video group">
          {/* Simulated Video Area */}
          <div className="absolute inset-0 flex items-center justify-center bg-surface">
            {isPlaying ? (
              <div className="relative w-full h-full overflow-hidden">
                {/* Simulated stream: sweeping gradient */}
                <div className="absolute inset-0 bg-gradient-to-tr from-surface via-surface-raised to-accent-mesh/10" />
                <div className="absolute inset-0 opacity-40 bg-[linear-gradient(110deg,transparent_20%,rgba(77,217,232,0.12)_40%,transparent_60%)] bg-[length:200%_200%] animate-[shimmer_4s_linear_infinite]" />
                {captions !== "Off" && (
                  <div className="absolute bottom-16 left-0 right-0 text-center">
                    <span className="bg-base/85 backdrop-blur text-text-primary px-4 py-1.5 rounded-lg text-sm md:text-lg border border-borderSubtle/60">
                      {captions === "EN"
                        ? "This is a simulated video stream."
                        : "Esta es una transmisión de video simulada."}
                    </span>
                  </div>
                )}
                {/* Simulated resolution switch flash */}
                <div
                  key={resolution}
                  className="absolute inset-0 bg-accent-mesh/20 animate-[fade-out_0.5s_ease-out_forwards]"
                />
              </div>
            ) : (
              <button
                onClick={() => setIsPlaying(true)}
                aria-label="Play demo video"
                className="w-[72px] h-[72px] rounded-full bg-gradient-to-tr from-accent-motion to-accent-mesh/80 flex items-center justify-center shadow-[0_0_40px_rgba(255,138,61,0.35)] hover:shadow-[0_0_60px_rgba(77,217,232,0.4)] hover:scale-105 transition-all"
              >
                <Play className="w-7 h-7 text-base fill-base ml-1" />
              </button>
            )}

            {/* Resolution indicator watermark */}
            <div className="absolute top-4 right-4 font-mono text-xs text-text-muted/60 select-none bg-base/40 backdrop-blur px-2.5 py-1 rounded-md border border-borderSubtle/50">
              {resolution} • {captions !== "Off" ? `CC:${captions}` : "NO CC"}
            </div>
          </div>

          {/* Custom Controls Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-5 pt-14 pb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                aria-label={isPlaying ? "Pause" : "Play"}
                className="text-text-primary hover:text-accent-motion transition-colors"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              <Volume2 className="w-5 h-5 text-text-muted/70" />
              <div className="h-1 w-32 md:w-64 bg-white/20 rounded-full overflow-hidden cursor-pointer">
                <div
                  className={`h-full bg-gradient-to-r from-accent-motion to-accent-mesh transition-all ${
                    isPlaying ? "animate-[progress_12s_linear_infinite]" : "w-1/3"
                  }`}
                  style={{ width: isPlaying ? undefined : "33%" }}
                />
              </div>
              <span className="hidden md:block font-mono text-[11px] text-text-muted/70">
                00:24 / 01:12
              </span>
            </div>

            <div className="flex items-center gap-1">
              <div className="relative group/cc">
                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs font-mono" aria-label="Captions">
                  <CaptionsIcon className="w-4 h-4 mr-1" />
                  CC
                </Button>
                <div className="absolute bottom-full right-0 mb-2 hidden group-hover/cc:flex flex-col bg-surface border border-borderSubtle rounded-lg overflow-hidden min-w-[88px] shadow-xl">
                  {["Off", "EN", "ES"].map((cc) => (
                    <button
                      key={cc}
                      onClick={() => setCaptions(cc)}
                      className={`px-3 py-1.5 text-xs font-mono text-left transition-colors hover:bg-surface-raised ${
                        captions === cc ? "text-accent-motion bg-surface-raised" : "text-text-muted"
                      }`}
                    >
                      {cc}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative group/res">
                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs font-mono" aria-label="Quality">
                  <Settings className="w-4 h-4 mr-1" />
                  {resolution}
                </Button>
                <div className="absolute bottom-full right-0 mb-2 hidden group-hover/res:flex flex-col bg-surface border border-borderSubtle rounded-lg overflow-hidden min-w-[88px] shadow-xl">
                  {["1080p", "720p", "480p"].map((res) => (
                    <button
                      key={res}
                      onClick={() => setResolution(res)}
                      className={`px-3 py-1.5 text-xs font-mono text-left transition-colors hover:bg-surface-raised ${
                        resolution === res ? "text-accent-mesh bg-surface-raised" : "text-text-muted"
                      }`}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>

              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" aria-label="Fullscreen">
                <Maximize className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}