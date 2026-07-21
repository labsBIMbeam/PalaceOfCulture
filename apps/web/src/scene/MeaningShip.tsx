import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  SHIP_MODULE_CAPACITY,
  SHIP_NAME,
  type ShipPlacementEpoch,
  type ShipPlacementEvent,
  diffShipPlacementEpoch,
  newestShipModule,
} from "../meaningverse/model";
import type { MultiplayerStatus, ShipModuleSnapshot } from "../net/multiplayer";
import { GrowableObject } from "./GrowableObject";
import { shipBerthLocalPosition, shipRoleColor } from "./shipBerths";
import { PLAZA_CENTRE, SHIP_RING_RADIUS } from "./streetLayout";

const PULSE_SECONDS = 2.6;
// Copper/amber = your own hands; cyan = a peer's — the same signal language as the HUD.
const PULSE_OWN = "#f7b04a";
const PULSE_PEER = "#5cd8ff";

/** One expanding floor ring + fading flare per confirmed placement; ends itself via onDone. */
function PlacementPulse({ own, onDone }: { own: boolean; onDone: () => void }) {
  const ring = useRef<THREE.Mesh>(null);
  const ringMat = useRef<THREE.MeshBasicMaterial>(null);
  const flare = useRef<THREE.PointLight>(null);
  const startedAt = useRef<number | null>(null);
  useFrame(({ clock }) => {
    if (startedAt.current === null) startedAt.current = clock.elapsedTime;
    const t = (clock.elapsedTime - startedAt.current) / PULSE_SECONDS;
    if (t >= 1) {
      onDone();
      return;
    }
    const eased = 1 - (1 - t) ** 3;
    ring.current?.scale.setScalar(1 + eased * 2.2);
    if (ringMat.current) ringMat.current.opacity = 0.85 * (1 - eased);
    if (flare.current) flare.current.intensity = 150 * (1 - eased);
  });
  const color = own ? PULSE_OWN : PULSE_PEER;
  return (
    <group>
      <mesh position={[0, 0.14, 0]} ref={ring} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[SHIP_RING_RADIUS - 0.6, SHIP_RING_RADIUS, 64]} />
        <meshBasicMaterial
          color={color}
          opacity={0.85}
          ref={ringMat}
          side={THREE.DoubleSide}
          toneMapped={false}
          transparent
        />
      </mesh>
      <pointLight color={color} distance={32} intensity={150} position={[0, 4, 0]} ref={flare} />
    </group>
  );
}

/** One berth light per confirmed module, role-coloured and slot-anchored on the glowing ring —
 *  a single instanced draw call for all 36 (mobile budget). */
function ShipBerthMarkers({ modules }: { modules: ShipModuleSnapshot[] }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const instanced = mesh.current;
    if (!instanced) return;
    const anchor = new THREE.Object3D();
    const tint = new THREE.Color();
    modules.forEach((module, index) => {
      const [x, y, z] = shipBerthLocalPosition(module.slot);
      anchor.position.set(x, y, z);
      anchor.updateMatrix();
      instanced.setMatrixAt(index, anchor.matrix);
      instanced.setColorAt(index, tint.set(shipRoleColor(module.role)));
    });
    instanced.instanceMatrix.needsUpdate = true;
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
  }, [modules]);
  return (
    <instancedMesh
      args={[undefined, undefined, SHIP_MODULE_CAPACITY]}
      count={Math.min(modules.length, SHIP_MODULE_CAPACITY)}
      frustumCulled={false}
      ref={mesh}
    >
      <octahedronGeometry args={[0.34]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

/** Copper beacon over the local player's own berth: their word, findable from across the plaza. */
function OwnBerthBeacon({ module }: { module: ShipModuleSnapshot }) {
  const [x, , z] = shipBerthLocalPosition(module.slot);
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 1.35, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 2.3, 6]} />
        <meshBasicMaterial color={PULSE_OWN} opacity={0.8} toneMapped={false} transparent />
      </mesh>
      <Html center position={[0, 3, 0]} transform>
        <div className="moc-berth-label" style={{ borderColor: shipRoleColor(module.role) }}>
          <strong>“{module.label}”</strong>
          <span>
            @{module.authorHandle} · berth #{module.slot}
          </span>
        </div>
      </Html>
    </group>
  );
}

/** The public MoC assembly body. Visual growth is driven only by server-confirmed session modules;
 *  each newly confirmed placement lands as a one-shot pulse (never on the initial room sync). */
export function MeaningShip({
  modules,
  localSessionId,
  status,
}: {
  modules: ShipModuleSnapshot[];
  localSessionId?: string;
  status: MultiplayerStatus;
}) {
  const visibleParts = Math.max(0, Math.min(SHIP_MODULE_CAPACITY, modules.length));
  const previous = useRef<ShipPlacementEpoch | null>(null);
  const [pulse, setPulse] = useState<ShipPlacementEvent | null>(null);
  useEffect(() => {
    const { baseline, events, reset } = diffShipPlacementEpoch(
      previous.current,
      modules,
      status,
      localSessionId,
    );
    previous.current = baseline;
    if (reset) setPulse(null);
    const latest = events[events.length - 1];
    if (latest) setPulse(latest);
  }, [modules, localSessionId, status]);
  const newest = newestShipModule(modules);
  const mine = localSessionId
    ? modules.find((module) => module.authorSessionId === localSessionId)
    : undefined;
  return (
    <group position={[PLAZA_CENTRE[0], 2.1, PLAZA_CENTRE[1]]}>
      <mesh receiveShadow rotation-x={-Math.PI / 2}>
        <ringGeometry args={[7.5, 9.2, 48]} />
        <meshStandardMaterial color="#15182a" emissive="#1c3152" emissiveIntensity={0.7} />
      </mesh>
      <mesh position={[0, 0.08, 0]} rotation-x={-Math.PI / 2}>
        <torusGeometry args={[SHIP_RING_RADIUS, 0.08, 8, 64]} />
        <meshStandardMaterial color="#63d8ff" emissive="#2ab8ff" emissiveIntensity={2.4} />
      </mesh>
      {pulse ? (
        <PlacementPulse
          key={pulse.module.id}
          onDone={() =>
            setPulse((current) => (current?.module.id === pulse.module.id ? null : current))
          }
          own={pulse.byLocalPlayer}
        />
      ) : null}
      <ShipBerthMarkers modules={modules} />
      {mine ? <OwnBerthBeacon module={mine} /> : null}
      <group position={[0, 1.2, 0]} rotation-y={Math.PI / 2}>
        <GrowableObject
          fitHeight={5.5}
          glbUrl="/growables/leviathan.glb"
          manifestUrl="/growables/leviathan.growth.json"
          progress={0}
          visibleParts={visibleParts}
        />
      </group>
      <pointLight color="#5cd8ff" distance={34} intensity={90} position={[0, 8, 0]} />
      <Html center position={[0, 12, 0]} transform>
        <div className="moc-ship-label">
          <strong>{SHIP_NAME}</strong>
          <span>
            {visibleParts}/{SHIP_MODULE_CAPACITY} session modules
          </span>
          {newest ? (
            <small className="moc-ship-latest">
              latest · #{newest.slot} “{newest.label}” · @{newest.authorHandle}
            </small>
          ) : null}
        </div>
      </Html>
    </group>
  );
}
