import type { FeatureCollection } from "geojson";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { GeoJSON, MapContainer, ZoomControl, useMap, useMapEvents } from "react-leaflet";
import { createCharacterStore } from "../character/store";
import { ENTITY_NPUBS } from "../identity/entities";
import { demoNpub, getOrCreateDemoSigner } from "../identity/keyStore";
import { type Article, loadArticles } from "../net/articles";
import { loadPlebListings } from "../net/market";
import { RELAYS, setSigner } from "../net/nostr";
import {
  type FeedNote,
  type FeedTab,
  PRESET_TABS,
  customTab,
  loadFeedNotes,
  localNote,
  publishNote,
  repostNote,
} from "../net/social";
import { PalaceScene } from "../scene/PalaceScene";
import { MemberSelect } from "../ui/MemberSelect";
import { GrowthSprite } from "./GrowthSprite";
import { IntroScreen } from "./IntroScreen";
import { LevelBuildHandoff } from "./LevelBuildHandoff";
import { StartScreen } from "./StartScreen";
import {
  circleFriends,
  feeds,
  navItems,
  styleDrops,
  timelockTiers,
  timelocks,
  worldAssets,
} from "./data";
import { loadTabs, saveTabs } from "./feedTabs";
import { growthStage, kindForTier } from "./growth";
import { Icon } from "./icons";
import type {
  Character,
  EngineTarget,
  FeedConfig,
  FeedPost,
  Friend,
  MarketItem,
  NavItem,
  ScreenId,
  Timelock,
} from "./types";
import "./frontend.css";

type ScreenProps = {
  onStartEngine: (target: EngineTarget) => void;
  onBuild: () => void;
};

type Region = {
  col: number;
  row: number;
  bornAt: number;
};

type GeoNode = {
  lat: number;
  lng: number;
  name: string;
};

const HQ_LATLNG: [number, number] = [32.7583, -16.9419];

const fallbackNav: NavItem = {
  id: "title",
  name: "Title",
  label: "TITLE",
  tag: "enter",
  icon: "play",
};

// The Natural Earth GeoJSON (~838 KB) is fetched once per session and cached here, so re-opening the
// Map is instant. Preloaded on app start (see GameFrontend) so the first open doesn't wait either.
let countriesPromise: Promise<FeatureCollection> | null = null;
function loadCountries(): Promise<FeatureCollection> {
  if (!countriesPromise) {
    countriesPromise = fetch("/ne_110m_admin_0_countries.geojson").then((response) =>
      response.json(),
    );
  }
  return countriesPromise;
}

function MatrixField() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const fontSize = 13;
    const signal = [
      ["6", "0", "0"],
      ["0", "0", "0"],
      ["0", "0", "0"],
      ["0", "0", "0"],
    ] as const;
    const columnWidth = Math.round(fontSize * 1.35);
    const rowHeight = Math.round(fontSize * 1.35);
    const sweepPerRow = 0.22;
    const hold = 1.1;
    const fade = 0.8;
    const sweepDuration = signal.length * sweepPerRow;
    const total = sweepDuration + hold + fade;
    const regions: Region[] = [];

    let width = 0;
    let height = 0;
    let columns = 0;
    let rows = 0;
    let nextSpawnAt = 0;
    let frameId = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      columns = Math.ceil(width / columnWidth);
      rows = Math.ceil(height / rowHeight);
    };

    const spawn = (now: number) => {
      regions.push({
        col: Math.floor(Math.random() * (Math.max(0, columns - 3) + 1)),
        row: Math.floor(Math.random() * (Math.max(0, rows - signal.length) + 1)),
        bornAt: now,
      });
    };

    const draw = (time: number) => {
      const now = time / 1000;
      context.clearRect(0, 0, width, height);
      context.font = `700 ${fontSize}px "JetBrains Mono", monospace`;
      context.textBaseline = "top";
      context.textAlign = "left";
      context.fillStyle = "rgba(247,147,26,0.085)";

      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < columns; col += 1) {
          context.fillText("0", col * columnWidth + 2, row * rowHeight);
        }
      }

      if (now > nextSpawnAt) {
        spawn(now);
        nextSpawnAt = now + 0.7 + Math.random() * 1.1;
      }

      for (let regionIndex = regions.length - 1; regionIndex >= 0; regionIndex -= 1) {
        const region = regions[regionIndex];
        if (!region) continue;

        const age = now - region.bornAt;
        if (age >= total) {
          regions.splice(regionIndex, 1);
          continue;
        }

        for (let row = 0; row < signal.length; row += 1) {
          const rowSignal = signal[row];
          if (!rowSignal) continue;

          const rowLightAt = (signal.length - 1 - row) * sweepPerRow;
          let alpha = 0;
          if (age >= rowLightAt && age < sweepDuration + hold) {
            alpha = Math.min(1, (age - rowLightAt) / sweepPerRow);
          } else if (age >= sweepDuration + hold) {
            alpha = Math.max(0, 1 - (age - (sweepDuration + hold)) / fade);
          }
          if (alpha <= 0) continue;

          context.fillStyle = `rgba(247,147,26,${alpha})`;
          for (let col = 0; col < rowSignal.length; col += 1) {
            const digit = rowSignal[col];
            if (!digit) continue;
            context.fillText(
              digit,
              (region.col + col) * columnWidth + 2,
              (region.row + row) * rowHeight,
            );
          }
        }
      }

      frameId = requestAnimationFrame(draw);
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    frameId = requestAnimationFrame(draw);

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(frameId);
    };
  }, []);

  return <canvas className="matrix-field" ref={canvasRef} />;
}

function NavBadge({
  current,
  open,
  onToggle,
  onSelect,
}: {
  current: NavItem;
  open: boolean;
  onToggle: () => void;
  onSelect: (screen: ScreenId) => void;
}) {
  return (
    <div className="nav-cluster">
      <button className="nav-pill" onClick={onToggle} type="button">
        <Icon name="sprout" size={22} />
        <strong>600B</strong>
        <span>{current.label}</span>
        <Icon name="chevron" size={15} />
      </button>
      {open ? (
        <div className="nav-menu">
          {navItems.map((item) => (
            <button
              className={item.id === current.id ? "nav-row nav-row--active" : "nav-row"}
              key={item.id}
              onClick={() => onSelect(item.id)}
              type="button"
            >
              <Icon name={item.icon} size={16} />
              <span>{item.name}</span>
              <small>{item.tag}</small>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TopChrome({
  current,
  navOpen,
  onToggleNav,
  onSelectScreen,
  showCoins,
  character,
}: {
  current: NavItem;
  navOpen: boolean;
  onToggleNav: () => void;
  onSelectScreen: (screen: ScreenId) => void;
  showCoins: boolean;
  character: Character;
}) {
  return (
    <header className="top-chrome">
      <NavBadge current={current} onSelect={onSelectScreen} onToggle={onToggleNav} open={navOpen} />
      <div className="block-pill">
        <span className="live-dot" />
        <Icon name="block" size={15} />
        <span>BLOCK 905,432</span>
        <small>the world clock</small>
      </div>
      <div className="status-cluster">
        {character.pubkey ? (
          <span className="demo-key-pill" title={`DEMO key (throwaway) · ${character.pubkey}`}>
            <Icon name="zap" size={11} />
            demo · {character.pubkey.slice(0, 9)}…
          </span>
        ) : null}
        {showCoins ? (
          <span className="coins-pill">
            <Icon name="coins" size={15} />
            12,400
          </span>
        ) : null}
        <span className="days-pill">
          <Icon name="lock" size={17} />
          <strong>2,847</strong>
          <small>DAYS LOCKED</small>
        </span>
        <span
          className="avatar-pill"
          style={{ "--aura": character.avatar.aura } as CSSProperties}
          title={character.handle}
        >
          <Icon name="paw" size={14} />
        </span>
      </div>
    </header>
  );
}

function PostCard({ post, onRepost }: { post: FeedPost; onRepost?: () => void }) {
  return (
    <article className={post.pinned ? "post-card post-card--pinned" : "post-card"}>
      <div className="post-author">
        <span className="post-avatar">{post.author.slice(0, 1)}</span>
        <div>
          <strong>
            {post.author}
            {post.founder ? <Icon className="founder-crown" name="crown" size={12} /> : null}
          </strong>
          <small>{post.meta}</small>
        </div>
      </div>
      <p>{post.body}</p>
      <div className="post-actions">
        <span>
          <Icon name="reply" size={14} />
          {post.actions.replies}
        </span>
        {onRepost ? (
          <button className="post-action" onClick={onRepost} title="Repost to nostr" type="button">
            <Icon name="repost" size={14} />
            {post.actions.reposts}
          </button>
        ) : (
          <span>
            <Icon name="repost" size={14} />
            {post.actions.reposts}
          </span>
        )}
        <span className="zap-count">
          <Icon name="zap" size={14} />
          {post.actions.zaps.toLocaleString("en-US")}
        </span>
      </div>
    </article>
  );
}

function FeedHead({ feed }: { feed: FeedConfig }) {
  return (
    <div className="feed-head">
      <div className="feed-title">
        <Icon name={feed.icon} size={20} />
        <div>
          <strong>{feed.title}</strong>
          <small>{feed.subtitle}</small>
        </div>
      </div>
      <span className={`feed-status feed-status--${feed.tone}`}>
        <span />
        {feed.status}
      </span>
    </div>
  );
}

function FeedCompose({ feed }: { feed: FeedConfig }) {
  return (
    <div className="feed-compose">
      <button className="compose-input" type="button">
        {feed.placeholder}
      </button>
      <button className="coral-button coral-button--compact" type="button">
        <Icon name={feed.icon} size={15} />
        {feed.action}
      </button>
    </div>
  );
}

function FeedRail({ feed }: { feed: FeedConfig }) {
  return (
    <aside className="feed-rail">
      <FeedHead feed={feed} />
      <div className="feed-body">
        {feed.posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
        {feed.events ? (
          <section className="events-panel">
            <div className="events-head">
              <Icon name="events" size={16} />
              <strong>Events</strong>
              <small>head of culture only</small>
            </div>
            {feed.events.map((event) => (
              <article className="event-line" key={event.title}>
                <strong>{event.title}</strong>
                <small>{event.tag}</small>
                <span>{event.description}</span>
              </article>
            ))}
          </section>
        ) : null}
      </div>
      <FeedCompose feed={feed} />
    </aside>
  );
}

/** Home's social rail: a Nostr browser scoped to your private circle — presence + friend threads. */
function CircleRail({ feed, friends }: { feed: FeedConfig; friends: Friend[] }) {
  const onlineCount = friends.filter((friend) => friend.online).length;

  return (
    <aside className="feed-rail">
      <FeedHead feed={feed} />
      <section className="circle-presence">
        <div className="presence-head">
          <strong>Friends</strong>
          <small>{onlineCount} online</small>
        </div>
        <div className="presence-row">
          {friends.map((friend) => (
            <button
              className={friend.online ? "presence-chip" : "presence-chip presence-chip--off"}
              key={friend.id}
              type="button"
            >
              <span className="presence-avatar">
                {friend.handle.slice(0, 1).toUpperCase()}
                <i className={friend.online ? "presence-dot presence-dot--on" : "presence-dot"} />
              </span>
              <span className="presence-text">
                <strong>
                  {friend.handle}
                  {friend.founder ? (
                    <Icon className="founder-crown" name="crown" size={10} />
                  ) : null}
                </strong>
                <small>{friend.status}</small>
              </span>
            </button>
          ))}
        </div>
      </section>
      <div className="feed-body feed-body--circle">
        {feed.posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
      <FeedCompose feed={feed} />
    </aside>
  );
}

function ScreenFrame({
  screen,
  navOpen,
  onToggleNav,
  onSelectScreen,
  character,
  children,
}: {
  screen: ScreenId;
  navOpen: boolean;
  onToggleNav: () => void;
  onSelectScreen: (screen: ScreenId) => void;
  character: Character;
  children: ReactNode;
}) {
  const current = navItems.find((item) => item.id === screen) ?? fallbackNav;

  return (
    <main className={`game-screen screen--${screen}`}>
      <TopChrome
        character={character}
        current={current}
        navOpen={navOpen}
        onSelectScreen={onSelectScreen}
        onToggleNav={onToggleNav}
        showCoins={screen === "style"}
      />
      {children}
      {screen === "home" ? (
        <CircleRail feed={feeds.home} friends={circleFriends} />
      ) : (
        <FeedRail feed={feeds[screen]} />
      )}
    </main>
  );
}

function TitleScreen({ onStartEngine }: ScreenProps) {
  const [selectedTier, setSelectedTier] = useState<(typeof timelockTiers)[number]>("21Y");
  const [destinationOpen, setDestinationOpen] = useState(false);

  return (
    <section className="title-layout">
      <div className="command-card">
        <div className="brand-lockup">
          <div className="sacred-number">
            <span>600</span>
            <span>000</span>
            <span>000</span>
            <span>000</span>
          </div>
          <div>
            <h1>600 Billion</h1>
            <p>The Palace of Culture</p>
            <small>money buys style. time builds legend.</small>
          </div>
        </div>
        <div className="field-block">
          <label htmlFor="destination-button">Destination</label>
          <button
            className="destination-button"
            id="destination-button"
            onClick={() => setDestinationOpen((value) => !value)}
            type="button"
          >
            <Icon name="crown" size={18} />
            <span>
              Palace of Culture HQ
              <small>Madeira - default</small>
            </span>
            <Icon name="chevron" size={16} />
          </button>
          {destinationOpen ? (
            <div className="destination-menu">
              <button onClick={() => onStartEngine("hq")} type="button">
                <Icon name="palace" size={17} />
                <span>
                  Palace of Culture HQ
                  <small>engine handoff point</small>
                </span>
              </button>
              <button onClick={() => setDestinationOpen(false)} type="button">
                <Icon name="map" size={17} />
                <span>
                  National palaces
                  <small>coming after HQ</small>
                </span>
              </button>
            </div>
          ) : null}
        </div>
        <button
          className="coral-button coral-button--hero"
          onClick={() => onStartEngine("hq")}
          type="button"
        >
          <Icon name="play" size={18} />
          Enter the Palace
          <small>come home</small>
        </button>
        <section className="timelock-card">
          <div>
            <strong>How much time will you commit?</strong>
            <small>starts at 21 days</small>
          </div>
          <div className="tier-row">
            {timelockTiers.map((tier) => (
              <button
                className={selectedTier === tier ? "tier-chip tier-chip--active" : "tier-chip"}
                key={tier}
                onClick={() => setSelectedTier(tier)}
                type="button"
              >
                {tier === "21Y" ? <Icon name="crown" size={13} /> : null}
                {tier}
              </button>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

/** Builds a sparse node graph: each land node links to its ~3 nearest neighbours within 11°. */
function buildEdges(nodes: GeoNode[]): Array<[number, number]> {
  const seen = new Set<string>();
  const edges: Array<[number, number]> = [];
  for (let i = 0; i < nodes.length; i += 1) {
    const here = nodes[i];
    if (!here) continue;
    const near: Array<{ index: number; distance: number }> = [];
    for (let j = 0; j < nodes.length; j += 1) {
      if (i === j) continue;
      const other = nodes[j];
      if (!other) continue;
      const dLat = here.lat - other.lat;
      const dLng = here.lng - other.lng;
      const distance = dLat * dLat + dLng * dLng;
      if (distance <= 11 * 11) near.push({ index: j, distance });
    }
    near.sort((a, b) => a.distance - b.distance);
    for (const candidate of near.slice(0, 3)) {
      const key = i < candidate.index ? `${i}-${candidate.index}` : `${candidate.index}-${i}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push([i, candidate.index]);
    }
  }
  return edges;
}

/** Glowing land-node network drawn on a canvas that re-projects through the map every frame. */
function NodeNetwork({ nodes }: { nodes: GeoNode[] }) {
  const map = useMap();

  useEffect(() => {
    if (!nodes.length) return;

    const container = map.getContainer();
    const canvas = document.createElement("canvas");
    canvas.className = "node-canvas";
    container.appendChild(canvas);
    const context = canvas.getContext("2d");
    if (!context) {
      canvas.remove();
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const edges = buildEdges(nodes);
    type Pulse = { edge: number; t: number; speed: number };
    let pulses: Pulse[] = [];
    let nextPulseAt = 0;
    let frameId = 0;

    const resize = () => {
      const size = map.getSize();
      canvas.width = size.x * dpr;
      canvas.height = size.y * dpr;
      canvas.style.width = `${size.x}px`;
      canvas.style.height = `${size.y}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    map.on("resize", resize);

    const draw = (time: number) => {
      const seconds = time / 1000;
      const size = map.getSize();
      context.clearRect(0, 0, size.x, size.y);

      const points = nodes.map((node) => map.latLngToContainerPoint([node.lat, node.lng]));

      context.lineWidth = 1;
      context.strokeStyle = "rgba(247,147,26,0.13)";
      for (const [i, j] of edges) {
        const a = points[i];
        const b = points[j];
        if (!a || !b) continue;
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.stroke();
      }

      if (seconds > nextPulseAt && edges.length) {
        pulses.push({
          edge: Math.floor(Math.random() * edges.length),
          t: 0,
          speed: 0.5 + Math.random() * 0.4,
        });
        nextPulseAt = seconds + 0.5 + Math.random();
      }

      const flares = new Set<number>();
      pulses = pulses.filter((pulse) => {
        pulse.t += 0.016 * pulse.speed;
        if (pulse.t >= 1) return false;
        const edge = edges[pulse.edge];
        if (!edge) return false;
        const a = points[edge[0]];
        const b = points[edge[1]];
        if (!a || !b) return false;
        const x = a.x + (b.x - a.x) * pulse.t;
        const y = a.y + (b.y - a.y) * pulse.t;
        context.fillStyle = "rgba(247,147,26,0.92)";
        context.beginPath();
        context.arc(x, y, 2.2, 0, Math.PI * 2);
        context.fill();
        if (pulse.t > 0.82) {
          flares.add(edge[0]);
          flares.add(edge[1]);
        }
        return true;
      });

      for (let index = 0; index < points.length; index += 1) {
        const point = points[index];
        if (!point) continue;
        if (point.x < -24 || point.y < -24 || point.x > size.x + 24 || point.y > size.y + 24) {
          continue;
        }
        const breathe = 0.55 + 0.45 * Math.abs(Math.sin(seconds * 0.9 + index * 0.4));
        const flared = flares.has(index);
        context.shadowColor = "rgba(247,147,26,0.9)";
        context.shadowBlur = flared ? 12 : 6;
        context.fillStyle = `rgba(247,147,26,${flared ? 1 : breathe})`;
        context.beginPath();
        context.arc(point.x, point.y, flared ? 3.4 : 1.8, 0, Math.PI * 2);
        context.fill();
        context.shadowBlur = 0;
      }

      frameId = requestAnimationFrame(draw);
    };
    frameId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frameId);
      map.off("resize", resize);
      canvas.remove();
    };
  }, [map, nodes]);

  return null;
}

/** The single charted location: a gold doubloon marker on Pico Ruivo, Madeira. */
function HqMarker({ onStartEngine }: { onStartEngine: (target: EngineTarget) => void }) {
  const map = useMap();

  useEffect(() => {
    // The HQ palace has its OWN Nostr identity (derived from the master seed) — show its npub here.
    const npub = ENTITY_NPUBS.hqPalace;
    const shortNpub = `${npub.slice(0, 12)}…${npub.slice(-4)}`;
    const icon = L.divIcon({
      className: "hq-leaflet",
      iconSize: [0, 0],
      html: `<span class="hq-doubloon">HQ</span><span class="hq-leaflet-label"><strong>Palace of Culture HQ</strong><small>Pico Ruivo, Madeira</small><small class="hq-npub">${shortNpub}</small></span>`,
    });
    const marker = L.marker(HQ_LATLNG, { icon }).addTo(map);
    const enter = () => onStartEngine("hq");
    marker.on("click", enter);

    return () => {
      marker.off("click", enter);
      marker.remove();
    };
  }, [map, onStartEngine]);

  return null;
}

/** Placed assets as a dot cluster around HQ — the ever-growing town (personal + community). */
function AssetMarkers() {
  const map = useMap();

  useEffect(() => {
    const markers = worldAssets.map((asset) => {
      const icon = L.divIcon({
        className: "asset-leaflet",
        iconSize: [0, 0],
        html: `<span class="asset-dot asset-dot--${asset.category}"></span>`,
      });
      const marker = L.marker([HQ_LATLNG[0] + asset.offset[0], HQ_LATLNG[1] + asset.offset[1]], {
        icon,
      }).addTo(map);
      marker.bindTooltip(asset.name, {
        className: "asset-label",
        direction: "top",
        offset: [0, -5],
      });
      return marker;
    });

    return () => {
      for (const marker of markers) marker.remove();
    };
  }, [map]);

  return null;
}

/** Toggles country labels on only at zoom >= 5 (otherwise they overlap into noise). */
function LabelZoom() {
  const map = useMapEvents({
    zoomend: () => {
      map.getContainer().classList.toggle("labels-visible", map.getZoom() >= 5);
    },
  });
  useEffect(() => {
    map.getContainer().classList.toggle("labels-visible", map.getZoom() >= 5);
  }, [map]);
  return null;
}

function MapScreen({ onStartEngine }: ScreenProps) {
  const [filter, setFilter] = useState("All");
  const [geo, setGeo] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    let active = true;
    loadCountries()
      .then((data) => {
        if (active) setGeo(data);
      })
      .catch(() => {
        /* offline / missing geojson — map still renders, just without contours */
      });
    return () => {
      active = false;
    };
  }, []);

  const nodes = useMemo<GeoNode[]>(() => {
    if (!geo) return [];
    return geo.features
      .map((feature) => {
        const props = (feature.properties ?? {}) as Record<string, unknown>;
        return {
          lat: Number(props.LABEL_Y),
          lng: Number(props.LABEL_X),
          name: String(props.NAME ?? ""),
        };
      })
      .filter((node) => Number.isFinite(node.lat) && Number.isFinite(node.lng));
  }, [geo]);

  return (
    <section className="map-layout">
      <MatrixField />
      <MapContainer
        attributionControl={false}
        center={[28, -26]}
        className="leaflet-earth"
        maxBounds={[
          [-84, -200],
          [84, 200],
        ]}
        maxBoundsViscosity={0.9}
        maxZoom={8}
        minZoom={2}
        zoom={3}
        zoomControl={false}
      >
        {geo ? (
          <GeoJSON
            data={geo}
            onEachFeature={(feature, layer) => {
              const name = String(feature.properties?.NAME ?? "");
              if (name) {
                layer.bindTooltip(name, {
                  className: "country-label",
                  direction: "center",
                  opacity: 1,
                  permanent: true,
                });
              }
            }}
            style={() => ({
              color: "#f7931a",
              weight: 1,
              opacity: 0.85,
              fillColor: "#f7931a",
              fillOpacity: 0.045,
            })}
          />
        ) : null}
        <NodeNetwork nodes={nodes} />
        <HqMarker onStartEngine={onStartEngine} />
        <AssetMarkers />
        <LabelZoom />
        <ZoomControl position="bottomright" />
      </MapContainer>
      <div className="map-toolbar">
        <div className="map-search">
          <Icon name="search" size={16} />
          <span>SEARCH PALACES, COUNTRIES...</span>
        </div>
        {["All", "National palaces", "Plazas"].map((label) => (
          <button
            className={filter === label ? "filter-chip filter-chip--active" : "filter-chip"}
            key={label}
            onClick={() => setFilter(label)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
      <div className="map-empty">Only the HQ is charted. The rest is unbuilt.</div>
      <div className="compass">N</div>
      <button className="signal-fab" type="button">
        <Icon name="community" size={18} />
        The Signal
      </button>
    </section>
  );
}

/** The Home dashboard: a wall of your committed timelocks (days locked is the hero metric). */
function Legendwall({ locks, compact }: { locks: Timelock[]; compact?: boolean }) {
  const totalDays = locks.reduce((sum, lock) => sum + lock.daysLocked, 0);

  return (
    <section className={compact ? "legendwall legendwall--compact" : "legendwall"}>
      <header className="legendwall-head">
        <div>
          <small>Legendwall</small>
          <h2>Your timelocks</h2>
        </div>
        <div className="legendwall-stat">
          <Icon name="lock" size={15} />
          <strong>{totalDays.toLocaleString("en-US")}</strong>
          <small>days locked / {locks.length} timelocks</small>
        </div>
      </header>
      <div className="legend-grid">
        {locks.map((lock) => (
          <article
            className={lock.status === "sealed" ? "lock-card lock-card--sealed" : "lock-card"}
            key={lock.id}
          >
            <div className={`lock-thumb lock-thumb--${lock.tone}`}>
              {/* Dynamic Tamagotchi sprite: grows with the lock's age (tree/ship/special × stage). */}
              <GrowthSprite kind={kindForTier(lock.tier)} stage={growthStage(lock)} />
              <span className="lock-tier">
                {lock.tier === "21Y" ? <Icon name="crown" size={11} /> : null}
                {lock.tier}
              </span>
            </div>
            <div className="lock-info">
              <h3>{lock.name}</h3>
              <small>{lock.grewInto}</small>
              <p>{lock.detail}</p>
              <div className="lock-foot">
                <span className="lock-days">
                  <Icon name="lock" size={12} />
                  {lock.daysLocked.toLocaleString("en-US")}d
                </span>
                <span
                  className={
                    lock.status === "sealed" ? "lock-status lock-status--sealed" : "lock-status"
                  }
                >
                  <Icon name={lock.status === "sealed" ? "check" : "block"} size={11} />
                  {lock.status === "sealed" ? "sealed" : lock.unlock}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/** A NIP-23 long-form article (kind 30023), shown in Home's Articles tab. Read opens it on habla.news. */
function ArticleCard({ article }: { article: Article }) {
  const [showImage, setShowImage] = useState(Boolean(article.image));
  return (
    <a className="article-card" href={article.href} rel="noopener noreferrer" target="_blank">
      {showImage && article.image ? (
        <img
          alt=""
          className="article-cover"
          loading="lazy"
          onError={() => setShowImage(false)}
          src={article.image}
        />
      ) : null}
      <div className="article-body">
        <strong className="article-title">{article.title}</strong>
        <p className="article-summary">{article.summary}</p>
        <div className="article-foot">
          <span className="article-author">{article.author}</span>
          <span>{article.meta}</span>
          <span className="article-read">
            <Icon name="doc" size={12} />
            {article.readingMinutes} min
          </span>
        </div>
      </div>
    </a>
  );
}

/** Home's hero: an Iris-style Nostr feed with mood tabs — PoC + Guild built in, add your own moods. */
function HomeFeed() {
  const [tabs, setTabs] = useState<FeedTab[]>(() => loadTabs());
  const [activeId, setActiveId] = useState<string>(() => loadTabs()[0]?.id ?? "general");
  const [notes, setNotes] = useState<FeedNote[] | null>(null);
  const [articles, setArticles] = useState<Article[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [custom, setCustom] = useState("");
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);

  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];
  const isArticles = active?.algo === "articles";

  // Publish the player's note (signed by the demo signer) and show it instantly at the top of the feed.
  const submitPost = async () => {
    const text = draft.trim();
    if (!text || posting) return;
    setPosting(true);
    const id = await publishNote(text);
    setPosting(false);
    if (id) {
      setDraft("");
      setNotes((prev) => [localNote(id, demoNpub(), text), ...(prev ?? [])]);
    }
  };

  // Repost a note (NIP-18 kind:6), bumping its count optimistically.
  const handleRepost = (note: FeedNote) => {
    setNotes(
      (prev) =>
        prev?.map((entry) =>
          entry.id === note.id
            ? { ...entry, actions: { ...entry.actions, reposts: entry.actions.reposts + 1 } }
            : entry,
        ) ?? prev,
    );
    void repostNote(note);
  };

  // Load the active tab's content whenever the tab (or the tab set) changes. The Articles tab loads
  // NIP-23 long-form (kind 30023) as article cards; every other tab loads kind:1 notes.
  useEffect(() => {
    const tab = tabs.find((entry) => entry.id === activeId);
    if (!tab) return;
    let alive = true;
    if (tab.algo === "articles") {
      setArticles(null);
      loadArticles().then((list) => {
        if (alive) setArticles(list);
      });
    } else {
      setNotes(null);
      loadFeedNotes(tab).then((list) => {
        if (alive) setNotes(list);
      });
    }
    return () => {
      alive = false;
    };
  }, [activeId, tabs]);

  const addTab = (tab: FeedTab) => {
    setAdding(false);
    setCustom("");
    setActiveId(tab.id);
    if (tabs.some((entry) => entry.id === tab.id)) return;
    const next = [...tabs, tab];
    setTabs(next);
    saveTabs(next);
  };

  const addCustom = () => {
    const tab = customTab(custom);
    if (tab) addTab(tab);
  };

  const removeTab = (id: string) => {
    const next = tabs.filter((entry) => entry.id !== id);
    setTabs(next);
    saveTabs(next);
    if (activeId === id) setActiveId(next[0]?.id ?? "general");
  };

  const available = PRESET_TABS.filter((preset) => !tabs.some((tab) => tab.id === preset.id));

  return (
    <section className="home-feed">
      <div className="home-feed-head">
        <div className="feed-title">
          <Icon name="zap" size={18} />
          <div>
            <strong>The Feed</strong>
            <small>live off nostr · pick a mood</small>
          </div>
        </div>
        <span className="feed-status feed-status--green">
          <span />
          {RELAYS.length} relays
        </span>
      </div>

      <div className="feed-tabs">
        {tabs.map((tab) => (
          <span
            className={tab.id === activeId ? "feed-tab feed-tab--active" : "feed-tab"}
            key={tab.id}
          >
            <button className="feed-tab-main" onClick={() => setActiveId(tab.id)} type="button">
              <Icon name={tab.icon} size={13} />
              {tab.label}
            </button>
            {tab.builtin ? null : (
              <button
                aria-label={`Remove ${tab.label}`}
                className="feed-tab-x"
                onClick={() => removeTab(tab.id)}
                type="button"
              >
                ×
              </button>
            )}
          </span>
        ))}
        <div className="feed-add">
          <button
            aria-label="Add a mood"
            className="feed-tab feed-tab--add"
            onClick={() => setAdding((value) => !value)}
            type="button"
          >
            +
          </button>
          {adding ? (
            <div className="feed-add-pop">
              <small>Add a mood</small>
              <div className="feed-add-presets">
                {available.length ? (
                  available.map((preset) => (
                    <button key={preset.id} onClick={() => addTab(preset)} type="button">
                      <Icon name={preset.icon} size={13} />
                      {preset.label}
                    </button>
                  ))
                ) : (
                  <span className="feed-add-empty">all presets added</span>
                )}
              </div>
              <div className="feed-add-custom">
                <input
                  onChange={(event) => setCustom(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") addCustom();
                  }}
                  placeholder="#topic"
                  value={custom}
                />
                <button onClick={addCustom} type="button">
                  Add
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="feed-stream">
        {isArticles ? (
          articles === null ? (
            <div className="feed-note-state">Loading articles…</div>
          ) : articles.length === 0 ? (
            <div className="feed-note-state">No articles right now. Try another mood.</div>
          ) : (
            articles.map((article) => <ArticleCard article={article} key={article.id} />)
          )
        ) : notes === null ? (
          <div className="feed-note-state">Loading the {active?.label ?? ""} feed…</div>
        ) : notes.length === 0 ? (
          <div className="feed-note-state">Quiet here. Try another mood.</div>
        ) : (
          notes.map((note) => (
            <PostCard key={note.id} onRepost={() => handleRepost(note)} post={note} />
          ))
        )}
      </div>

      {isArticles ? null : (
        <div className="feed-compose">
          <input
            className="compose-input"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void submitPost();
            }}
            placeholder="post to nostr…"
            value={draft}
          />
          <button
            className="coral-button coral-button--compact"
            disabled={posting || !draft.trim()}
            onClick={() => void submitPost()}
            type="button"
          >
            <Icon name="zap" size={15} />
            {posting ? "Posting…" : "Post"}
          </button>
        </div>
      )}
    </section>
  );
}

/** The Home screen: a compact timelock strip stacked above the Iris-style Nostr feed (the hero). */
function HomeScreen({ onStartEngine, onBuild }: ScreenProps) {
  return (
    <section className="home-layout home-layout--feed">
      <div className="screen-heading">
        <h1>Home</h1>
        <p>your timelocks / the feed / pick a mood</p>
      </div>
      <Legendwall compact locks={timelocks} />
      <HomeFeed />
      <div className="build-dock build-dock--slim">
        <button className="coral-button coral-button--compact" onClick={onBuild} type="button">
          <Icon name="hammer" size={17} />
          Build
        </button>
        <button
          className="tool-button tool-button--wide"
          onClick={() => onStartEngine("home")}
          type="button"
        >
          <Icon name="home" size={18} />
          Enter My Plot
          <small>3d builder · comes with the world</small>
        </button>
      </div>
    </section>
  );
}

/** The card thumbnail: the real product photo when the listing has one, else the category icon. */
function MarketThumb({ item, mode }: { item: MarketItem; mode: "pleb" | "style" }) {
  const [showImage, setShowImage] = useState(Boolean(item.image));
  return (
    <div className={`market-thumb market-thumb--${item.tone}`}>
      {showImage && item.image ? (
        <img
          alt=""
          className="market-img"
          loading="lazy"
          onError={() => setShowImage(false)}
          src={item.image}
        />
      ) : (
        <Icon name={item.icon} size={42} />
      )}
      {item.badge ? <span className="market-badge">{item.badge}</span> : null}
      {mode === "style" && !item.locked ? <span className="stock-badge">12 left</span> : null}
    </div>
  );
}

function MarketCard({ item, mode }: { item: MarketItem; mode: "pleb" | "style" }) {
  return (
    <article className={item.locked ? "market-card market-card--locked" : "market-card"}>
      <MarketThumb item={item} mode={mode} />
      <div className="market-info">
        <h2>{item.title}</h2>
        <small>{item.meta}</small>
        <div className="market-buy-row">
          <span className={item.locked ? "locked-price" : "sats-price"}>
            <Icon name={item.locked ? "lock" : "zap"} size={13} />
            {item.price}
          </span>
          {item.href && !item.locked ? (
            <a
              className="coral-button coral-button--compact"
              href={item.href}
              rel="noopener noreferrer"
              target="_blank"
            >
              {mode === "pleb" ? "Buy" : "Get"}
              <Icon name="chevron" size={13} />
            </a>
          ) : (
            <button
              className={item.locked ? "ghost-button" : "coral-button coral-button--compact"}
              type="button"
            >
              {item.locked ? "Earned" : mode === "pleb" ? "Offer" : "Get"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

/** Split the "Goods" / "Land" chips: Land = real-estate-ish listings, Goods = everything else. */
function matchesMarketFilter(item: MarketItem, filter: string): boolean {
  if (filter === "All") return true;
  const isLand =
    /land|plot|estate|property|real/.test(item.meta.toLowerCase()) || item.icon === "map";
  return filter === "Land" ? isLand : !isLand;
}

function PlebMarketScreen() {
  const [filter, setFilter] = useState("All");
  const [listings, setListings] = useState<MarketItem[] | null>(null);

  // Pull real plebeian.market listings (NIP-15 / NIP-99) off the relays; mock fallback if quiet.
  useEffect(() => {
    let alive = true;
    loadPlebListings().then((items) => {
      if (alive) setListings(items);
    });
    return () => {
      alive = false;
    };
  }, []);

  const visible = (listings ?? []).filter((item) => matchesMarketFilter(item, filter));

  return (
    <section className="market-layout">
      <div className="market-head">
        <div>
          <h1>Pleb Market</h1>
          <p>by plebs, for plebs / live nostr listings / checkout on plebeian.market</p>
        </div>
      </div>
      <div className="market-toolbar">
        <button className="market-search" type="button">
          <Icon name="search" size={16} />
          search the stalls...
        </button>
        {["All", "Goods", "Land"].map((label) => (
          <button
            className={filter === label ? "filter-chip filter-chip--active" : "filter-chip"}
            key={label}
            onClick={() => setFilter(label)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
      <div className="market-grid">
        {listings === null ? (
          <div className="market-empty">Loading listings off nostr…</div>
        ) : visible.length === 0 ? (
          <div className="market-empty">No listings in this category yet.</div>
        ) : (
          visible.map((item) => <MarketCard item={item} key={item.id} mode="pleb" />)
        )}
      </div>
    </section>
  );
}

function StyleMarketScreen() {
  const [filter, setFilter] = useState("Outfits");

  return (
    <section className="market-layout">
      <div className="market-head">
        <div>
          <h1>Style Market</h1>
          <p>digital assets / money buys style / wear it now</p>
        </div>
        <div className="market-filters">
          {["Outfits", "Vehicle", "Pet", "Decor"].map((label) => (
            <button
              className={filter === label ? "filter-chip filter-chip--coral" : "filter-chip"}
              key={label}
              onClick={() => setFilter(label)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="market-grid">
        {styleDrops.map((item) => (
          <MarketCard item={item} key={item.id} mode="style" />
        ))}
      </div>
    </section>
  );
}

/**
 * The 3D game — the Godot homebuilder (Pokopia loop: magnet building, drip economy,
 * month crafts, palace decoration) shipped as a web export and embedded as a screen
 * of the ONE website. Synced from godot/dist/web via `pnpm game:sync`; the fullscreen
 * link opens the same build in its own tab.
 */
function GameScreen() {
  return (
    <section className="game-embed-layout">
      <div className="market-head">
        <div>
          <h1>Homebuilder</h1>
          <p>the 3D game / build at home, decorate the palace / time is the material</p>
        </div>
        <a className="filter-chip" href="/game/index.html" rel="noreferrer" target="_blank">
          Open fullscreen
        </a>
      </div>
      <iframe
        allow="autoplay; fullscreen"
        className="game-embed"
        src="/game/index.html"
        title="Homebuilder — 3D game"
      />
    </section>
  );
}

function renderScreen(screen: ScreenId, props: ScreenProps) {
  switch (screen) {
    case "title":
      return <TitleScreen {...props} />;
    case "map":
      return <MapScreen {...props} />;
    case "home":
      return <HomeScreen {...props} />;
    case "pleb":
      return <PlebMarketScreen />;
    case "style":
      return <StyleMarketScreen />;
    case "game":
      return <GameScreen />;
  }
}

// TESTING: when false, the saved character is neither loaded nor persisted, so the member-select
// gate always shows (no "skip to last character"). Flip back to true to restore device persistence.
const PERSIST_CHARACTER = false;

export function GameFrontend() {
  const [started, setStarted] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [character, setCharacter] = useState<Character | null>(null);
  const [screen, setScreen] = useState<ScreenId>("title");
  const [navOpen, setNavOpen] = useState(false);
  const [engineTarget, setEngineTarget] = useState<EngineTarget | null>(null);
  const [buildMode, setBuildMode] = useState(false);
  const store = useMemo(() => createCharacterStore(), []);
  const [storeChecked, setStoreChecked] = useState(false);

  // Load the saved character from the device DB (plug-and-play persistence) before the create gate.
  useEffect(() => {
    if (!PERSIST_CHARACTER) {
      setStoreChecked(true); // skip load → member-select always shows (testing)
      return;
    }
    let active = true;
    store.loadCurrent().then((saved) => {
      if (!active) return;
      if (saved) setCharacter(saved);
      setStoreChecked(true);
    });
    return () => {
      active = false;
    };
  }, [store]);

  // Warm the Map's GeoJSON in the background so it's ready before the user ever opens the Map.
  useEffect(() => {
    loadCountries().catch(() => {});
  }, []);

  // Wire the DEMO Nostr signer at startup so every write (post/react/zap/chat) is signed. ⚠️ throwaway
  // key — the secure NIP-07/bunker flow replaces this behind net/nostr's setSigner later.
  useEffect(() => {
    setSigner(getOrCreateDemoSigner());
  }, []);

  const selectScreen = (nextScreen: ScreenId) => {
    setScreen(nextScreen);
    setNavOpen(false);
  };

  if (!started) {
    return <StartScreen onStart={() => setStarted(true)} />;
  }

  if (!introDone) {
    return <IntroScreen onComplete={() => setIntroDone(true)} />;
  }

  if (!character) {
    if (!storeChecked) return null;
    const onCreated = (created: Character) => {
      // Stamp the player's demo npub onto the character so the HUD can show their identity.
      const withKey: Character = { ...created, pubkey: demoNpub(), keySource: "demo" };
      if (PERSIST_CHARACTER) void store.save(withKey);
      setCharacter(withKey);
    };
    return <MemberSelect onComplete={onCreated} />;
  }

  if (engineTarget) {
    return (
      <PalaceScene
        character={character}
        onExit={() => setEngineTarget(null)}
        target={engineTarget}
      />
    );
  }

  if (buildMode) {
    return <LevelBuildHandoff onExit={() => setBuildMode(false)} />;
  }

  return (
    <ScreenFrame
      character={character}
      navOpen={navOpen}
      onSelectScreen={selectScreen}
      onToggleNav={() => setNavOpen((value) => !value)}
      screen={screen}
    >
      {renderScreen(screen, {
        onStartEngine: setEngineTarget,
        onBuild: () => setBuildMode(true),
      })}
    </ScreenFrame>
  );
}
