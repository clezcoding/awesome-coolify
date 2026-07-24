import * as z from 'zod/v4';
import type { EnvConfig } from '../../config/env.js';
import { resolveProjection, type ProjectionMode } from '../../utils/projections.js';
import { CoolifyApiError, RECOVERY_HINTS } from '../../utils/errors.js';
import { InstanceManager } from '../../utils/instance-registry.js';

/** Attached by createFlatActionSchema for action-aware parseWithInstanceRouting hints. */
export const ACTION_REQUIRED_FIELDS = Symbol('actionRequiredFields');
/** Attached by createFlatActionSchema for optional-field recovery hint lines. */
export const ACTION_ALLOWED_FIELDS = Symbol('actionAllowedFields');

type FlatActionSchemaMeta = {
  [ACTION_REQUIRED_FIELDS]?: Partial<Record<string, string[]>>;
  [ACTION_ALLOWED_FIELDS]?: Partial<Record<string, string[]>>;
};

/**
 * Flat top-level z.object + superRefine for MCP JSON Schema DX (D-01/D-02).
 * Replaces top-level z.discriminatedUnion at the MCP boundary while preserving
 * { action, ...fields } call shape (D-03).
 */
export function createFlatActionSchema<
  TAction extends string,
  TShape extends z.ZodRawShape,
>(
  actions: [TAction, ...TAction[]],
  shape: TShape,
  actionAllowedFields: Record<TAction, (keyof TShape | 'action')[]>,
  actionRequiredFields?: Partial<Record<TAction, (keyof TShape)[]>>,
  extraRefine?: (data: z.infer<z.ZodObject<{ action: z.ZodEnum<{ [K in TAction]: K }> } & TShape>>, ctx: z.RefinementCtx) => void,
) {
  const schema = z
    .object({
      action: z.enum(actions).describe('The action to run'),
      ...shape,
    })
    .strict()
    .superRefine((data, ctx) => {
      const action = data.action as TAction;
      const allowed = new Set<string>([
        'action',
        ...((actionAllowedFields[action] ?? []) as string[]),
      ]);
      const required = actionRequiredFields?.[action] ?? [];

      for (const reqField of required) {
        if (data[reqField as keyof typeof data] === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Action '${action}' requires field '${String(reqField)}'`,
            path: [reqField as string],
          });
        }
      }

      for (const key of Object.keys(data)) {
        if (key === 'instance') continue;
        if (!allowed.has(key)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Parameter '${key}' is not allowed for action '${action}'`,
            path: [key],
          });
        }
      }

      extraRefine?.(data, ctx);
    });

  const meta = schema as typeof schema & FlatActionSchemaMeta;
  meta[ACTION_REQUIRED_FIELDS] = actionRequiredFields as Partial<
    Record<string, string[]>
  >;
  meta[ACTION_ALLOWED_FIELDS] = actionAllowedFields as Partial<
    Record<string, string[]>
  >;
  return meta;
}

function readFlatActionMeta(schema: z.ZodType): FlatActionSchemaMeta {
  return schema as z.ZodType & FlatActionSchemaMeta;
}

function buildActionAwareRecoveryHints(
  action: unknown,
  schema: z.ZodType,
): string[] {
  const actionName = typeof action === 'string' ? action : 'unknown';
  const { [ACTION_REQUIRED_FIELDS]: requiredMap, [ACTION_ALLOWED_FIELDS]: allowedMap } =
    readFlatActionMeta(schema);

  if (!requiredMap && !allowedMap) {
    return RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR;
  }

  const required = (requiredMap?.[actionName] ?? []).map(String);
  const allowed = (allowedMap?.[actionName] ?? []).map(String);
  const optional = allowed.filter((field) => !required.includes(field));

  const hints: string[] = [];
  if (required.length > 0) {
    hints.push(`Action '${actionName}' requires: ${required.join(', ')}.`);
  }
  if (optional.length > 0) {
    hints.push(`Optional: ${optional.join(', ')}.`);
  }
  if (hints.length === 0) {
    return RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR;
  }
  hints.push(...RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR);
  return hints;
}

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
  const ctor = schema.constructor.name;
  if (ctor === 'ZodObject') {
    return (schema as z.ZodObject).extend(optionalInstanceParam);
  }
  throw new Error(
    `withInstanceRoutingSchema: unsupported schema type ${ctor} — flat z.object required post Phase 19 migration`,
  );
}

/** Strip + validate instance param without weakening inner strict action schemas. */
export function parseWithInstanceRouting<T extends Record<string, unknown>>(
  schema: z.ZodType<T>,
  args: unknown,
): T & { instance?: string } {
  const result = safeParseWithInstanceRouting(schema, args);
  if (!result.success) {
    const rawAction =
      typeof args === 'object' && args !== null
        ? (args as Record<string, unknown>).action
        : undefined;
    throw new CoolifyApiError({
      code: 'COOLIFY_VALIDATION_ERROR',
      message: result.error.issues.map((i) => i.message).join('; '),
      recoveryHints: buildActionAwareRecoveryHints(rawAction, schema),
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

/** Flat MCP schema fields — optional without defaults; parseReadParams applies defaults in handlers. */
export const sharedReadParamsFlatShape = {
  format: z
    .enum(['pretty', 'json', 'table'])
    .optional()
    .describe(sharedReadParamsSchema.format.description),
  projection: z
    .enum(['summary', 'full'])
    .optional()
    .describe(sharedReadParamsSchema.projection.description),
  include_full: sharedReadParamsSchema.include_full,
  page: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe(sharedReadParamsSchema.page.description),
  per_page: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe(sharedReadParamsSchema.per_page.description),
  max_chars: z
    .number()
    .int()
    .min(1000)
    .max(100000)
    .optional()
    .describe(sharedReadParamsSchema.max_chars.description),
  reveal: z
    .boolean()
    .optional()
    .describe(sharedReadParamsSchema.reveal.description),
} satisfies z.ZodRawShape;

/** Flat MCP log-param fields — optional without defaults; handlers apply defaults. */
export const sharedLogParamsFlatShape = {
  lines: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .optional()
    .describe(sharedLogParamsSchema.lines.description),
  max_chars: z
    .number()
    .int()
    .min(1000)
    .max(100000)
    .optional()
    .describe(sharedLogParamsSchema.max_chars.description),
  format: z
    .enum(['pretty', 'json'])
    .optional()
    .describe(sharedLogParamsSchema.format.description),
  include_hidden: z
    .boolean()
    .optional()
    .describe(sharedLogParamsSchema.include_hidden.description),
  type: z
    .enum(['stdout', 'stderr', 'all'])
    .optional()
    .describe(sharedLogParamsSchema.type.description),
} satisfies z.ZodRawShape;

/** Flat mutation response formatting — same bounds as sharedReadParamsFlatShape. */
export const mutationResponseParamsFlatShape = {
  format: z
    .enum(['pretty', 'json', 'table'])
    .optional()
    .describe('Output format (default pretty)'),
  max_chars: z
    .number()
    .int()
    .min(1000)
    .max(100000)
    .optional()
    .describe('Max formatted output characters (default 16000)'),
} satisfies z.ZodRawShape;

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
