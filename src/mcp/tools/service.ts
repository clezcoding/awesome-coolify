import * as z from 'zod/v4';
import type { EnvConfig } from '../config/env.js';
import { fetchService } from '../../api/client.js';
import {
  projectServiceSummary,
  resolveProjection,
  sanitizeFullProjection,
  type ServiceSummary,
} from '../../utils/projections.js';
import { buildReadResponse, type ReadResponse } from '../../utils/formatters.js';
import { wrapMcpError, type McpErrorResult } from '../../utils/errors.js';
import {
  rejectTableFormatOnFullProjection,
  sharedReadParamsSchema,
} from './shared-read-params.js';
import { generateHints } from '../../utils/diagnose-hints.js';

export const serviceActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('get'),
    uuid: z.string().describe('Service UUID'),
    ...sharedReadParamsSchema,
  }),
]);

export type ServiceAction = z.infer<typeof serviceActionSchema>;

export type ServiceGetResult = ReadResponse<
  ServiceSummary | ReturnType<typeof sanitizeFullProjection>
>;

export type ServiceActionResult = ServiceGetResult | McpErrorResult;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export async function handleServiceAction(
  args: ServiceAction,
  env: EnvConfig,
): Promise<ServiceActionResult> {
  const parsed = serviceActionSchema.parse(args);
  const projection = resolveProjection(
    parsed.projection,
    parsed.include_full,
  );

  try {
    rejectTableFormatOnFullProjection(parsed.format, projection);

    const raw = await fetchService(
      env.COOLIFY_URL,
      env.COOLIFY_TOKEN,
      parsed.uuid,
      env.COOLIFY_VERIFY_SSL,
    );

    const rawRecord = isRecord(raw) ? raw : {};
    const hints = generateHints(
      'service',
      parsed.uuid,
      String(rawRecord.status ?? 'unknown'),
      rawRecord.health_check_status !== undefined
        ? String(rawRecord.health_check_status)
        : undefined,
    );

    const data =
      projection === 'full'
        ? { ...(sanitizeFullProjection(raw) as Record<string, unknown>), hints }
        : { ...projectServiceSummary(rawRecord), hints };

    return buildReadResponse(data, {
      format: parsed.format,
      max_chars: parsed.max_chars,
    });
  } catch (error) {
    return wrapMcpError(error);
  }
}

export function isServiceErrorResult(
  result: ServiceActionResult,
): result is McpErrorResult {
  return 'isError' in result && result.isError === true;
}
