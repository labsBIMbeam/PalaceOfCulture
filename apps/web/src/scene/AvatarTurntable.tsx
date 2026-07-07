import type { AvatarConfig } from "@600b/shared";
import { Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { AvatarView } from "./AvatarView";

/** A slow turntable preview of an avatar — drag to spin, auto-rotates otherwise. Shared by the
 * character builder and the member-select screen. */
export function AvatarTurntable({ config }: { config: AvatarConfig }) {
  return (
    <Canvas camera={{ fov: 38, position: [0, 1.05, 3.1] }} dpr={[1, 2]} shadows>
      <color args={["#1b140d"]} attach="background" />
      <ambientLight intensity={0.45} />
      <hemisphereLight args={["#fff2d6", "#3a2a14", 0.4]} />
      <directionalLight castShadow color="#ffe6ad" intensity={1.7} position={[3, 6, 4]} />
      {/* Procedural studio IBL — soft reflections/ambient so the flat-albedo toon skins read richer.
          background={false} keeps the dark stage; no external HDRI fetch. */}
      <Environment background={false} resolution={128}>
        <Lightformer color="#fff2d6" intensity={2.2} position={[2.5, 3, 2.5]} scale={5} />
        <Lightformer color="#bcd4e6" intensity={1} position={[-3, 1.5, -2]} scale={5} />
        <Lightformer
          color="#ffffff"
          form="ring"
          intensity={1.4}
          position={[0, 4.5, 1.5]}
          scale={3}
        />
      </Environment>
      <AvatarView config={config} locomotion={false} />
      <mesh position={[0, 0.19, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.72, 40]} />
        <meshStandardMaterial color="#241710" roughness={1} />
      </mesh>
      <OrbitControls
        autoRotate
        autoRotateSpeed={1.4}
        enablePan={false}
        enableZoom={false}
        maxPolarAngle={Math.PI / 2.02}
        minPolarAngle={Math.PI / 3.4}
        target={[0, 1, 0]}
      />
    </Canvas>
  );
}
