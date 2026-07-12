/**
 * Workshop — the working heart of the beta sandbox: this is a Werkstatt, so it needs TOOLS. Kenney
 * workbenches (bench, anvil-bench, grindstone) plus scattered hand tools (axe, saw, sledgehammer,
 * pickaxe, crowbar, toolbox) grouped into work stations near the plaza. CC0 GLBs (public/tools).
 */

import { Suspense } from "react";
import { GlbModel } from "./GlbModel";

const tool = (name: string) => `/tools/${name}.glb`;

/** One work station: two benches + a few tools leaning/lying around, on a small trodden patch. */
function Station({
  position,
  rotationY = 0,
  kind,
}: {
  position: [number, number, number];
  rotationY?: number;
  kind: "smith" | "carpenter" | "bench";
}) {
  return (
    <group position={position} rotation-y={rotationY}>
      {kind === "smith" ? (
        <>
          <GlbModel fitHeight={1.0} position={[0, 0, 0]} url={tool("workbench-anvil")} />
          <GlbModel
            fitHeight={1.1}
            position={[1.6, 0, 0.2]}
            rotationY={0.3}
            url={tool("workbench-grind")}
          />
          <GlbModel
            fitHeight={1.5}
            position={[-1.2, 0, 0.6]}
            rotationY={-0.4}
            url={tool("sledgehammer")}
          />
          <GlbModel
            fitHeight={1.6}
            position={[-1.5, 0, -0.4]}
            rotationY={0.5}
            url={tool("pickaxe")}
          />
        </>
      ) : kind === "carpenter" ? (
        <>
          <GlbModel fitHeight={1.0} position={[0, 0, 0]} url={tool("workbench")} />
          <GlbModel
            fitHeight={1.5}
            position={[1.4, 0, 0.3]}
            rotationY={-0.3}
            url={tool("handsaw")}
          />
          <GlbModel
            fitHeight={1.7}
            position={[-1.3, 0, 0.4]}
            rotationY={0.4}
            url={tool("woodaxe")}
          />
          <GlbModel fitHeight={0.5} position={[1.2, 0, -0.7]} url={tool("toolbox")} />
        </>
      ) : (
        <>
          <GlbModel fitHeight={1.0} position={[0, 0, 0]} url={tool("workbench")} />
          <GlbModel
            fitHeight={1.3}
            position={[1.3, 0, 0.2]}
            rotationY={0.6}
            url={tool("crowbar")}
          />
          <GlbModel fitHeight={0.9} position={[-1.2, 0, 0.3]} rotationY={-0.5} url={tool("axe")} />
        </>
      )}
    </group>
  );
}

/** Work stations placed around the camp — the crafts that make this a workshop. */
export function Workshop() {
  return (
    <Suspense fallback={null}>
      <Station kind="smith" position={[-10, 0, 58]} rotationY={0.5} />
      <Station kind="carpenter" position={[11, 0, 74]} rotationY={-0.6} />
      <Station kind="bench" position={[-12, 0, 96]} rotationY={0.4} />
      <Station kind="carpenter" position={[13, 0, 104]} rotationY={-0.4} />
    </Suspense>
  );
}
