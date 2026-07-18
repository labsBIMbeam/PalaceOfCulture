import { useEffect, useRef, useState } from "react";
import { INTRO_CARDS } from "../meaningverse/onboardingStory";
import { Icon } from "./icons";

/**
 * Skippable intro video followed by three canonical story cards. A video error goes to the same
 * cards, so the raccoon/Kaiserwarte/Locktard Street facts never depend on decorative media.
 */
export function IntroScreen({ onComplete }: { onComplete: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cardRef = useRef<HTMLButtonElement | null>(null);
  const [muted, setMuted] = useState(false);
  const [showCards, setShowCards] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);

  // Try to start with sound. If the browser blocks unmuted autoplay, the click-to-play below covers it.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
    video.play().catch(() => {});
  }, [muted]);

  useEffect(() => {
    if (showCards) cardRef.current?.focus();
  }, [showCards]);

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

  const openCards = () => {
    videoRef.current?.pause();
    setShowCards(true);
    setCardIndex(0);
  };

  const advanceCard = () => {
    if (cardIndex >= INTRO_CARDS.length - 1) {
      onComplete();
      return;
    }
    setCardIndex((index) => index + 1);
  };

  const card = INTRO_CARDS[cardIndex];

  return (
    <div className="intro-screen">
      {showCards && card ? (
        <button
          aria-label={`${card.kicker}. ${card.caption} ${card.line}`}
          className="intro-card"
          onClick={advanceCard}
          ref={cardRef}
          type="button"
        >
          <span className="intro-card__count">
            {cardIndex + 1} / {INTRO_CARDS.length}
          </span>
          <small>{card.kicker}</small>
          <strong>{card.caption}</strong>
          <span>{card.line}</span>
          <b>{cardIndex === INTRO_CARDS.length - 1 ? "Walk in" : "Continue"}</b>
        </button>
      ) : (
        // biome-ignore lint/a11y/useKeyWithClickEvents: Skip/Sound buttons are the keyboard path
        <video
          aria-label="Intro video: noise, then quiet, then a first look at the Palace. Skip to continue."
          autoPlay
          className="intro-video"
          muted={muted}
          onClick={resume}
          onEnded={openCards}
          onError={openCards}
          playsInline
          preload="metadata"
          ref={videoRef}
          src="/intro.mp4"
        />
      )}
      <div className="intro-controls">
        {!showCards ? (
          <button className="intro-button" onClick={toggleSound} type="button">
            {muted ? "Sound on" : "Mute"}
          </button>
        ) : null}
        <button className="intro-button" onClick={onComplete} type="button">
          Skip
          <Icon name="play" size={14} />
        </button>
      </div>
    </div>
  );
}
