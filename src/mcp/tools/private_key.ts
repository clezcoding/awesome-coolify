import * as z from 'zod/v4';
import { readFileSync } from 'node:fs';
import type { EnvConfig } from '../config/env.js';
import {
  createPrivateKey,
  deletePrivateKey,
  fetchPrivateKey,
  fetchPrivateKeys,
  fetchServers,
  updatePrivateKey,
} from '../../api/client.js';
import { buildReadResponse, paginateArray, type ReadResponse } from '../../utils/formatters.js';
import {
  CoolifyApiError,
  RECOVERY_HINTS,
  wrapMcpError,
  type CoolifyErrorCode,
  type McpErrorResult,
} from '../../utils/errors.js';
import {
  createFlatActionSchema,
  rejectTableFormatOnFullProjection,
  resolveRoutingEnv,
  safeParseWithInstanceRouting,
  sharedReadParamsFlatShape,
} from './shared-read-params.js';
import {
  resolveProjection,
  sanitizeFullProjection,
} from '../../utils/projections.js';

const mutationResponseParamsFlatShape = {
  format: z
    .enum(['pretty', 'json', 'table'])
    .optional()
    .describe('Output format (default pretty)'),
  max_chars: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Max formatted output characters (default 16000)'),
};

const privateKeyReadParamKeys = [
  'format',
  'projection',
  'include_full',
  'page',
  'per_page',
  'max_chars',
  'reveal',
] as const;

export const privateKeyActionsCatalog =
  'Actions: list(format?, page?, per_page?) · get(uuid, format?, projection?, reveal?) · create(name, private_key?, key_file?) · update(uuid) · delete(uuid, confirm) · delete_preview(uuid)';

export const privateKeySafetyFooter =
  'Safety: confirm for destructive ops · optional instance · reveal opt-in only';

export const privateKeyActionSchema = createFlatActionSchema(
  ['list', 'get', 'create', 'update', 'delete', 'delete_preview'],
  {
    uuid: z.string().optional().describe('Private key UUID'),
    name: z.string().optional().describe('Private key name'),
    description: z.string().optional().describe('Optional description'),
    private_key: z.string().optional().describe('Inline PEM material'),
    key_file: z.string().optional().describe('Local filesystem path to PEM file'),
    confirm: z
      .boolean()
      .optional()
      .describe('Explicit confirmation required for destructive delete'),
    ...sharedReadParamsFlatShape,
    ...mutationResponseParamsFlatShape,
  },
  {
    list: [...privateKeyReadParamKeys],
    get: ['uuid', ...privateKeyReadParamKeys],
    create: ['name', 'description', 'private_key', 'key_file', 'format', 'max_chars'],
    update: ['uuid', 'name', 'description', 'private_key', 'format', 'max_chars'],
    delete: ['uuid', 'confirm', 'format', 'max_chars'],
    delete_preview: ['uuid', 'format', 'max_chars'],
  },
  {
    get: ['uuid'],
    create: ['name'],
    update: ['uuid'],
    delete: ['uuid'],
    delete_preview: ['uuid'],
  },
  (data, ctx) => {
    if (data.action === 'create') {
      const hasInline =
        typeof data.private_key === 'string' && data.private_key.length > 0;
      const hasFile =
        typeof data.key_file === 'string' && data.key_file.length > 0;

      if (hasInline === hasFile) {
        ctx.addIssue({
          code: 'custom',
          message:
            'Exactly one of private_key (inline PEM) or key_file (local path) is required',
          params: { code: 'COOLIFY_422' },
        });
      }
    }
  },
);

export type PrivateKeyAction = z.infer<typeof privateKeyActionSchema>;

export type PrivateKeySummary = {
  uuid: string;
  name: string;
  fingerprint?: string;
  description?: string;
};

export type PrivateKeyActionResult =
  | ReadResponse<PrivateKeySummary | PrivateKeySummary[] | Record<string, unknown>>
  | McpErrorResult;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function throwValidationError(error: z.ZodError): never {
  const customIssue = error.issues.find(
    (issue) =>
      typeof (issue as { params?: { code?: string } }).params?.code === 'string',
  );
  const code =
    ((customIssue as { params?: { code?: CoolifyErrorCode } } | undefined)?.params
      ?.code as CoolifyErrorCode | undefined) ?? 'COOLIFY_422';

  throw new CoolifyApiError({
    code,
    message: error.issues.map((issue) => issue.message).join('; '),
    recoveryHints: RECOVERY_HINTS[code] ?? RECOVERY_HINTS.COOLIFY_422,
  });
}

function parsePrivateKeyAction(
  args: unknown,
): PrivateKeyAction & { instance?: string } {
  const parsed = safeParseWithInstanceRouting(privateKeyActionSchema, args);
  if (!parsed.success) {
    throwValidationError(parsed.error);
  }
  return parsed.data;
}

function projectPrivateKeySummary(raw: Record<string, unknown>): PrivateKeySummary {
  const summary: PrivateKeySummary = {
    uuid: String(raw.uuid ?? ''),
    name: String(raw.name ?? ''),
  };

  if (raw.fingerprint != null && String(raw.fingerprint).length > 0) {
    summary.fingerprint = String(raw.fingerprint);
  }
  if (raw.description != null && String(raw.description).length > 0) {
    summary.description = String(raw.description);
  }

  return summary;
}

function stripPemFields(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (/private_key|pem/i.test(key)) {
      continue;
    }
    if (isRecord(value)) {
      result[key] = stripPemFields(value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

function buildCreateResponse(
  created: Record<string, unknown>,
  fetched?: Record<string, unknown>,
): Record<string, unknown> {
  const response: Record<string, unknown> = {
    uuid: String(created.uuid ?? fetched?.uuid ?? ''),
    name: String(created.name ?? fetched?.name ?? ''),
  };

  const fingerprint = created.fingerprint ?? fetched?.fingerprint;
  if (fingerprint != null && String(fingerprint).length > 0) {
    response.fingerprint = String(fingerprint);
  }

  return response;
}

async function findDependentServers(
  env: EnvConfig,
  keyUuid: string,
): Promise<Array<{ uuid: string; name?: string }>> {
  const rawKey = await fetchPrivateKey(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    keyUuid,
    env.COOLIFY_VERIFY_SSL,
  );
  const keyRecord = isRecord(rawKey) ? rawKey : {};
  const keyId = keyRecord.id;

  const servers = await fetchServers(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    env.COOLIFY_VERIFY_SSL,
  );

  return servers
    .filter(isRecord)
    .filter((server) => String(server.private_key_id) === String(keyId))
    .map((server) => ({
      uuid: String(server.uuid ?? ''),
      ...(typeof server.name === 'string' ? { name: server.name } : {}),
    }));
}

function validateDeleteConfirm(confirm: boolean, uuid: string): void {
  if (confirm === true) {
    return;
  }

  throw new CoolifyApiError({
    code: 'COOLIFY_CONFIRM_REQUIRED',
    message: `Action 'delete' on private key '${uuid}' requires explicit confirmation.`,
    recoveryHints: RECOVERY_HINTS.COOLIFY_CONFIRM_REQUIRED,
    data: {
      action: 'delete',
      uuid,
    },
  });
}

export async function handlePrivateKeyAction(
  args: unknown,
  env: EnvConfig,
): Promise<PrivateKeyActionResult> {
  try {
    const parsed = parsePrivateKeyAction(args);
    const routingEnv = resolveRoutingEnv(env, parsed.instance);

    switch (parsed.action) {
      case 'list': {
        if (parsed.reveal === true) {
          throw new CoolifyApiError({
            code: 'COOLIFY_422',
            message:
              'private_key list does not support reveal:true — PEM material is never returned (D-11).',
            recoveryHints: RECOVERY_HINTS.COOLIFY_422,
          });
        }

        const rawKeys = await fetchPrivateKeys(
          routingEnv.COOLIFY_URL,
          routingEnv.COOLIFY_TOKEN,
          routingEnv.COOLIFY_VERIFY_SSL,
        );

        const summaries = rawKeys
          .filter(isRecord)
          .map((raw) => projectPrivateKeySummary(raw));

        const page = parsed.page ?? 1;
        const perPage = parsed.per_page ?? 10;
        const paginated = paginateArray(summaries, page, perPage);

        return buildReadResponse(paginated, {
          format: parsed.format,
          max_chars: parsed.max_chars,
          page,
          per_page: perPage,
          total: summaries.length,
        });
      }

      case 'get': {
        const projection = resolveProjection(
          parsed.projection,
          parsed.include_full,
        );

        rejectTableFormatOnFullProjection(parsed.format, projection);

        const raw = await fetchPrivateKey(
          routingEnv.COOLIFY_URL,
          routingEnv.COOLIFY_TOKEN,
          parsed.uuid,
          routingEnv.COOLIFY_VERIFY_SSL,
        );
        const rawRecord = isRecord(raw) ? raw : {};

        const data =
          projection === 'full'
            ? stripPemFields(
                sanitizeFullProjection(raw, parsed.reveal) as Record<string, unknown>,
              )
            : projectPrivateKeySummary(rawRecord);

        return buildReadResponse(data, {
          format: parsed.format,
          max_chars: parsed.max_chars,
        });
      }

      case 'create': {
        const pem =
          typeof parsed.private_key === 'string'
            ? parsed.private_key
            : readFileSync(parsed.key_file!, 'utf8');

        const created = await createPrivateKey(
          routingEnv.COOLIFY_URL,
          routingEnv.COOLIFY_TOKEN,
          {
            name: parsed.name,
            private_key: pem,
            ...(parsed.description ? { description: parsed.description } : {}),
          },
          routingEnv.COOLIFY_VERIFY_SSL,
        );

        const createdRecord = isRecord(created) ? created : {};
        let fetchedRecord: Record<string, unknown> | undefined;

        if (
          createdRecord.fingerprint == null &&
          typeof createdRecord.uuid === 'string'
        ) {
          const fetched = await fetchPrivateKey(
            routingEnv.COOLIFY_URL,
            routingEnv.COOLIFY_TOKEN,
            createdRecord.uuid,
            routingEnv.COOLIFY_VERIFY_SSL,
          );
          fetchedRecord = isRecord(fetched) ? fetched : undefined;
        }

        return buildReadResponse(
          buildCreateResponse(createdRecord, fetchedRecord),
          {
            format: parsed.format,
            max_chars: parsed.max_chars,
          },
        );
      }

      case 'update': {
        const payload: {
          name?: string;
          description?: string;
          private_key?: string;
        } = {};

        if (parsed.name !== undefined) payload.name = parsed.name;
        if (parsed.description !== undefined) payload.description = parsed.description;
        if (parsed.private_key !== undefined) payload.private_key = parsed.private_key;

        const updated = await updatePrivateKey(
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

        if (updatedRecord.name != null) response.name = String(updatedRecord.name);
        if (updatedRecord.description != null) {
          response.description = String(updatedRecord.description);
        }
        if (updatedRecord.fingerprint != null) {
          response.fingerprint = String(updatedRecord.fingerprint);
        }

        return buildReadResponse(stripPemFields(response), {
          format: parsed.format,
          max_chars: parsed.max_chars,
        });
      }

      case 'delete': {
        validateDeleteConfirm(parsed.confirm, parsed.uuid);

        const dependents = await findDependentServers(routingEnv, parsed.uuid);
        if (dependents.length > 0) {
          throw new CoolifyApiError({
            code: 'COOLIFY_409',
            message:
              'Private key is still referenced by one or more servers and cannot be deleted.',
            recoveryHints: RECOVERY_HINTS.COOLIFY_409,
            data: {
              dependent_server_uuids: dependents.map((server) => server.uuid),
            },
          });
        }

        await deletePrivateKey(
          routingEnv.COOLIFY_URL,
          routingEnv.COOLIFY_TOKEN,
          parsed.uuid,
          routingEnv.COOLIFY_VERIFY_SSL,
        );

        return buildReadResponse(
          { ok: true, uuid: parsed.uuid },
          {
            format: parsed.format,
            max_chars: parsed.max_chars,
          },
        );
      }

      case 'delete_preview': {
        const dependents = await findDependentServers(routingEnv, parsed.uuid);

        return buildReadResponse(
          {
            uuid: parsed.uuid,
            dependents,
            would_delete: dependents.length === 0,
          },
          {
            format: parsed.format,
            max_chars: parsed.max_chars,
          },
        );
      }

      default: {
        const _exhaustive: never = parsed;
        throw new Error(`Unknown private_key action: ${String(_exhaustive)}`);
      }
    }
  } catch (error) {
    return wrapMcpError(error);
  }
}

export function isPrivateKeyErrorResult(
  result: PrivateKeyActionResult,
): result is McpErrorResult {
  return 'isError' in result && result.isError === true;
}
