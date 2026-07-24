import * as z from 'zod/v4';
import type { EnvConfig } from '../config/env.js';
import {
  createServer,
  deleteServer,
  fetchPrivateKeys,
  fetchServer,
  fetchServerResources,
  pollServerUntilReachable,
  updateServer,
  validateServer,
} from '../../api/client.js';
import { buildReadResponse, type ReadResponse } from '../../utils/formatters.js';
import {
  CoolifyApiError,
  RECOVERY_HINTS,
  wrapMcpError,
  type McpErrorResult,
} from '../../utils/errors.js';
import {
  createFlatActionSchema,
  mutationResponseParamsFlatShape,
  parseWithInstanceRouting,
  rejectTableFormatOnFullProjection,
  resolveRoutingEnv,
  sharedReadParamsFlatShape,
} from './shared-read-params.js';
import {
  resolveProjection,
  sanitizeFullProjection,
} from '../../utils/projections.js';

const DEFAULT_VALIDATE_TIMEOUT_SEC = 30;
const DEFAULT_VALIDATE_TIMEOUT_MS = DEFAULT_VALIDATE_TIMEOUT_SEC * 1000;

const serverReadParamKeys = [
  'format',
  'projection',
  'include_full',
  'page',
  'per_page',
  'max_chars',
  'reveal',
] as const;

export const serverActionsCatalog =
  'Actions: get(uuid, format?, projection?, reveal?) · create(name, ip, private_key_uuid) · update(uuid) · delete(uuid, confirm) · delete_preview(uuid) · validate(uuid, timeout?)';

export const serverSafetyFooter =
  'Safety: confirm for destructive ops · optional instance · reveal opt-in only';

export const serverActionSchema = createFlatActionSchema(
  ['get', 'create', 'update', 'delete', 'delete_preview', 'validate'],
  {
    uuid: z.string().optional().describe('Server UUID'),
    name: z.string().optional().describe('Server display name'),
    ip: z.string().optional().describe('Server IP address or hostname'),
    port: z.number().int().optional().describe('SSH port (default 22)'),
    user: z.string().optional().describe('SSH user (default root)'),
    private_key_uuid: z
      .string()
      .optional()
      .describe('Private key UUID for SSH auth'),
    is_build_server: z.boolean().optional().describe('Mark as build server'),
    validate: z
      .boolean()
      .optional()
      .describe('Auto-run reachability validation after create (default true)'),
    proxy_type: z
      .enum(['traefik', 'caddy', 'none'])
      .optional()
      .describe('Proxy type on the server'),
    description: z.string().optional().describe('Updated description'),
    concurrent_builds: z.number().int().optional().describe('Concurrent build limit'),
    dynamic_timeout: z.number().int().optional().describe('Dynamic timeout seconds'),
    deployment_queue_limit: z
      .number()
      .int()
      .optional()
      .describe('Deployment queue limit'),
    connection_timeout: z
      .number()
      .int()
      .optional()
      .describe('Connection timeout seconds'),
    confirm: z
      .boolean()
      .optional()
      .describe('Explicit confirmation required for destructive delete'),
    delete_volumes: z
      .boolean()
      .optional()
      .describe('Also delete attached volumes (default false)'),
    timeout: z
      .number()
      .int()
      .optional()
      .describe('Validation poll timeout in seconds (default 30)'),
    ...sharedReadParamsFlatShape,
    ...mutationResponseParamsFlatShape,
  },
  {
    get: ['uuid', ...serverReadParamKeys],
    create: [
      'name',
      'ip',
      'port',
      'user',
      'private_key_uuid',
      'is_build_server',
      'validate',
      'proxy_type',
      'format',
      'max_chars',
    ],
    update: [
      'uuid',
      'name',
      'description',
      'ip',
      'port',
      'user',
      'private_key_uuid',
      'is_build_server',
      'proxy_type',
      'concurrent_builds',
      'dynamic_timeout',
      'deployment_queue_limit',
      'connection_timeout',
      'format',
      'max_chars',
    ],
    delete: ['uuid', 'confirm', 'delete_volumes', 'format', 'max_chars'],
    delete_preview: ['uuid', 'format', 'max_chars'],
    validate: ['uuid', 'timeout', 'format', 'max_chars'],
  },
  {
    get: ['uuid'],
    create: ['name', 'ip', 'private_key_uuid'],
    update: ['uuid'],
    delete: ['uuid'],
    delete_preview: ['uuid'],
    validate: ['uuid'],
  },
);

export type ServerAction = z.infer<typeof serverActionSchema>;

export type ServerActionResult =
  | ReadResponse<Record<string, unknown>>
  | McpErrorResult;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function resolvePrivateKeyUuidFromId(
  keys: unknown[],
  id: unknown,
): string | null {
  if (id == null) {
    return null;
  }

  const match = keys.filter(isRecord).find((key) => String(key.id) === String(id));
  if (!match || match.uuid == null) {
    return null;
  }

  return String(match.uuid);
}

function getReachableFlag(server: Record<string, unknown>): boolean | undefined {
  const settings = server.settings;
  if (!isRecord(settings)) {
    return undefined;
  }
  const reachable = settings.is_reachable;
  if (reachable === true || reachable === false) {
    return reachable;
  }
  return undefined;
}

type ValidationResult = {
  status?: 'valid' | 'skipped' | 'pending';
  reachable?: boolean;
  recoveryHints?: string[];
};

async function runValidationCycle(
  env: EnvConfig,
  uuid: string,
  timeoutMs: number,
): Promise<ValidationResult> {
  await validateServer(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    uuid,
    env.COOLIFY_VERIFY_SSL,
  );

  const server = await pollServerUntilReachable(
    async () => {
      const raw = await fetchServer(
        env.COOLIFY_URL,
        env.COOLIFY_TOKEN,
        uuid,
        env.COOLIFY_VERIFY_SSL,
      );
      return isRecord(raw) ? raw : {};
    },
    timeoutMs,
  );

  const reachable = getReachableFlag(server);

  if (reachable === true) {
    return { status: 'valid', reachable: true };
  }

  if (reachable === false) {
    return {
      reachable: false,
      recoveryHints: RECOVERY_HINTS.COOLIFY_SSH_UNREACHABLE,
    };
  }

  return {
    status: 'pending',
    recoveryHints: [
      'Validation is still in progress — retry server.validate or check reachability in the Coolify UI.',
    ],
  };
}

function projectServerSummary(
  raw: Record<string, unknown>,
  privateKeyUuid: string | null,
): Record<string, unknown> {
  const reachable = getReachableFlag(raw);

  return {
    uuid: String(raw.uuid ?? ''),
    name: String(raw.name ?? ''),
    ip: String(raw.ip ?? ''),
    port: raw.port != null ? Number(raw.port) : undefined,
    user: raw.user != null ? String(raw.user) : undefined,
    private_key_uuid: privateKeyUuid,
    is_build_server:
      raw.is_build_server != null ? Boolean(raw.is_build_server) : undefined,
    reachable,
  };
}

function validateDeleteConfirm(confirm: boolean, uuid: string): void {
  if (confirm === true) {
    return;
  }

  throw new CoolifyApiError({
    code: 'COOLIFY_CONFIRM_REQUIRED',
    message: `Action 'delete' on server '${uuid}' requires explicit confirmation.`,
    recoveryHints: RECOVERY_HINTS.COOLIFY_CONFIRM_REQUIRED,
    data: {
      action: 'delete',
      uuid,
    },
  });
}

function buildUpdatePayload(
  parsed: z.infer<typeof updateActionSchema>,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (parsed.name !== undefined) payload.name = parsed.name;
  if (parsed.description !== undefined) payload.description = parsed.description;
  if (parsed.ip !== undefined) payload.ip = parsed.ip;
  if (parsed.port !== undefined) payload.port = parsed.port;
  if (parsed.user !== undefined) payload.user = parsed.user;
  if (parsed.private_key_uuid !== undefined) {
    payload.private_key_uuid = parsed.private_key_uuid;
  }
  if (parsed.is_build_server !== undefined) {
    payload.is_build_server = parsed.is_build_server;
  }
  if (parsed.proxy_type !== undefined) payload.proxy_type = parsed.proxy_type;
  if (parsed.concurrent_builds !== undefined) {
    payload.concurrent_builds = parsed.concurrent_builds;
  }
  if (parsed.dynamic_timeout !== undefined) {
    payload.dynamic_timeout = parsed.dynamic_timeout;
  }
  if (parsed.deployment_queue_limit !== undefined) {
    payload.deployment_queue_limit = parsed.deployment_queue_limit;
  }
  if (parsed.connection_timeout !== undefined) {
    payload.connection_timeout = parsed.connection_timeout;
  }

  return payload;
}

export async function handleServerAction(
  args: unknown,
  env: EnvConfig,
): Promise<ServerActionResult> {
  try {
    const parsed = parseWithInstanceRouting(serverActionSchema, args);
    const routingEnv = resolveRoutingEnv(env, parsed.instance);

    switch (parsed.action) {
      case 'get': {
        const projection = resolveProjection(
          parsed.projection,
          parsed.include_full,
        );

        rejectTableFormatOnFullProjection(parsed.format, projection);

        const raw = await fetchServer(
          routingEnv.COOLIFY_URL,
          routingEnv.COOLIFY_TOKEN,
          parsed.uuid,
          routingEnv.COOLIFY_VERIFY_SSL,
        );
        const rawRecord = isRecord(raw) ? raw : {};

        const keys = await fetchPrivateKeys(
          routingEnv.COOLIFY_URL,
          routingEnv.COOLIFY_TOKEN,
          routingEnv.COOLIFY_VERIFY_SSL,
        );
        const privateKeyUuid = resolvePrivateKeyUuidFromId(
          keys,
          rawRecord.private_key_id,
        );

        const data =
          projection === 'full'
            ? (sanitizeFullProjection(raw, parsed.reveal) as Record<string, unknown>)
            : projectServerSummary(rawRecord, privateKeyUuid);

        return buildReadResponse(data, {
          format: parsed.format,
          max_chars: parsed.max_chars,
        });
      }

      case 'create': {
        const created = await createServer(
          routingEnv.COOLIFY_URL,
          routingEnv.COOLIFY_TOKEN,
          {
            name: parsed.name,
            ip: parsed.ip,
            port: parsed.port,
            user: parsed.user,
            private_key_uuid: parsed.private_key_uuid,
            ...(parsed.is_build_server !== undefined
              ? { is_build_server: parsed.is_build_server }
              : {}),
            ...(parsed.proxy_type !== undefined
              ? { proxy_type: parsed.proxy_type }
              : {}),
          },
          routingEnv.COOLIFY_VERIFY_SSL,
        );

        const createdRecord = isRecord(created) ? created : {};
        const uuid = String(createdRecord.uuid ?? '');

        if (parsed.validate === false) {
          return buildReadResponse(
            {
              uuid,
              validation: { status: 'skipped' },
            },
            {
              format: parsed.format,
              max_chars: parsed.max_chars,
            },
          );
        }

        const validation = await runValidationCycle(
          routingEnv,
          uuid,
          DEFAULT_VALIDATE_TIMEOUT_MS,
        );

        return buildReadResponse(
          {
            uuid,
            validation,
          },
          {
            format: parsed.format,
            max_chars: parsed.max_chars,
          },
        );
      }

      case 'update': {
        const payload = buildUpdatePayload(parsed);

        const updated = await updateServer(
          routingEnv.COOLIFY_URL,
          routingEnv.COOLIFY_TOKEN,
          parsed.uuid,
          payload,
          routingEnv.COOLIFY_VERIFY_SSL,
        );

        const updatedRecord = isRecord(updated) ? updated : {};
        const response: Record<string, unknown> = {
          uuid: String(updatedRecord.uuid ?? parsed.uuid),
        };

        for (const key of Object.keys(payload)) {
          if (updatedRecord[key] !== undefined) {
            response[key] = updatedRecord[key];
          } else if (payload[key] !== undefined) {
            response[key] = payload[key];
          }
        }

        return buildReadResponse(response, {
          format: parsed.format,
          max_chars: parsed.max_chars,
        });
      }

      case 'delete': {
        validateDeleteConfirm(parsed.confirm, parsed.uuid);

        const deleteVolumes = parsed.delete_volumes ?? false;

        await deleteServer(
          routingEnv.COOLIFY_URL,
          routingEnv.COOLIFY_TOKEN,
          parsed.uuid,
          routingEnv.COOLIFY_VERIFY_SSL,
          deleteVolumes,
        );

        return buildReadResponse(
          {
            ok: true,
            uuid: parsed.uuid,
            deleted: true,
            delete_volumes: deleteVolumes,
          },
          {
            format: parsed.format,
            max_chars: parsed.max_chars,
          },
        );
      }

      case 'delete_preview': {
        const resources = await fetchServerResources(
          routingEnv.COOLIFY_URL,
          routingEnv.COOLIFY_TOKEN,
          parsed.uuid,
          routingEnv.COOLIFY_VERIFY_SSL,
        );

        const childResources = resources.filter(isRecord).map((resource) => ({
          uuid: String(resource.uuid ?? ''),
          name: resource.name != null ? String(resource.name) : undefined,
          type: resource.type != null ? String(resource.type) : undefined,
        }));

        const response: Record<string, unknown> = {
          uuid: parsed.uuid,
          child_resources: childResources,
          would_delete: true,
        };

        if (childResources.length > 0) {
          response.warning =
            'Server has child resources that will also be removed or orphaned — review child_resources before confirming delete.';
        }

        return buildReadResponse(response, {
          format: parsed.format,
          max_chars: parsed.max_chars,
        });
      }

      case 'validate': {
        const timeoutMs = (parsed.timeout ?? DEFAULT_VALIDATE_TIMEOUT_SEC) * 1000;
        const validation = await runValidationCycle(routingEnv, parsed.uuid, timeoutMs);

        return buildReadResponse(
          {
            uuid: parsed.uuid,
            validation,
          },
          {
            format: parsed.format,
            max_chars: parsed.max_chars,
          },
        );
      }

      default: {
        const _exhaustive: never = parsed;
        throw new Error(`Unknown server action: ${String(_exhaustive)}`);
      }
    }
  } catch (error) {
    return wrapMcpError(error);
  }
}

export function isServerErrorResult(
  result: ServerActionResult,
): result is McpErrorResult {
  return 'isError' in result && result.isError === true;
}
