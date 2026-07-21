import * as z from 'zod/v4';
import type { EnvConfig } from '../config/env.js';
import {
  fetchHealth,
  fetchVersion,
  fetchResources,
  fetchServers,
  fetchProjects,
} from '../../api/client.js';
import { wrapMcpError, type McpErrorResult } from '../../utils/errors.js';
import { buildReadResponse, type ReadResponse } from '../../utils/formatters.js';
import { createLogger } from '../../utils/logger.js';
import { isDatabaseRawType } from '../../utils/projections.js';
import {
  parseWithInstanceRouting,
  resolveRoutingEnv,
  sharedReadParamsSchema,
} from './shared-read-params.js';

export const systemActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('health') }),
  z.object({ action: z.literal('version') }),
  z.object({ action: z.literal('verify') }),
  z.object({
    action: z.literal('infrastructure_overview'),
    ...sharedReadParamsSchema,
    // D-21 N/A: projection/include_full — aggregate overview, not per-resource projection
    // D-21 N/A: page/per_page — single aggregate object, not paginated
  }),
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

export interface InfrastructureOverviewData {
  servers: { total: number; running: number; stopped: number };
  projects: { total: number };
  applications: {
    total: number;
    running: number;
    stopped: number;
    unhealthy: number;
  };
  databases: {
    total: number;
    running: number;
    stopped: number;
    unhealthy: number;
  };
  services: {
    total: number;
    running: number;
    stopped: number;
    unhealthy: number;
  };
}

export type InfrastructureOverviewResult =
  ReadResponse<InfrastructureOverviewData>;

export type SystemSuccessResult =
  | SystemHealthResult
  | SystemVersionResult
  | SystemVerifyResult
  | InfrastructureOverviewResult;

export type SystemActionResult = SystemSuccessResult | McpErrorResult;

function hostnameFromUrl(url: string): string {
  return new URL(url).hostname;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function statusStartsWith(value: unknown, prefix: string): boolean {
  return typeof value === 'string' && value.startsWith(prefix);
}

function statusIncludes(value: unknown, substring: string): boolean {
  return typeof value === 'string' && value.includes(substring);
}

function countByStatus(
  items: Record<string, unknown>[],
  statusField = 'status',
): { running: number; stopped: number; unhealthy: number } {
  return {
    running: items.filter((item) =>
      statusStartsWith(item[statusField], 'running'),
    ).length,
    stopped: items.filter(
      (item) =>
        statusStartsWith(item[statusField], 'exited') ||
        statusStartsWith(item[statusField], 'stopped'),
    ).length,
    unhealthy: items.filter((item) =>
      statusIncludes(item[statusField], 'unhealthy'),
    ).length,
  };
}

export async function handleSystemAction(
  args: unknown,
  env: EnvConfig,
): Promise<SystemActionResult> {
  try {
    const parsed = parseWithInstanceRouting(systemActionSchema, args);
    const routingEnv = resolveRoutingEnv(env, parsed.instance);
    const logger = createLogger(routingEnv.COOLIFY_MCP_LOG);

    switch (parsed.action) {
      case 'health': {
        logger.httpDebug('/api/health', 0);
        await fetchHealth(
          routingEnv.COOLIFY_URL,
          routingEnv.COOLIFY_TOKEN,
          routingEnv.COOLIFY_VERIFY_SSL,
        );
        return {
          connected: true,
          host: hostnameFromUrl(routingEnv.COOLIFY_URL),
        };
      }
      case 'version': {
        logger.httpDebug('/api/v1/version', 0);
        const versionData = await fetchVersion(
          routingEnv.COOLIFY_URL,
          routingEnv.COOLIFY_TOKEN,
          routingEnv.COOLIFY_VERIFY_SSL,
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
          routingEnv.COOLIFY_URL,
          routingEnv.COOLIFY_TOKEN,
          routingEnv.COOLIFY_VERIFY_SSL,
        );
        const coolifyVersion =
          typeof versionData === 'object' &&
          versionData !== null &&
          'version' in versionData
            ? String((versionData as { version: unknown }).version)
            : String(versionData);
        return {
          connected: true,
          host: hostnameFromUrl(routingEnv.COOLIFY_URL),
          coolifyVersion,
        };
      }
      case 'infrastructure_overview': {
        const [rawResources, rawServers, rawProjects] = await Promise.all([
          fetchResources(
            routingEnv.COOLIFY_URL,
            routingEnv.COOLIFY_TOKEN,
            routingEnv.COOLIFY_VERIFY_SSL,
          ),
          fetchServers(
            routingEnv.COOLIFY_URL,
            routingEnv.COOLIFY_TOKEN,
            routingEnv.COOLIFY_VERIFY_SSL,
          ),
          fetchProjects(
            routingEnv.COOLIFY_URL,
            routingEnv.COOLIFY_TOKEN,
            routingEnv.COOLIFY_VERIFY_SSL,
          ),
        ]);

        const resources = rawResources.filter(isRecord);
        const servers = rawServers.filter(isRecord);
        const apps = resources.filter((resource) => resource.type === 'application');
        const dbs = resources.filter((resource) =>
          isDatabaseRawType(String(resource.type ?? '')),
        );
        const services = resources.filter((resource) => resource.type === 'service');

        const appCounts = countByStatus(apps);
        const dbCounts = countByStatus(dbs);
        const serviceCounts = countByStatus(services);

        const overview: InfrastructureOverviewData = {
          servers: {
            total: servers.length,
            running: servers.filter(
              (server) =>
                (server.settings as { is_reachable?: boolean } | undefined)
                  ?.is_reachable,
            ).length,
            stopped: servers.filter(
              (server) =>
                !(server.settings as { is_reachable?: boolean } | undefined)
                  ?.is_reachable,
            ).length,
          },
          projects: {
            total: rawProjects.length,
          },
          applications: {
            total: apps.length,
            ...appCounts,
          },
          databases: {
            total: dbs.length,
            ...dbCounts,
          },
          services: {
            total: services.length,
            ...serviceCounts,
          },
        };

        return buildReadResponse(overview, {
          format: parsed.format,
          max_chars: parsed.max_chars,
        });
      }
      default: {
        const _exhaustive: never = parsed;
        throw new Error(`Unknown system action: ${String(_exhaustive)}`);
      }
    }
  } catch (error) {
    return wrapMcpError(error);
  }
}

export function formatSystemResult(result: SystemSuccessResult): string {
  if (result && typeof result === 'object' && '_formattedText' in result) {
    return result._formattedText;
  }
  return JSON.stringify(result);
}

export function isMcpErrorResult(
  result: SystemActionResult,
): result is McpErrorResult {
  return 'isError' in result && result.isError === true;
}
