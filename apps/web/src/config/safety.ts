/** Runtime safety gates. Unsafe demo capabilities are never enabled in production builds. */
const env = (import.meta.env ?? {}) as ImportMetaEnv;

/** Plaintext throwaway keys and public-relay writes require an explicit local-dev opt-in. */
export const DEMO_WRITES_ENABLED = env.DEV === true && env.VITE_ENABLE_DEMO_WRITES === "true";

/**
 * Real wallet hand-off stays disabled until returned BOLT11 invoices are validated completely.
 * The dev-only flag makes the unfinished flow testable without making it shippable by accident.
 */
export const REAL_PAYMENTS_ENABLED = env.DEV === true && env.VITE_ENABLE_REAL_PAYMENTS === "true";
