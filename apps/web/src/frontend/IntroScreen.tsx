import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";

/**
 * Full-screen intro video shown before character creation. Sound is ON by default — browsers block
 * unmuted autoplay until a gesture, so if it doesn't start on its own, the first click anywhere on
 * the video plays it with sound. Sound toggle + skip; advances when it ends, errors, or is skipped.
 */
export function IntroScreen({ onComplete }: { onComplete: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [muted, setMuted] = useState(false);

  // Try to start with sound. If the browser blocks unmuted autoplay, the click-to-play below covers it.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
    video.play().catch(() => {});
  }, [muted]);

  const toggleSound = () => {
    const video = videoRef.current;
    if (!video) return;
    const next = !muted;
    video.muted = next;
    if (!next) video.play().catch(() => {});
    setMuted(next);
  };

  // Fallback: if a browser blocks autoplay, clicking the video starts it (with sound).
  const resume = () => videoRef.current?.play().catch(() => {});

  return (
    <div className="intro-screen">
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Skip/Sound buttons are the keyboard path */}
      <video
        aria-label="Palace of Culture intro video. Use Skip to continue."
        autoPlay
        className="intro-video"
        muted={muted}
        onClick={resume}
        onEnded={onComplete}
        onError={onComplete}
        playsInline
        preload="metadata"
        ref={videoRef}
        src="/intro.mp4"
      />
      <div className="intro-controls">
        <button className="intro-button" onClick={toggleSound} type="button">
          {muted ? "Sound on" : "Mute"}
        </button>
        <button className="intro-button" onClick={onComplete} type="button">
          Skip
          <Icon name="play" size={14} />
        </button>
      </div>
    </div>
  );
}
