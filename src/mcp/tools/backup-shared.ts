import * as z from 'zod/v4';
import { CoolifyApiError, RECOVERY_HINTS } from '../../utils/errors.js';
import { sanitizeFullProjection } from '../../utils/projections.js';
import { ASK_HUMAN_REVEAL_HINT } from './env-shared.js';

export { ASK_HUMAN_REVEAL_HINT };

export const BACKUP_FREQUENCY_PRESETS = [
  'every_minute',
  'hourly',
  'daily',
  'weekly',
  'monthly',
  'yearly',
] as const;

export const backupFrequencyCreateSchema = z.string().min(1);

export const backupFrequencyUpdateSchema = z.enum(BACKUP_FREQUENCY_PRESETS);

const S3_CREDENTIAL_KEYS = new Set([
  'secret_key',
  'secret_access_key',
  'access_key',
  'session_token',
  'token',
  'password',
  'key',
]);

function omitUndefined(
  body: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

export function maskBackupConfig(
  raw: unknown,
  reveal: boolean,
): Record<string, unknown> {
  const projected = sanitizeFullProjection(raw, reveal) as Record<
    string,
    unknown
  >;

  if (!reveal) {
    const maskCredentials = (obj: Record<string, unknown>): void => {
      for (const [key, value] of Object.entries(obj)) {
        if (
          typeof value === 'object' &&
          value !== null &&
          !Array.isArray(value)
        ) {
          maskCredentials(value as Record<string, unknown>);
        } else if (S3_CREDENTIAL_KEYS.has(key) && typeof value === 'string') {
          obj[key] = '***';
        }
      }
    };
    maskCredentials(projected);
  }

  return projected;
}

export function validateBackupDeleteConfirm(
  confirm: boolean,
  deleteS3: boolean,
  dbUuid: string,
  scheduledBackupUuid: string,
): void {
  if (confirm === true) {
    return;
  }

  const s3Note = deleteS3
    ? ' Purging S3 backup artifacts requires explicit confirmation.'
    : '';

  throw new CoolifyApiError({
    code: 'COOLIFY_CONFIRM_REQUIRED',
    message: `Action 'backup:delete' on database '${dbUuid}' backup '${scheduledBackupUuid}' requires explicit confirmation.${s3Note}`,
    recoveryHints: RECOVERY_HINTS.COOLIFY_CONFIRM_REQUIRED,
    data: {
      action: 'backup:delete',
      uuid: dbUuid,
      scheduled_backup_uuid: scheduledBackupUuid,
      delete_s3: deleteS3,
    },
  });
}

export interface BackupCreateFields {
  frequency: string;
  enabled?: boolean;
  save_s3?: boolean;
  s3_storage_uuid?: string;
  databases_to_backup?: string;
  dump_all?: boolean;
  backup_now?: boolean;
  database_backup_retention_amount_locally?: number;
  database_backup_retention_days_locally?: number;
  database_backup_retention_max_storage_locally?: number;
  database_backup_retention_amount_s3?: number;
  database_backup_retention_days_s3?: number;
  database_backup_retention_max_storage_s3?: number;
  timeout?: number;
}

export interface BackupUpdateFields {
  frequency?: string;
  enabled?: boolean;
  save_s3?: boolean;
  s3_storage_uuid?: string;
  databases_to_backup?: string;
  dump_all?: boolean;
  backup_now?: boolean;
  database_backup_retention_amount_locally?: number;
  database_backup_retention_days_locally?: number;
  database_backup_retention_max_storage_locally?: number;
  database_backup_retention_amount_s3?: number;
  database_backup_retention_days_s3?: number;
  database_backup_retention_max_storage_s3?: number;
  timeout?: number;
}

export function buildBackupCreatePayload(
  parsed: BackupCreateFields,
): Record<string, unknown> {
  const saveS3 = parsed.save_s3 ?? false;

  return omitUndefined({
    frequency: parsed.frequency,
    enabled: parsed.enabled ?? true,
    save_s3: saveS3,
    s3_storage_uuid: saveS3 ? parsed.s3_storage_uuid : undefined,
    databases_to_backup: parsed.databases_to_backup,
    dump_all: parsed.dump_all,
    backup_now: parsed.backup_now,
    database_backup_retention_amount_locally:
      parsed.database_backup_retention_amount_locally,
    database_backup_retention_days_locally:
      parsed.database_backup_retention_days_locally,
    database_backup_retention_max_storage_locally:
      parsed.database_backup_retention_max_storage_locally,
    database_backup_retention_amount_s3:
      parsed.database_backup_retention_amount_s3,
    database_backup_retention_days_s3: parsed.database_backup_retention_days_s3,
    database_backup_retention_max_storage_s3:
      parsed.database_backup_retention_max_storage_s3,
    timeout: parsed.timeout,
  });
}

export function buildBackupUpdatePayload(
  parsed: BackupUpdateFields,
): Record<string, unknown> {
  const saveS3 = parsed.save_s3;

  return omitUndefined({
    frequency: parsed.frequency,
    enabled: parsed.enabled,
    save_s3: saveS3,
    s3_storage_uuid:
      saveS3 === false ? undefined : parsed.s3_storage_uuid,
    databases_to_backup: parsed.databases_to_backup,
    dump_all: parsed.dump_all,
    backup_now: parsed.backup_now,
    database_backup_retention_amount_locally:
      parsed.database_backup_retention_amount_locally,
    database_backup_retention_days_locally:
      parsed.database_backup_retention_days_locally,
    database_backup_retention_max_storage_locally:
      parsed.database_backup_retention_max_storage_locally,
    database_backup_retention_amount_s3:
      parsed.database_backup_retention_amount_s3,
    database_backup_retention_days_s3: parsed.database_backup_retention_days_s3,
    database_backup_retention_max_storage_s3:
      parsed.database_backup_retention_max_storage_s3,
    timeout: parsed.timeout,
  });
}
