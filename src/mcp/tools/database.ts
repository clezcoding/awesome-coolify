import * as z from 'zod/v4';
import type { EnvConfig } from '../config/env.js';
import { fetchDatabase } from '../../api/client.js';
import {
  projectDatabaseSummary,
  resolveProjection,
  sanitizeFullProjection,
  type DatabaseSummary,
} from '../../utils/projections.js';
import { buildReadResponse, type ReadResponse } from '../../utils/formatters.js';
import { wrapMcpError, type McpErrorResult } from '../../utils/errors.js';
import {
  rejectTableFormatOnFullProjection,
  sharedReadParamsSchema,
} from './shared-read-params.js';

export const databaseActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('get'),
    uuid: z.string().describe('Database UUID'),
    ...sharedReadParamsSchema,
  }),
]);

export type DatabaseAction = z.infer<typeof databaseActionSchema>;

export type DatabaseGetResult = ReadResponse<
  DatabaseSummary | ReturnType<typeof sanitizeFullProjection>
>;

export type DatabaseActionResult = DatabaseGetResult | McpErrorResult;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export async function handleDatabaseAction(
  args: DatabaseAction,
  env: EnvConfig,
): Promise<DatabaseActionResult> {
  const parsed = databaseActionSchema.parse(args);
  const projection = resolveProjection(
    parsed.projection,
    parsed.include_full,
  );

  try {
    rejectTableFormatOnFullProjection(parsed.format, projection);

    const raw = await fetchDatabase(
      env.COOLIFY_URL,
      env.COOLIFY_TOKEN,
      parsed.uuid,
      env.COOLIFY_VERIFY_SSL,
    );

    const data =
      projection === 'full'
        ? sanitizeFullProjection(raw)
        : projectDatabaseSummary(isRecord(raw) ? raw : {});

    return buildReadResponse(data, {
      format: parsed.format,
      max_chars: parsed.max_chars,
    });
  } catch (error) {
    return wrapMcpError(error);
  }
}

export function isDatabaseErrorResult(
  result: DatabaseActionResult,
): result is McpErrorResult {
  return 'isError' in result && result.isError === true;
}
