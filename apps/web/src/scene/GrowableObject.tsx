// r3f wrapper for a growable asset (apple-tree / starship-stack / …). `progress` (0..1) is the data
// value (timelock maturity). The fully-grown asset is normalised to `fitHeight` and seated on y=0, so
// it drops into a slot regardless of the model's authoring scale. Growth only re-applies when the
// progress actually changes, so a static (full) showcase asset costs nothing per frame.

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { Box3 } from "three";
import { type Growable, loadGrowable } from "./loadGrowable";

export function GrowableObject({
  glbUrl,
  manifestUrl,
  progress,
  fitHeight,
  lift = 0,
}: {
  glbUrl: string;
  manifestUrl: string;
  progress: number;
  /** Height (m) of the fully-grown asset; the wrapper is scaled to match. */
  fitHeight: number;
  /** Extra y-offset for the seated base (e.g. onto a plinth). */
  lift?: number;
}) {
  const [growable, setGrowable] = useState<Growable | null>(null);
  const [fit, setFit] = useState<{ scale: number; posY: number } | null>(null);
  const target = useRef(progress);
  target.current = progress;
  const lastApplied = useRef(-1);

  // biome-ignore lint/correctness/useExhaustiveDependencies: load once per asset; progress is read via ref each frame
  useEffect(() => {
    let alive = true;
    let loaded: Growable | null = null;
    loadGrowable(glbUrl, manifestUrl).then((g) => {
      if (!alive) {
        g.dispose();
        return;
      }
      loaded = g;
      // Measure the fully-grown bounds → scale the wrapper to fitHeight and seat its base on y=0.
      g.setGrowth(1);
      g.root.updateMatrixWorld(true);
      const box = new Box3().setFromObject(g.root);
      const height = box.max.y - box.min.y || 1;
      const scale = fitHeight / height;
      g.setGrowth(target.current);
      lastApplied.current = target.current;
      setFit({ scale, posY: lift - box.min.y * scale });
      setGrowable(g);
    });
    return () => {
      alive = false;
      loaded?.dispose();
    };
  }, [glbUrl, manifestUrl]);

  useFrame(() => {
    if (!growable) return;
    if (Math.abs(target.current - lastApplied.current) > 0.0005) {
      growable.setGrowth(target.current);
      lastApplied.current = target.current;
    }
  });

  if (!growable || !fit) return null;
  return (
    <group position-y={fit.posY} scale={fit.scale}>
      <primitive object={growable.root} />
    </group>
  );
}
