export interface ResourceSummary {
  uuid: string;
  name: string;
  type: 'application' | 'database' | 'service';
  status: string;
  health: string;
  fqdn: string | null;
  project_name: string;
  server_name: string;
  updated_at: string;
}

export interface ApplicationSummary {
  uuid: string;
  name: string;
  status: string;
  fqdn: string | null;
  project_name: string;
  server_name: string;
  project_uuid: string;
  server_uuid: string;
  destination_uuid: string;
  updated_at: string;
}

export interface ServiceSummary {
  uuid: string;
  name: string;
  status: string;
  fqdn: string | null;
  project_name: string;
  server_name: string;
  project_uuid: string;
  server_uuid: string;
  updated_at: string;
}

export interface DatabaseSummary {
  uuid: string;
  name: string;
  status: string;
  type: string;
  project_name: string;
  server_name: string;
  project_uuid: string;
  server_uuid: string;
  updated_at: string;
}

export type ProjectionMode = 'summary' | 'full';

import type { FollowUpHint } from './diagnose-hints.js';
import { generateHints } from './diagnose-hints.js';
import type { ScanIssue } from './issue-classifier.js';

export interface DeploymentSummary {
  deployment_uuid: string;
  commit: string;
  status: string;
  created_at: string;
  finished_at: string;
}

export interface LastDeployment {
  commit: string;
  status: string;
  finished_at: string;
}

export interface AppDiagnoseSummary {
  uuid: string;
  name: string;
  fqdn: string | null;
  project_name: string;
  server_name: string;
  status: string;
  health_check_status: string;
  env_count: number | null;
  last_deployment: LastDeployment;
  recent_deployments: DeploymentSummary[];
  updated_at: string;
  hints: FollowUpHint[];
}

export interface AppDiagnoseFull extends AppDiagnoseSummary {
  raw_application: unknown;
  deployments: Array<DeploymentSummary & { logs?: string }>;
}

export interface ResourceTypeCounts {
  total: number;
  running: number;
  stopped: number;
  unhealthy: number;
}

export interface ServerDiagnoseView {
  uuid: string;
  name: string;
  ip: string;
  status: string;
  is_reachable: boolean;
  updated_at: string;
  resources_counts: {
    applications: ResourceTypeCounts;
    databases: ResourceTypeCounts;
    services: ResourceTypeCounts;
  };
  domains: Array<{
    ip: string;
    ipv4: string | null;
    ipv6: string | null;
    domain: string;
  }>;
  validation_started: boolean;
  hints: FollowUpHint[];
}

const SECRET_KEY_PATTERN = /password|token|secret|private|env/i;

export function projectResourceSummary(raw: Record<string, unknown>): ResourceSummary {
  const status = String(raw.status ?? 'unknown');
  return {
    uuid: String(raw.uuid ?? raw.id ?? ''),
    name: String(raw.name ?? ''),
    type: (raw.type as ResourceSummary['type']) || 'application',
    status,
    health: String(raw.health ?? raw.status_detail ?? status),
    fqdn: (raw.fqdn as string | null) ?? (raw.domain as string | null) ?? null,
    project_name: (raw.project as { name?: string } | undefined)?.name ?? 'default',
    server_name: (raw.server as { name?: string } | undefined)?.name ?? 'localhost',
    updated_at: String(raw.updated_at ?? new Date().toISOString()),
  };
}

export function projectApplicationSummary(raw: Record<string, unknown>): ApplicationSummary {
  return {
    uuid: String(raw.uuid ?? raw.id ?? ''),
    name: String(raw.name ?? ''),
    status: String(raw.status ?? 'unknown'),
    fqdn: (raw.fqdn as string | null) ?? null,
    project_name: (raw.project as { name?: string } | undefined)?.name ?? 'default',
    server_name: (raw.server as { name?: string } | undefined)?.name ?? 'localhost',
    project_uuid: (raw.project as { uuid?: string } | undefined)?.uuid ?? '',
    server_uuid: (raw.server as { uuid?: string } | undefined)?.uuid ?? '',
    destination_uuid: (raw.destination as { uuid?: string } | undefined)?.uuid ?? '',
    updated_at: String(raw.updated_at ?? new Date().toISOString()),
  };
}

export function projectServiceSummary(raw: Record<string, unknown>): ServiceSummary {
  return {
    uuid: String(raw.uuid ?? raw.id ?? ''),
    name: String(raw.name ?? ''),
    status: String(raw.status ?? 'unknown'),
    fqdn: (raw.fqdn as string | null) ?? null,
    project_name: (raw.project as { name?: string } | undefined)?.name ?? 'default',
    server_name: (raw.server as { name?: string } | undefined)?.name ?? 'localhost',
    project_uuid: (raw.project as { uuid?: string } | undefined)?.uuid ?? '',
    server_uuid: (raw.server as { uuid?: string } | undefined)?.uuid ?? '',
    updated_at: String(raw.updated_at ?? new Date().toISOString()),
  };
}

export function projectDatabaseSummary(raw: Record<string, unknown>): DatabaseSummary {
  return {
    uuid: String(raw.uuid ?? raw.id ?? ''),
    name: String(raw.name ?? ''),
    status: String(raw.status ?? 'unknown'),
    type: String(raw.type ?? 'database'),
    project_name: (raw.project as { name?: string } | undefined)?.name ?? 'default',
    server_name: (raw.server as { name?: string } | undefined)?.name ?? 'localhost',
    project_uuid: (raw.project as { uuid?: string } | undefined)?.uuid ?? '',
    server_uuid: (raw.server as { uuid?: string } | undefined)?.uuid ?? '',
    updated_at: String(raw.updated_at ?? new Date().toISOString()),
  };
}

export function sanitizeFullProjection(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const clone = JSON.parse(JSON.stringify(raw)) as Record<string, unknown>;

  const maskSecrets = (obj: Record<string, unknown>): void => {
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        maskSecrets(value as Record<string, unknown>);
      } else if (SECRET_KEY_PATTERN.test(key) && typeof value === 'string') {
        obj[key] = '***';
      }
    }
  };

  maskSecrets(clone);
  return clone;
}

export function resolveProjection(
  projection?: ProjectionMode,
  includeFull?: boolean,
): ProjectionMode {
  if (includeFull === true || projection === 'full') {
    return 'full';
  }
  return 'summary';
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
): ResourceTypeCounts {
  return {
    total: items.length,
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

function mapDeployment(raw: Record<string, unknown>): DeploymentSummary {
  return projectDeploymentSummary(raw);
}

export function projectDeploymentSummary(
  raw: Record<string, unknown>,
): DeploymentSummary {
  return {
    deployment_uuid: String(raw.deployment_uuid ?? raw.id ?? ''),
    commit: String(raw.git_commit_sha ?? raw.commit ?? ''),
    status: String(raw.status ?? 'unknown'),
    created_at: String(raw.created_at ?? ''),
    finished_at: String(raw.finished_at ?? raw.updated_at ?? ''),
  };
}

export function truncateLogs(logs: string, maxChars: number): string {
  if (logs.length <= maxChars) return logs;
  return logs.slice(0, maxChars) + '…[truncated]';
}

export function projectDeploymentFull(
  raw: Record<string, unknown>,
  maxChars = 16000,
): DeploymentSummary & { logs?: string; raw_deployment: unknown } {
  const summary = projectDeploymentSummary(raw);
  const logs = raw.logs;
  return {
    ...summary,
    ...(typeof logs === 'string'
      ? { logs: truncateLogs(logs, maxChars) }
      : {}),
    raw_deployment: sanitizeFullProjection(raw),
  };
}

export function projectAppDiagnose(
  raw: Record<string, unknown>,
  envCount: number | null,
  deployments: unknown[],
  projection: ProjectionMode,
  maxChars = 16000,
): AppDiagnoseSummary | AppDiagnoseFull {
  const status = String(raw.status ?? 'unknown');
  const healthCheckStatus = String(
    raw.health_check_status ?? raw.health ?? status,
  );
  const uuid = String(raw.uuid ?? raw.id ?? '');

  const mappedDeployments = deployments
    .filter(isRecord)
    .map(mapDeployment);

  const lastDeployment: LastDeployment = mappedDeployments[0]
    ? {
        commit: mappedDeployments[0].commit,
        status: mappedDeployments[0].status,
        finished_at: mappedDeployments[0].finished_at,
      }
    : { commit: '', status: 'none', finished_at: '' };

  const summary: AppDiagnoseSummary = {
    uuid,
    name: String(raw.name ?? ''),
    fqdn: (raw.fqdn as string | null) ?? null,
    project_name:
      (raw.project as { name?: string } | undefined)?.name ?? 'N/A',
    server_name:
      (raw.server as { name?: string } | undefined)?.name ?? 'N/A',
    status,
    health_check_status: healthCheckStatus,
    env_count: envCount,
    last_deployment: lastDeployment,
    recent_deployments: mappedDeployments,
    updated_at: String(raw.updated_at ?? new Date().toISOString()),
    hints: generateHints('application', uuid, status, healthCheckStatus),
  };

  if (projection === 'full') {
    const fullDeployments = deployments.filter(isRecord).map((dep) => {
      const base = mapDeployment(dep);
      const logs = dep.logs ?? dep.build_logs;
      return {
        ...base,
        ...(typeof logs === 'string'
          ? { logs: truncateLogs(logs, maxChars) }
          : {}),
      };
    });

    return {
      ...summary,
      raw_application: sanitizeFullProjection(raw),
      deployments: fullDeployments,
    };
  }

  return summary;
}

export function projectServerDiagnose(
  rawServer: Record<string, unknown>,
  resources: unknown[],
  domains: unknown[],
  validationStarted: boolean,
): ServerDiagnoseView {
  const reachable = (rawServer.settings as { is_reachable?: boolean } | undefined)
    ?.is_reachable;
  const isReachable = reachable !== false;
  const uuid = String(rawServer.uuid ?? rawServer.id ?? '');
  const status = isReachable ? 'running' : 'unreachable';

  const typedResources = resources.filter(isRecord);
  const applications = typedResources.filter((r) => r.type === 'application');
  const databases = typedResources.filter((r) => r.type === 'database');
  const services = typedResources.filter((r) => r.type === 'service');

  const mappedDomains = domains.filter(isRecord).map((d) => ({
    ip: String(d.ip ?? ''),
    ipv4: (d.ipv4 as string | null) ?? null,
    ipv6: (d.ipv6 as string | null) ?? null,
    domain: String(d.domain ?? ''),
  }));

  return {
    uuid,
    name: String(rawServer.name ?? ''),
    ip: String(rawServer.ip ?? ''),
    status,
    is_reachable: isReachable,
    updated_at: String(rawServer.updated_at ?? new Date().toISOString()),
    resources_counts: {
      applications: countByStatus(applications),
      databases: countByStatus(databases),
      services: countByStatus(services),
    },
    domains: mappedDomains,
    validation_started: validationStarted,
    hints: generateHints('server', uuid, status),
  };
}

export function projectScanIssue(issue: ScanIssue): ScanIssue {
  return {
    resource_type: issue.resource_type,
    uuid: issue.uuid,
    name: issue.name,
    status: issue.status,
    issue: issue.issue,
    hint: issue.hint,
  };
}
