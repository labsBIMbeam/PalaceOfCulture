import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import type { Group } from "three";
import { type Growable, loadGrowable } from "./loadGrowable";

/**
 * Example react-three-fiber wrapper. `progress` is your data value (e.g. derived
 * from timelock maturity: elapsed / term). Renders nothing until loaded.
 */
export function GrowableObject(props: {
  glbUrl: string;
  manifestUrl: string;
  progress: number;
}): JSX.Element | null {
  const [growable, setGrowable] = useState<Growable | null>(null);
  const target = useRef(props.progress);
  target.current = props.progress;

  useEffect(() => {
    let alive = true;
    loadGrowable(props.glbUrl, props.manifestUrl).then((g) => {
      if (alive) setGrowable(g);
    });
    return () => {
      alive = false;
      growable?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.glbUrl, props.manifestUrl]);

  useFrame(() => {
    growable?.setGrowth(target.current);
  });

  if (!growable) return null;
  return <primitive object={growable.root as Group} />;
}
