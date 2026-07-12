import * as z from 'zod/v4';
import type { EnvConfig } from '../config/env.js';
import { fetchResources, fetchServers } from '../../api/client.js';
import { projectResourceSummary, type ResourceSummary } from '../../utils/projections.js';
import { buildReadResponse, paginateArray, type ReadResponse } from '../../utils/formatters.js';
import { wrapMcpError, type McpErrorResult } from '../../utils/errors.js';
import { sharedReadParamsSchema } from './shared-read-params.js';

export const resourceActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('list'),
    type: z.enum(['application', 'service', 'database']).optional(),
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

export type ResourceListResult = ReadResponse<ResourceSummary[]>;
export type ResourceFindResult = ReadResponse<FindableResource[]>;

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
  args: ResourceAction,
  env: EnvConfig,
): Promise<ResourceActionResult> {
  const parsed = resourceActionSchema.parse(args);

  try {
    switch (parsed.action) {
      case 'list': {
        const rawResources = await fetchResources(
          env.COOLIFY_URL,
          env.COOLIFY_TOKEN,
          env.COOLIFY_VERIFY_SSL,
        );
        const projected = rawResources
          .filter(isRecord)
          .map(projectResourceSummary);

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
            env.COOLIFY_URL,
            env.COOLIFY_TOKEN,
            env.COOLIFY_VERIFY_SSL,
          ),
          fetchServers(
            env.COOLIFY_URL,
            env.COOLIFY_TOKEN,
            env.COOLIFY_VERIFY_SSL,
          ),
        ]);

        const projectedResources = rawResources
          .filter(isRecord)
          .map(projectResourceSummary) as FindableResource[];

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
