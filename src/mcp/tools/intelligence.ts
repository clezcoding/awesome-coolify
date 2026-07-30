import * as z from 'zod/v4';
import type { EnvConfig } from '../../config/env.js';
import { fetchResources, fetchService } from '../../api/client.js';
import { buildReadResponse, type ReadResponse } from '../../utils/formatters.js';
import {
  CoolifyApiError,
  RECOVERY_HINTS,
  wrapMcpError,
  type McpErrorResult,
} from '../../utils/errors.js';
import {
  buildGraph,
  enrichServiceEdges,
} from '../../utils/resource-graph.js';
import {
  createFlatActionSchema,
  parseWithInstanceRouting,
  resolveRoutingEnv,
  sharedReadParamsFlatShape,
} from './shared-read-params.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export const intelligenceActionsCatalog =
  'Actions: scorecard(format?, max_chars?, instance?) · graph(format?, max_chars?, instance?) · ' +
  'impact(uuid, type, intent?, max_depth?, instance?) · janitor(stopped_days?, format?, instance?) · ' +
  'cleanup(targets, confirm, delete_volumes?, delete_configurations?, instance?)';

export const intelligenceSafetyFooter =
  'Safety: cleanup requires confirm:true · delete_volumes/configurations default false · advisory impact only';

const intelligenceReadParamKeys = [
  'format',
  'projection',
  'include_full',
  'page',
  'per_page',
  'max_chars',
  'reveal',
] as const;

export const intelligenceActionSchema = createFlatActionSchema(
  ['scorecard', 'graph', 'impact', 'janitor', 'cleanup'],
  {
    uuid: z.string().uuid().optional().describe('Resource UUID (impact)'),
    type: z
      .enum(['application', 'service', 'database'])
      .optional()
      .describe('Resource type (impact)'),
    intent: z
      .enum(['delete', 'restart'])
      .optional()
      .describe('Impact intent (advisory)'),
    max_depth: z
      .number()
      .int()
      .positive()
      .optional()
      .describe('Max transitive depth for impact (default 3)'),
    stopped_days: z
      .number()
      .int()
      .positive()
      .optional()
      .describe('Janitor long-exited threshold in days (default 7)'),
    targets: z
      .array(
        z.object({
          type: z.enum(['application', 'service', 'database']),
          uuid: z.string().uuid(),
        }),
      )
      .optional()
      .describe('Cleanup target list'),
    confirm: z
      .boolean()
      .optional()
      .describe('Explicit confirm for cleanup mutations'),
    delete_volumes: z
      .boolean()
      .optional()
      .describe('Pass-through to domain delete (default false)'),
    delete_configurations: z
      .boolean()
      .optional()
      .describe('Pass-through to domain delete (default false)'),
    ...sharedReadParamsFlatShape,
  },
  {
    scorecard: [...intelligenceReadParamKeys],
    graph: [...intelligenceReadParamKeys],
    impact: [
      'uuid',
      'type',
      'intent',
      'max_depth',
      ...intelligenceReadParamKeys,
    ],
    janitor: ['stopped_days', ...intelligenceReadParamKeys],
    cleanup: [
      'targets',
      'confirm',
      'delete_volumes',
      'delete_configurations',
    ],
  },
  {
    impact: ['uuid', 'type'],
    cleanup: ['targets', 'confirm'],
  },
);

export type IntelligenceAction = z.infer<typeof intelligenceActionSchema>;

export type IntelligenceActionResult =
  | ReadResponse<unknown>
  | McpErrorResult;

function notImplemented(action: string, pendingPlan: string): never {
  throw new CoolifyApiError({
    code: 'COOLIFY_NOT_IMPLEMENTED',
    message: `intelligence.${action} is not implemented yet (pending ${pendingPlan}).`,
    recoveryHints: RECOVERY_HINTS.COOLIFY_NOT_IMPLEMENTED,
    data: { action, pending_plan: pendingPlan },
  });
}

export async function handleIntelligenceGraph(
  parsed: IntelligenceAction,
  env: EnvConfig,
): Promise<ReadResponse<unknown>> {
  const resources = await fetchResources(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    env.COOLIFY_VERIFY_SSL,
  );

  const serviceUuids = resources
    .filter(isRecord)
    .filter((r) => String(r.type ?? '') === 'service')
    .map((r) => String(r.uuid ?? ''))
    .filter(Boolean);

  const enrichment = await enrichServiceEdges(
    serviceUuids,
    (uuid) =>
      fetchService(
        env.COOLIFY_URL,
        env.COOLIFY_TOKEN,
        uuid,
        env.COOLIFY_VERIFY_SSL,
      ),
  );

  const graph = buildGraph({
    resources,
    serviceEdges: enrichment.edges,
    services_enriched: enrichment.services_enriched,
    service_fetch_errors: enrichment.service_fetch_errors,
  });

  return buildReadResponse(
    {
      nodes: graph.nodes,
      edges: graph.edges,
      meta: graph.meta,
    },
    {
      format: parsed.format,
      max_chars: parsed.max_chars,
    },
  );
}

export async function handleIntelligenceAction(
  args: unknown,
  env: EnvConfig,
): Promise<IntelligenceActionResult> {
  try {
    const parsed = parseWithInstanceRouting(intelligenceActionSchema, args);
    const routingEnv = resolveRoutingEnv(env, parsed.instance);

    switch (parsed.action) {
      case 'scorecard':
        return notImplemented('scorecard', '28-02');
      case 'graph':
        return await handleIntelligenceGraph(parsed, routingEnv);
      case 'impact':
        return notImplemented('impact', '28-03');
      case 'janitor':
        return notImplemented('janitor', '28-03');
      case 'cleanup':
        return notImplemented('cleanup', '28-04');
      default: {
        const _exhaustive: never = parsed;
        throw new Error(
          `Unknown intelligence action: ${String(_exhaustive)}`,
        );
      }
    }
  } catch (error) {
    return wrapMcpError(error);
  }
}

export function isIntelligenceErrorResult(
  result: IntelligenceActionResult,
): result is McpErrorResult {
  return 'isError' in result && result.isError === true;
}
