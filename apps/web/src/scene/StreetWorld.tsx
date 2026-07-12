/**
 * Werkstattgasse — the Palace of Culture workshop street. A walkable demo world (PC): a cobbled lane
 * running out from the palace gate, lined with the tall Gründerzeit/cypherpunk facades (LocktardStreet)
 * and walk-in shops (StreetShops), with open-air WORKSHOP STALLS along the centre — the crafts that feed
 * the economy (sawmill, kiln, weaver, forge, lantern-maker, print) — plus market props and warm evening
 * lantern light. Everything is primitives + procedural canvas textures, so it loads offline with no asset
 * fetch. Art is static, state is data: nothing here reads or writes game state; it is pure scenery.
 */

import { useMemo } from "react";
import * as THREE from "three";
import { LocktardStreet } from "./LocktardStreet";
import { StreetShops } from "./StreetShops";

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

/** A planter with a little greenery, to soften the stone. */
function Planter({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.3, 0]} receiveShadow>
        <boxGeometry args={[1.2, 0.6, 1.2]} />
        <meshStandardMaterial color="#7a5a3a" roughness={0.9} />
      </mesh>
      {[
        [0, 0.9, 0],
        [0.3, 0.8, 0.2],
        [-0.3, 0.85, -0.2],
      ].map((p, i) => (
        <mesh castShadow key={p.join(",")} position={p as [number, number, number]}>
          <sphereGeometry args={[0.42, 8, 8]} />
          <meshStandardMaterial color={i === 0 ? "#5b8f4e" : "#6ea15c"} roughness={0.9} />
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

      {/* rows of lampposts + a real warm pool of light at a few (rationed to keep the frame budget) */}
      {lampZs.map((z, i) => (
        <group key={z}>
          <LampPost position={[-16, 0, z]} />
          <LampPost position={[16, 0, z]} />
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

      {[38, 74, 128, 164, 200].map((z, i) => (
        <Planter key={z} position={[i % 2 ? -18 : 18, 0, z]} />
      ))}
    </group>
  );
}
