/**
 * Gemini-specific Request Transformations
 *
 * Handles Gemini model-specific request transformations including:
 * - Thinking config (camelCase keys, thinkingLevel for Gemini 3)
 * - Tool normalization (function/custom format)
 * - Schema transformation (JSON Schema -> Gemini Schema format)
 */

import type {
  RequestPayload,
  ThinkingConfig,
  ThinkingTier,
  GoogleSearchConfig,
} from "./types";

function isNullSchema(schema: unknown): boolean {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return false;
  }
  return (schema as Record<string, unknown>).type === "null";
}

function nullableUnionSchema(
  schema: Record<string, unknown>,
): Record<string, unknown> | undefined {
  for (const key of ["anyOf", "oneOf"] as const) {
    const options = schema[key];
    if (!Array.isArray(options) || options.length !== 2) {
      continue;
    }

    const nonNullOptions = options.filter((option) => !isNullSchema(option));
    if (nonNullOptions.length !== 1) {
      continue;
    }

    const nonNullOption = nonNullOptions[0];
    if (
      !nonNullOption ||
      typeof nonNullOption !== "object" ||
      Array.isArray(nonNullOption)
    ) {
      continue;
    }

    const { [key]: _union, ...rest } = schema;
    const nonNullSchema = nonNullOption as Record<string, unknown>;
    const nullableSchema = {
      ...rest,
      ...nonNullSchema,
    };
    const baseDescription =
      typeof rest.description === "string"
        ? rest.description
        : typeof nonNullSchema.description === "string"
          ? nonNullSchema.description
          : undefined;
    const description =
      baseDescription !== undefined
        ? `${baseDescription} (nullable)`
        : "nullable";
    return {
      ...nullableSchema,
      description,
    };
  }
  return undefined;
}

function singleOptionUnionSchema(
  schema: Record<string, unknown>,
): Record<string, unknown> | undefined {
  for (const key of ["anyOf", "oneOf"] as const) {
    const options = schema[key];
    if (!Array.isArray(options) || options.length !== 1) {
      continue;
    }

    const option = options[0];
    if (!option || typeof option !== "object" || Array.isArray(option)) {
      continue;
    }

    const { [key]: _union, ...rest } = schema;
    const optionSchema = option as Record<string, unknown>;
    const description =
      typeof rest.description === "string"
        ? rest.description
        : optionSchema.description;
    return {
      ...rest,
      ...optionSchema,
      ...(description !== undefined ? { description } : {}),
    };
  }
  return undefined;
}

const geminiSchemaCache = new WeakMap<object, unknown>();

/**
 * Converted tool schemas, keyed by their serialized input.
 *
 * `geminiSchemaCache` above memoizes by object identity, which cannot hit
 * across requests: every request parses a fresh body, so an unchanged tool
 * schema is a new object each turn. An agent's tool definitions are stable for
 * a whole session, so keying by content converts them once instead of once per
 * request. The full serialization is the key, so distinct schemas can never
 * collide onto each other's result.
 *
 * Values are stored serialized and re-parsed on read, so each caller gets its
 * own object and cannot mutate another caller's cached schema.
 */
const geminiSchemaContentCache = new Map<string, string>();
// Each tool takes two entries (normalizeGeminiTools converts it, then the wrap
// step converts the result), and the FIFO evicts everything once a request's
// keys exceed the cap. 512 keeps a 200-tool setup (OpenCode plus several MCP
// servers) cached across requests.
const MAX_SCHEMA_CONTENT_ENTRIES = 512;
/** Beyond this the serialize/parse round-trip stops paying for itself. */
const MAX_SCHEMA_CONTENT_BYTES = 64 * 1024;

/**
 * Converts a tool schema to Gemini's dialect, reusing the result for a schema
 * whose content was converted before. Use this at the outer, per-tool call
 * sites; `toGeminiSchema` itself recurses and must stay uncached.
 */
export function toGeminiSchemaMemoized(schema: unknown): unknown {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return toGeminiSchema(schema);
  }

  let key: string;
  try {
    key = JSON.stringify(schema);
  } catch {
    // Circular or otherwise unserializable: fall back to the direct transform.
    return toGeminiSchema(schema);
  }
  if (key.length > MAX_SCHEMA_CONTENT_BYTES) {
    return toGeminiSchema(schema);
  }

  const hit = geminiSchemaContentCache.get(key);
  if (hit !== undefined) {
    return JSON.parse(hit);
  }

  const converted = toGeminiSchema(schema);
  let serialized: string;
  try {
    serialized = JSON.stringify(converted);
  } catch {
    return converted;
  }
  if (geminiSchemaContentCache.size >= MAX_SCHEMA_CONTENT_ENTRIES) {
    const oldest = geminiSchemaContentCache.keys().next().value;
    if (oldest !== undefined) geminiSchemaContentCache.delete(oldest);
  }
  geminiSchemaContentCache.set(key, serialized);
  return converted;
}

/**
 * The fields of Gemini's `Schema` message. Antigravity parses requests as
 * protobuf JSON, so any other key is rejected with HTTP 400 ("Unknown name"),
 * failing the whole request rather than one tool. MCP tool schemas routinely
 * carry such keys (`exclusiveMinimum`, `examples`, `uniqueItems`, ...), so the
 * converter keeps only these and turns useful constraints into description
 * hints, as the Claude path does.
 */
const GEMINI_SCHEMA_FIELDS = new Set([
  "type",
  "format",
  "title",
  "description",
  "nullable",
  "enum",
  "maxItems",
  "minItems",
  "properties",
  "required",
  "minProperties",
  "maxProperties",
  "minLength",
  "maxLength",
  "pattern",
  "example",
  "anyOf",
  "propertyOrdering",
  "default",
  "items",
  "minimum",
  "maximum",
]);

/** Gemini accepts `format` only with these values, per type. */
const GEMINI_FORMATS: Record<string, ReadonlySet<string>> = {
  STRING: new Set(["enum", "date-time"]),
  NUMBER: new Set(["float", "double"]),
  INTEGER: new Set(["int32", "int64"]),
};

/** Constraints Gemini has no field for, kept for the model as a description hint. */
const HINTED_CONSTRAINTS = [
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "uniqueItems",
] as const;

/** How deep `$ref`s are inlined; deeper (or recursive) references become a hint. */
const MAX_REF_DEPTH = 8;

type SchemaRecord = Record<string, unknown>;

function isSchemaRecord(value: unknown): value is SchemaRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function refName(ref: string): string {
  return ref.split("/").pop() || ref;
}

/**
 * Replaces local `$ref`s (`#/$defs/X`, `#/definitions/X`) with the schema they
 * name, so the model still sees the shape (a todo list's items, say) instead
 * of an empty schema. Sibling keys on the referencing schema win.
 */
function inlineLocalRefs(
  schema: unknown,
  defs: SchemaRecord,
  depth: number,
  seen: ReadonlySet<string>,
): unknown {
  if (Array.isArray(schema)) {
    return schema.map((item) => inlineLocalRefs(item, defs, depth, seen));
  }
  if (!isSchemaRecord(schema)) return schema;

  let current: SchemaRecord = schema;
  let nextSeen = seen;
  let ref = current.$ref;
  // A loop, not an `if`: a definition can itself be a `$ref` (an alias), and
  // leaving that one unresolved would drop the shape entirely.
  while (typeof ref === "string") {
    const match = /^#\/(?:\$defs|definitions)\/(.+)$/.exec(ref);
    const target = match ? defs[match[1]!] : undefined;
    const { $ref: _ref, ...siblings } = current;
    if (isSchemaRecord(target) && depth < MAX_REF_DEPTH && !nextSeen.has(ref)) {
      current = { ...target, ...siblings };
      nextSeen = new Set([...nextSeen, ref]);
      ref = current.$ref;
    } else {
      current = {
        type: "object",
        ...siblings,
        description: appendHint(siblings.description, `See: ${refName(ref)}`),
      };
      break;
    }
  }

  const out: SchemaRecord = {};
  for (const [key, value] of Object.entries(current)) {
    if (key === "$defs" || key === "definitions") continue;
    if (key === "properties" && isSchemaRecord(value)) {
      const props: SchemaRecord = {};
      for (const [name, prop] of Object.entries(value)) {
        props[name] = inlineLocalRefs(prop, defs, depth + 1, nextSeen);
      }
      out[key] = props;
    } else if (
      key === "items" ||
      key === "anyOf" ||
      key === "oneOf" ||
      key === "allOf" ||
      key === "additionalProperties"
    ) {
      out[key] = inlineLocalRefs(value, defs, depth + 1, nextSeen);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function appendHint(description: unknown, hint: string): string {
  return typeof description === "string" && description.length > 0
    ? `${description} (${hint})`
    : hint;
}

/** Folds `allOf` parts into one schema: properties and required are unioned. */
function mergeAllOf(schema: SchemaRecord): SchemaRecord | undefined {
  const parts = schema.allOf;
  if (!Array.isArray(parts)) return undefined;
  const { allOf: _allOf, ...rest } = schema;
  const merged: SchemaRecord = {};
  const properties: SchemaRecord = {};
  const required = new Set<string>();
  for (const part of [...parts, rest]) {
    if (!isSchemaRecord(part)) continue;
    for (const [key, value] of Object.entries(part)) {
      if (key === "properties" && isSchemaRecord(value)) {
        Object.assign(properties, value);
      } else if (key === "required" && Array.isArray(value)) {
        for (const name of value) if (typeof name === "string") required.add(name);
      } else {
        merged[key] = value;
      }
    }
  }
  if (Object.keys(properties).length > 0) {
    merged.properties = properties;
    merged.type ??= "object";
  }
  if (required.size > 0) merged.required = [...required];
  return merged;
}

/**
 * Converts a JSON Schema to Gemini's `Schema` dialect: upper-case types, local
 * `$ref`s inlined, `oneOf`/`allOf` rewritten, `type` arrays and `const`
 * resolved, and every key outside {@link GEMINI_SCHEMA_FIELDS} removed.
 */
export function toGeminiSchema(schema: unknown): unknown {
  if (!isSchemaRecord(schema)) {
    return schema;
  }

  const cached = geminiSchemaCache.get(schema);
  if (cached !== undefined) {
    return cached;
  }

  const defs: SchemaRecord = {
    ...(isSchemaRecord(schema.definitions) ? schema.definitions : {}),
    ...(isSchemaRecord(schema.$defs) ? schema.$defs : {}),
  };
  const hasRefs = Object.keys(defs).length > 0 || JSON.stringify(schema).includes('"$ref"');
  const prepared = hasRefs ? inlineLocalRefs(schema, defs, 0, new Set()) : schema;
  const result = convertSchema(prepared as SchemaRecord);
  geminiSchemaCache.set(schema, result);
  return result;
}

function convertSchema(inputSchema: SchemaRecord): unknown {
  const singleOptionSchema = singleOptionUnionSchema(inputSchema);
  if (singleOptionSchema) {
    return convertSchema(singleOptionSchema);
  }

  const nullableSchema = nullableUnionSchema(inputSchema);
  if (nullableSchema) {
    return convertSchema(nullableSchema);
  }

  const mergedSchema = mergeAllOf(inputSchema);
  if (mergedSchema) {
    return convertSchema(mergedSchema);
  }

  const result: SchemaRecord = {};
  const hints: string[] = [];

  // First pass: collect all property names for required validation
  const propertyNames = new Set<string>();
  if (isSchemaRecord(inputSchema.properties)) {
    for (const propName of Object.keys(inputSchema.properties)) {
      propertyNames.add(propName);
    }
  }

  for (const [key, value] of Object.entries(inputSchema)) {
    if (key === "type") {
      if (typeof value === "string") {
        result.type = value.toUpperCase();
      } else if (Array.isArray(value)) {
        // ["string", "null"] -> STRING, noted as nullable like the union case.
        const types = value.filter((item): item is string => typeof item === "string");
        const nonNull = types.filter((item) => item !== "null");
        if (nonNull.length > 0) result.type = nonNull[0]!.toUpperCase();
        if (nonNull.length > 1) hints.push(`one of: ${nonNull.join(", ")}`);
        if (nonNull.length < types.length) hints.push("nullable");
      }
    } else if (key === "properties" && isSchemaRecord(value)) {
      const props: SchemaRecord = {};
      for (const [propName, propSchema] of Object.entries(value)) {
        props[propName] = isSchemaRecord(propSchema) ? convertSchema(propSchema) : propSchema;
      }
      result.properties = props;
    } else if (key === "items" && isSchemaRecord(value)) {
      result.items = convertSchema(value);
    } else if ((key === "anyOf" || key === "oneOf") && Array.isArray(value)) {
      // Gemini has no oneOf; anyOf is the closest it accepts. It has no null
      // type either, so null options become a hint (two-option unions were
      // already flattened by nullableUnionSchema).
      const options = value.filter((item) => !isNullSchema(item));
      if (options.length < value.length) hints.push("nullable");
      result.anyOf = options.map((item) => (isSchemaRecord(item) ? convertSchema(item) : item));
    } else if (key === "enum" && Array.isArray(value)) {
      // Gemini accepts string enums only; others are dropped (see pieliesdie 068919f).
      if (value.every((item) => typeof item === "string")) result.enum = value;
    } else if (key === "const") {
      if (typeof value === "string") {
        result.enum = [value];
      } else {
        hints.push(`must be ${JSON.stringify(value)}`);
      }
    } else if (key === "examples" && Array.isArray(value)) {
      if (value.length > 0 && result.example === undefined) result.example = value[0];
    } else if (key === "required" && Array.isArray(value)) {
      // Filter required array to only include properties that exist
      // This fixes: "parameters.required[X]: property is not defined"
      if (propertyNames.size > 0) {
        const validRequired = value.filter(
          (prop) => typeof prop === "string" && propertyNames.has(prop),
        );
        if (validRequired.length > 0) {
          result.required = validRequired;
        }
      } else {
        result.required = value;
      }
    } else if ((HINTED_CONSTRAINTS as readonly string[]).includes(key)) {
      if (value !== false && value !== undefined) hints.push(`${key}: ${JSON.stringify(value)}`);
    } else if (GEMINI_SCHEMA_FIELDS.has(key)) {
      result[key] = value;
    }
    // Anything else ($schema, additionalProperties, readOnly, ...) is dropped.
  }

  if (typeof result.format === "string") {
    const allowed = typeof result.type === "string" ? GEMINI_FORMATS[result.type] : undefined;
    if (!allowed?.has(result.format)) {
      hints.push(`format: ${result.format}`);
      delete result.format;
    }
  }

  if (hints.length > 0) {
    result.description = appendHint(result.description, hints.join(", "));
  }

  // Issue #80: Ensure array schemas have an 'items' field
  // Gemini API requires: "parameters.properties[X].items: missing field"
  if (result.type === "ARRAY" && !result.items) {
    result.items = { type: "STRING" };
  }

  return result;
}

/**
 * Check if a model is a Gemini model (not Claude).
 */
export function isGeminiModel(model: string): boolean {
  const lower = model.toLowerCase();
  return lower.includes("gemini") && !lower.includes("claude");
}

/**
 * Check if a model is Gemini 3 (uses thinkingLevel string).
 */
export function isGemini3Model(model: string): boolean {
  return model.toLowerCase().includes("gemini-3");
}

const STRICT_SAMPLING_MODEL_REGEX =
  /^gemini-(?:3\.[678]-flash(?:-(?:low|medium|high|tiered))?|3\.5-flash-lite)$/i;
const DEPRECATED_SAMPLING_FIELDS = [
  "temperature",
  "topP",
  "top_p",
  "topK",
  "top_k",
  "candidateCount",
  "candidate_count",
] as const;

/**
 * Gemini 3.6/3.7/3.8 Flash and 3.5 Flash-Lite ignore deprecated sampling controls and
 * reject candidate count. Remove them without affecting older Gemini models.
 */
export function sanitizeGeminiGenerationConfigForModel(
  payload: RequestPayload,
  model: string,
): void {
  const normalizedModel = model.replace(/^antigravity-/i, "");
  if (!STRICT_SAMPLING_MODEL_REGEX.test(normalizedModel)) {
    return;
  }

  const configs: unknown[] = [payload.generationConfig];
  const extraBody = payload.extra_body ?? payload.extraBody;
  if (extraBody && typeof extraBody === "object" && !Array.isArray(extraBody)) {
    configs.push((extraBody as Record<string, unknown>).generationConfig);
  }

  for (const config of configs) {
    if (!config || typeof config !== "object" || Array.isArray(config)) {
      continue;
    }
    for (const field of DEPRECATED_SAMPLING_FIELDS) {
      delete (config as Record<string, unknown>)[field];
    }
  }
}

/**
 * Check if a model is Gemini 2.5 (uses numeric thinkingBudget).
 */
export function isGemini25Model(model: string): boolean {
  return model.toLowerCase().includes("gemini-2.5");
}

/**
 * Check if a model is an image generation model.
 * Image models don't support thinking and require imageConfig.
 */
export function isImageGenerationModel(model: string): boolean {
  const lower = model.toLowerCase();
  return lower.includes("image") || lower.includes("imagen");
}

/**
 * Build Gemini 3 thinking config with thinkingLevel string.
 */
export function buildGemini3ThinkingConfig(
  includeThoughts: boolean,
  thinkingLevel: ThinkingTier,
): ThinkingConfig {
  return {
    includeThoughts,
    thinkingLevel,
  };
}

/**
 * Build Gemini 2.5 thinking config with numeric thinkingBudget.
 */
export function buildGemini25ThinkingConfig(
  includeThoughts: boolean,
  thinkingBudget?: number,
): ThinkingConfig {
  return {
    includeThoughts,
    ...(typeof thinkingBudget === "number" && thinkingBudget > 0
      ? { thinkingBudget }
      : {}),
  };
}

/**
 * Image generation config for Gemini image models.
 *
 * Supported aspect ratios: "1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"
 */
export interface ImageConfig {
  aspectRatio?: string;
}

/**
 * Valid aspect ratios for image generation.
 */
const VALID_ASPECT_RATIOS = [
  "1:1",
  "2:3",
  "3:2",
  "3:4",
  "4:3",
  "4:5",
  "5:4",
  "9:16",
  "16:9",
  "21:9",
];

/**
 * Build image generation config for Gemini image models.
 *
 * Configuration is read from environment variables:
 * - OPENCODE_IMAGE_ASPECT_RATIO: Aspect ratio (e.g., "16:9", "4:3")
 *
 * Defaults to 1:1 aspect ratio if not specified.
 *
 * Note: Resolution setting is not currently supported by the Antigravity API.
 */
export function buildImageGenerationConfig(): ImageConfig {
  // Read aspect ratio from environment or default to 1:1
  const aspectRatio = process.env.OPENCODE_IMAGE_ASPECT_RATIO || "1:1";

  if (VALID_ASPECT_RATIOS.includes(aspectRatio)) {
    return { aspectRatio };
  }

  console.warn(
    `[gemini] Invalid aspect ratio "${aspectRatio}". Using default "1:1". Valid values: ${VALID_ASPECT_RATIOS.join(", ")}`,
  );

  // Default to 1:1 square aspect ratio
  return { aspectRatio: "1:1" };
}

/**
 * Normalize tools for Gemini models.
 * Ensures tools have proper function-style format.
 *
 * @returns Debug info about tool normalization
 */
export function normalizeGeminiTools(payload: RequestPayload): {
  toolDebugMissing: number;
  toolDebugSummaries: string[];
} {
  let toolDebugMissing = 0;
  const toolDebugSummaries: string[] = [];

  if (!Array.isArray(payload.tools)) {
    return { toolDebugMissing, toolDebugSummaries };
  }

  const placeholderSchema: Record<string, unknown> = {
    type: "OBJECT",
    properties: {
      _placeholder: {
        type: "BOOLEAN",
        description: "Placeholder. Always pass true.",
      },
    },
    required: ["_placeholder"],
  };

  payload.tools = (payload.tools as unknown[]).map(
    (tool: unknown, toolIndex: number) => {
      const t = tool as Record<string, unknown>;

      // Skip normalization for Google Search tools (both old and new API)
      if (t.googleSearch || t.googleSearchRetrieval) {
        return t;
      }

      // Handle pre-wrapped functionDeclarations format (e.g. from @ai-sdk/google)
      if (Array.isArray(t.functionDeclarations)) {
        const normalizedDeclarations = t.functionDeclarations.map(
          (decl: unknown, declIndex: number) => {
            const d = decl as Record<string, unknown>;
            const schemaCandidates = [
              d.parameters,
              d.parametersJsonSchema,
              d.input_schema,
              d.inputSchema,
            ].filter(Boolean);

            let schema = schemaCandidates[0] as
              | Record<string, unknown>
              | undefined;
            const schemaObjectOk =
              schema && typeof schema === "object" && !Array.isArray(schema);
            if (!schemaObjectOk) {
              schema = placeholderSchema;
              toolDebugMissing += 1;
            } else {
              schema = toGeminiSchemaMemoized(schema) as Record<string, unknown>;
            }

            const name = String(d.name || `tool-${toolIndex}-${declIndex}`);
            toolDebugSummaries.push(
              `decl=${name},src=functionDeclarations,hasSchema=${schemaObjectOk ? "y" : "n"}`,
            );

            return {
              ...d,
              name,
              description: String(d.description || ""),
              parameters: schema,
            };
          },
        );

        const newTool: Record<string, unknown> = {
          ...t,
          functionDeclarations: normalizedDeclarations,
        };
        delete newTool.parameters;
        delete newTool.input_schema;
        delete newTool.inputSchema;
        delete newTool.custom;
        delete newTool.function;
        return newTool;
      }

      const newTool = { ...t };

      const schemaCandidates = [
        (newTool.function as Record<string, unknown> | undefined)?.input_schema,
        (newTool.function as Record<string, unknown> | undefined)?.parameters,
        (newTool.function as Record<string, unknown> | undefined)?.inputSchema,
        (newTool.custom as Record<string, unknown> | undefined)?.input_schema,
        (newTool.custom as Record<string, unknown> | undefined)?.parameters,
        newTool.parameters,
        newTool.input_schema,
        newTool.inputSchema,
      ].filter(Boolean);

      let schema = schemaCandidates[0] as Record<string, unknown> | undefined;
      const schemaObjectOk =
        schema && typeof schema === "object" && !Array.isArray(schema);
      if (!schemaObjectOk) {
        schema = placeholderSchema;
        toolDebugMissing += 1;
      } else {
        // Transform existing schema to Gemini-compatible format
        schema = toGeminiSchemaMemoized(schema) as Record<string, unknown>;
      }

      const nameCandidate =
        newTool.name ||
        (newTool.function as Record<string, unknown> | undefined)?.name ||
        (newTool.custom as Record<string, unknown> | undefined)?.name ||
        `tool-${toolIndex}`;

      // Always update function.input_schema with transformed schema
      if (newTool.function && schema) {
        (newTool.function as Record<string, unknown>).input_schema = schema;
      }

      // Always update custom.input_schema with transformed schema
      if (newTool.custom && schema) {
        (newTool.custom as Record<string, unknown>).input_schema = schema;
      }

      // Create custom from function if missing
      if (!newTool.custom && newTool.function) {
        const fn = newTool.function as Record<string, unknown>;
        newTool.custom = {
          name: fn.name || nameCandidate,
          description: fn.description,
          input_schema: schema,
        };
      }

      // Create custom if both missing
      if (!newTool.custom && !newTool.function) {
        newTool.custom = {
          name: nameCandidate,
          description: newTool.description,
          input_schema: schema,
        };
      }

      if (
        newTool.custom &&
        !(newTool.custom as Record<string, unknown>).input_schema
      ) {
        (newTool.custom as Record<string, unknown>).input_schema = {
          type: "OBJECT",
          properties: {},
        };
        toolDebugMissing += 1;
      }

      toolDebugSummaries.push(
        `idx=${toolIndex}, hasCustom=${!!newTool.custom}, customSchema=${!!(newTool.custom as Record<string, unknown> | undefined)?.input_schema}, hasFunction=${!!newTool.function}, functionSchema=${!!(newTool.function as Record<string, unknown> | undefined)?.input_schema}`,
      );

      // Strip custom wrappers for Gemini; only function-style is accepted.
      if (newTool.custom) {
        if (!newTool.function) {
          // wrapToolsAsFunctionDeclarations reads a tool without `function`
          // from its top level, so the custom wrapper's name, description and
          // converted schema move there. Left behind, the tool would lose its
          // name and schema, or a raw top-level schema would be sent as is.
          const custom = newTool.custom as Record<string, unknown>;
          newTool.name = nameCandidate;
          newTool.description ??= custom.description;
          newTool.parameters = custom.input_schema;
          delete newTool.input_schema;
          delete newTool.inputSchema;
        }
        delete newTool.custom;
      }

      return newTool;
    },
  );

  return { toolDebugMissing, toolDebugSummaries };
}

/**
 * Apply all Gemini-specific transformations to a request payload.
 */
export interface GeminiTransformOptions {
  /** The effective model name (resolved) */
  model: string;
  /** Tier-based thinking budget (from model suffix, for Gemini 2.5) */
  tierThinkingBudget?: number;
  /** Tier-based thinking level (from model suffix, for Gemini 3) */
  tierThinkingLevel?: ThinkingTier;
  /** Normalized thinking config from user settings */
  normalizedThinking?: { includeThoughts?: boolean; thinkingBudget?: number };
  /** Google Search configuration */
  googleSearch?: GoogleSearchConfig;
}

export interface GeminiTransformResult {
  toolDebugMissing: number;
  toolDebugSummaries: string[];
  /** Number of function declarations after wrapping */
  wrappedFunctionCount: number;
  /** Number of passthrough tools (googleSearch, googleSearchRetrieval, codeExecution) */
  passthroughToolCount: number;
}

/**
 * Apply all Gemini-specific transformations.
 */
export function applyGeminiTransforms(
  payload: RequestPayload,
  options: GeminiTransformOptions,
): GeminiTransformResult {
  const {
    model,
    tierThinkingBudget,
    tierThinkingLevel,
    normalizedThinking,
    googleSearch,
  } = options;

  // 1. Apply thinking config if needed
  if (normalizedThinking) {
    let thinkingConfig: ThinkingConfig;

    if (tierThinkingLevel && isGemini3Model(model)) {
      // Gemini 3 uses thinkingLevel string
      thinkingConfig = buildGemini3ThinkingConfig(
        normalizedThinking.includeThoughts ?? true,
        tierThinkingLevel,
      );
    } else {
      // Gemini 2.5 and others use numeric budget
      const thinkingBudget =
        tierThinkingBudget ?? normalizedThinking.thinkingBudget;
      thinkingConfig = buildGemini25ThinkingConfig(
        normalizedThinking.includeThoughts ?? true,
        thinkingBudget,
      );
    }

    const generationConfig = (payload.generationConfig ?? {}) as Record<
      string,
      unknown
    >;
    generationConfig.thinkingConfig = thinkingConfig;
    payload.generationConfig = generationConfig;
  }

  // 2. Apply Google Search (Grounding) if enabled
  // Uses the new googleSearch API for Gemini 2.0+ / Gemini 3 models
  // Note: The old googleSearchRetrieval with dynamicRetrievalConfig is deprecated
  // The new API doesn't support threshold - the model decides when to search automatically
  if (googleSearch && googleSearch.mode === "auto") {
    const tools = (payload.tools as unknown[]) || [];
    if (!payload.tools) {
      payload.tools = tools;
    }

    // Add Google Search tool using new API format for Gemini 2.0+
    // See: https://ai.google.dev/gemini-api/docs/grounding
    (payload.tools as any[]).push({
      googleSearch: {},
    });
  }

  // 3. Normalize tools
  const result = normalizeGeminiTools(payload);

  // 4. Wrap tools in functionDeclarations format (fixes #203, #206)
  // Antigravity strict protobuf validation rejects wrapper-level 'parameters' field
  // Must be: [{ functionDeclarations: [{ name, description, parameters }] }]
  const wrapResult = wrapToolsAsFunctionDeclarations(payload);

  return {
    ...result,
    wrappedFunctionCount: wrapResult.wrappedFunctionCount,
    passthroughToolCount: wrapResult.passthroughToolCount,
  };
}

export interface WrapToolsResult {
  wrappedFunctionCount: number;
  passthroughToolCount: number;
}

/**
 * Wrap tools array in Gemini's required functionDeclarations format.
 *
 * Gemini/Antigravity API expects:
 *   { tools: [{ functionDeclarations: [{ name, description, parameters }] }] }
 *
 * NOT:
 *   { tools: [{ function: {...}, parameters: {...} }] }
 *
 * The wrapper-level 'parameters' field causes:
 *   "Unknown name 'parameters' at 'request.tools[0]'"
 */
/**
 * Detect if a tool is a web search tool in any of the supported formats:
 * - Claude/Anthropic: { type: "web_search_20250305" } or { name: "web_search" }
 * - Gemini native: { googleSearch: {} } or { googleSearchRetrieval: {} }
 */
function isWebSearchTool(tool: Record<string, unknown>): boolean {
  // 1. Gemini native format
  if (tool.googleSearch || tool.googleSearchRetrieval) {
    return true;
  }

  // 2. Claude/Anthropic format: { type: "web_search_20250305" }
  if (tool.type === "web_search_20250305") {
    return true;
  }

  // 3. Simple name-based format: { name: "web_search" | "google_search" }
  const name = tool.name as string | undefined;
  if (name === "web_search" || name === "google_search") {
    return true;
  }

  return false;
}

export function wrapToolsAsFunctionDeclarations(
  payload: RequestPayload,
): WrapToolsResult {
  if (!Array.isArray(payload.tools) || payload.tools.length === 0) {
    return { wrappedFunctionCount: 0, passthroughToolCount: 0 };
  }

  const functionDeclarations: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }> = [];

  const passthroughTools: unknown[] = [];
  let hasWebSearchTool = false;

  for (const tool of payload.tools as Array<Record<string, unknown>>) {
    // Handle passthrough tools (Google Search and Code Execution)
    if (tool.googleSearch || tool.googleSearchRetrieval || tool.codeExecution) {
      passthroughTools.push(tool);
      continue;
    }

    // Detect and convert web search tools to Gemini format
    if (isWebSearchTool(tool)) {
      hasWebSearchTool = true;
      continue; // Will be added as { googleSearch: {} } at the end
    }

    if (tool.functionDeclarations) {
      if (Array.isArray(tool.functionDeclarations)) {
        for (const decl of tool.functionDeclarations as Array<
          Record<string, unknown>
        >) {
          const parameters =
            decl.parameters &&
            typeof decl.parameters === "object" &&
            !Array.isArray(decl.parameters)
              ? (toGeminiSchemaMemoized(decl.parameters) as Record<string, unknown>)
              : { type: "OBJECT", properties: {} };
          functionDeclarations.push({
            name: String(decl.name || `tool-${functionDeclarations.length}`),
            description: String(decl.description || ""),
            parameters,
          });
        }
      }
      continue;
    }

    const fn = tool.function as Record<string, unknown> | undefined;
    const custom = tool.custom as Record<string, unknown> | undefined;

    const name = String(
      tool.name ||
        fn?.name ||
        custom?.name ||
        `tool-${functionDeclarations.length}`,
    );

    const description = String(
      tool.description || fn?.description || custom?.description || "",
    );

    const schema = (fn?.input_schema ||
      fn?.parameters ||
      fn?.inputSchema ||
      custom?.input_schema ||
      custom?.parameters ||
      tool.parameters ||
      tool.input_schema ||
      tool.inputSchema || { type: "OBJECT", properties: {} }) as Record<
      string,
      unknown
    >;

    functionDeclarations.push({
      name,
      description,
      parameters: schema,
    });
  }

  const finalTools: unknown[] = [];

  if (functionDeclarations.length > 0) {
    finalTools.push({ functionDeclarations });
  }

  finalTools.push(...passthroughTools);

  // Add googleSearch tool if a web search tool was detected
  // Note: googleSearch cannot be combined with functionDeclarations in the same request
  // If there are function declarations, we skip adding googleSearch (Gemini API limitation)
  if (hasWebSearchTool && functionDeclarations.length === 0) {
    finalTools.push({ googleSearch: {} });
  } else if (hasWebSearchTool && functionDeclarations.length > 0) {
    // Log warning: web search requested but can't be used with functions
    console.warn(
      "[gemini] web_search tool detected but cannot be combined with function declarations. " +
        "Use the explicit google_search() tool call instead.",
    );
  }

  payload.tools = finalTools;

  return {
    wrappedFunctionCount: functionDeclarations.length,
    passthroughToolCount:
      passthroughTools.length +
      (hasWebSearchTool && functionDeclarations.length === 0 ? 1 : 0),
  };
}
