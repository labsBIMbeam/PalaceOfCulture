// In-engine atmosphere + post-processing for the Palace. The sky is a CC0 cloud+sun panorama (Poly
// Haven "kloofendal_48d_partly_cloudy_puresky", baked HDR → tonemapped JPG); it's the wrap-around
// BACKGROUND only, not image-based light — so the scene's own lights stay predictable. SoftShadows
// dropped (miscompiles on ANGLE/Intel, too heavy for mobile); the directional shadow map is enough.
//
// Verification note: this preview's GPU (Intel UHD via ANGLE) is too slow for the screenshot tool to
// capture the heaviest effects; the skybox background captures fine. Final tuning is on real hardware.

import { useLoader, useThree } from "@react-three/fiber";
import {
  Bloom,
  BrightnessContrast,
  EffectComposer,
  HueSaturation,
  SMAA,
  Vignette,
} from "@react-three/postprocessing";
import { Suspense, useEffect } from "react";
import * as THREE from "three";

// Tonemapped LDR equirectangular sky (8-bit JPG, ~60 KB) baked from the CC0 HDRI — far cheaper to
// sample than a float HDR background, which matters for the mobile 30 FPS budget.
const SKY_IMG = "/sky/puresky.jpg";

/** Installs the equirectangular sky as the wrap-around background AND a low-intensity image-based
 *  light (so PBR skins/buildings catch the sky's ambient + soft reflections instead of reading flat).
 *  Intensity is kept modest so the scene's own directional/ambient lights still dominate. Restores the
 *  previous background/environment on unmount. */
function Skybox() {
  const scene = useThree((state) => state.scene);
  const texture = useLoader(THREE.TextureLoader, SKY_IMG);
  useEffect(() => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    const prevBg = scene.background;
    const prevEnv = scene.environment;
    const prevIntensity = scene.environmentIntensity;
    scene.background = texture;
    scene.environment = texture;
    // A touch more IBL now that the flat fill lights are dialled down — gives skins/buildings soft
    // sky ambient + gentle reflections so they read as lit, not painted.
    scene.environmentIntensity = 0.55;
    return () => {
      scene.background = prevBg;
      scene.environment = prevEnv;
      scene.environmentIntensity = prevIntensity;
    };
  }, [scene, texture]);
  return null;
}

/** The sky. Suspends while the HDRI loads (fallback = whatever background was there). */
export function Atmosphere() {
  return (
    <Suspense fallback={null}>
      <Skybox />
    </Suspense>
  );
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
