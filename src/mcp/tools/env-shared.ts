import type { Env, EnvBulkEntry } from '../../api/client.js';
import type { ReadResponse } from '../../utils/formatters.js';
import { CoolifyApiError, RECOVERY_HINTS } from '../../utils/errors.js';
import { sanitizeFullProjection } from '../../utils/projections.js';

export const ASK_HUMAN_REVEAL_HINT =
  'ask_human_reveal: confirm with the human that they want revealed values before retrying with reveal: true';

export function maskEnvRecord(
  env: Env,
  reveal: boolean,
): Record<string, unknown> {
  const projected = sanitizeFullProjection(env, reveal) as Record<
    string,
    unknown
  >;

  if (!reveal && typeof projected.value === 'string') {
    projected.value = '***';
  }

  return projected;
}

export function maskEnvRecords(
  envs: Env[],
  reveal: boolean,
): Array<Record<string, unknown>> {
  return envs.map((env) => maskEnvRecord(env, reveal));
}

export function withRevealRecoveryHints<T extends ReadResponse<unknown>>(
  response: T,
  reveal: boolean,
): T & { recoveryHints?: string[] } {
  if (!reveal) {
    return response;
  }

  return {
    ...response,
    recoveryHints: [ASK_HUMAN_REVEAL_HINT],
  };
}

export function buildEnvBulkEntry(input: {
  key: string;
  value: string;
  is_preview?: boolean;
  is_literal?: boolean;
  is_multiline?: boolean;
  is_shown_once?: boolean;
}): EnvBulkEntry {
  const entry: EnvBulkEntry = {
    key: input.key,
    value: input.value,
  };

  if (input.is_preview !== undefined) {
    entry.is_preview = input.is_preview;
  }
  if (input.is_literal !== undefined) {
    entry.is_literal = input.is_literal;
  }
  if (input.is_multiline !== undefined) {
    entry.is_multiline = input.is_multiline;
  }
  if (input.is_shown_once !== undefined) {
    entry.is_shown_once = input.is_shown_once;
  }

  return entry;
}

export function validateEnvMutationConfirm(
  confirm: boolean,
  action: string,
  uuid: string,
  resourceLabel: string,
): void {
  if (confirm === true) {
    return;
  }

  throw new CoolifyApiError({
    code: 'COOLIFY_CONFIRM_REQUIRED',
    message: `Action '${action}' on ${resourceLabel} '${uuid}' requires explicit confirmation.`,
    recoveryHints: RECOVERY_HINTS.COOLIFY_CONFIRM_REQUIRED,
    data: {
      action,
      uuid,
    },
  });
}

export function resolveEnvIdentity(
  envs: Env[],
  input: { env_uuid?: string; key?: string },
  resourceLabel: string,
): Env {
  if (input.env_uuid) {
    const matches = envs.filter((env) => env.uuid === input.env_uuid);
    if (matches.length === 0) {
      throw new CoolifyApiError({
        code: 'COOLIFY_404',
        message: `No environment variable matched env_uuid '${input.env_uuid}'.`,
        recoveryHints: [
          `Check that the env UUID exists on this ${resourceLabel}.`,
          'Use envs:list to enumerate environment variables.',
        ],
      });
    }
    if (matches.length > 1) {
      throw new CoolifyApiError({
        code: 'COOLIFY_AMBIGUOUS_MATCH',
        message:
          'Multiple environment variables matched env_uuid — refusing to mutate.',
        recoveryHints: [
          'Re-run with an explicit env_uuid from envs:list.',
        ],
      });
    }
    return matches[0];
  }

  if (input.key) {
    const matches = envs.filter((env) => env.key === input.key);
    if (matches.length === 0) {
      throw new CoolifyApiError({
        code: 'COOLIFY_404',
        message: `No environment variable matched key '${input.key}'.`,
        recoveryHints: [
          `Check that the env key exists on this ${resourceLabel}.`,
          'Use envs:list to enumerate environment variables.',
        ],
      });
    }
    if (matches.length > 1) {
      throw new CoolifyApiError({
        code: 'COOLIFY_AMBIGUOUS_MATCH',
        message:
          'Multiple environment variables matched key — refusing to mutate. Re-run with env_uuid.',
        recoveryHints: [
          'Re-run with an explicit env_uuid from envs:list.',
          'Multiple env vars share this key — pass env_uuid directly.',
        ],
      });
    }
    return matches[0];
  }

  throw new CoolifyApiError({
    code: 'COOLIFY_VALIDATION_ERROR',
    message: 'At least one of env_uuid or key is required.',
    recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
  });
}
