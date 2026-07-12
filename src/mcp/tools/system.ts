import * as z from 'zod/v4';
import type { EnvConfig } from '../config/env.js';
import {
  fetchHealth,
  fetchVersion,
} from '../../api/client.js';
import { wrapMcpError, type McpErrorResult } from '../../utils/errors.js';
import { createLogger } from '../../utils/logger.js';

export const systemActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('health') }),
  z.object({ action: z.literal('version') }),
  z.object({ action: z.literal('verify') }),
]);

export type SystemAction = z.infer<typeof systemActionSchema>;

export interface SystemHealthResult {
  connected: true;
  host: string;
}

export interface SystemVersionResult {
  version: string;
}

export interface SystemVerifyResult {
  connected: true;
  host: string;
  coolifyVersion: string;
}

export type SystemSuccessResult =
  | SystemHealthResult
  | SystemVersionResult
  | SystemVerifyResult;

export type SystemActionResult = SystemSuccessResult | McpErrorResult;

function hostnameFromUrl(url: string): string {
  return new URL(url).hostname;
}

export async function handleSystemAction(
  args: SystemAction,
  env: EnvConfig,
): Promise<SystemActionResult> {
  const logger = createLogger(env.COOLIFY_MCP_LOG);

  try {
    switch (args.action) {
      case 'health': {
        logger.httpDebug('/api/health', 0);
        await fetchHealth(
          env.COOLIFY_URL,
          env.COOLIFY_TOKEN,
          env.COOLIFY_VERIFY_SSL,
        );
        return {
          connected: true,
          host: hostnameFromUrl(env.COOLIFY_URL),
        };
      }
      case 'version': {
        logger.httpDebug('/api/v1/version', 0);
        const versionData = await fetchVersion(
          env.COOLIFY_URL,
          env.COOLIFY_TOKEN,
          env.COOLIFY_VERIFY_SSL,
        );
        const version =
          typeof versionData === 'object' &&
          versionData !== null &&
          'version' in versionData
            ? String((versionData as { version: unknown }).version)
            : String(versionData);
        return { version };
      }
      case 'verify': {
        logger.httpDebug('/api/v1/version', 0);
        const versionData = await fetchVersion(
          env.COOLIFY_URL,
          env.COOLIFY_TOKEN,
          env.COOLIFY_VERIFY_SSL,
        );
        const coolifyVersion =
          typeof versionData === 'object' &&
          versionData !== null &&
          'version' in versionData
            ? String((versionData as { version: unknown }).version)
            : String(versionData);
        return {
          connected: true,
          host: hostnameFromUrl(env.COOLIFY_URL),
          coolifyVersion,
        };
      }
      default: {
        const _exhaustive: never = args;
        throw new Error(`Unknown system action: ${String(_exhaustive)}`);
      }
    }
  } catch (error) {
    return wrapMcpError(error);
  }
}

export function formatSystemResult(result: SystemSuccessResult): string {
  return JSON.stringify(result);
}

export function isMcpErrorResult(
  result: SystemActionResult,
): result is McpErrorResult {
  return 'isError' in result && result.isError === true;
}
