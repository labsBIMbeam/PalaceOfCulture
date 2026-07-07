import { useGLTF } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import { useMemo } from "react";
import * as THREE from "three";
import { stoneTexture } from "./stoneTextures";

const MODEL_URL = "/palace.glb";

/** Lowercased material name of a mesh (first slot). */
function materialName(mesh: THREE.Mesh): string {
  const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  return (material?.name ?? "").toLowerCase();
}

/** Door/curtain meshes the player should walk through — these become the building's passages. */
function isPassable(mesh: THREE.Mesh): boolean {
  return /door|glass/.test(materialName(mesh));
}

/** Removed at load: the black PV roof panels and the black steel posts ("schwarze Dächer + Säulen"). */
const HIDDEN_MATERIALS = ["pv", "steel"];
function isHidden(mesh: THREE.Mesh): boolean {
  const name = materialName(mesh);
  return HIDDEN_MATERIALS.some((hidden) => name.includes(hidden));
}

/**
 * The HQ level asset. Cloned so we can mutate freely without corrupting the cached GLB; re-centred on
 * XZ; the black PV/Steel groups are dropped; door meshes are lifted out of the trimesh collider so you
 * can walk through them; and every surviving group is given a procedural Mediterranean texture (the
 * stone/clay grain lives in the map, so material colour stays white). Structure is kept as authored —
 * pyramid, walls, floor slabs — only re-skinned.
 */
export function Palace() {
  const { scene: original } = useGLTF(MODEL_URL);

  const { solids, passable } = useMemo(() => {
    // Procedural Mediterranean skins (base colour baked in → material colour stays white).
    const sandstone = stoneTexture("#e4d4ad", { bands: true });
    sandstone.repeat.set(8, 8);
    const adobe = stoneTexture("#cdab7e", { speck: 6000 });
    adobe.repeat.set(5, 5);
    const limewash = stoneTexture("#ece1c6", { speck: 4000, contrast: 0.1 });
    limewash.repeat.set(2, 2);
    const terracotta = stoneTexture("#b8542f", { bands: true, contrast: 0.2 });
    terracotta.repeat.set(6, 6);

    const skins: {
      match: RegExp;
      map?: THREE.Texture;
      color: string;
      roughness: number;
      metalness?: number;
    }[] = [
      { match: /palapa/, map: terracotta, color: "#ffffff", roughness: 0.85 }, // roof tiles
      { match: /concrete|floor|stone/, map: sandstone, color: "#ffffff", roughness: 0.95 }, // pyramid/base/floor
      { match: /rammedearth/, map: adobe, color: "#ffffff", roughness: 1 }, // walls
      { match: /column/, map: limewash, color: "#ffffff", roughness: 0.8 }, // whitewashed columns
      { match: /door|glass/, color: "#2f6f8f", roughness: 0.5 }, // Mediterranean blue
    ];

    const skin = (material: THREE.Material): THREE.Material => {
      const name = (material.name ?? "").toLowerCase();
      const hit = skins.find((s) => s.match.test(name));
      const cloned = (material as THREE.MeshStandardMaterial).clone();
      if (hit) {
        cloned.color = new THREE.Color(hit.color);
        cloned.roughness = hit.roughness;
        if (hit.metalness !== undefined) cloned.metalness = hit.metalness;
        if (hit.map) cloned.map = hit.map;
      }
      return cloned;
    };

    const solidScene = original.clone(true);
    const passableGroup = new THREE.Group();
    solidScene.updateMatrixWorld(true);

    // drop any stray / blown-up mesh that would wreck the bounds
    const strays: THREE.Object3D[] = [];
    solidScene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry) return;
      mesh.geometry.computeBoundingSphere();
      const sphere = mesh.geometry.boundingSphere;
      if (!sphere) {
        strays.push(mesh);
        return;
      }
      const worldCenter = sphere.center.clone().applyMatrix4(mesh.matrixWorld);
      if (sphere.radius > 2000 || worldCenter.length() > 2000) strays.push(mesh);
    });
    for (const mesh of strays) mesh.parent?.remove(mesh);

    // re-centre on XZ, keep Y (the deck sits at y=0)
    const box = new THREE.Box3().setFromObject(solidScene);
    const center = box.getCenter(new THREE.Vector3());
    solidScene.position.set(-center.x, 0, -center.z);
    solidScene.updateMatrixWorld(true);

    // drop the black PV roof + steel posts after re-centring (keeps the rest where it sits)
    const hidden: THREE.Object3D[] = [];
    solidScene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh && isHidden(mesh)) hidden.push(mesh);
    });
    for (const mesh of hidden) mesh.parent?.remove(mesh);

    // shadows, Mediterranean skin, and collect the passable (door) meshes
    const doors: THREE.Mesh[] = [];
    solidScene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if (isPassable(mesh)) doors.push(mesh);
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(skin) : skin(mesh.material);
    });
    // move doors out of the collider scene, preserving world transform → still visible, no collision
    for (const door of doors) passableGroup.attach(door);

    return { solids: solidScene, passable: passableGroup };
  }, [original]);

  return (
    <>
      <RigidBody colliders="trimesh" friction={1} type="fixed">
        <primitive object={solids} />
      </RigidBody>
      <primitive object={passable} />
    </>
  );
}

useGLTF.preload(MODEL_URL);
