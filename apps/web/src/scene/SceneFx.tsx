// In-engine atmosphere + post-processing for the Palace. The sky is a PROCEDURAL golden-hour gradient
// (generated at runtime, no asset) — warm peach at the horizon fading to blue at the zenith, with a
// soft sun glow. It's the wrap-around background AND a low-intensity image-based light, so buildings
// catch warm sky ambient instead of reading flat. Procedural on purpose: the old baked sky JPG lived
// in a gitignored folder and 404'd on fresh checkouts; a generated sky always works and is tunable.
//
// Verification note: this preview's GPU (Intel UHD via ANGLE) is too slow for the screenshot tool to
// capture the heaviest effects; final tuning is on real hardware.

import { useThree } from "@react-three/fiber";
import {
  Bloom,
  BrightnessContrast,
  EffectComposer,
  HueSaturation,
  SMAA,
  Vignette,
} from "@react-three/postprocessing";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

/** An equirectangular golden-hour sky as a canvas gradient: zenith blue → warm horizon → ground haze,
 *  plus a soft warm sun glow near the horizon. Canvas top (v=1) is the zenith; the middle is the
 *  horizon line. Used as both background and IBL environment. */
function goldenSkyTexture(): THREE.CanvasTexture {
  const W = 1024;
  const H = 512;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d");
  if (!x) return new THREE.CanvasTexture(c);
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0.0, "#5b79a8"); // zenith blue
  g.addColorStop(0.34, "#8ea6c6"); // upper sky
  g.addColorStop(0.5, "#e6c69c"); // horizon — warm gold
  g.addColorStop(0.58, "#d7a373"); // just below horizon
  g.addColorStop(1.0, "#7c6552"); // ground haze (rarely seen behind terrain)
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  // soft warm sun glow near the horizon on one side (the key-light direction)
  const sx = W * 0.72;
  const sy = H * 0.49;
  const rg = x.createRadialGradient(sx, sy, 0, sx, sy, W * 0.3);
  rg.addColorStop(0, "rgba(255,228,184,0.85)");
  rg.addColorStop(1, "rgba(255,228,184,0)");
  x.fillStyle = rg;
  x.fillRect(0, 0, W, H);
  const t = new THREE.CanvasTexture(c);
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Installs the procedural golden-hour sky as the wrap-around background AND a low-intensity IBL, so
 *  skins/buildings catch soft warm sky ambient + gentle reflections. Restores prior state on unmount. */
function Skybox() {
  const scene = useThree((state) => state.scene);
  const texture = useMemo(goldenSkyTexture, []);
  useEffect(() => {
    const prevBg = scene.background;
    const prevEnv = scene.environment;
    const prevIntensity = scene.environmentIntensity;
    scene.background = texture;
    scene.environment = texture;
    scene.environmentIntensity = 0.6;
    return () => {
      scene.background = prevBg;
      scene.environment = prevEnv;
      scene.environmentIntensity = prevIntensity;
      texture.dispose();
    };
  }, [scene, texture]);
  return null;
}

/** The sky (generated at runtime — no async load). */
export function Atmosphere() {
  return <Skybox />;
}

/** Post-processing — the "simple geometry, cinematic image" stack (Valheim-ish): bloom lifts the
 *  neon/gold emissives, a slight desaturate + contrast bump is the filmic grade, and a vignette
 *  frames it. Kept GPU-robust (no SSAO/normal pass); soft directional shadows + fog do the grounding.
 *  On by default; `?postfx=0` disables. Toggle wiring: POSTFX_ENABLED in PalaceScene. */
export function PostFx() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom intensity={0.7} luminanceSmoothing={0.28} luminanceThreshold={0.62} mipmapBlur />
      <HueSaturation saturation={-0.08} />
      <BrightnessContrast brightness={-0.02} contrast={0.16} />
      <Vignette darkness={0.55} eskil={false} offset={0.32} />
      <SMAA />
    </EffectComposer>
  );
}
