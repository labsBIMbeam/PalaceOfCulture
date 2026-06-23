// In-engine atmosphere + post-processing for the Palace. The sky is a CC0 cloud+sun panorama (Poly
// Haven "kloofendal_48d_partly_cloudy_puresky", baked HDR → tonemapped JPG); it's the wrap-around
// BACKGROUND only, not image-based light — so the scene's own lights stay predictable. SoftShadows
// dropped (miscompiles on ANGLE/Intel, too heavy for mobile); the directional shadow map is enough.
//
// Verification note: this preview's GPU (Intel UHD via ANGLE) is too slow for the screenshot tool to
// capture the heaviest effects; the skybox background captures fine. Final tuning is on real hardware.

import { useLoader, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { Suspense, useEffect } from "react";
import * as THREE from "three";

// Tonemapped LDR equirectangular sky (8-bit JPG, ~60 KB) baked from the CC0 HDRI — far cheaper to
// sample than a float HDR background, which matters for the mobile 30 FPS budget.
const SKY_IMG = "/sky/puresky.jpg";

/** Installs the equirectangular sky as a wrap-around background (moves with the camera). Restores the
 *  previous background on unmount. */
function Skybox() {
  const scene = useThree((state) => state.scene);
  const texture = useLoader(THREE.TextureLoader, SKY_IMG);
  useEffect(() => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    const previous = scene.background;
    scene.background = texture;
    return () => {
      scene.background = previous;
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

/** Post-processing: subtle bloom on the gold/emissive accents (high threshold so the sky doesn't
 *  blow out) + a gentle vignette. Toggle via POSTFX_ENABLED in PalaceScene. */
export function PostFx() {
  return (
    <EffectComposer multisampling={8}>
      <Bloom intensity={0.5} luminanceSmoothing={0.3} luminanceThreshold={0.95} mipmapBlur />
      <Vignette darkness={0.5} eskil={false} offset={0.3} />
    </EffectComposer>
  );
}
