/**
 * Building — a single-storey WALKABLE building with real detail: corner + bay columns, framed windows
 * with warm glowing panes (they light up at dusk), a framed door opening you can walk through, and a
 * roof with an overhang. Sizes scale by room count (1–4 bays), always one storey. Primitives only.
 */

import * as THREE from "three";

const BAY = 3.8; // width of one room/bay
const D = 6.2; // depth
const H = 3.2; // wall height
const T = 0.2; // wall thickness
const COL = 0.34; // column size

/** A framed window with a warm emissive pane (the dusk glow). `axis` = which wall it sits in. */
function Window({
  position,
  axis,
  lit = "#ffcf87",
}: {
  position: [number, number, number];
  axis: "x" | "z";
  lit?: string;
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
      {/* glowing pane */}
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial
          color={lit}
          emissive={lit}
          emissiveIntensity={1.5}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/** A stone column (slightly proud of the wall) with a simple capital + base. */
function Column({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, H / 2, 0]}>
        <boxGeometry args={[COL, H, COL]} />
        <meshStandardMaterial color="#d8c9ad" roughness={0.9} />
      </mesh>
      {[0.12, H - 0.12].map((y) => (
        <mesh castShadow key={y} position={[0, y, 0]}>
          <boxGeometry args={[COL + 0.14, 0.24, COL + 0.14]} />
          <meshStandardMaterial color="#c9b892" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/** A single-storey walkable building, `rooms` bays wide, facing +z (rotate to taste). */
export function Building({
  position,
  rotationY = 0,
  rooms = 1,
  wall = "#cbb083",
  lit = "#ffcf87",
}: {
  position: [number, number, number];
  rotationY?: number;
  rooms?: 1 | 2 | 3 | 4;
  wall?: string;
  lit?: string;
}) {
  const W = rooms * BAY;
  const doorBay = Math.floor(rooms / 2);
  const bayX = (i: number) => -W / 2 + BAY * (i + 0.5);
  const doorW = 1.7;
  const seg = (BAY - doorW) / 2;

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
          <meshStandardMaterial color={wall} roughness={0.92} />
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
                  <meshStandardMaterial color={wall} roughness={0.92} />
                </mesh>
              ))}
              <mesh castShadow position={[cx, H - 0.4, D / 2]}>
                <boxGeometry args={[doorW + 0.3, 0.8, T + 0.06]} />
                <meshStandardMaterial color={wall} roughness={0.92} />
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
              <meshStandardMaterial color={wall} roughness={0.92} />
            </mesh>
            <Window axis="z" lit={lit} position={[cx, 1.55, D / 2 + 0.02]} />
          </group>
        );
      })}

      {/* back windows (one per bay) */}
      {Array.from({ length: rooms }, (_, i) => (
        <Window
          axis="z"
          key={`back-${bayX(i)}`}
          lit={lit}
          position={[bayX(i), 1.55, -D / 2 - 0.02]}
        />
      ))}
      {/* side windows */}
      {[-W / 2 - 0.02, W / 2 + 0.02].map((sx) => (
        <Window axis="x" key={sx} lit={lit} position={[sx, 1.55, 0]} />
      ))}

      {/* columns at every bay boundary, front + back */}
      {Array.from({ length: rooms + 1 }, (_, i) => {
        const cx = -W / 2 + BAY * i;
        return (
          <group key={`col-${cx}`}>
            <Column position={[cx, 0, D / 2]} />
            <Column position={[cx, 0, -D / 2]} />
          </group>
        );
      })}

      {/* roof: overhanging slab + a trim beam */}
      <mesh castShadow position={[0, H + 0.2, 0]}>
        <boxGeometry args={[W + 1.0, 0.36, D + 1.0]} />
        <meshStandardMaterial color="#7a4a2c" roughness={0.9} />
      </mesh>
      <mesh position={[0, H, 0]}>
        <boxGeometry args={[W + 0.5, 0.18, D + 0.5]} />
        <meshStandardMaterial color="#9c8a63" roughness={0.9} />
      </mesh>
    </group>
  );
}
