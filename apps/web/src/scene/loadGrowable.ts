// Growable assets for "600 Billion" (from assets-incoming). Art is static (the .glb), state is data
// (the .growth.json) — a single `progress` (0..1) drives per-part growth at runtime; nothing baked in.

import { type Group, MathUtils, type Object3D, type Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export interface GrowthNodeMeta {
  /** Name of the glTF node (1:1 with the Blender object name). */
  node: string;
  /** Progress at which this part starts to grow. */
  t0: number;
  /** Growth window length (progress units until fully grown). */
  win: number;
  /** Category: branch/leaf/blossom/apple/... or tower/booster/raptor/tile/... */
  group: string;
  /** Optional: part shrinks back to zero (e.g. apple blossoms falling). */
  fadeStart?: number;
  fadeWin?: number;
  /** Optional: [startYear, endYear] for year-based assets (Leviathan). */
  year?: [number, number];
}

export interface GrowthPhase {
  name?: string;
  id?: string;
  range?: [number, number];
}

export interface GrowthManifest {
  asset: string;
  totalParts: number;
  growthModel: string;
  phases: GrowthPhase[];
  nodes: GrowthNodeMeta[];
}

export interface Growable {
  /** Add this to your scene. */
  root: Group;
  manifest: GrowthManifest;
  /** Drive the original time-based growth. `progress` is clamped to 0..1. */
  setGrowth: (progress: number) => void;
  /** Show exactly the first N manifest nodes for contributor-driven assembly. */
  setVisibleParts: (count: number) => void;
  /** Current phase label for a given progress (UI helper). */
  phaseAt: (progress: number) => string;
  dispose: () => void;
}

const smooth = (s: number): number => s * s * (3 - 2 * s);

interface Tracked {
  node: Object3D;
  meta: GrowthNodeMeta;
  base: Vector3;
}

/**
 * Load a growable asset and return a handle whose `setGrowth(progress)` scales each part in. The base
 * scale is read from the glTF, so models stay authoring-accurate.
 */
export async function loadGrowable(
  glbUrl: string,
  manifestUrl: string,
  loader: GLTFLoader = new GLTFLoader(),
): Promise<Growable> {
  const [gltf, manifest] = await Promise.all([
    loader.loadAsync(glbUrl),
    fetch(manifestUrl).then((r) => r.json() as Promise<GrowthManifest>),
  ]);

  const root = gltf.scene as unknown as Group;
  const byName = new Map<string, Object3D>();
  root.traverse((o) => {
    if (o.name) byName.set(o.name, o);
  });

  const tracked: Tracked[] = [];
  for (const meta of manifest.nodes) {
    const node = byName.get(meta.node);
    if (!node) continue;
    tracked.push({ node, meta, base: node.scale.clone() });
  }

  const setGrowth = (progress: number): void => {
    const p = MathUtils.clamp(progress, 0, 1);
    for (const t of tracked) {
      const s = MathUtils.clamp((p - t.meta.t0) / t.meta.win, 0, 1);
      let f = smooth(s);
      if (t.meta.fadeStart !== undefined && t.meta.fadeWin !== undefined) {
        const fd = MathUtils.clamp((p - t.meta.fadeStart) / t.meta.fadeWin, 0, 1);
        f *= 1 - smooth(fd);
      }
      t.node.scale.copy(t.base).multiplyScalar(f);
      t.node.visible = f > 0.004;
    }
  };

  const setVisibleParts = (count: number): void => {
    const visibleCount = MathUtils.clamp(Math.floor(count), 0, tracked.length);
    tracked.forEach((item, index) => {
      const visible = index < visibleCount;
      item.node.scale.copy(item.base).multiplyScalar(visible ? 1 : 0);
      item.node.visible = visible;
    });
  };

  const phaseAt = (progress: number): string => {
    const p = MathUtils.clamp(progress, 0, 1);
    for (const ph of manifest.phases) {
      if (ph.range && p < ph.range[1]) return ph.name ?? ph.id ?? "";
    }
    return manifest.phases.at(-1)?.name ?? "";
  };

  const dispose = (): void => {
    root.traverse((o) => {
      const m = o as unknown as { geometry?: { dispose?: () => void } };
      m.geometry?.dispose?.();
    });
  };

  setGrowth(0);
  return { root, manifest, setGrowth, setVisibleParts, phaseAt, dispose };
}
