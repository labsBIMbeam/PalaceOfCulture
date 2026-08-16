/**
 * Palace of Culture teaser — unfinished landmark, not playable.
 * Visible from Locktard Street / plaza site; no door, no entry. Date remains TBA.
 */

import { Billboard, Text } from "@react-three/drei";
import { PLAZA_CENTRE } from "./Plaza";

/** Distant unfinished palace silhouette + "released soon" billboard. */
export function PalaceTeaser({
  position = [PLAZA_CENTRE[0], 0, PLAZA_CENTRE[1] + 2] as [number, number, number],
  scale = 0.55,
}: {
  position?: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      {/* rough stacked silhouette — unenterable landmark */}
      <mesh castShadow position={[0, 4.5, 0]}>
        <boxGeometry args={[14, 9, 8]} />
        <meshStandardMaterial color="#6a5a48" flatShading roughness={0.95} />
      </mesh>
      <mesh castShadow position={[-4.2, 10.2, 0]}>
        <boxGeometry args={[4.5, 5.5, 4.5]} />
        <meshStandardMaterial color="#5c4d3d" flatShading roughness={0.95} />
      </mesh>
      <mesh castShadow position={[4.5, 11.5, -0.5]}>
        <boxGeometry args={[3.8, 7.5, 3.8]} />
        <meshStandardMaterial color="#524335" flatShading roughness={0.95} />
      </mesh>
      <mesh castShadow position={[0, 13.5, 1]}>
        <boxGeometry args={[3.2, 4.2, 3.2]} />
        <meshStandardMaterial color="#46382c" flatShading roughness={0.95} />
      </mesh>
      {/* scaffolding suggestion */}
      <mesh position={[-6.5, 7, 3.5]} rotation-z={0.08}>
        <boxGeometry args={[0.15, 12, 0.15]} />
        <meshStandardMaterial color="#c4a574" metalness={0.2} roughness={0.7} />
      </mesh>
      <mesh position={[6.5, 7, 3.5]} rotation-z={-0.08}>
        <boxGeometry args={[0.15, 12, 0.15]} />
        <meshStandardMaterial color="#c4a574" metalness={0.2} roughness={0.7} />
      </mesh>
      <mesh position={[0, 12.5, 3.6]}>
        <boxGeometry args={[13, 0.12, 0.12]} />
        <meshStandardMaterial color="#c4a574" metalness={0.2} roughness={0.7} />
      </mesh>
      <pointLight color="#f0b060" distance={28} intensity={2.2} position={[0, 8, 6]} />

      <Billboard follow position={[0, 7.5, 5.2]}>
        <mesh>
          <planeGeometry args={[8.5, 3.2]} />
          <meshStandardMaterial color="#1f1814" roughness={0.85} />
        </mesh>
        <Text
          anchorX="center"
          anchorY="middle"
          color="#f2d7a8"
          fontSize={0.55}
          maxWidth={7.5}
          outlineColor="#000000"
          outlineWidth={0.02}
          position={[0, 0.55, 0.05]}
          textAlign="center"
        >
          Palace of Culture
        </Text>
        <Text
          anchorX="center"
          anchorY="middle"
          color="#e8a04a"
          fontSize={0.38}
          maxWidth={7.5}
          outlineColor="#000000"
          outlineWidth={0.015}
          position={[0, -0.15, 0.05]}
          textAlign="center"
        >
          released soon
        </Text>
        <Text
          anchorX="center"
          anchorY="middle"
          color="#b9a48a"
          fontSize={0.32}
          maxWidth={7.5}
          outlineColor="#000000"
          outlineWidth={0.012}
          position={[0, -0.7, 0.05]}
          textAlign="center"
        >
          date TBA
        </Text>
      </Billboard>
    </group>
  );
}
