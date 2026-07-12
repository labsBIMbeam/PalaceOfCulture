import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../frontend/icons";
import type { IconName } from "../frontend/types";
import { type PodcastShow, loadShowEpisodes, searchPodcastShows } from "../net/feed";
import { sendBoost } from "../net/lightning";
import { type MediaItem, type MediaKind, createMediaCatalog } from "../net/media";

const TABS: ReadonlyArray<{ id: MediaKind; label: string }> = [
  { id: "music", label: "Music" },
  { id: "podcast", label: "Podcasts" },
  { id: "live", label: "Live" },
];

// Editorial demo builds expose only the approved feed registry. Keep search code ready for the later
// self-curation UI, where adding a result becomes an explicit review action rather than instant play.
const OPEN_CATALOG_SEARCH_ENABLED = false;

function kindIcon(kind: MediaKind): IconName {
  if (kind === "podcast") return "community";
  if (kind === "live") return "zap";
  return "spark";
}

/**
 * The in-game media player (ADR 0004) — Music / Podcasts / Live, modelled on Podverse. Music + live
 * come from the approved feed registry; open catalog search stays disabled until the review UI exists.
 * V4V **Boost** seam carries the item's `valueRecipient`.
 */
export function MediaPlayer() {
  const catalog = useMemo(() => createMediaCatalog(), []);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [nowPlaying, setNowPlaying] = useState<MediaItem | null>(null);
  const [playlist, setPlaylist] = useState<MediaItem[]>([]);
  const [playing, setPlaying] = useState(false);
  const [tab, setTab] = useState<MediaKind>("music");
  const [collapsed, setCollapsed] = useState(false);
  const [boosted, setBoosted] = useState(0);
  const [flash, setFlash] = useState(false);

  const [query, setQuery] = useState("");
  const [shows, setShows] = useState<PodcastShow[]>([]);
  const [openShow, setOpenShow] = useState<PodcastShow | null>(null);
  const [episodes, setEpisodes] = useState<MediaItem[]>([]);
  const [busy, setBusy] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let active = true;
    catalog.load().then((list) => {
      if (!active) return;
      setItems(list);
      setNowPlaying((current) => current ?? list[0] ?? null);
    });
    return () => {
      active = false;
    };
  }, [catalog]);

  // Start the chosen track when it changes (or when resumed); pausing is handled directly below.
  // biome-ignore lint/correctness/useExhaustiveDependencies: nowPlaying.id is a play trigger, not a read
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && playing) audio.play().catch(() => {});
  }, [nowPlaying?.id, playing]);

  const play = (item: MediaItem, list: MediaItem[]) => {
    setNowPlaying(item);
    setPlaylist(list);
    setPlaying(true);
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio
        .play()
        .then(() => setPlaying(true))
        .catch(() => {});
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  const step = (direction: number) => {
    if (!nowPlaying || playlist.length === 0) return;
    const at = playlist.findIndex((item) => item.id === nowPlaying.id);
    const next = playlist[(at + direction + playlist.length) % playlist.length];
    if (next) play(next, playlist);
  };

  // V4V (ADR 0004): 100-sat boost to the item's value recipient — LNURL-pay via WebLN, else the
  // OS wallet gets a lightning: URI. Counted only when WebLN confirms the payment.
  const [boosting, setBoosting] = useState(false);
  const boost = async () => {
    const recipient = nowPlaying?.valueRecipient;
    if (!recipient || boosting) return;
    setBoosting(true);
    try {
      const result = await sendBoost(recipient, 100, `Boost from the Palace: ${nowPlaying.title}`);
      if (result.paid) {
        setBoosted((sats) => sats + 100);
        setFlash(true);
        setTimeout(() => setFlash(false), 1100);
      } else if (result.fallbackUri) {
        window.open(result.fallbackUri, "_self");
      }
    } finally {
      setBoosting(false);
    }
  };

  const runSearch = async () => {
    if (!query.trim()) return;
    setBusy(true);
    setOpenShow(null);
    setShows(await searchPodcastShows(query));
    setBusy(false);
  };

  const openShowEpisodes = async (show: PodcastShow) => {
    setOpenShow(show);
    setEpisodes([]);
    setBusy(true);
    setEpisodes(await loadShowEpisodes(show.feedUrl));
    setBusy(false);
  };

  const catalogList = items.filter((item) => item.kind === tab);

  const trackRow = (item: MediaItem, list: MediaItem[]) => (
    <button
      className={`media-row${item.id === nowPlaying?.id ? " media-row--active" : ""}`}
      key={item.id}
      onClick={() => play(item, list)}
      type="button"
    >
      <span className={`media-art media-art--${item.tone}`}>
        <Icon name={kindIcon(item.kind)} size={14} />
      </span>
      <span className="media-rowmeta">
        <strong>{item.title}</strong>
        <small>
          {item.author}
          {item.source === "demo" ? " · demo" : ""}
        </small>
      </span>
      {item.kind === "live" ? (
        <span className="media-live">
          <i />
          {item.listeners ?? 0}
        </span>
      ) : null}
    </button>
  );

  return (
    <section className={`media-player${collapsed ? " media-player--collapsed" : ""}`}>
      {/* biome-ignore lint/a11y/useMediaCaption: music/podcast audio has no captions track */}
      <audio
        onEnded={() => step(1)}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        ref={audioRef}
        src={nowPlaying?.audioUrl}
      />

      {collapsed ? null : (
        <>
          <div className="media-tabs">
            {TABS.map((entry) => (
              <button
                className={`media-tab${tab === entry.id ? " media-tab--active" : ""}`}
                key={entry.id}
                onClick={() => setTab(entry.id)}
                type="button"
              >
                {entry.label}
              </button>
            ))}
          </div>

          <div className="media-list">
            {OPEN_CATALOG_SEARCH_ENABLED && tab === "podcast" ? (
              <>
                <div className="media-search">
                  <input
                    className="media-searchinput"
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                      event.stopPropagation();
                      if (event.key === "Enter") void runSearch();
                    }}
                    onKeyUp={(event) => event.stopPropagation()}
                    placeholder="search the whole catalog…"
                    value={query}
                  />
                  <button
                    aria-label="Search"
                    className="media-btn"
                    onClick={() => void runSearch()}
                    type="button"
                  >
                    <Icon name="search" size={15} />
                  </button>
                </div>

                {busy ? <p className="media-empty">loading…</p> : null}

                {!busy && openShow ? (
                  <>
                    <button className="media-back" onClick={() => setOpenShow(null)} type="button">
                      <Icon name="chevron" size={13} />
                      {openShow.title}
                    </button>
                    {episodes.length
                      ? episodes.map((episode) => trackRow(episode, episodes))
                      : null}
                  </>
                ) : null}

                {!busy && !openShow && shows.length
                  ? shows.map((show) => (
                      <button
                        className="media-row"
                        key={show.feedUrl}
                        onClick={() => void openShowEpisodes(show)}
                        type="button"
                      >
                        <span className="media-art media-art--gold">
                          <Icon name="community" size={14} />
                        </span>
                        <span className="media-rowmeta">
                          <strong>{show.title}</strong>
                          <small>{show.author}</small>
                        </span>
                        <Icon className="media-rowchevron" name="chevron" size={14} />
                      </button>
                    ))
                  : null}

                {!busy && !openShow && shows.length === 0
                  ? catalogList.map((item) => trackRow(item, catalogList))
                  : null}
              </>
            ) : (
              catalogList.map((item) => trackRow(item, catalogList))
            )}
          </div>
        </>
      )}

      <div className="media-bar">
        <span className={`media-art media-art--${nowPlaying?.tone ?? "gold"}`}>
          <Icon name={nowPlaying ? kindIcon(nowPlaying.kind) : "spark"} size={15} />
        </span>
        <div className="media-meta">
          <strong>{nowPlaying?.title ?? "—"}</strong>
          <small>
            {nowPlaying?.kind === "live" ? "● live · " : ""}
            {nowPlaying?.author ?? "select a track"}
            {nowPlaying?.source === "demo" ? " · demo" : ""}
          </small>
        </div>
        <button
          aria-label="Play or pause"
          className="media-btn media-play"
          onClick={togglePlay}
          type="button"
        >
          <Icon name={playing ? "pause" : "play"} size={16} />
        </button>
        <button
          aria-label="Next"
          className="media-btn media-next"
          onClick={() => step(1)}
          type="button"
        >
          <Icon name="chevron" size={15} />
        </button>
        <button
          className={`media-boost${flash ? " media-boost--flash" : ""}`}
          disabled={!nowPlaying?.valueRecipient || boosting}
          onClick={boost}
          title={
            nowPlaying?.valueRecipient
              ? `Boost 100 sats → ${nowPlaying.valueRecipient}`
              : "No value recipient on this item"
          }
          type="button"
        >
          <Icon name="zap" size={13} />
          {boosted > 0 ? boosted : ""}
        </button>
        <button
          aria-label="Toggle player"
          className={`media-collapse${collapsed ? " media-collapse--up" : ""}`}
          onClick={() => setCollapsed((value) => !value)}
          type="button"
        >
          <Icon name="chevron" size={14} />
        </button>
      </div>
    </section>
  );
}
