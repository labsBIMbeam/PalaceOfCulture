/**
 * Building — a single-storey WALKABLE building with real detail: corner + bay columns, framed windows
 * with translucent glass panes (you can peer at the furnished interior), a framed door opening you
 * can walk through, and a flat or hipped roof with an overhang. Width scales by room count (1–4
 * bays); height and depth vary per instance so the ring never reads as a copy-paste row. Primitives
 * only. Every size that affects collision flows through `buildingWallColliders` with the SAME
 * height/depth, so visuals and colliders stay in lockstep.
 */

import * as THREE from "three";
import { mulberry32 } from "./rand";

const BAY = 3.8; // width of one room/bay
export const DEFAULT_DEPTH = 6.2;
const DEFAULT_HEIGHT = 3.2;
const T = 0.2; // wall thickness
const COL = 0.34; // column size
const DOOR_W = 1.7; // door opening width

export type RoofStyle = "flat" | "hip";

/** Width of one bay — exported so interior furnishing can address rooms. */
export const BUILDING_BAY = BAY;
/** Local x of the door centre for a `rooms`-wide building (the middle bay). */
export function buildingDoorX(rooms: 1 | 2 | 3 | 4): number {
  return (-rooms * BAY) / 2 + BAY * (Math.floor(rooms / 2) + 0.5);
}
/** Local x of bay `i`'s centre for a `rooms`-wide building. */
export function buildingBayX(rooms: 1 | 2 | 3 | 4, i: number): number {
  return (-rooms * BAY) / 2 + BAY * (i + 0.5);
}

/** Wall collider boxes for a `rooms`-wide building, in LOCAL space (half-extents + centre). Back +
 *  two sides + the two front segments beside the door — so you collide with the walls but can walk in
 *  through the door. Used by StreetColliders (visuals live outside <Physics>). Pass the SAME
 *  height/depth as the visual Building. */
export function buildingWallColliders(
  rooms: 1 | 2 | 3 | 4,
  depth: number = DEFAULT_DEPTH,
  height: number = DEFAULT_HEIGHT,
): { half: [number, number, number]; pos: [number, number, number] }[] {
  const W = rooms * BAY;
  const doorX = buildingDoorX(rooms);
  const gapL = doorX - DOOR_W / 2;
  const gapR = doorX + DOOR_W / 2;
  const hy = height / 2;
  const hd = depth / 2;
  const out: { half: [number, number, number]; pos: [number, number, number] }[] = [
    { half: [W / 2, hy, T / 2], pos: [0, hy, -hd] }, // back
    { half: [T / 2, hy, hd], pos: [-W / 2, hy, 0] }, // left side
    { half: [T / 2, hy, hd], pos: [W / 2, hy, 0] }, // right side
  ];
  if (gapL > -W / 2) {
    out.push({ half: [(gapL + W / 2) / 2, hy, T / 2], pos: [(-W / 2 + gapL) / 2, hy, hd] });
  }
  if (W / 2 > gapR) {
    out.push({ half: [(W / 2 - gapR) / 2, hy, T / 2], pos: [(gapR + W / 2) / 2, hy, hd] });
  }
  return out;
}

/** Procedural timber-plank texture (horizontal boards + grain). Cached module-wide. */
let woodCache: THREE.CanvasTexture | undefined;
function woodTexture(): THREE.CanvasTexture {
  if (woodCache) return woodCache;
  const S = 256;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const x = c.getContext("2d");
  const t = new THREE.CanvasTexture(c);
  if (x) {
    const rnd = mulberry32(101);
    x.fillStyle = "#ffffff";
    x.fillRect(0, 0, S, S);
    const planks = 7;
    const ph = S / planks;
    for (let i = 0; i < planks; i++) {
      const shade = 0.82 + rnd() * 0.18;
      x.fillStyle = `rgb(${Math.round(255 * shade)},${Math.round(240 * shade)},${Math.round(220 * shade)})`;
      x.fillRect(0, i * ph, S, ph - 1);
      x.strokeStyle = "rgba(70,45,25,0.5)"; // seam between boards
      x.lineWidth = 2;
      x.beginPath();
      x.moveTo(0, i * ph + ph - 1);
      x.lineTo(S, i * ph + ph - 1);
      x.stroke();
      for (let g = 0; g < 4; g++) {
        // grain streaks
        x.strokeStyle = "rgba(90,60,35,0.18)";
        x.lineWidth = 1;
        const gy = i * ph + 4 + rnd() * (ph - 8);
        x.beginPath();
        x.moveTo(0, gy);
        x.bezierCurveTo(S / 3, gy + (rnd() - 0.5) * 6, (2 * S) / 3, gy + (rnd() - 0.5) * 6, S, gy);
        x.stroke();
      }
    }
  }
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1.6, 1.4);
  woodCache = t;
  return t;
}

/** Procedural stone-block texture (mortared blocks). Cached module-wide. */
let stoneCache: THREE.CanvasTexture | undefined;
function stoneTexture(): THREE.CanvasTexture {
  if (stoneCache) return stoneCache;
  const S = 256;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const x = c.getContext("2d");
  const t = new THREE.CanvasTexture(c);
  if (x) {
    const rnd = mulberry32(202);
    x.fillStyle = "#5a5348"; // mortar
    x.fillRect(0, 0, S, S);
    const rows = 6;
    const bh = S / rows;
    for (let r = 0; r < rows; r++) {
      const off = r % 2 === 0 ? 0 : S / 8;
      for (let bx = -1; bx < 5; bx++) {
        const shade = 0.82 + rnd() * 0.2;
        x.fillStyle = `rgb(${Math.round(212 * shade)},${Math.round(200 * shade)},${Math.round(175 * shade)})`;
        x.fillRect(bx * (S / 4) + off + 2, r * bh + 2, S / 4 - 4, bh - 4);
      }
    }
  }
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1.5, 2.4);
  stoneCache = t;
  return t;
}

// Hip-roof geometry: a 4-sided pyramid with the 45° yaw BAKED IN, so its square base is
// axis-aligned BEFORE the mesh scale (three.js applies scale before rotation — rotating the mesh
// instead would shear the scaled base into an oversized diamond hanging over the street).
// Half-extent along each axis is 1/√2, so scale by (hx·√2, rise, hz·√2).
const HIP_GEO = (() => {
  const g = new THREE.ConeGeometry(1, 1, 4);
  g.rotateY(Math.PI / 4);
  return g;
})();

// One shared translucent glass material for every pane (transparent objects are sorted per
// material-mesh — keep it cheap and consistent). A faint warm emissive keeps a candle-lit hint at
// dusk without the old lightbox look; depthWrite off avoids sorting artifacts against the frames.
let glassCache: THREE.MeshStandardMaterial | undefined;
function glassMaterial(): THREE.MeshStandardMaterial {
  if (!glassCache) {
    glassCache = new THREE.MeshStandardMaterial({
      color: "#e8d9b8",
      emissive: "#ffca70",
      emissiveIntensity: 0.28,
      roughness: 0.18,
      metalness: 0,
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }
  return glassCache;
}

/** A framed window with a translucent glass pane — you can peer into the furnished room; a faint
 *  warm sheen keeps the dusk mood. `axis` = which wall it sits in. */
function Window({
  position,
  axis,
}: {
  position: [number, number, number];
  axis: "x" | "z";
}) {
  const w = 1.3;
  const h = 1.3;
  const fr = 0.12;
  const rot = axis === "x" ? Math.PI / 2 : 0;
  return (
    <group position={position} rotation-y={rot}>
      {/* frame */}
      {[
        [0, h / 2 + fr / 2, w + fr * 2, fr],
        [0, -h / 2 - fr / 2, w + fr * 2, fr],
        [-w / 2 - fr / 2, 0, fr, h],
        [w / 2 + fr / 2, 0, fr, h],
      ].map(([px, py, sw, sh]) => (
        <mesh key={`${px},${py}`} position={[px as number, py as number, 0]}>
          <boxGeometry args={[sw as number, sh as number, 0.16]} />
          <meshStandardMaterial color="#5a4632" roughness={0.9} />
        </mesh>
      ))}
      {/* mullion */}
      <mesh position={[0, 0, 0.01]}>
        <boxGeometry args={[0.06, h, 0.12]} />
        <meshStandardMaterial color="#5a4632" roughness={0.9} />
      </mesh>
      {/* translucent pane */}
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[w, h]} />
        <primitive attach="material" object={glassMaterial()} />
      </mesh>
    </group>
  );
}

/** A stone column (slightly proud of the wall) with a simple capital + base. */
function Column({ position, height }: { position: [number, number, number]; height: number }) {
  const stone = stoneTexture();
  return (
    <group position={position}>
      <mesh castShadow position={[0, height / 2, 0]}>
        <boxGeometry args={[COL, height, COL]} />
        <meshStandardMaterial color="#d8c9ad" map={stone} roughness={0.9} />
      </mesh>
      {[0.12, height - 0.12].map((y) => (
        <mesh castShadow key={y} position={[0, y, 0]}>
          <boxGeometry args={[COL + 0.14, 0.24, COL + 0.14]} />
          <meshStandardMaterial color="#c9b892" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/** A single-storey walkable building, `rooms` bays wide, facing +z (rotate to taste). Height,
 *  depth, roof style and porch vary per instance — pass the same height/depth to
 *  `buildingWallColliders` so collision follows. */
export function Building({
  position,
  rotationY = 0,
  rooms = 1,
  wall = "#cbb083",
  roof = "#7a4a2c",
  height = DEFAULT_HEIGHT,
  depth = DEFAULT_DEPTH,
  roofStyle = "flat",
  porch = false,
}: {
  position: [number, number, number];
  rotationY?: number;
  rooms?: 1 | 2 | 3 | 4;
  wall?: string;
  roof?: string;
  height?: number;
  depth?: number;
  roofStyle?: RoofStyle;
  porch?: boolean;
}) {
  const W = rooms * BAY;
  const H = height;
  const D = depth;
  const doorBay = Math.floor(rooms / 2);
  const bayX = (i: number) => -W / 2 + BAY * (i + 0.5);
  const doorX = bayX(doorBay);
  const doorW = DOOR_W;
  const seg = (BAY - doorW) / 2;
  const wood = woodTexture();
  const rise = 1.3 + W * 0.09; // hip-roof peak height above the walls

  return (
    <group position={position} rotation-y={rotationY}>
      {/* floor */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[W + 0.4, 0.1, D + 0.4]} />
        <meshStandardMaterial color="#8a6a44" roughness={0.95} />
      </mesh>

      {/* back wall + side walls */}
      <mesh castShadow position={[0, H / 2, -D / 2]} receiveShadow>
        <boxGeometry args={[W, H, T]} />
        <meshStandardMaterial color={wall} roughness={0.92} />
      </mesh>
      {[-W / 2, W / 2].map((sx) => (
        <mesh castShadow key={sx} position={[sx, H / 2, 0]} receiveShadow>
          <boxGeometry args={[T, H, D]} />
          <meshStandardMaterial color={wall} map={wood} roughness={0.92} />
        </mesh>
      ))}

      {/* front wall — per bay: a door in the middle bay, a window elsewhere */}
      {Array.from({ length: rooms }, (_, i) => {
        const cx = bayX(i);
        if (i === doorBay) {
          return (
            <group key={`front-${cx}`}>
              {[-(doorW / 2 + seg / 2), doorW / 2 + seg / 2].map((sx) => (
                <mesh castShadow key={sx} position={[cx + sx, H / 2, D / 2]} receiveShadow>
                  <boxGeometry args={[seg, H, T]} />
                  <meshStandardMaterial color={wall} map={wood} roughness={0.92} />
                </mesh>
              ))}
              <mesh castShadow position={[cx, H - 0.4, D / 2]}>
                <boxGeometry args={[doorW + 0.3, 0.8, T + 0.06]} />
                <meshStandardMaterial color={wall} map={wood} roughness={0.92} />
              </mesh>
              {/* door frame posts */}
              {[-doorW / 2, doorW / 2].map((sx) => (
                <mesh castShadow key={`fr${sx}`} position={[cx + sx, (H - 0.4) / 2, D / 2 + 0.02]}>
                  <boxGeometry args={[0.14, H - 0.4, T + 0.1]} />
                  <meshStandardMaterial color="#5a4632" roughness={0.9} />
                </mesh>
              ))}
            </group>
          );
        }
        return (
          <group key={`front-${cx}`}>
            <mesh castShadow position={[cx, H / 2, D / 2]} receiveShadow>
              <boxGeometry args={[BAY, H, T]} />
              <meshStandardMaterial color={wall} map={wood} roughness={0.92} />
            </mesh>
            {/* proud of the wall face (T/2), so the pane is never buried in the wall box */}
            <Window axis="z" position={[cx, 1.55, D / 2 + T / 2 + 0.02]} />
          </group>
        );
      })}

      {/* back windows (one per bay) */}
      {Array.from({ length: rooms }, (_, i) => (
        <Window
          axis="z"
          key={`back-${bayX(i)}`}
          position={[bayX(i), 1.55, -D / 2 - T / 2 - 0.02]}
        />
      ))}
      {/* side windows */}
      {[-W / 2 - T / 2 - 0.02, W / 2 + T / 2 + 0.02].map((sx) => (
        <Window axis="x" key={sx} position={[sx, 1.55, 0]} />
      ))}

      {/* columns at every bay boundary, front + back */}
      {Array.from({ length: rooms + 1 }, (_, i) => {
        const cx = -W / 2 + BAY * i;
        return (
          <group key={`col-${cx}`}>
            <Column height={H} position={[cx, 0, D / 2]} />
            <Column height={H} position={[cx, 0, -D / 2]} />
          </group>
        );
      })}

      {/* roof: a trim beam + either the flat overhanging slab or a hipped (pyramid) roof */}
      <mesh position={[0, H, 0]}>
        <boxGeometry args={[W + 0.5, 0.18, D + 0.5]} />
        <meshStandardMaterial color="#9c8a63" roughness={0.9} />
      </mesh>
      {roofStyle === "flat" ? (
        <mesh castShadow position={[0, H + 0.2, 0]}>
          <boxGeometry args={[W + 1.0, 0.36, D + 1.0]} />
          <meshStandardMaterial color={roof} roughness={0.9} />
        </mesh>
      ) : (
        <mesh
          castShadow
          geometry={HIP_GEO}
          position={[0, H + rise / 2 + 0.08, 0]}
          scale={[(W / 2 + 0.9) * Math.SQRT2, rise, (D / 2 + 0.9) * Math.SQRT2]}
        >
          <meshStandardMaterial color={roof} flatShading roughness={0.9} />
        </mesh>
      )}

      {/* porch: a small canopy on two posts over the door */}
      {porch ? (
        <group>
          <mesh castShadow position={[doorX, H - 0.5, D / 2 + 0.75]}>
            <boxGeometry args={[doorW + 1.6, 0.14, 1.5]} />
            <meshStandardMaterial color="#6b4a2e" roughness={0.95} />
          </mesh>
          {[-(doorW / 2 + 0.55), doorW / 2 + 0.55].map((px) => (
            <mesh castShadow key={px} position={[doorX + px, (H - 0.57) / 2, D / 2 + 1.35]}>
              <boxGeometry args={[0.12, H - 0.57, 0.12]} />
              <meshStandardMaterial color="#6b4a2e" roughness={0.95} />
            </mesh>
          ))}
        </group>
      ) : null}
    </group>
  );
}
