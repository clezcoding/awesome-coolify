import * as z from 'zod/v4';
import type { EnvConfig } from '../config/env.js';
import { fetchHealth } from '../../api/client.js';
import { wrapMcpError, type McpErrorResult } from '../../utils/errors.js';

export const systemActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('health') }),
]);

export type SystemAction = z.infer<typeof systemActionSchema>;

export interface SystemHealthResult {
  connected: true;
  host: string;
}

export type SystemActionResult = SystemHealthResult | McpErrorResult;

export async function handleSystemAction(
  args: SystemAction,
  env: EnvConfig,
): Promise<SystemActionResult> {
  switch (args.action) {
    case 'health': {
      try {
        await fetchHealth(
          env.COOLIFY_URL,
          env.COOLIFY_TOKEN,
          env.COOLIFY_VERIFY_SSL,
        );
        return {
          connected: true,
          host: new URL(env.COOLIFY_URL).hostname,
        };
      } catch (error) {
        return wrapMcpError(error);
      }
    }
    default: {
      const _exhaustive: never = args;
      throw new Error(`Unknown system action: ${String(_exhaustive)}`);
    }
  }
}

export function formatSystemResult(result: SystemHealthResult): string {
  return JSON.stringify(result);
}

export function isMcpErrorResult(
  result: SystemActionResult,
): result is McpErrorResult {
  return 'isError' in result && result.isError === true;
}
