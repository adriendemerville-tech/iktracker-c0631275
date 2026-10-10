import { useEffect, useRef, useState } from "react";
import { Play, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

const VIDEO_URL = "/video/iktracker-home-v1.mp4";
const POSTER_URL = "/video/iktracker-home-v1-poster.jpg";

export function HomeDemoVideo() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inView = useRef(false);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section || !video) return;

    const prepare = () => {
      if (video.getAttribute("src")) return;
      video.autoplay = false;
      video.src = VIDEO_URL;
      video.load();
    };
    const updateVisibility = (visible: boolean) => {
      inView.current = visible;
      if (!visible) {
        video.pause();
        return;
      }
      prepare();
      video.autoplay = true;
      void video.play().then(() => {
        if (!inView.current) video.pause();
      }).catch(() => setPlaying(false));
    };

    if (typeof IntersectionObserver === "undefined") {
      updateVisibility(true);
      return () => { inView.current = false; video.pause(); };
    }
    const nearbyObserver = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        prepare();
        nearbyObserver.disconnect();
      }
    }, { rootMargin: "250px" });
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      updateVisibility(Boolean(entry?.isIntersecting));
    });
    nearbyObserver.observe(section);
    visibilityObserver.observe(video);
    return () => {
      nearbyObserver.disconnect();
      visibilityObserver.disconnect();
      inView.current = false;
      video.pause();
    };
  }, []);

  const toggleSound = () => {
    const video = videoRef.current;
    if (!video) return;
    if (!video.getAttribute("src")) video.src = VIDEO_URL;
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setMuted(nextMuted);
    if (!nextMuted) video.currentTime = 0;
    void video.play().catch(() => setPlaying(false));
  };

  return (
    <section ref={sectionRef} id="demo-video" aria-label="Démonstration IKtracker" className="px-4 pb-12 md:pb-16 bg-background">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-6 text-center text-2xl md:text-3xl font-bold text-foreground">Démonstration IKtracker</h2>
        <div className="relative aspect-video overflow-hidden rounded-lg border border-border/60 bg-muted shadow-sm">
          <video
            ref={videoRef}
            className="block h-full w-full object-contain cursor-pointer"
            width={1280}
            height={720}
            autoPlay
            muted={muted}
            loop
            playsInline
            preload="none"
            poster={POSTER_URL}
            aria-label="Vidéo de démonstration IKtracker"
            tabIndex={0}
            onClick={toggleSound}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                toggleSound();
              }
            }}
            onPlaying={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onError={() => setPlaying(false)}
          />
          {!playing && (
            <Button type="button" variant="outline" size="icon" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" aria-label="Lire la démonstration IKtracker" onClick={() => {
              const video = videoRef.current;
              if (!video) return;
              if (!video.getAttribute("src")) video.src = VIDEO_URL;
              void video.play().catch(() => setPlaying(false));
            }}>
              <Play aria-hidden="true" />
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 shadow-sm" onClick={toggleSound} aria-pressed={!muted}>
            {muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
            {muted ? "Activer le son" : "Couper le son"}
          </Button>
        </div>
      </div>
    </section>
  );
}