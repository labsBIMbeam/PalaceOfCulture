import { useEffect, useRef, useState } from "react";
import { INTRO_CARDS } from "../meaningverse/onboardingStory";
import { Icon } from "./icons";

/**
 * Skippable intro video followed by three canonical story cards. A video error — and the Skip
 * button itself — goes to the same cards, so the family-slapstick bite, Kerni reveal, and
 * Locktard Street facts never depend on media and cannot be bypassed by the reflexive first tap.
 * The video carries sound: it plays only after the "Enter MoC" click, so unmuted autoplay is
 * within policy; where a browser still blocks it, clicking the video starts playback.
 */
export function IntroScreen({ onComplete }: { onComplete: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cardRef = useRef<HTMLButtonElement | null>(null);
  const [showCards, setShowCards] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);

  useEffect(() => {
    if (showCards) cardRef.current?.focus();
  }, [showCards]);

  // Fallback: if a browser blocks unmuted autoplay, clicking the video starts it.
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
        // biome-ignore lint/a11y/useKeyWithClickEvents: the Skip button is the keyboard path
        <video
          aria-label="Decorative Kerni intro with sound. The canonical bite and reveal continue in the story cards. Skip to continue."
          autoPlay
          className="intro-video"
          onClick={resume}
          onEnded={openCards}
          onError={openCards}
          playsInline
          preload="metadata"
          ref={videoRef}
          src="/intro.mp4"
        >
          {/* The film has no dialogue; the captions transcribe its sound design (design doc §Sound). */}
          <track default kind="captions" label="English" src="/intro.vtt" srcLang="en" />
        </video>
      )}
      {!showCards ? (
        <div className="intro-controls">
          <button className="intro-button" onClick={openCards} type="button">
            Skip video
            <Icon name="play" size={14} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
