import * as z from 'zod/v4';
import type { EnvConfig } from '../../config/env.js';
import { resolveProjection, type ProjectionMode } from '../../utils/projections.js';
import { CoolifyApiError, RECOVERY_HINTS } from '../../utils/errors.js';
import { InstanceManager } from '../../utils/instance-registry.js';

/** Optional multi-instance routing param (D-08) — shared across domain tools. */
export const optionalInstanceParam = {
  instance: z
    .string()
    .regex(/^[a-z][a-z0-9_-]{1,31}$/)
    .optional()
    .describe(
      'Coolify instance name from registry (optional — uses env credentials or registry default)',
    ),
};

export const instanceRoutingExtension = z.object(optionalInstanceParam);

/**
 * MCP `registerTool` inputSchema wrapper: extends every object option with
 * `optionalInstanceParam` so SDK `validateToolInput` retains `instance`
 * (does not strip/reject) and `tools/list` JSON Schema advertises the field.
 *
 * Handlers keep using `parseWithInstanceRouting` against unwrapped action
 * schemas — both paths accept `instance`.
 */
export function withInstanceRoutingSchema(schema: z.ZodType): z.ZodType {
  return extendSchemaWithInstance(schema);
}

function extendSchemaWithInstance(schema: z.ZodType): z.ZodType {
  const ctor = schema.constructor.name;
  const def = (
    schema as {
      def?: { type?: string; discriminator?: string };
      options?: z.ZodType[];
    }
  ).def;
  const options = (schema as { options?: z.ZodType[] }).options;

  if (ctor === 'ZodObject') {
    return (schema as z.ZodObject).extend(optionalInstanceParam);
  }

  if (def?.type === 'union' && Array.isArray(options)) {
    const mapped = options.map(extendSchemaWithInstance);
    if (mapped.length < 2) {
      throw new Error('withInstanceRoutingSchema: union needs ≥2 options');
    }
    if (ctor === 'ZodDiscriminatedUnion' && def.discriminator) {
      return z.discriminatedUnion(
        def.discriminator,
        mapped as [z.ZodObject, z.ZodObject, ...z.ZodObject[]],
      );
    }
    return z.union(mapped as [z.ZodType, z.ZodType, ...z.ZodType[]]);
  }

  throw new Error(
    `withInstanceRoutingSchema: unsupported schema type ${ctor}`,
  );
}

/** Strip + validate instance param without weakening inner strict action schemas. */
export function parseWithInstanceRouting<T extends Record<string, unknown>>(
  schema: z.ZodType<T>,
  args: unknown,
): T & { instance?: string } {
  const result = safeParseWithInstanceRouting(schema, args);
  if (!result.success) {
    throw new CoolifyApiError({
      code: 'COOLIFY_VALIDATION_ERROR',
      message: result.error.issues.map((i) => i.message).join('; '),
      recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
    });
  }
  return result.data;
}

/** safeParse variant for handlers that map Zod failures to validation errors. */
export function safeParseWithInstanceRouting<T extends Record<string, unknown>>(
  schema: z.ZodType<T>,
  args: unknown,
): z.ZodSafeParseResult<T & { instance?: string }> {
  const record =
    typeof args === 'object' && args !== null
      ? ({ ...(args as Record<string, unknown>) } as Record<string, unknown>)
      : {};
  const instanceResult = instanceRoutingExtension.safeParse({
    instance: record.instance,
  });
  if (!instanceResult.success) {
    return instanceResult as z.ZodSafeParseResult<T & { instance?: string }>;
  }
  delete record.instance;
  const parsed = schema.safeParse(record);
  if (!parsed.success) {
    return parsed as z.ZodSafeParseResult<T & { instance?: string }>;
  }
  return {
    success: true,
    data: { ...parsed.data, ...instanceResult.data },
  };
}

/** Resolve per-request credentials; returns EnvConfig with routed URL/token/verifySsl. */
export function resolveRoutingEnv(env: EnvConfig, instance?: string): EnvConfig {
  const creds = InstanceManager.resolveCredentials(instance, {
    COOLIFY_URL: env.COOLIFY_URL,
    COOLIFY_TOKEN: env.COOLIFY_TOKEN,
    COOLIFY_VERIFY_SSL: env.COOLIFY_VERIFY_SSL === false ? 'false' : 'true',
  });
  return {
    ...env,
    COOLIFY_URL: creds.url,
    COOLIFY_TOKEN: creds.token,
    COOLIFY_VERIFY_SSL: creds.verifySsl,
  };
}

export const sharedLogParamsSchema = {
  lines: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(100)
    .describe('Number of log lines to retrieve'),
  max_chars: z
    .number()
    .int()
    .min(1000)
    .max(100000)
    .default(20000)
    .describe('Maximum characters in response before truncation'),
  format: z
    .enum(['pretty', 'json'])
    .default('pretty')
    .describe('Output format style'),
  include_hidden: z
    .boolean()
    .default(false)
    .describe(
      'Include entries with hidden:true in build-logs output (default false — hidden entries are filtered out)',
    ),
  type: z
    .enum(['stdout', 'stderr', 'all'])
    .default('all')
    .describe(
      'Filter build-logs entries by type (default all — no filter). Applies only to the deployment_uuid (build-logs) path; ignored on runtime logs path.',
    ),
};

const logParamsObjectSchema = z.object(sharedLogParamsSchema);

export type ParsedLogParams = z.infer<typeof logParamsObjectSchema>;

export const sharedReadParamsSchema = {
  format: z
    .enum(['pretty', 'json', 'table'])
    .default('pretty')
    .describe('Output format style'),
  projection: z
    .enum(['summary', 'full'])
    .default('summary')
    .describe('Detail projection depth'),
  include_full: z
    .boolean()
    .optional()
    .describe('Alias for projection: full'),
  page: z
    .number()
    .int()
    .min(1)
    .default(1)
    .describe('Page number for pagination'),
  per_page: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(10)
    .describe('Items per page'),
  max_chars: z
    .number()
    .int()
    .min(1000)
    .max(100000)
    .default(16000)
    .describe('Maximum characters in text response before truncation'),
  reveal: z
    .boolean()
    .default(false)
    .describe(
      'Reveal sensitive/masked values in full projection (default false — secrets masked as ***)',
    ),
};

const readParamsObjectSchema = z.object(sharedReadParamsSchema);

export type ReadParamsInput = z.input<typeof readParamsObjectSchema>;

export interface ParsedReadParams {
  format: 'pretty' | 'json' | 'table';
  projection: ProjectionMode;
  include_full?: boolean;
  page: number;
  per_page: number;
  max_chars: number;
  reveal: boolean;
}

export function rejectTableFormatOnFullProjection(
  format: 'pretty' | 'json' | 'table',
  projection: ProjectionMode,
): void {
  if (format === 'table' && projection === 'full') {
    throw new CoolifyApiError({
      code: 'COOLIFY_422',
      message:
        'format: table is not supported with projection: full on get actions',
      recoveryHints: [
        'Use format: pretty or format: json for full projection output.',
        'Use projection: summary for tabular display of operational fields.',
      ],
    });
  }
}

export function parseReadParams(input: ReadParamsInput): ParsedReadParams {
  const parsed = readParamsObjectSchema.parse(input);
  const projection = resolveProjection(
    parsed.projection,
    parsed.include_full,
  );
  return {
    format: parsed.format,
    projection,
    include_full: parsed.include_full,
    page: parsed.page,
    per_page: parsed.per_page,
    max_chars: parsed.max_chars,
    reveal: parsed.reveal,
  };
}
