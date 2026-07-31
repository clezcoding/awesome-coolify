import * as z from 'zod/v4';
import type { EnvConfig } from '../../config/env.js';
import {
  fetchAppDeployments,
  fetchDatabaseBackups,
  fetchResources,
  fetchServers,
  fetchService,
} from '../../api/client.js';
import { buildReadResponse, type ReadResponse } from '../../utils/formatters.js';
import {
  CoolifyApiError,
  RECOVERY_HINTS,
  toStructuredError,
  wrapMcpError,
  type McpErrorResult,
} from '../../utils/errors.js';
import {
  generateHints,
  type FollowUpHint,
} from '../../utils/diagnose-hints.js';
import { classifyIssues } from '../../utils/issue-classifier.js';
import { sortDeploymentsNewestFirst } from '../../utils/deploy-preflight.js';
import { isDatabaseRawType } from '../../utils/projections.js';
import { redactSecrets } from '../../utils/redact.js';
import {
  buildGraph,
  enrichServiceEdges,
  findDependents,
  findJanitorCandidates,
} from '../../utils/resource-graph.js';
import { handleApplicationAction } from './application.js';
import { handleDatabaseAction } from './database.js';
import { validateConfirmGate } from './emergency.js';
import { handleServiceAction } from './service.js';
import {
  createFlatActionSchema,
  parseWithInstanceRouting,
  resolveRoutingEnv,
  sharedReadParamsFlatShape,
} from './shared-read-params.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

type FactorSeverity = 'critical' | 'high' | 'info' | 'ok';
type FindingSeverity = 'critical' | 'high' | 'info';

const SEVERITY_RANK: Record<FactorSeverity, number> = {
  critical: 3,
  high: 2,
  info: 1,
  ok: 0,
};

const SAMPLE_CAP = 50;
const SAMPLE_CONCURRENCY = 5;
const STUCK_DEPLOY_MS = 24 * 60 * 60 * 1000;
const RECENT_FAIL_MS = 7 * 24 * 60 * 60 * 1000;

export type ScorecardFinding = {
  severity: FindingSeverity;
  factor: string;
  issue: string;
  uuid?: string;
  name?: string;
  resource_type?: string;
  status?: string;
  hint: FollowUpHint;
};

type FactorResult = {
  severity: FactorSeverity;
  findings: ScorecardFinding[];
  partial?: boolean;
  sampled_count?: number;
  total_count?: number;
  counts?: Record<string, number>;
};

function maxSeverity(
  a: FactorSeverity,
  b: FactorSeverity,
): FactorSeverity {
  const rankA = SEVERITY_RANK[a] ?? -1;
  const rankB = SEVERITY_RANK[b] ?? -1;
  return rankA >= rankB ? a : b;
}

function rollupSeverity(findings: ScorecardFinding[]): FactorSeverity {
  let highest: FactorSeverity = 'ok';
  for (const finding of findings) {
    highest = maxSeverity(highest, finding['severity'] as FactorSeverity);
  }
  return highest;
}

function toFactorError(reason: unknown): { code: string; message: string } {
  const envelope =
    reason instanceof CoolifyApiError
      ? reason.envelope
      : toStructuredError(reason);
  return {
    code: envelope.code,
    message: redactSecrets(envelope.message),
  };
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await fn(items[index]!);
    }
  }

  const workers = Math.min(Math.max(1, concurrency), items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

function deploymentTimestamp(dep: Record<string, unknown>): number {
  const raw =
    dep.updated_at ?? dep.finished_at ?? dep.created_at ?? dep.createdAt;
  const ms = typeof raw === 'string' ? Date.parse(raw) : NaN;
  return Number.isFinite(ms) ? ms : 0;
}

function deployHint(uuid: string, deploymentUuid?: string): FollowUpHint {
  if (deploymentUuid) {
    return {
      tool: 'diagnose',
      action: 'logs',
      args: { uuid, deployment_uuid: deploymentUuid },
      label: 'Inspect failed deployment logs',
      available_in_phase: 26,
    };
  }
  return {
    tool: 'application',
    action: 'deployments',
    args: { uuid },
    label: 'List application deployments',
    available_in_phase: 4,
  };
}

function backupHint(uuid: string): FollowUpHint {
  return {
    tool: 'database',
    action: 'backup:list',
    args: { uuid },
    label: 'Review database backup schedules',
    available_in_phase: 11,
  };
}

async function collectDeploymentsFactor(
  env: EnvConfig,
  resources: Record<string, unknown>[],
  nowMs: number,
): Promise<FactorResult> {
  const apps = resources.filter((r) => String(r.type ?? '') === 'application');
  const total_count = apps.length;
  const sample = apps.slice(0, SAMPLE_CAP);
  const findings: ScorecardFinding[] = [];

  await mapPool(sample, SAMPLE_CONCURRENCY, async (app) => {
    const uuid = String(app.uuid ?? '');
    const name = String(app.name ?? uuid);
    if (!uuid) return;

    const deployments = await fetchAppDeployments(
      env.COOLIFY_URL,
      env.COOLIFY_TOKEN,
      uuid,
      env.COOLIFY_VERIFY_SSL,
    );
    const sorted = sortDeploymentsNewestFirst(deployments);
    if (sorted.length === 0) return;

    const latest = sorted[0]!;
    const latestStatus = String(latest.status ?? '').toLowerCase();
    const latestUuid =
      latest.deployment_uuid != null
        ? String(latest.deployment_uuid)
        : undefined;
    const latestTs = deploymentTimestamp(latest);

    if (latestStatus === 'failed') {
      findings.push({
        severity: 'high',
        factor: 'deployments',
        issue: 'Latest deployment failed',
        uuid,
        name,
        resource_type: 'application',
        status: latestStatus,
        hint: deployHint(uuid, latestUuid),
      });
      return;
    }

    if (
      (latestStatus === 'in_progress' || latestStatus === 'queued') &&
      latestTs > 0 &&
      nowMs - latestTs > STUCK_DEPLOY_MS
    ) {
      findings.push({
        severity: 'high',
        factor: 'deployments',
        issue: 'Deployment stuck in progress >24h',
        uuid,
        name,
        resource_type: 'application',
        status: latestStatus,
        hint: deployHint(uuid, latestUuid),
      });
      return;
    }

    const recentOlderFail = sorted.slice(1).find((dep) => {
      const status = String(dep.status ?? '').toLowerCase();
      const ts = deploymentTimestamp(dep);
      return (
        status === 'failed' && ts > 0 && nowMs - ts <= RECENT_FAIL_MS
      );
    });
    if (recentOlderFail) {
      const failUuid =
        recentOlderFail.deployment_uuid != null
          ? String(recentOlderFail.deployment_uuid)
          : undefined;
      findings.push({
        severity: 'info',
        factor: 'deployments',
        issue: 'Older deployment failure within 7d',
        uuid,
        name,
        resource_type: 'application',
        status: 'failed',
        hint: deployHint(uuid, failUuid),
      });
    }
  });

  return {
    severity: rollupSeverity(findings),
    findings,
    partial: total_count > SAMPLE_CAP,
    sampled_count: sample.length,
    total_count,
  };
}

function scheduleEnabled(schedule: Record<string, unknown>): boolean {
  const enabled = schedule.enabled ?? schedule.is_enabled;
  if (typeof enabled === 'boolean') return enabled;
  if (typeof enabled === 'number') return enabled !== 0;
  if (typeof enabled === 'string') {
    return enabled === '1' || enabled.toLowerCase() === 'true';
  }
  return false;
}

async function collectBackupsFactor(
  env: EnvConfig,
  resources: Record<string, unknown>[],
): Promise<FactorResult> {
  const databases = resources.filter((r) =>
    isDatabaseRawType(String(r.type ?? '')),
  );
  const total_count = databases.length;
  const sample = databases.slice(0, SAMPLE_CAP);
  const findings: ScorecardFinding[] = [];

  await mapPool(sample, SAMPLE_CONCURRENCY, async (db) => {
    const uuid = String(db.uuid ?? '');
    const name = String(db.name ?? uuid);
    if (!uuid) return;

    const schedules = await fetchDatabaseBackups(
      env.COOLIFY_URL,
      env.COOLIFY_TOKEN,
      uuid,
      env.COOLIFY_VERIFY_SSL,
    );
    const records = schedules.filter(isRecord);
    const enabledCount = records.filter(scheduleEnabled).length;

    if (records.length === 0 || enabledCount === 0) {
      findings.push({
        severity: 'high',
        factor: 'backups',
        issue:
          records.length === 0
            ? 'No backup schedules configured'
            : 'No enabled backup schedules',
        uuid,
        name,
        resource_type: 'database',
        hint: backupHint(uuid),
      });
      return;
    }

    if (records.some((s) => !scheduleEnabled(s))) {
      findings.push({
        severity: 'info',
        factor: 'backups',
        issue: 'Backup schedule disabled',
        uuid,
        name,
        resource_type: 'database',
        status: 'disabled',
        hint: backupHint(uuid),
      });
    }
  });

  return {
    severity: rollupSeverity(findings),
    findings,
    partial: total_count > SAMPLE_CAP,
    sampled_count: sample.length,
    total_count,
  };
}

function collectExitedResourcesFactor(
  resources: Record<string, unknown>[],
): FactorResult {
  const findings: ScorecardFinding[] = [];

  for (const resource of resources) {
    const status = String(resource.status ?? '');
    if (
      !status.startsWith('exited') &&
      !status.startsWith('stopped')
    ) {
      continue;
    }

    const rawType = String(resource.type ?? '');
    const resourceType = isDatabaseRawType(rawType)
      ? 'database'
      : rawType === 'application' || rawType === 'service'
        ? rawType
        : null;
    if (!resourceType) continue;

    const uuid = String(resource.uuid ?? '');
    const name = String(resource.name ?? uuid);
    const hints = generateHints(resourceType, uuid, status);
    findings.push({
      severity: 'info',
      factor: 'exited_resources',
      issue: `${resourceType} stopped`,
      uuid,
      name,
      resource_type: resourceType,
      status,
      hint:
        hints[0] ??
        ({
          tool: resourceType,
          action: 'start',
          args: { uuid },
          label: `Start ${resourceType}`,
          available_in_phase: 4,
        } satisfies FollowUpHint),
    });
  }

  return {
    severity: rollupSeverity(findings),
    findings,
    counts: { exited_or_stopped: findings.length },
  };
}

function collectDiagnoseScanFactor(
  servers: unknown[],
  resources: unknown[],
): FactorResult {
  const classified = classifyIssues(servers, resources);
  const findings: ScorecardFinding[] = [];

  const pushBucket = (
    severity: FindingSeverity,
    issues: typeof classified.critical,
  ): void => {
    for (const issue of issues) {
      findings.push({
        severity,
        factor: 'diagnose_scan',
        issue: issue.issue,
        uuid: issue.uuid,
        name: issue.name,
        resource_type: issue.resource_type,
        status: issue.status,
        hint: issue.hint,
      });
    }
  };

  pushBucket('critical', classified.critical);
  pushBucket('high', classified.high);
  pushBucket('info', classified.info);

  return {
    severity: rollupSeverity(findings),
    findings,
    counts: {
      critical: classified.critical.length,
      high: classified.high.length,
      info: classified.info.length,
    },
  };
}

function computeScoreBreakdown(findings: ScorecardFinding[]): {
  score: number;
  score_breakdown: {
    start: number;
    critical: number;
    high: number;
    info: number;
    deductions: { critical: number; high: number; info: number };
  };
} {
  const critical = findings.filter((f) => f['severity'] === 'critical').length;
  const high = findings.filter((f) => f['severity'] === 'high').length;
  const info = findings.filter((f) => f['severity'] === 'info').length;
  const deductions = {
    critical: critical * 30,
    high: high * 15,
    info: info * 5,
  };
  const score = Math.max(
    0,
    100 - deductions.critical - deductions.high - deductions.info,
  );
  return {
    score,
    score_breakdown: {
      start: 100,
      critical,
      high,
      info,
      deductions,
    },
  };
}

/**
 * Composite instance health scorecard (INTEL-01/02).
 * Soft-partials per factor via Promise.allSettled (D-17).
 */
export async function handleIntelligenceScorecard(
  parsed: { format?: string; max_chars?: number },
  env: EnvConfig,
): Promise<ReadResponse<unknown>> {
  const [rawServers, rawResources] = await Promise.all([
    fetchServers(env.COOLIFY_URL, env.COOLIFY_TOKEN, env.COOLIFY_VERIFY_SSL),
    fetchResources(env.COOLIFY_URL, env.COOLIFY_TOKEN, env.COOLIFY_VERIFY_SSL),
  ]);

  const servers = rawServers.filter(isRecord);
  const resources = rawResources.filter(isRecord);
  const nowMs = Date.now();

  const [deploySettled, backupSettled, exitedSettled, scanSettled] =
    await Promise.allSettled([
      collectDeploymentsFactor(env, resources, nowMs),
      collectBackupsFactor(env, resources),
      Promise.resolve(collectExitedResourcesFactor(resources)),
      Promise.resolve(collectDiagnoseScanFactor(servers, resources)),
    ]);

  const factors: Record<string, unknown> = {};
  const findings: ScorecardFinding[] = [];
  let overall: FactorSeverity = 'ok';

  const absorb = (
    key: string,
    settled: PromiseSettledResult<FactorResult>,
  ): void => {
    if (settled.status === 'fulfilled') {
      factors[key] = settled.value;
      findings.push(...settled.value.findings);
      overall = maxSeverity(overall, settled.value['severity']);
      return;
    }
    factors[key] = { failed: toFactorError(settled.reason) };
  };

  absorb('deployments', deploySettled);
  absorb('backups', backupSettled);
  absorb('exited_resources', exitedSettled);
  absorb('diagnose_scan', scanSettled);


  const { score, score_breakdown } = computeScoreBreakdown(findings);

  return buildReadResponse(
    {
      severity: overall,
      score,
      score_breakdown,
      factors,
      findings,
    },
    {
      format: parsed.format,
      max_chars: parsed.max_chars,
    },
  );
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
          uuid: z.string().min(1),
        }),
      )
      .min(1)
      .optional()
      .describe('Cleanup target list (explicit UUIDs only)'),
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

async function loadResourceGraph(env: EnvConfig) {
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

  return { resources, graph };
}

function impactPreflightHints(
  type: 'application' | 'service' | 'database',
  uuid: string,
  intent: 'delete' | 'restart',
): FollowUpHint[] {
  if (intent === 'restart') {
    return [
      {
        tool: type,
        action: 'restart',
        args: { uuid },
        label: `Restart ${type} via domain tool (advisory — impact does not mutate)`,
        available_in_phase: 4,
      },
    ];
  }
  return [
    {
      tool: type,
      action: 'delete_preview',
      args: { uuid },
      label: `Preview delete for ${type}`,
      available_in_phase: 4,
    },
  ];
}

/**
 * Advisory blast-radius preflight (GRAPH-02, D-09, D-10).
 * Does not call delete/restart handlers.
 */
export async function handleIntelligenceImpact(
  parsed: IntelligenceAction,
  env: EnvConfig,
): Promise<ReadResponse<unknown>> {
  if (parsed.uuid == null || parsed.type == null) {
    throw new CoolifyApiError({
      code: 'COOLIFY_VALIDATION_ERROR',
      message: "intelligence.impact requires 'uuid' and 'type'.",
      recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
      data: { action: 'impact' },
    });
  }

  const uuid = parsed.uuid;
  const type = parsed.type;
  const intent = parsed.intent ?? 'delete';
  const maxDepth = parsed.max_depth ?? 3;

  const { graph } = await loadResourceGraph(env);
  const deps = findDependents(graph.edges, uuid, {
    max_depth: maxDepth,
    nodes: graph.nodes,
    intent,
  });

  return buildReadResponse(
    {
      target: { uuid, type },
      intent,
      direct_dependents: deps.direct,
      transitive_dependents: deps.transitive,
      depth_cap: deps.depth_cap,
      max_depth: deps.max_depth,
      advisory: true,
      suggested_preflight: impactPreflightHints(type, uuid, intent),
      ...(intent === 'restart'
        ? {
            restart_note:
              'Restart impact tags database_uuid-linked dependents as degraded (may recover when DB is up); other links are outage. Advisory only — use domain restart tools to mutate.',
          }
        : {}),
    },
    {
      format: parsed.format,
      max_chars: parsed.max_chars,
    },
  );
}

/**
 * Read-only cleanup candidate listing (JANI-01, D-11, D-12).
 * Never mutates resources.
 */
export async function handleIntelligenceJanitor(
  parsed: IntelligenceAction,
  env: EnvConfig,
): Promise<ReadResponse<unknown>> {
  const stoppedDays = parsed.stopped_days ?? 7;
  const { resources, graph } = await loadResourceGraph(env);
  const candidates = findJanitorCandidates(resources, graph, {
    stopped_days: stoppedDays,
  });

  return buildReadResponse(
    {
      candidates,
      preview_only: true,
      mutation: false,
      stopped_days: stoppedDays,
      posture:
        'preview / no mutation — use domain delete_preview or intelligence.cleanup with confirm:true',
      coverage_note:
        'Orphan detection uses UUID graph inbound degree only (D-08). Databases linked solely via env vars may appear as orphans — verify before delete.',
    },
    {
      format: parsed.format,
      max_chars: parsed.max_chars,
    },
  );
}

/**
 * Live dependency graph from flat /resources UUID links + bounded service enrichment.
 * Response data includes `meta.services_enriched` (successful fetchService count)
 * and optional `meta.service_fetch_errors` when individual enrichment calls fail.
 */
export async function handleIntelligenceGraph(
  parsed: IntelligenceAction,
  env: EnvConfig,
): Promise<ReadResponse<unknown>> {
  const { graph } = await loadResourceGraph(env);

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

type CleanupTarget = {
  type: 'application' | 'service' | 'database';
  uuid: string;
};

type CleanupItemResult = {
  type: CleanupTarget['type'];
  uuid: string;
  ok: boolean;
  deleted?: boolean;
  error?: ReturnType<typeof toStructuredError>;
};

function isDomainErrorResult(
  result: unknown,
): result is McpErrorResult {
  return (
    typeof result === 'object' &&
    result !== null &&
    'isError' in result &&
    (result as McpErrorResult).isError === true
  );
}

/**
 * Confirm-gated batch cleanup reusing domain delete handlers (JANI-02, D-13, D-14).
 * SAF-02: delete_volumes / delete_configurations default false.
 */
export async function handleIntelligenceCleanup(
  parsed: IntelligenceAction,
  env: EnvConfig,
): Promise<ReadResponse<unknown>> {
  const targets = (parsed.targets ?? []) as CleanupTarget[];

  if (targets.length === 0) {
    throw new CoolifyApiError({
      code: 'COOLIFY_VALIDATION_ERROR',
      message:
        "Action 'cleanup' requires a non-empty targets array of {type, uuid}.",
      recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
      data: {
        action: 'cleanup',
        hint: 'Call intelligence.janitor first, then pass explicit targets.',
      },
    });
  }

  await validateConfirmGate(
    'cleanup',
    parsed.confirm === true,
    targets.map((t) => ({ uuid: t.uuid, name: t.type })),
  );

  const deleteVolumes = parsed.delete_volumes ?? false;
  const deleteConfigurations = parsed.delete_configurations ?? false;

  const results: CleanupItemResult[] = [];

  for (const target of targets) {
    const deleteArgs = {
      action: 'delete' as const,
      uuid: target.uuid,
      confirm: true as const,
      delete_volumes: deleteVolumes,
      delete_configurations: deleteConfigurations,
      instance: parsed.instance,
    };

    try {
      let domainResult: unknown;
      switch (target.type) {
        case 'application':
          domainResult = await handleApplicationAction(deleteArgs, env);
          break;
        case 'service':
          domainResult = await handleServiceAction(deleteArgs, env);
          break;
        case 'database':
          domainResult = await handleDatabaseAction(deleteArgs, env);
          break;
        default: {
          const _exhaustive: never = target.type;
          throw new Error(`Unknown cleanup target type: ${String(_exhaustive)}`);
        }
      }

      if (isDomainErrorResult(domainResult)) {
        results.push({
          type: target.type,
          uuid: target.uuid,
          ok: false,
          error: domainResult.structuredContent.error,
        });
        continue;
      }

      results.push({
        type: target.type,
        uuid: target.uuid,
        ok: true,
        deleted: true,
      });
    } catch (error) {
      results.push({
        type: target.type,
        uuid: target.uuid,
        ok: false,
        error: toStructuredError(error),
      });
    }
  }

  return buildReadResponse(
    {
      ok: results.every((r) => r.ok),
      results,
      delete_volumes: deleteVolumes,
      delete_configurations: deleteConfigurations,
      hint: 'Prefer intelligence.janitor preview before cleanup mutations.',
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
        return await handleIntelligenceScorecard(parsed, routingEnv);
      case 'graph':
        return await handleIntelligenceGraph(parsed, routingEnv);
      case 'impact':
        return await handleIntelligenceImpact(parsed, routingEnv);
      case 'janitor':
        return await handleIntelligenceJanitor(parsed, routingEnv);
      case 'cleanup':
        return await handleIntelligenceCleanup(parsed, routingEnv);
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
