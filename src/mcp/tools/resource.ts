import * as z from 'zod/v4';
import type { EnvConfig } from '../config/env.js';
import { fetchResources, fetchServers, fetchProjects } from '../../api/client.js';
import { buildProjectEnvironmentIndex } from '../../utils/project-lookup.js';
import { projectResourceSummary, type ResourceSummary } from '../../utils/projections.js';
import { buildReadResponse, paginateArray, type ReadResponse } from '../../utils/formatters.js';
import { wrapMcpError, type McpErrorResult } from '../../utils/errors.js';
import {
  parseWithInstanceRouting,
  resolveRoutingEnv,
  sharedReadParamsSchema,
} from './shared-read-params.js';

export const resourceActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('list'),
    type: z.enum(['application', 'service', 'database', 'server', 'project', 'environment']).optional(),
    ...sharedReadParamsSchema,
  }),
  z.object({
    action: z.literal('find'),
    query: z.string().optional(),
    uuid: z.string().optional(),
    name: z.string().optional(),
    domain: z.string().optional(),
    ip: z.string().optional(),
    ...sharedReadParamsSchema,
  }),
]);

export type ResourceAction = z.infer<typeof resourceActionSchema>;

export interface FindableResource extends ResourceSummary {
  type: ResourceSummary['type'] | 'server';
}

export type ResourceListResult = ReadResponse<ResourceSummary[] | ProjectSummary[] | EnvironmentSummary[]>;
export type ResourceFindResult = ReadResponse<FindableResource[]>;

export type ProjectSummary = {
  uuid: string;
  name: string;
  description: string | null;
  environment_count: number;
};

export type EnvironmentSummary = {
  uuid: string;
  name: string;
  project_uuid: string;
  project_name: string;
};

export type ResourceActionResult =
  | ResourceListResult
  | ResourceFindResult
  | McpErrorResult;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const FIND_MATCH_CAP = 10;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function projectServerSummary(raw: Record<string, unknown>): FindableResource {
  const reachable = (raw.settings as { is_reachable?: boolean } | undefined)
    ?.is_reachable;
  const ip = String(raw.ip ?? '');
  return {
    uuid: String(raw.uuid ?? raw.id ?? ''),
    name: String(raw.name ?? ''),
    type: 'server',
    status: reachable ? 'running' : 'unreachable',
    health: reachable ? 'healthy' : 'unreachable',
    fqdn: ip || null,
    project_name: 'N/A',
    server_name: String(raw.name ?? ''),
    updated_at: String(raw.updated_at ?? new Date().toISOString()),
  };
}

export function projectProjectSummary(raw: Record<string, unknown>): ProjectSummary {
  return {
    uuid: String(raw.uuid ?? raw.id ?? ''),
    name: String(raw.name ?? ''),
    description:
      raw.description === undefined || raw.description === null
        ? null
        : String(raw.description),
    environment_count: Array.isArray(raw.environments)
      ? raw.environments.length
      : 0,
  };
}

export function projectEnvironmentSummary(
  rawEnv: Record<string, unknown>,
  projectUuid: string,
  projectName: string,
): EnvironmentSummary {
  return {
    uuid: String(rawEnv.uuid ?? rawEnv.id ?? ''),
    name: String(rawEnv.name ?? ''),
    project_uuid: projectUuid,
    project_name: projectName,
  };
}

export function matchesQuery(item: FindableResource, query: string): boolean {
  const q = query.toLowerCase();
  return (
    item.uuid.toLowerCase() === q ||
    item.name.toLowerCase().includes(q) ||
    (item.fqdn !== null && item.fqdn.toLowerCase().includes(q))
  );
}

export function matchesExplicitFields(
  item: FindableResource,
  fields: {
    uuid?: string;
    name?: string;
    domain?: string;
    ip?: string;
  },
): boolean {
  if (fields.uuid && item.uuid.toLowerCase() !== fields.uuid.toLowerCase()) {
    return false;
  }
  if (
    fields.name &&
    !item.name.toLowerCase().includes(fields.name.toLowerCase())
  ) {
    return false;
  }
  if (
    fields.domain &&
    (item.fqdn === null ||
      !item.fqdn.toLowerCase().includes(fields.domain.toLowerCase()))
  ) {
    return false;
  }
  if (
    fields.ip &&
    (item.fqdn === null ||
      !item.fqdn.toLowerCase().includes(fields.ip.toLowerCase()))
  ) {
    return false;
  }
  return true;
}

function relevanceScore(
  item: FindableResource,
  searchTerms: { query?: string; name?: string; uuid?: string; domain?: string; ip?: string },
): number {
  const nameTerm = (searchTerms.name ?? searchTerms.query ?? '').toLowerCase();
  const uuidTerm = (searchTerms.uuid ?? searchTerms.query ?? '').toLowerCase();
  const domainTerm = (searchTerms.domain ?? '').toLowerCase();
  const ipTerm = (searchTerms.ip ?? searchTerms.query ?? '').toLowerCase();

  if (nameTerm && item.name.toLowerCase() === nameTerm) {
    return 4;
  }
  if (uuidTerm && item.uuid.toLowerCase() === uuidTerm) {
    return 3;
  }
  if (
    domainTerm &&
    item.fqdn !== null &&
    item.fqdn.toLowerCase().includes(domainTerm)
  ) {
    return 2;
  }
  if (ipTerm && item.fqdn !== null && item.fqdn.toLowerCase().includes(ipTerm)) {
    return 2;
  }
  if (nameTerm && item.name.toLowerCase().includes(nameTerm)) {
    return 1;
  }
  if (
    searchTerms.query &&
    item.fqdn !== null &&
    item.fqdn.toLowerCase().includes(searchTerms.query.toLowerCase())
  ) {
    return 2;
  }
  if (
    searchTerms.query &&
    UUID_PATTERN.test(searchTerms.query) &&
    item.uuid.toLowerCase() === searchTerms.query.toLowerCase()
  ) {
    return 3;
  }
  return 0;
}

export function rankFindMatches(
  matches: FindableResource[],
  searchTerms: {
    query?: string;
    name?: string;
    uuid?: string;
    domain?: string;
    ip?: string;
  },
): FindableResource[] {
  return [...matches].sort((a, b) => {
    const scoreDiff =
      relevanceScore(b, searchTerms) - relevanceScore(a, searchTerms);
    if (scoreDiff !== 0) return scoreDiff;
    return a.name.localeCompare(b.name);
  });
}

export async function handleResourceAction(
  args: unknown,
  env: EnvConfig,
): Promise<ResourceActionResult> {
  try {
    const parsed = parseWithInstanceRouting(resourceActionSchema, args);
    const routingEnv = resolveRoutingEnv(env, parsed.instance);

    switch (parsed.action) {
      case 'list': {
        if (parsed.type === 'server') {
          const rawServers = await fetchServers(
            routingEnv.COOLIFY_URL,
            routingEnv.COOLIFY_TOKEN,
            routingEnv.COOLIFY_VERIFY_SSL,
          );
          const projected = rawServers
            .filter(isRecord)
            .map(projectServerSummary);

          const paginated = paginateArray(
            projected,
            parsed.page,
            parsed.per_page,
          );

          return buildReadResponse(paginated, {
            format: parsed.format,
            max_chars: parsed.max_chars,
            page: parsed.page,
            per_page: parsed.per_page,
            total: projected.length,
          });
        }

        if (parsed.type === 'project') {
          const rawProjects = await fetchProjects(
            routingEnv.COOLIFY_URL,
            routingEnv.COOLIFY_TOKEN,
            routingEnv.COOLIFY_VERIFY_SSL,
          );
          const projected = rawProjects
            .filter(isRecord)
            .map(projectProjectSummary);

          const paginated = paginateArray(
            projected,
            parsed.page,
            parsed.per_page,
          );

          return buildReadResponse(paginated, {
            format: parsed.format,
            max_chars: parsed.max_chars,
            page: parsed.page,
            per_page: parsed.per_page,
            total: projected.length,
          });
        }

        if (parsed.type === 'environment') {
          const rawProjects = await fetchProjects(
            routingEnv.COOLIFY_URL,
            routingEnv.COOLIFY_TOKEN,
            routingEnv.COOLIFY_VERIFY_SSL,
          );
          const projected: EnvironmentSummary[] = [];
          for (const raw of rawProjects) {
            if (!isRecord(raw)) continue;
            const projectUuid = String(raw.uuid ?? raw.id ?? '');
            const projectName = String(raw.name ?? '');
            const environments = raw.environments;
            if (!Array.isArray(environments)) continue;
            for (const rawEnv of environments) {
              if (!isRecord(rawEnv)) continue;
              projected.push(
                projectEnvironmentSummary(rawEnv, projectUuid, projectName),
              );
            }
          }

          const paginated = paginateArray(
            projected,
            parsed.page,
            parsed.per_page,
          );

          return buildReadResponse(paginated, {
            format: parsed.format,
            max_chars: parsed.max_chars,
            page: parsed.page,
            per_page: parsed.per_page,
            total: projected.length,
          });
        }

        const rawResources = await fetchResources(
          routingEnv.COOLIFY_URL,
          routingEnv.COOLIFY_TOKEN,
          routingEnv.COOLIFY_VERIFY_SSL,
        );
        const lookup = await buildProjectEnvironmentIndex(routingEnv);
        const projected = rawResources
          .filter(isRecord)
          .map((raw) => projectResourceSummary(raw, lookup));

        const filtered = parsed.type
          ? projected.filter((resource) => resource.type === parsed.type)
          : projected;

        const paginated = paginateArray(
          filtered,
          parsed.page,
          parsed.per_page,
        );

        return buildReadResponse(paginated, {
          format: parsed.format,
          max_chars: parsed.max_chars,
          page: parsed.page,
          per_page: parsed.per_page,
          total: filtered.length,
        });
      }
      case 'find': {
        if (
          !parsed.query &&
          !parsed.uuid &&
          !parsed.name &&
          !parsed.domain &&
          !parsed.ip
        ) {
          throw new Error(
            'At least one search field (query, uuid, name, domain, or ip) is required',
          );
        }

        const [rawResources, rawServers] = await Promise.all([
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
        ]);

        const lookup = await buildProjectEnvironmentIndex(routingEnv);
        const projectedResources = rawResources
          .filter(isRecord)
          .map((raw) => projectResourceSummary(raw, lookup)) as FindableResource[];

        const projectedServers = rawServers
          .filter(isRecord)
          .map(projectServerSummary);

        const allItems: FindableResource[] = [
          ...projectedResources,
          ...projectedServers,
        ];

        const searchTerms = {
          query: parsed.query,
          name: parsed.name,
          uuid: parsed.uuid,
          domain: parsed.domain,
          ip: parsed.ip,
        };

        let matches: FindableResource[];
        if (parsed.query) {
          matches = allItems.filter((item) => matchesQuery(item, parsed.query!));
        } else {
          matches = allItems.filter((item) =>
            matchesExplicitFields(item, {
              uuid: parsed.uuid,
              name: parsed.name,
              domain: parsed.domain,
              ip: parsed.ip,
            }),
          );
        }

        const ranked = rankFindMatches(matches, searchTerms);
        const capped = ranked.slice(0, FIND_MATCH_CAP);
        const paginated = paginateArray(capped, parsed.page, parsed.per_page);

        return buildReadResponse(paginated, {
          format: parsed.format,
          max_chars: parsed.max_chars,
          page: parsed.page,
          per_page: parsed.per_page,
          total: capped.length,
        });
      }
      default: {
        const _exhaustive: never = parsed;
        throw new Error(`Unknown resource action: ${String(_exhaustive)}`);
      }
    }
  } catch (error) {
    return wrapMcpError(error);
  }
}

export function isResourceErrorResult(
  result: ResourceActionResult,
): result is McpErrorResult {
  return 'isError' in result && result.isError === true;
}
