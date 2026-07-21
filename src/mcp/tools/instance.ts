import * as z from 'zod/v4';
import type { EnvConfig } from '../../config/env.js';
import { buildReadResponse, type ReadResponse } from '../../utils/formatters.js';
import {
  CoolifyApiError,
  RECOVERY_HINTS,
  wrapMcpError,
  type CoolifyErrorCode,
  type McpErrorResult,
} from '../../utils/errors.js';
import {
  InstanceManager,
  type Instance,
  type Registry,
} from '../../utils/instance-registry.js';

const instanceNameSchema = z
  .string()
  .regex(/^[a-z][a-z0-9_-]{1,31}$/)
  .describe('Instance name (lowercase, 2–32 chars)');

const listActionSchema = z
  .object({
    action: z.literal('list'),
    reveal: z.boolean().optional().describe('Reveal token values (default masked)'),
  })
  .strict();

const getActionSchema = z
  .object({
    action: z.literal('get'),
    name: instanceNameSchema,
    reveal: z.boolean().optional().describe('Reveal token value (default masked)'),
  })
  .strict();

const addActionSchema = z
  .object({
    action: z.literal('add'),
    name: instanceNameSchema,
    url: z.string().url(),
    token: z.string().min(1),
    type: z.enum(['self-hosted', 'cloud']),
    verifySsl: z.boolean().default(true),
  })
  .strict();

const updateActionSchema = z
  .object({
    action: z.literal('update'),
    name: instanceNameSchema,
    url: z.string().url().optional(),
    token: z.string().min(1).optional(),
    type: z.enum(['self-hosted', 'cloud']).optional(),
    verifySsl: z.boolean().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const hasPatch =
      data.url !== undefined ||
      data.token !== undefined ||
      data.type !== undefined ||
      data.verifySsl !== undefined;
    if (!hasPatch) {
      ctx.addIssue({
        code: 'custom',
        message: 'At least one of url, token, type, or verifySsl is required for update',
        params: { code: 'COOLIFY_422' },
      });
    }
  });

const deleteActionSchema = z
  .object({
    action: z.literal('delete'),
    name: instanceNameSchema,
    confirm: z
      .boolean()
      .default(false)
      .describe('Explicit confirmation required for destructive delete'),
    force: z
      .boolean()
      .optional()
      .describe('Required when deleting the default or last remaining instance'),
  })
  .strict();

const setDefaultActionSchema = z
  .object({
    action: z.literal('set-default'),
    name: instanceNameSchema,
  })
  .strict();

const importEnvActionSchema = z
  .object({
    action: z.literal('import-env'),
    name: instanceNameSchema.optional().describe('Name for the imported entry (auto-derived from URL when omitted)'),
    type: z
      .enum(['self-hosted', 'cloud'])
      .optional()
      .describe('Instance type (default: cloud when hostname is *.coolify.io, else self-hosted)'),
    verifySsl: z.boolean().optional(),
  })
  .strict();

export const instanceActionSchema = z.discriminatedUnion('action', [
  listActionSchema,
  getActionSchema,
  addActionSchema,
  updateActionSchema,
  deleteActionSchema,
  setDefaultActionSchema,
  importEnvActionSchema,
]);

export type InstanceAction = z.infer<typeof instanceActionSchema>;

export type InstanceActionResult =
  | ReadResponse<Instance | Instance[] | Record<string, unknown>>
  | McpErrorResult;

function throwValidationError(error: z.ZodError): never {
  const customIssue = error.issues.find(
    (issue) =>
      typeof (issue as { params?: { code?: string } }).params?.code === 'string',
  );
  const code =
    ((customIssue as { params?: { code?: CoolifyErrorCode } } | undefined)?.params
      ?.code as CoolifyErrorCode | undefined) ?? 'COOLIFY_VALIDATION_ERROR';

  throw new CoolifyApiError({
    code,
    message: error.issues.map((issue) => issue.message).join('; '),
    recoveryHints: RECOVERY_HINTS[code] ?? RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
  });
}

function parseInstanceAction(args: unknown): InstanceAction {
  const parsed = instanceActionSchema.safeParse(args);
  if (!parsed.success) {
    throwValidationError(parsed.error);
  }
  return parsed.data;
}

function maskInstance(instance: Instance, reveal?: boolean): Instance {
  if (reveal) {
    return { ...instance };
  }
  return { ...instance, token: '***' };
}

function hasEnvOverride(env?: EnvConfig): boolean {
  const url = env?.COOLIFY_URL ?? process.env.COOLIFY_URL;
  const token = env?.COOLIFY_TOKEN ?? process.env.COOLIFY_TOKEN;
  return Boolean(url && token);
}

function resolveEnvCredentials(env?: EnvConfig): {
  url: string;
  token: string;
  verifySsl: boolean;
} {
  const url = (env?.COOLIFY_URL ?? process.env.COOLIFY_URL)?.trim();
  const token = (env?.COOLIFY_TOKEN ?? process.env.COOLIFY_TOKEN)?.trim();
  const hasUrl = Boolean(url);
  const hasToken = Boolean(token);

  if (hasUrl && hasToken) {
    const verifySsl =
      env?.COOLIFY_VERIFY_SSL ??
      (process.env.COOLIFY_VERIFY_SSL !== 'false');
    return { url: url!, token: token!, verifySsl };
  }

  if (hasUrl || hasToken) {
    throw new CoolifyApiError({
      code: 'COOLIFY_PARTIAL_ENV',
      message:
        'Partial environment configuration: both COOLIFY_URL and COOLIFY_TOKEN must be set, or neither',
      recoveryHints: RECOVERY_HINTS.COOLIFY_PARTIAL_ENV,
    });
  }

  throw new CoolifyApiError({
    code: 'COOLIFY_NO_INSTANCE',
    message: 'No Coolify credentials in environment to import',
    recoveryHints: RECOVERY_HINTS.COOLIFY_NO_INSTANCE,
  });
}

function deriveImportName(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    const sanitized = hostname.replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-');
    const trimmed = sanitized.replace(/^-+|-+$/g, '');
    if (/^[a-z][a-z0-9_-]{1,31}$/.test(trimmed)) {
      return trimmed;
    }
    const fallback = `i-${trimmed.slice(0, 30)}`.replace(/-+$/, '');
    if (/^[a-z][a-z0-9_-]{1,31}$/.test(fallback)) {
      return fallback;
    }
  } catch {
    /* invalid URL handled elsewhere */
  }
  return 'imported';
}

function rejectMaskedToken(token: string): void {
  if (token === '***') {
    throw new CoolifyApiError({
      code: 'COOLIFY_VALIDATION_ERROR',
      message:
        'Cannot persist masked placeholder token *** — pass the real token (use reveal:true on get if needed)',
      recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
    });
  }
}

function inferInstanceType(url: string): 'self-hosted' | 'cloud' {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname === 'coolify.io' || hostname.endsWith('.coolify.io')) {
      return 'cloud';
    }
  } catch {
    /* invalid URL handled by schema / resolveEnvCredentials */
  }
  return 'self-hosted';
}

function withEnvOverrideMeta<T extends ReadResponse<unknown>>(
  response: T,
  env?: EnvConfig,
): T {
  if (!hasEnvOverride(env)) {
    return response;
  }
  return {
    ...response,
    _meta: {
      ...response._meta,
      envOverride: true,
    } as T['_meta'] & { envOverride?: boolean },
  };
}

export async function handleInstanceAction(
  args: unknown,
  env?: EnvConfig,
): Promise<InstanceActionResult> {
  try {
    const parsed = parseInstanceAction(args);

    switch (parsed.action) {
      case 'list': {
        const instances = InstanceManager.list({ reveal: parsed.reveal });
        const response = buildReadResponse(instances);
        return withEnvOverrideMeta(response, env);
      }

      case 'get': {
        const instance = InstanceManager.get(parsed.name, { reveal: parsed.reveal });
        return buildReadResponse(instance);
      }

      case 'add': {
        rejectMaskedToken(parsed.token);
        let instance: Instance;
        try {
          instance = await InstanceManager.add(parsed);
        } catch (error) {
          if (error instanceof z.ZodError) {
            throwValidationError(error);
          }
          throw error;
        }
        return buildReadResponse(maskInstance(instance));
      }

      case 'update': {
        const patch: Partial<Omit<Instance, 'name'>> = {};
        if (parsed.url !== undefined) patch.url = parsed.url;
        if (parsed.token !== undefined) {
          rejectMaskedToken(parsed.token);
          patch.token = parsed.token;
        }
        if (parsed.type !== undefined) patch.type = parsed.type;
        if (parsed.verifySsl !== undefined) patch.verifySsl = parsed.verifySsl;

        const updated = await InstanceManager.update(parsed.name, patch);
        return buildReadResponse(maskInstance(updated));
      }

      case 'delete': {
        await InstanceManager.delete(parsed.name, {
          confirm: parsed.confirm,
          force: parsed.force,
        });
        return buildReadResponse({ ok: true, name: parsed.name });
      }

      case 'set-default': {
        await InstanceManager.setDefault(parsed.name);
        const registry: Registry = InstanceManager.loadRegistry();
        return buildReadResponse({ default: registry.default });
      }

      case 'import-env': {
        const creds = resolveEnvCredentials(env);
        rejectMaskedToken(creds.token);
        const name = parsed.name ?? deriveImportName(creds.url);
        const type = parsed.type ?? inferInstanceType(creds.url);
        let instance: Instance;
        try {
          instance = await InstanceManager.add({
            name,
            url: creds.url,
            token: creds.token,
            type,
            verifySsl: parsed.verifySsl ?? creds.verifySsl,
          });
        } catch (error) {
          if (error instanceof z.ZodError) {
            throwValidationError(error);
          }
          throw error;
        }
        return buildReadResponse(maskInstance(instance));
      }

      default: {
        const _exhaustive: never = parsed;
        throw new Error(`Unknown instance action: ${String(_exhaustive)}`);
      }
    }
  } catch (error) {
    return wrapMcpError(error);
  }
}

export function isInstanceErrorResult(
  result: InstanceActionResult,
): result is McpErrorResult {
  return 'isError' in result && result.isError === true;
}
