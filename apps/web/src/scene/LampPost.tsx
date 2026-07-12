/**
 * LampPost — a cast-iron lamppost with a warm glowing head. Emissive only by default (real lights
 * are rationed for perf); callers add a pointLight beside the few hero lamps that carry the dusk.
 */

export function LampPost({ position }: { position: [number, number, number] }) {
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
