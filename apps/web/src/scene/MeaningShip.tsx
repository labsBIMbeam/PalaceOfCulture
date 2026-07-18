import { Html } from "@react-three/drei";
import { SHIP_MODULE_CAPACITY, SHIP_NAME } from "../meaningverse/model";
import { GrowableObject } from "./GrowableObject";

/** The public MoC assembly body. Visual growth is driven only by server-confirmed human modules. */
export function MeaningShip({ moduleCount }: { moduleCount: number }) {
  const visibleParts = Math.max(0, Math.min(SHIP_MODULE_CAPACITY, Math.floor(moduleCount)));
  return (
    <group position={[0, 2.1, 88]}>
      <mesh receiveShadow rotation-x={-Math.PI / 2}>
        <ringGeometry args={[7.5, 9.2, 48]} />
        <meshStandardMaterial color="#15182a" emissive="#1c3152" emissiveIntensity={0.7} />
      </mesh>
      <mesh position={[0, 0.08, 0]} rotation-x={-Math.PI / 2}>
        <torusGeometry args={[10.2, 0.08, 8, 64]} />
        <meshStandardMaterial color="#63d8ff" emissive="#2ab8ff" emissiveIntensity={2.4} />
      </mesh>
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
            {visibleParts}/{SHIP_MODULE_CAPACITY} human modules
          </span>
        </div>
      </Html>
    </group>
  );
}
