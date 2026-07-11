/** A JSON primitive accepted by signed domain payloads. */
export type JsonPrimitive = boolean | null | number | string;

/** A JSON object with recursively serializable, immutable values. */
export interface JsonObject {
  readonly [key: string]: JsonValue;
}

/** A value that can be encoded deterministically as JSON. */
export type JsonValue = JsonObject | JsonPrimitive | readonly JsonValue[];

/** Raised when a value cannot be represented by the canonical JSON subset. */
export class JsonEncodingError extends Error {
  override readonly name = "JsonEncodingError";
}

/** Serialize JSON deterministically, rejecting lossy values, sparse arrays and cycles. */
export function canonicalizeJson(value: unknown): string {
  return serializeJson(value, new Set<object>());
}

function serializeJson(value: unknown, ancestors: Set<object>): string {
  if (value === null) return "null";

  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false";
    case "number":
      if (!Number.isFinite(value)) throw new JsonEncodingError("JSON numbers must be finite.");
      return JSON.stringify(value);
    case "string":
      return JSON.stringify(value);
    case "object":
      break;
    default:
      throw new JsonEncodingError(`Unsupported JSON value: ${typeof value}.`);
  }

  if (ancestors.has(value)) throw new JsonEncodingError("Circular JSON values are not supported.");
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      const items: string[] = [];
      for (let index = 0; index < value.length; index += 1) {
        if (!(index in value)) throw new JsonEncodingError("Sparse JSON arrays are not supported.");
        items.push(serializeJson(value[index], ancestors));
      }
      return `[${items.join(",")}]`;
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== null && prototype !== Object.prototype) {
      throw new JsonEncodingError("JSON objects must use a plain or null prototype.");
    }
    const record = value as Record<string, unknown>;
    const properties = Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${serializeJson(record[key], ancestors)}`);
    return `{${properties.join(",")}}`;
  } finally {
    ancestors.delete(value);
  }
}
