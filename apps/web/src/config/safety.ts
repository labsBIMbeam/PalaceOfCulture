/** Runtime safety gates. Unsafe demo capabilities are never enabled in production builds. */
const env = (import.meta.env ?? {}) as ImportMetaEnv;

/** Plaintext throwaway keys and public-relay writes require an explicit local-dev opt-in. */
export const DEMO_WRITES_ENABLED = env.DEV === true && env.VITE_ENABLE_DEMO_WRITES === "true";

/**
 * Real wallet hand-off stays disabled until returned BOLT11 invoices are validated completely.
 * Double opt-in: only dev servers and explicit demo builds (VITE_DEMO=1, the stage build) may
 * even ask, and both still require VITE_ENABLE_REAL_PAYMENTS=true. Mainnet builds without the
 * flags keep refusing — the QR/`lightning:` hand-off (paid on the player's own device) is the
 * default path and needs no gate.
 */
export const REAL_PAYMENTS_ENABLED =
  (env.DEV === true || env.VITE_DEMO === "1") && env.VITE_ENABLE_REAL_PAYMENTS === "true";
