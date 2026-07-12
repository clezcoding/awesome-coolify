import * as z from 'zod/v4';
import type { EnvConfig } from '../config/env.js';
import { fetchApplication } from '../../api/client.js';
import {
  projectApplicationSummary,
  resolveProjection,
  sanitizeFullProjection,
  type ApplicationSummary,
} from '../../utils/projections.js';
import { buildReadResponse, type ReadResponse } from '../../utils/formatters.js';
import { wrapMcpError, type McpErrorResult } from '../../utils/errors.js';
import {
  rejectTableFormatOnFullProjection,
  sharedReadParamsSchema,
} from './shared-read-params.js';

export const applicationActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('get'),
    uuid: z.string().describe('Application UUID'),
    ...sharedReadParamsSchema,
  }),
]);

export type ApplicationAction = z.infer<typeof applicationActionSchema>;

export type ApplicationGetResult = ReadResponse<
  ApplicationSummary | ReturnType<typeof sanitizeFullProjection>
>;

export type ApplicationActionResult = ApplicationGetResult | McpErrorResult;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export async function handleApplicationAction(
  args: ApplicationAction,
  env: EnvConfig,
): Promise<ApplicationActionResult> {
  const parsed = applicationActionSchema.parse(args);
  const projection = resolveProjection(
    parsed.projection,
    parsed.include_full,
  );

  try {
    rejectTableFormatOnFullProjection(parsed.format, projection);

    const raw = await fetchApplication(
      env.COOLIFY_URL,
      env.COOLIFY_TOKEN,
      parsed.uuid,
      env.COOLIFY_VERIFY_SSL,
    );

    const data =
      projection === 'full'
        ? sanitizeFullProjection(raw)
        : projectApplicationSummary(isRecord(raw) ? raw : {});

    return buildReadResponse(data, {
      format: parsed.format,
      max_chars: parsed.max_chars,
    });
  } catch (error) {
    return wrapMcpError(error);
  }
}

export function isApplicationErrorResult(
  result: ApplicationActionResult,
): result is McpErrorResult {
  return 'isError' in result && result.isError === true;
}
