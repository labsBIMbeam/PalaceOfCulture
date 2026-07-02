/**
 * Locktard Street — the avenue running out from the palace, lined both sides with buildings. Style:
 * Viennese Gründerzeit (5–6 storeys, stucco facades, mansard roofs) crossed with a Western-town ground
 * floor (rusticated base, big shop fronts) and a cypherpunk streak (neon shopfronts + lit windows).
 * Built from primitives with procedural facade textures (window grid baked into the map + a matching
 * emissive map for the glowing panes) — a handful of shared facade variants keep texture memory small.
 * Decorative for now (no collider); the player walks the open centre lane. Art is static, state is data.
 */

import { useMemo } from "react";
import * as THREE from "three";

type Variant = {
  floors: number;
  body: string; // stucco
  trim: string; // window frames / cornice
  neon: string; // cypherpunk shopfront + sign
  roof: string; // mansard
  antenna: boolean;
};

const VARIANTS: Variant[] = [
  { floors: 5, body: "#e8dcc4", trim: "#fff7e6", neon: "#39d6ff", roof: "#3a3f47", antenna: true },
  { floors: 4, body: "#d8b88a", trim: "#f3ead2", neon: "#ff4fd8", roof: "#41372f", antenna: false },
  { floors: 6, body: "#cfc6b4", trim: "#ffffff", neon: "#39d6ff", roof: "#34414a", antenna: true },
  { floors: 4, body: "#d9c2b0", trim: "#ffffff", neon: "#7cff6b", roof: "#4a5e52", antenna: false },
  { floors: 5, body: "#c2c9b0", trim: "#ffffff", neon: "#ff8a3d", roof: "#3a3f47", antenna: true },
];

const FLOOR_H = 3.4; // metres per storey
const B_W = 14; // building width
const B_D = 12; // building depth

/** Lighten (amt>0) / darken (amt<0) a #rrggbb colour, returned as an rgb() string. */
function shade(hex: string, amt: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  return `rgb(${clamp((n >> 16) & 255)},${clamp((n >> 8) & 255)},${clamp(n & 255)})`;
}

function canvas2d(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D | null] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")];
}

function toTexture(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Draw a Gründerzeit facade: cornice, rows of framed windows (some lit warm / neon), and a Western /
 * cypherpunk ground floor (rusticated, glowing shopfront + door). Returns the colour map and a matching
 * emissive map (lit panes on black) so the windows glow. Canvas top = building top (CanvasTexture
 * flipY maps row 0 → v=1), so the ground floor sits at the bottom.
 */
function facade(v: Variant): { map: THREE.CanvasTexture; emissive: THREE.CanvasTexture } {
  const W = 256;
  const GF = 84; // ground-floor band
  const FH = 54; // upper-floor band
  const upper = v.floors - 1;
  const H = GF + FH * upper;
  const [cc, x] = canvas2d(W, H);
  const [ec, e] = canvas2d(W, H);
  if (!x || !e) return { map: toTexture(cc), emissive: toTexture(ec) };

  x.fillStyle = v.body;
  x.fillRect(0, 0, W, H);
  e.fillStyle = "#000000";
  e.fillRect(0, 0, W, H);

  // top cornice
  x.fillStyle = shade(v.body, -0.18);
  x.fillRect(0, 0, W, 9);

  // upper floors (3 windows per floor)
  const cols = 3;
  const winW = 50;
  const winH = 34;
  const gapX = (W - cols * winW) / (cols + 1);
  for (let f = 0; f < upper; f++) {
    const y0 = 12 + f * FH + 8;
    // string-course line under each floor
    x.fillStyle = shade(v.body, -0.1);
    x.fillRect(0, y0 + winH + 10, W, 3);
    for (let c = 0; c < cols; c++) {
      const wx = gapX + c * (winW + gapX);
      // frame + sill
      x.fillStyle = v.trim;
      x.fillRect(wx - 4, y0 - 5, winW + 8, winH + 12);
      // glass — most dark, some lit warm, a few neon
      const r = Math.random();
      const glass = r > 0.82 ? "#ffcf87" : r > 0.74 ? v.neon : r > 0.7 ? "#9fb4c9" : "#262b34";
      x.fillStyle = glass;
      x.fillRect(wx, y0, winW, winH);
      // mullion
      x.fillStyle = v.trim;
      x.fillRect(wx + winW / 2 - 1, y0, 2, winH);
      if (r > 0.74) {
        e.fillStyle = glass;
        e.fillRect(wx, y0, winW, winH);
      }
    }
  }

  // ground floor: rusticated base + glowing shopfront + door + neon sign band
  const gy = H - GF;
  x.fillStyle = shade(v.body, -0.06);
  x.fillRect(0, gy, W, GF);
  x.strokeStyle = "rgba(0,0,0,0.16)";
  x.lineWidth = 1;
  for (let yy = gy + 14; yy < H; yy += 15) {
    x.beginPath();
    x.moveTo(0, yy);
    x.lineTo(W, yy);
    x.stroke();
  }
  // sign band
  x.fillStyle = v.neon;
  x.fillRect(18, gy + 8, 150, 9);
  e.fillStyle = v.neon;
  e.fillRect(18, gy + 8, 150, 9);
  // shopfront
  x.fillStyle = "#0e1218";
  x.fillRect(18, gy + 24, 152, GF - 36);
  x.fillStyle = v.neon;
  x.fillRect(23, gy + 29, 142, GF - 46);
  e.fillStyle = v.neon;
  e.fillRect(23, gy + 29, 142, GF - 46);
  // door
  x.fillStyle = "#1d1410";
  x.fillRect(190, gy + 20, 48, GF - 22);

  return { map: toTexture(cc), emissive: toTexture(ec) };
}

function Building({
  position,
  variant,
  skin,
}: {
  position: [number, number, number];
  variant: Variant;
  skin: { map: THREE.CanvasTexture; emissive: THREE.CanvasTexture };
}) {
  const h = variant.floors * FLOOR_H;
  const roofH = 3.2;
  return (
    <group position={position}>
      {/* rusticated plinth */}
      <mesh castShadow position={[0, 0.4, 0]} receiveShadow>
        <boxGeometry args={[B_W + 0.6, 0.8, B_D + 0.6]} />
        <meshStandardMaterial color={shade(variant.body, -0.18)} roughness={0.95} />
      </mesh>
      {/* facade body */}
      <mesh castShadow position={[0, h / 2, 0]} receiveShadow>
        <boxGeometry args={[B_W, h, B_D]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={0.85}
          emissiveMap={skin.emissive}
          map={skin.map}
          roughness={0.85}
        />
      </mesh>
      {/* cornice */}
      <mesh castShadow position={[0, h - 0.2, 0]}>
        <boxGeometry args={[B_W + 0.8, 0.6, B_D + 0.8]} />
        <meshStandardMaterial color={variant.trim} roughness={0.8} />
      </mesh>
      {/* mansard roof: a 4-sided frustum (rotate the geometry, then scale the group to the footprint) */}
      <group position={[0, h, 0]} scale={[B_W * 0.7, roofH, B_D * 0.7]}>
        <mesh castShadow position={[0, 0.5, 0]} rotation-y={Math.PI / 4}>
          <cylinderGeometry args={[0.62, 1, 1, 4]} />
          <meshStandardMaterial color={variant.roof} metalness={0.15} roughness={0.7} />
        </mesh>
      </group>
      {/* cypherpunk rooftop antenna + beacon */}
      {variant.antenna ? (
        <group position={[B_W * 0.28, h + roofH, B_D * 0.2]}>
          <mesh position={[0, 1.6, 0]}>
            <boxGeometry args={[0.14, 3.2, 0.14]} />
            <meshStandardMaterial color="#2a2e36" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0, 3.3, 0]}>
            <sphereGeometry args={[0.22, 10, 10]} />
            <meshStandardMaterial
              color={variant.neon}
              emissive={variant.neon}
              emissiveIntensity={1.4}
            />
          </mesh>
        </group>
      ) : null}
    </group>
  );
}

/** The street lined both sides — open centre lane along z (the palace → tree → rocket axis at x=0). */
export function LocktardStreet() {
  const skins = useMemo(() => VARIANTS.map(facade), []);
  const buildings = useMemo(() => {
    const lane = B_W / 2 + 15; // facade row offset — set back so the walk-in shops sit in front
    const out: { position: [number, number, number]; vi: number }[] = [];
    let i = 0;
    for (let z = 46; z <= 212; z += 17) {
      out.push({ position: [-lane, 0, z], vi: i % VARIANTS.length });
      out.push({ position: [lane, 0, z], vi: (i + 2) % VARIANTS.length });
      i++;
    }
    return out;
  }, []);

  return (
    <group>
      {buildings.map((b) => {
        const variant = VARIANTS[b.vi];
        const skin = skins[b.vi];
        if (!variant || !skin) return null;
        return (
          <Building
            key={`${b.position[0]},${b.position[2]}`}
            position={b.position}
            skin={skin}
            variant={variant}
          />
        );
      })}
    </group>
  );
}
