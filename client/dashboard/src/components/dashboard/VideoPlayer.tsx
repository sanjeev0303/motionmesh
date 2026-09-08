"use client";

import { useEffect, useRef } from "react";
import Hls from "hls.js";

interface VideoPlayerProps {
  src: string;
  subtitleUrl?: string;
  autoPlay?: boolean;
  className?: string;
}

export function VideoPlayer({ src, subtitleUrl, autoPlay = false, className }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
    }

    return () => {
      hls?.destroy();
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      controls
      playsInline
      autoPlay={autoPlay}
      className={className}
    >
      {subtitleUrl ? (
        <track kind="subtitles" src={subtitleUrl} srcLang="en" label="English" default />
      ) : null}
    </video>
  );
}