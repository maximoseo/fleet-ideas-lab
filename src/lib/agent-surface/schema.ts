import type { JsonSchema, ObjectSchema } from "./types";

/**
 * Minimal JSON-schema validation + a Standard Schema adapter.
 *
 * The route table stores plain JSON schemas (what OpenAPI wants). MCP SDK v2
 * wants a Standard Schema (`~standard.validate` + `~standard.jsonSchema`), so
 * we adapt instead of pulling a second schema library into 47 repos with four
 * different zod versions.
 */

export type Issue = { message: string; path?: (string | number)[] };

export const EMPTY_OBJECT: ObjectSchema = { type: "object", properties: {}, additionalProperties: false };

function typeOf(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}

/** Coerce query-string values (always strings) toward the declared type. */
export function coerce(schema: JsonSchema, v: unknown): unknown {
  if (typeof v !== "string") return v;
  switch (schema.type) {
    case "integer":
    case "number": {
      // decimal syntax only — Number("0x10") would silently become 16
      if (!/^-?\d+(\.\d+)?$/.test(v.trim())) return v;
      const n = Number(v);
      return Number.isFinite(n) ? n : v;
    }
    case "boolean":
      if (v === "true" || v === "1") return true;
      if (v === "false" || v === "0") return false;
      return v;
    case "array":
      return v.split(",").map((s) => (schema.items ? coerce(schema.items, s.trim()) : s.trim()));
    default:
      return v;
  }
}

export function validateValue(schema: JsonSchema, v: unknown, path: (string | number)[] = [], out: Issue[] = []): Issue[] {
  const t = schema.type;
  if (v === undefined) return out;
  if (t === "object") {
    if (typeOf(v) !== "object") {
      out.push({ message: "expected object", path });
      return out;
    }
    const obj = v as Record<string, unknown>;
    const props = schema.properties ?? {};
    for (const r of schema.required ?? []) if (!Object.prototype.hasOwnProperty.call(obj, r) || obj[r] === undefined) out.push({ message: `missing required "${r}"`, path: [...path, r] });
    for (const [k, val] of Object.entries(obj)) {
      if (Object.prototype.hasOwnProperty.call(props, k)) validateValue(props[k], val, [...path, k], out);
      else if (schema.additionalProperties === false) out.push({ message: `unknown property "${k}"`, path: [...path, k] });
    }
    return out;
  }
  if (t === "string") {
    if (typeof v !== "string") {
      out.push({ message: "expected string", path });
      return out;
    }
    if (schema.minLength !== undefined && v.length < schema.minLength) out.push({ message: `shorter than ${schema.minLength}`, path });
    if (schema.maxLength !== undefined && v.length > schema.maxLength) out.push({ message: `longer than ${schema.maxLength}`, path });
  } else if (t === "number" || t === "integer") {
    if (typeof v !== "number" || !Number.isFinite(v)) {
      out.push({ message: `expected ${t}`, path });
      return out;
    }
    if (t === "integer" && !Number.isInteger(v)) out.push({ message: "expected integer", path });
    if (schema.minimum !== undefined && v < schema.minimum) out.push({ message: `below minimum ${schema.minimum}`, path });
    if (schema.maximum !== undefined && v > schema.maximum) out.push({ message: `above maximum ${schema.maximum}`, path });
  } else if (t === "boolean") {
    if (typeof v !== "boolean") {
      out.push({ message: "expected boolean", path });
      return out;
    }
  } else if (t === "array") {
    if (!Array.isArray(v)) {
      out.push({ message: "expected array", path });
      return out;
    }
    if (schema.items) v.forEach((item, i) => validateValue(schema.items as JsonSchema, item, [...path, i], out));
  }
  if (schema.enum && !schema.enum.includes(v as string | number)) out.push({ message: `must be one of ${schema.enum.join(", ")}`, path });
  return out;
}

/** Apply defaults + coercion, then validate. Returns the cleaned object or throws issues. */
export function parseInput(schema: ObjectSchema | undefined, raw: Record<string, unknown>, fromQuery: boolean): { value: Record<string, unknown>; issues: Issue[] } {
  const s = schema ?? EMPTY_OBJECT;
  const value: Record<string, unknown> = {};
  for (const [k, ps] of Object.entries(s.properties)) {
    let v = Object.prototype.hasOwnProperty.call(raw, k) ? raw[k] : undefined;
    if (v === undefined && ps.default !== undefined) v = ps.default;
    if (v !== undefined) value[k] = fromQuery ? coerce(ps, v) : v;
  }
  // unknown keys: kept when the schema allows them, rejected otherwise (typos surface immediately).
  // Write routes carry `confirm` in their schema (rest.ts withConfirm), so no special case here.
  const issues: Issue[] = [];
  for (const [k, v] of Object.entries(raw)) {
    if (value[k] !== undefined || Object.prototype.hasOwnProperty.call(s.properties, k)) continue;
    if (s.additionalProperties !== false) value[k] = fromQuery ? coerce({ type: "string" }, v) : v;
    else issues.push({ message: `unknown property "${k}"`, path: [k] });
  }
  return { value, issues: [...issues, ...validateValue(s, value)] };
}

/**
 * Standard Schema v1 (+ JSON Schema) wrapper around a JSON schema — the shape
 * `@modelcontextprotocol/server` v2 accepts for `inputSchema`.
 */
export type StandardJsonSchema = {
  readonly "~standard": {
    readonly version: 1;
    readonly vendor: string;
    readonly types?: { readonly input: Record<string, unknown>; readonly output: Record<string, unknown> };
    readonly validate: (value: unknown) => { value: Record<string, unknown> } | { issues: ReadonlyArray<{ message: string; path?: ReadonlyArray<PropertyKey> }> };
    readonly jsonSchema: {
      readonly input: (options: { target: string }) => Record<string, unknown>;
      readonly output: (options: { target: string }) => Record<string, unknown>;
    };
  };
};

export function toStandardSchema(schema: ObjectSchema | undefined): StandardJsonSchema {
  const s: ObjectSchema = schema ?? EMPTY_OBJECT;
  const json = () => JSON.parse(JSON.stringify(s)) as Record<string, unknown>;
  return {
    "~standard": {
      version: 1,
      vendor: "agent-surface",
      validate: (value: unknown) => {
        if (value === undefined || value === null) value = {};
        if (typeof value !== "object" || Array.isArray(value)) return { issues: [{ message: "expected object", path: [] }] };
        const { value: v, issues } = parseInput(s, value as Record<string, unknown>, false);
        return issues.length ? { issues } : { value: v };
      },
      jsonSchema: { input: json, output: json },
    },
  };
}
