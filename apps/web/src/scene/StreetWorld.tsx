/**
 * Werkstattgasse — the Palace of Culture workshop street. A walkable demo world (PC): a cobbled lane
 * running out from the palace gate, lined with the tall Gründerzeit/cypherpunk facades (LocktardStreet)
 * and walk-in shops (StreetShops), with open-air WORKSHOP STALLS along the centre — the crafts that feed
 * the economy (sawmill, kiln, weaver, forge, lantern-maker, print) — plus market props and warm evening
 * lantern light. Everything is primitives + procedural canvas textures, so it loads offline with no asset
 * fetch. Art is static, state is data: nothing here reads or writes game state; it is pure scenery.
 */

import { useGLTF } from "@react-three/drei";
import { Component, type ReactNode, Suspense, useMemo } from "react";
import * as THREE from "three";
import { KitHouse } from "./KitBuilding";
import { LocktardStreet } from "./LocktardStreet";
import { StreetShops } from "./StreetShops";

/** Keeps a failed asset fetch (404/renamed GLB) from white-screening the whole engine — the street
 *  just renders without that prop. Suspense does not catch fetch errors, so we need this boundary. */
class PropBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

export const STREET_SPAWN: [number, number, number] = [0, 3, 30];
/** Half-extents + centre of the flat walk collider under the whole lane (z runs 0→256). */
export const STREET_GROUND: {
  half: [number, number, number];
  center: [number, number, number];
} = { half: [70, 5, 150], center: [0, -5, 132] };

/** Lighten (amt>0) / darken (amt<0) a #rrggbb colour → rgb() string. */
function shade(hex: string, amt: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  return `rgb(${clamp((n >> 16) & 255)},${clamp((n >> 8) & 255)},${clamp(n & 255)})`;
}

/** Repeating cobblestone texture: warm-grey stones on dark grout, a lighter drainage lane down the middle. */
function cobbleTexture(): THREE.CanvasTexture {
  const S = 256;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const x = c.getContext("2d");
  const fallback = new THREE.CanvasTexture(c);
  if (!x) return fallback;
  x.fillStyle = "#4a4640";
  x.fillRect(0, 0, S, S);
  const tones = ["#8f887c", "#9c9587", "#847d72", "#a29a8b", "#79736a"];
  const r = 15;
  for (let gy = 0; gy < S / (r * 2) + 1; gy++) {
    for (let gx = 0; gx < S / (r * 2) + 1; gx++) {
      const off = gy % 2 === 0 ? 0 : r;
      const cx = gx * r * 2 + off;
      const cy = gy * r * 2;
      x.fillStyle = tones[(gx * 7 + gy * 13) % tones.length] ?? "#8f887c";
      x.beginPath();
      x.ellipse(cx, cy, r - 2, r - 2, 0, 0, Math.PI * 2);
      x.fill();
    }
  }
  // centre lane strip (lighter, worn)
  x.fillStyle = "rgba(210,198,170,0.16)";
  x.fillRect(S * 0.4, 0, S * 0.2, S);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(14, 46);
  t.anisotropy = 4;
  return t;
}

/** A glowing sign board with the workshop name burned into it (dark board + emissive neon text). */
function signTexture(
  label: string,
  neon: string,
): { map: THREE.CanvasTexture; emissive: THREE.CanvasTexture } {
  const W = 256;
  const H = 64;
  const mk = () => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    return [c, c.getContext("2d")] as const;
  };
  const [cc, x] = mk();
  const [ec, e] = mk();
  const tex = (c: HTMLCanvasElement) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  if (!x || !e) return { map: tex(cc), emissive: tex(ec) };
  x.fillStyle = "#141118";
  x.fillRect(0, 0, W, H);
  x.strokeStyle = neon;
  x.lineWidth = 4;
  x.strokeRect(6, 6, W - 12, H - 12);
  x.font = "bold 34px Georgia, serif";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillStyle = neon;
  x.fillText(label, W / 2, H / 2 + 2);
  // emissive: black board, glowing frame + text only
  e.fillStyle = "#000000";
  e.fillRect(0, 0, W, H);
  e.strokeStyle = neon;
  e.lineWidth = 4;
  e.strokeRect(6, 6, W - 12, H - 12);
  e.font = "bold 34px Georgia, serif";
  e.textAlign = "center";
  e.textBaseline = "middle";
  e.fillStyle = neon;
  e.fillText(label, W / 2, H / 2 + 2);
  return { map: tex(cc), emissive: tex(ec) };
}

type Craft = {
  label: string;
  neon: string;
  cloth: string;
  /** the little craft prop on the counter */
  prop: "boards" | "pots" | "cloth" | "anvil" | "lanterns" | "press";
};

/** The crafts that feed the economy, as open-air stalls down the lane. */
const WORKSHOPS: { craft: Craft; pos: [number, number, number]; rotY: number }[] = [
  {
    craft: { label: "SÄGEREI", neon: "#ffb454", cloth: "#c2703a", prop: "boards" },
    pos: [-13, 0, 42],
    rotY: Math.PI / 2,
  },
  {
    craft: { label: "TÖPFEREI", neon: "#ff6f91", cloth: "#8a5a7a", prop: "pots" },
    pos: [13, 0, 84],
    rotY: -Math.PI / 2,
  },
  {
    craft: { label: "WEBEREI", neon: "#7cff9e", cloth: "#3f7a63", prop: "cloth" },
    pos: [-13, 0, 110],
    rotY: Math.PI / 2,
  },
  {
    craft: { label: "SCHMIEDE", neon: "#ff8a3d", cloth: "#5a4a3a", prop: "anvil" },
    pos: [13, 0, 134],
    rotY: -Math.PI / 2,
  },
  {
    craft: { label: "LATERNEN", neon: "#39d6ff", cloth: "#2f5a6a", prop: "lanterns" },
    pos: [-13, 0, 168],
    rotY: Math.PI / 2,
  },
  {
    craft: { label: "DRUCKEREI", neon: "#c9a0ff", cloth: "#5a4a7a", prop: "press" },
    pos: [13, 0, 196],
    rotY: -Math.PI / 2,
  },
];

/** The little scene on the workshop counter that tells you which craft it is. */
function CounterProp({ kind }: { kind: Craft["prop"] }) {
  if (kind === "boards") {
    return (
      <group position={[0, 1.05, 0]}>
        {[0, 0.14, 0.28].map((y, i) => (
          <mesh castShadow key={y} position={[0, y, 0]} rotation-y={i * 0.08}>
            <boxGeometry args={[1.4, 0.1, 0.5]} />
            <meshStandardMaterial color={i % 2 ? "#c8a06a" : "#b58a52"} roughness={0.85} />
          </mesh>
        ))}
      </group>
    );
  }
  if (kind === "pots") {
    return (
      <group position={[0, 1.02, 0]}>
        {[-0.5, 0, 0.5].map((px, i) => (
          <mesh castShadow key={px} position={[px, 0.18, 0]}>
            <cylinderGeometry args={[0.18, 0.24, 0.36, 12]} />
            <meshStandardMaterial color={i === 1 ? "#c96f4a" : "#a9583a"} roughness={0.7} />
          </mesh>
        ))}
      </group>
    );
  }
  if (kind === "cloth") {
    return (
      <group position={[0, 1.02, 0]}>
        {[-0.45, 0, 0.45].map((px, i) => (
          <mesh castShadow key={px} position={[px, 0.25, 0]} rotation-z={0.08}>
            <cylinderGeometry args={[0.16, 0.16, 0.5, 10]} />
            <meshStandardMaterial
              color={["#c94f7c", "#4f8fc9", "#5ec97c"][i] ?? "#c94f7c"}
              roughness={0.8}
            />
          </mesh>
        ))}
      </group>
    );
  }
  if (kind === "anvil") {
    return (
      <group position={[0, 1.02, 0]}>
        <mesh castShadow position={[0, 0.12, 0]}>
          <boxGeometry args={[0.7, 0.24, 0.34]} />
          <meshStandardMaterial color="#3a3f47" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh castShadow position={[0.45, 0.28, 0]}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshStandardMaterial color="#ff8a3d" emissive="#ff5a1d" emissiveIntensity={1.6} />
        </mesh>
      </group>
    );
  }
  if (kind === "lanterns") {
    return (
      <group position={[0, 1.1, 0]}>
        {[-0.5, 0, 0.5].map((px) => (
          <mesh castShadow key={px} position={[px, 0.12, 0]}>
            <boxGeometry args={[0.26, 0.34, 0.26]} />
            <meshStandardMaterial color="#39d6ff" emissive="#39d6ff" emissiveIntensity={1.3} />
          </mesh>
        ))}
      </group>
    );
  }
  // press
  return (
    <group position={[0, 1.02, 0]}>
      <mesh castShadow position={[0, 0.2, 0]}>
        <boxGeometry args={[0.6, 0.4, 0.5]} />
        <meshStandardMaterial color="#3f3550" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh castShadow position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.4, 8]} />
        <meshStandardMaterial color="#c9a0ff" emissive="#c9a0ff" emissiveIntensity={1} />
      </mesh>
    </group>
  );
}

/** One open-air workshop stall: platform, two posts, a striped awning, counter, glowing sign + craft prop. */
function WorkshopStall({
  craft,
  pos,
  rotY,
}: { craft: Craft; pos: [number, number, number]; rotY: number }) {
  const sign = useMemo(() => signTexture(craft.label, craft.neon), [craft.label, craft.neon]);
  const W = 4.2;
  const D = 3;
  const H = 2.6;
  return (
    <group position={pos} rotation-y={rotY}>
      {/* plinth */}
      <mesh castShadow position={[0, 0.15, 0]} receiveShadow>
        <boxGeometry args={[W + 0.4, 0.3, D + 0.4]} />
        <meshStandardMaterial color="#6b6153" roughness={0.95} />
      </mesh>
      {/* counter */}
      <mesh castShadow position={[0, 0.75, D / 2 - 0.4]} receiveShadow>
        <boxGeometry args={[W, 0.9, 0.5]} />
        <meshStandardMaterial color="#7a5a3a" roughness={0.85} />
      </mesh>
      {/* posts */}
      {[-W / 2 + 0.1, W / 2 - 0.1].map((px) => (
        <mesh castShadow key={px} position={[px, H / 2, -D / 2 + 0.2]}>
          <boxGeometry args={[0.16, H, 0.16]} />
          <meshStandardMaterial color="#4a3f30" roughness={0.8} />
        </mesh>
      ))}
      {[-W / 2 + 0.1, W / 2 - 0.1].map((px) => (
        <mesh castShadow key={`f${px}`} position={[px, H - 0.4, D / 2 - 0.1]}>
          <boxGeometry args={[0.16, H - 0.8, 0.16]} />
          <meshStandardMaterial color="#4a3f30" roughness={0.8} />
        </mesh>
      ))}
      {/* striped awning (a slab tilted forward over the counter) */}
      <mesh castShadow position={[0, H - 0.1, 0.35]} rotation-x={-0.32}>
        <boxGeometry args={[W + 0.5, 0.1, D + 0.4]} />
        <meshStandardMaterial color={craft.cloth} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, H - 0.02, 0.98]} rotation-x={-0.32}>
        <boxGeometry args={[W + 0.5, 0.06, 0.5]} />
        <meshStandardMaterial color={shade(craft.cloth, 0.18)} roughness={0.9} />
      </mesh>
      {/* back board with the glowing sign */}
      <mesh castShadow position={[0, 1.7, -D / 2 + 0.25]}>
        <boxGeometry args={[W - 0.3, 1, 0.1]} />
        <meshStandardMaterial color="#20242c" roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.7, -D / 2 + 0.31]}>
        <planeGeometry args={[W - 0.6, 0.75]} />
        <meshStandardMaterial
          emissive="#ffffff"
          emissiveIntensity={1}
          emissiveMap={sign.emissive}
          map={sign.map}
          toneMapped={false}
        />
      </mesh>
      <CounterProp kind={craft.prop} />
    </group>
  );
}

/** A cast-iron lamppost with a warm glowing head (emissive only — real lights are rationed for perf). */
function LampPost({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 2.1, 0]}>
        <cylinderGeometry args={[0.09, 0.12, 4.2, 8]} />
        <meshStandardMaterial color="#2a2e34" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[0, 4.3, 0]}>
        <boxGeometry args={[0.4, 0.5, 0.4]} />
        <meshStandardMaterial
          color="#ffdca0"
          emissive="#ffca70"
          emissiveIntensity={1.7}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/** A catenary of warm bulbs strung across the lane between two lampposts. */
function StringLights({ z }: { z: number }) {
  const bulbs = useMemo(() => {
    const out: [number, number, number][] = [];
    const span = 26;
    const n = 13;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = -span / 2 + t * span;
      const sag = Math.sin(t * Math.PI) * 1.6;
      out.push([x, 5.6 - sag, 0]);
    }
    return out;
  }, []);
  return (
    <group position={[0, 0, z]}>
      {bulbs.map((b, i) => (
        <mesh key={b[0]} position={b}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshStandardMaterial
            color={i % 2 ? "#ffd27a" : "#ffe6ad"}
            emissive={i % 2 ? "#ffb347" : "#ffd27a"}
            emissiveIntensity={1.8}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/** The gate arch at the palace end that frames the street vista. */
function GateArch() {
  const H = 7;
  const span = 18;
  return (
    <group position={[0, 0, 14]}>
      {[-span / 2, span / 2].map((px) => (
        <mesh castShadow key={px} position={[px, H / 2, 0]} receiveShadow>
          <boxGeometry args={[2, H, 2]} />
          <meshStandardMaterial color="#d8cdb4" roughness={0.9} />
        </mesh>
      ))}
      <mesh castShadow position={[0, H + 0.6, 0]}>
        <boxGeometry args={[span + 3, 1.6, 2.4]} />
        <meshStandardMaterial color="#cfc3a6" roughness={0.9} />
      </mesh>
      <mesh position={[0, H + 0.6, 1.25]}>
        <boxGeometry args={[span - 2, 0.7, 0.1]} />
        <meshStandardMaterial
          color="#ffca70"
          emissive="#ffb347"
          emissiveIntensity={1.2}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

// --- Real CC0 props (Quaternius / Kenney via Poly Pizza — see public/props/CREDITS.md) ---

const propUrl = (name: string) => `/props/${name}.glb`;

/** A CC0 GLB prop: cloned (so one GLB serves many), shadowed, seated on y=0, uniform-scaled to fit. */
function Prop({
  name,
  position,
  rotationY = 0,
  fitHeight,
}: {
  name: string;
  position: [number, number, number];
  rotationY?: number;
  /** Target height in metres; uniform scale preserves the model's proportions. */
  fitHeight: number;
}) {
  const { scene } = useGLTF(propUrl(name));
  const { object, scale, posY } = useMemo(() => {
    const o = scene.clone(true);
    o.traverse((n) => {
      const mesh = n as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    const box = new THREE.Box3().setFromObject(o);
    const h = box.max.y - box.min.y || 1;
    const s = fitHeight / h;
    return { object: o, scale: s, posY: -box.min.y * s };
  }, [scene, fitHeight]);
  return (
    <group position={position} rotation-y={rotationY}>
      <primitive object={object} position={[0, posY, 0]} scale={scale} />
    </group>
  );
}

type PropSpec = { name: string; pos: [number, number, number]; fit: number; rotY?: number };

/** Themed clutter beside each workshop + general street furniture. Placed off the walk lane. */
const PROPS: PropSpec[] = [
  // Sägerei (z42, left) — logs + barrels
  { name: "log", pos: [-16.5, 0, 39], fit: 0.6, rotY: 0.5 },
  { name: "log", pos: [-16, 0, 40], fit: 0.6, rotY: 1.2 },
  { name: "barrel-1", pos: [-17, 0, 45], fit: 1.1 },
  { name: "crate-1", pos: [-10, 0, 47], fit: 0.9, rotY: 0.4 },
  // Töpferei (z84, right) — vases + crates
  { name: "vase", pos: [16.5, 0, 81], fit: 0.5 },
  { name: "vase", pos: [17, 0, 82], fit: 0.42, rotY: 0.8 },
  { name: "box", pos: [16.5, 0, 87], fit: 0.9 },
  { name: "bucket", pos: [10, 0, 86], fit: 0.5 },
  // Weberei (z110, left) — sacks + bench
  { name: "sack", pos: [-16.5, 0, 107], fit: 0.6 },
  { name: "sack", pos: [-16, 0, 108.5], fit: 0.55, rotY: 0.6 },
  { name: "bench", pos: [-9, 0, 113], fit: 0.85, rotY: Math.PI / 2 },
  // Schmiede (z134, right) — anvil + barrels + bucket + cart
  { name: "anvil", pos: [16, 0, 128], fit: 0.9, rotY: -0.4 },
  { name: "barrel-2", pos: [16.5, 0, 131], fit: 1.05 },
  { name: "bucket", pos: [16, 0, 137], fit: 0.5 },
  { name: "cart", pos: [12, 0, 140], fit: 1.5, rotY: -0.7 },
  // Laternen (z168, left) — crates + a torch cluster
  { name: "crate-2", pos: [-16.5, 0, 165], fit: 0.9 },
  { name: "lantern", pos: [-15.5, 0, 170], fit: 1.3 },
  // Druckerei (z196, right) — stacked boxes
  { name: "crate-1", pos: [16.5, 0, 193], fit: 0.9 },
  { name: "box", pos: [16.6, 0, 199], fit: 0.9, rotY: 0.5 },
  // general street furniture
  { name: "well", pos: [8, 0, 66], fit: 2.4 },
  { name: "bench", pos: [9, 0, 104], fit: 0.85, rotY: -Math.PI / 2 },
  { name: "bench", pos: [-9, 0, 150], fit: 0.85, rotY: Math.PI / 2 },
  { name: "cart", pos: [-12, 0, 182], fit: 1.5, rotY: 0.9 },
  { name: "stall", pos: [11, 0, 160], fit: 2.6, rotY: -Math.PI / 2 },
  { name: "plant-1", pos: [-6.5, 0, 58], fit: 0.8 },
  { name: "plant-2", pos: [6.5, 0, 76], fit: 0.7 },
  { name: "plant-1", pos: [-6.5, 0, 124], fit: 0.8 },
  { name: "plant-2", pos: [6.5, 0, 178], fit: 0.7 },
  // trees against the facades + banners for colour
  { name: "tree", pos: [-20, 0, 54], fit: 6.5 },
  { name: "tree", pos: [20, 0, 100], fit: 6 },
  { name: "tree", pos: [-20, 0, 146], fit: 6.5 },
  { name: "tree", pos: [20, 0, 200], fit: 6 },
  { name: "flag", pos: [-6, 0, 20], fit: 3.4 },
  { name: "flag", pos: [6, 0, 20], fit: 3.4, rotY: Math.PI },
  // café seating outside the hero shop (corner-store, ~z72 left)
  { name: "table-a", pos: [-6, 0, 68], fit: 0.78 },
  { name: "chair-a", pos: [-6, 0, 66.4], fit: 0.95 },
  { name: "chair-b", pos: [-6, 0, 69.6], fit: 0.95, rotY: Math.PI },
  { name: "lamp-stand", pos: [-8.5, 0, 70], fit: 1.9 },
  { name: "table-round", pos: [-6, 0, 96], fit: 0.75 },
  { name: "chair-a", pos: [-7.4, 0, 96], fit: 0.95, rotY: Math.PI / 2 },
  // a print bench outside the Druckerei (z196 right)
  { name: "desk", pos: [10, 0, 202], fit: 0.92, rotY: -Math.PI / 2 },
  { name: "chair-office", pos: [8.5, 0, 202], fit: 1.15, rotY: Math.PI / 2 },
  { name: "lamp-table", pos: [10.4, 0, 201], fit: 0.42 },
  // workshop tools leaning at the relevant stalls
  { name: "tool-saw", pos: [-15, 0, 44], fit: 0.8, rotY: 0.6 },
  { name: "tool-axe", pos: [-11, 0, 45], fit: 0.9 },
  { name: "tool-hammer", pos: [15, 0, 130], fit: 1.1, rotY: -0.5 },
  { name: "tool-shovel", pos: [17, 0, 138], fit: 1.7, rotY: 0.3 },
  // floor lamps down the lane edges
  { name: "lamp-stand", pos: [-9, 0, 122], fit: 1.9 },
  { name: "lamp-stand", pos: [9, 0, 156], fit: 1.9 },
];

const PROP_NAMES = [...new Set(PROPS.map((p) => p.name))];

/** The whole workshop street: ground, facades, shops, workshop stalls, lamps, string lights, props. */
export function StreetWorld() {
  const cobble = useMemo(cobbleTexture, []);
  const lampZs = [26, 62, 98, 134, 170, 206];
  return (
    <group>
      {/* cobbled lane */}
      <mesh position={[0, 0.02, STREET_GROUND.center[2]]} receiveShadow rotation-x={-Math.PI / 2}>
        <planeGeometry args={[STREET_GROUND.half[0] * 2, STREET_GROUND.half[2] * 2]} />
        <meshStandardMaterial map={cobble} roughness={0.95} />
      </mesh>

      <GateArch />
      <LocktardStreet />
      <StreetShops />

      {WORKSHOPS.map((w) => (
        <WorkshopStall craft={w.craft} key={w.craft.label} pos={w.pos} rotY={w.rotY} />
      ))}

      {/* real CC0 lampposts + a warm glow head; a real pool of light at a few (rationed for the budget) */}
      {lampZs.map((z, i) => (
        <group key={z}>
          <Suspense fallback={<LampPost position={[-16, 0, z]} />}>
            <Prop fitHeight={4.6} name="lamppost" position={[-16, 0, z]} rotationY={Math.PI / 2} />
            <Prop fitHeight={4.6} name="lamppost" position={[16, 0, z]} rotationY={-Math.PI / 2} />
          </Suspense>
          <mesh position={[-15.6, 4.1, z]}>
            <sphereGeometry args={[0.16, 10, 10]} />
            <meshStandardMaterial
              color="#ffdca0"
              emissive="#ffca70"
              emissiveIntensity={1.8}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[15.6, 4.1, z]}>
            <sphereGeometry args={[0.16, 10, 10]} />
            <meshStandardMaterial
              color="#ffdca0"
              emissive="#ffca70"
              emissiveIntensity={1.8}
              toneMapped={false}
            />
          </mesh>
          {i % 2 === 0 ? (
            <pointLight
              color="#ffcf87"
              decay={2}
              distance={34}
              intensity={40}
              position={[0, 5, z]}
            />
          ) : null}
        </group>
      ))}

      {[44, 116, 188].map((z) => (
        <StringLights key={z} z={z} />
      ))}

      {/* downloaded CC0 props — themed clutter + street furniture (public/props) */}
      <PropBoundary>
        <Suspense fallback={null}>
          {PROPS.map((p) => (
            <Prop
              fitHeight={p.fit}
              key={`${p.name}@${p.pos.join(",")}`}
              name={p.name}
              position={p.pos}
              rotationY={p.rotY ?? 0}
            />
          ))}
        </Suspense>
      </PropBoundary>

      {/* a little residential quarter at the far end, assembled from the CC0 Kenney house kit */}
      <PropBoundary>
        <Suspense fallback={null}>
          <KitHouse cells={[3, 2]} position={[-12, 0, 232]} rotationY={0.2} />
          <KitHouse cells={[2, 2]} position={[11, 0, 236]} rotationY={-0.35} />
          <KitHouse cells={[2, 3]} position={[-2, 0, 256]} rotationY={Math.PI} />
        </Suspense>
      </PropBoundary>
    </group>
  );
}

for (const name of PROP_NAMES) useGLTF.preload(propUrl(name));
