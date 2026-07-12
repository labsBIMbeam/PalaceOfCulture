import { JsonEncodingError, canonicalizeJson } from "@600b/shared";

/** Audit-specific error surface wrapped around the shared canonical JSON wire format. */
export class AuditEncodingError extends Error {
  override readonly name = "AuditEncodingError";
}

/** Encode audit payloads with the same deterministic JSON format used by web and ownership. */
export function canonicalizeAuditJson(value: unknown): string {
  try {
    return canonicalizeJson(value);
  } catch (error) {
    if (error instanceof AuditEncodingError) throw error;
    throw new AuditEncodingError(
      error instanceof JsonEncodingError
        ? error.message
        : "Value cannot be encoded as canonical JSON.",
    );
  }
}
