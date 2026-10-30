"use client";

import { useRef, useState } from "react";

export default function HeroBanner() {
  const [heroVideoPhase, setHeroVideoPhase] = useState<"intro" | "loop">("intro");
  const heroLoopVideoRef = useRef<HTMLVideoElement>(null);
  const [loadLoopVideo, setLoadLoopVideo] = useState(false);

  const startHeroLoop = () => {
    const loopVideo = heroLoopVideoRef.current;
    if (!loopVideo) {
      setHeroVideoPhase("loop");
      return;
    }
    loopVideo.currentTime = 0;
    void loopVideo.play();
    setHeroVideoPhase("loop");
  };

  // Begin buffering loop video after intro video has started playing
  const handleIntroPlay = () => {
    setLoadLoopVideo(true);
  };

  return (
    <section className="hero" id="home" aria-label="House of Urja">
      <link
        rel="preload"
        href="/assets/hero-banner-poster.webp"
        as="image"
        type="image/webp"
      />
      <video
        className={`hero-background${
          heroVideoPhase === "intro" ? " is-active" : ""
        }`}
        autoPlay
        muted
        playsInline
        preload="auto"
        poster="/assets/hero-banner-poster.webp"
        onPlay={handleIntroPlay}
        onEnded={startHeroLoop}
        aria-hidden="true"
      >
        <source src="/assets/hou_banner_video_v1.mp4" type="video/mp4" />
      </video>
      <video
        ref={heroLoopVideoRef}
        className={`hero-background${
          heroVideoPhase === "loop" ? " is-active" : ""
        }`}
        loop
        muted
        playsInline
        preload={loadLoopVideo ? "auto" : "none"}
        aria-hidden="true"
      >
        {loadLoopVideo && (
          <source src="/assets/hou_banner_video_v2.mp4" type="video/mp4" />
        )}
      </video>
    </section>
  );
}
