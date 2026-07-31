import type { EnvConfig } from '../config/env.js';
import {
  fetchAppDeployments,
  fetchApplication,
  fetchApplicationEnvs,
  fetchDeployment,
  fetchResources,
  fetchServerDomains,
  fetchServers,
  triggerDeploy,
  updateApplication,
  type Env,
} from '../api/client.js';
import { classifyIssues } from './issue-classifier.js';
import type { FollowUpHint } from './diagnose-hints.js';
import { CoolifyApiError, RECOVERY_HINTS } from './errors.js';
import { maskEnvRecords } from '../mcp/tools/env-shared.js';
import { pollDeploymentUntilTerminal } from './deploy-poll.js';
import { extractDeploymentUuid } from '../mcp/tools/application.js';

export type DeployRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type DeployPreflightFinding = {
  severity: 'critical' | 'high' | 'info';
  factor: string;
  issue: string;
  hint?: FollowUpHint;
};

export type FactorResult = {
  severity: 'critical' | 'high' | 'info' | 'ok';
  findings: DeployPreflightFinding[];
  partial?: boolean;
  error?: string;
  counts?: { critical: number; high: number; info: number };
  runtime_envs_masked?: Array<Record<string, unknown>>;
};

export type DeployRiskScoreResult = {
  risk_score: number;
  risk_level: DeployRiskLevel;
  score_breakdown: {
    start: number;
    critical: number;
    high: number;
    info: number;
    deductions: { critical: number; high: number; info: number };
  };
};

const STUCK_DEPLOY_MS = 24 * 60 * 60 * 1000;
const RECENT_FAIL_MS = 7 * 24 * 60 * 60 * 1000;
const GIT_COMMIT_SHA_RE = /^[0-9a-f]{7,64}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deploymentTimestamp(dep: Record<string, unknown>): number {
  const candidates = [
    dep.updated_at,
    dep.finished_at,
    dep.created_at,
    dep.createdAt,
  ];
  for (const raw of candidates) {
    if (typeof raw === 'string' && raw.trim() !== '') {
      const ms = Date.parse(raw);
      if (Number.isFinite(ms)) return ms;
    }
  }
  return 0;
}

export function sortDeploymentsNewestFirst(
  deployments: unknown[],
): Record<string, unknown>[] {
  return deployments
    .filter(isRecord)
    .slice()
    .sort((a, b) => deploymentTimestamp(b) - deploymentTimestamp(a));
}

export function findLastSuccessfulDeployment(
  deployments: unknown[],
): Record<string, unknown> | null {
  const sorted = sortDeploymentsNewestFirst(deployments);
  const finished = sorted.filter(
    (dep) => String(dep.status ?? '').toLowerCase() === 'finished',
  );
  if (finished.length === 0) return null;

  const newest = sorted[0];
  const newestIsFinished =
    newest != null &&
    String(newest.status ?? '').toLowerCase() === 'finished';

  if (newestIsFinished) {
    if (finished.length < 2) return null;
    return finished[1] ?? null;
  }

  return finished[0] ?? null;
}

export function computeDeployRiskScore(
  findings: DeployPreflightFinding[],
): DeployRiskScoreResult {
  const critical = findings.filter((f) => f.severity === 'critical').length;
  const high = findings.filter((f) => f.severity === 'high').length;
  const info = findings.filter((f) => f.severity === 'info').length;
  const deductions = {
    critical: critical * 30,
    high: high * 15,
    info: info * 5,
  };
  const risk_score = Math.max(
    0,
    100 - deductions.critical - deductions.high - deductions.info,
  );

  let risk_level: DeployRiskLevel = 'low';
  if (critical > 0 || risk_score < 40) {
    risk_level = 'critical';
  } else if (risk_score < 70) {
    risk_level = 'high';
  } else if (risk_score < 85) {
    risk_level = 'medium';
  }

  return {
    risk_score,
    risk_level,
    score_breakdown: {
      start: 100,
      critical,
      high,
      info,
      deductions,
    },
  };
}

function okFactor(): FactorResult {
  return { severity: 'ok', findings: [], counts: { critical: 0, high: 0, info: 0 } };
}

function factorFromFindings(findings: DeployPreflightFinding[]): FactorResult {
  const counts = {
    critical: findings.filter((f) => f.severity === 'critical').length,
    high: findings.filter((f) => f.severity === 'high').length,
    info: findings.filter((f) => f.severity === 'info').length,
  };
  let severity: FactorResult['severity'] = 'ok';
  if (counts.critical > 0) severity = 'critical';
  else if (counts.high > 0) severity = 'high';
  else if (counts.info > 0) severity = 'info';
  return { severity, findings, counts };
}

function deployLogsHint(uuid: string, deploymentUuid?: string): FollowUpHint {
  if (deploymentUuid) {
    return {
      tool: 'deployment',
      action: 'logs',
      args: { deployment_uuid: deploymentUuid },
      label: 'Inspect deployment build logs',
      available_in_phase: 4,
    };
  }
  return {
    tool: 'deployment',
    action: 'list',
    args: { application_uuid: uuid },
    label: 'List application deployments',
    available_in_phase: 4,
  };
}

async function collectInstanceHealthFactor(
  env: EnvConfig,
  appUuid: string,
  app: Record<string, unknown>,
): Promise<FactorResult> {
  const [servers, resources] = await Promise.all([
    fetchServers(env.COOLIFY_URL, env.COOLIFY_TOKEN, env.COOLIFY_VERIFY_SSL),
    fetchResources(env.COOLIFY_URL, env.COOLIFY_TOKEN, env.COOLIFY_VERIFY_SSL),
  ]);

  const serverId = app.server_id ?? app.destination_id;
  const classified = classifyIssues(servers, resources);
  const findings: DeployPreflightFinding[] = [];

  for (const bucket of ['critical', 'high', 'info'] as const) {
    for (const issue of classified[bucket]) {
      if (issue.uuid === appUuid) {
        findings.push({
          severity: bucket,
          factor: 'instance_health',
          issue: issue.issue,
          hint: issue.hint,
        });
      } else if (
        serverId != null &&
        issue.resource_type === 'server' &&
        String(issue.uuid) === String(serverId)
      ) {
        findings.push({
          severity: bucket,
          factor: 'instance_health',
          issue: issue.issue,
          hint: issue.hint,
        });
      }
    }
  }

  return factorFromFindings(findings);
}

async function collectEnvCompletenessFactor(
  env: EnvConfig,
  appUuid: string,
): Promise<FactorResult> {
  const raw = await fetchApplicationEnvs(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    appUuid,
    env.COOLIFY_VERIFY_SSL,
  );
  const envs = Array.isArray(raw) ? (raw as Env[]) : [];
  const runtime = envs.filter((entry) => !entry.is_preview);
  const findings: DeployPreflightFinding[] = [];

  for (const entry of runtime) {
    const value = entry.value;
    if (value == null || String(value).trim() === '') {
      findings.push({
        severity: 'high',
        factor: 'env_completeness',
        issue: `Runtime env key "${entry.key}" has an empty value`,
        hint: {
          tool: 'application',
          action: 'envs:list',
          args: { uuid: appUuid },
          label: 'Review application environment variables',
          available_in_phase: 4,
        },
      });
    }
  }

  if (runtime.length === 0) {
    findings.push({
      severity: 'info',
      factor: 'env_completeness',
      issue: 'No runtime environment variables configured',
      hint: {
        tool: 'application',
        action: 'envs:list',
        args: { uuid: appUuid },
        label: 'Review application environment variables',
        available_in_phase: 4,
      },
    });
  }

  const masked = maskEnvRecords(runtime, false);

  return {
    ...factorFromFindings(findings),
    runtime_envs_masked: masked,
  };
}

async function collectRecentDeploymentFailuresFactor(
  env: EnvConfig,
  appUuid: string,
  nowMs: number,
  deploymentsInput?: unknown[],
): Promise<FactorResult> {
  const deployments =
    deploymentsInput ??
    (await fetchAppDeployments(
      env.COOLIFY_URL,
      env.COOLIFY_TOKEN,
      appUuid,
      env.COOLIFY_VERIFY_SSL,
    ));
  const sorted = sortDeploymentsNewestFirst(deployments);
  if (sorted.length === 0) {
    return okFactor();
  }

  const findings: DeployPreflightFinding[] = [];
  const latest = sorted[0]!;
  const latestStatus = String(latest.status ?? '').toLowerCase();
  const latestUuid =
    latest.deployment_uuid != null ? String(latest.deployment_uuid) : undefined;
  const latestTs = deploymentTimestamp(latest);

  if (latestStatus === 'failed') {
    findings.push({
      severity: 'high',
      factor: 'recent_deployment_failures',
      issue: 'Latest deployment failed',
      hint: deployLogsHint(appUuid, latestUuid),
    });
  } else if (
    (latestStatus === 'in_progress' || latestStatus === 'queued') &&
    latestTs > 0 &&
    nowMs - latestTs > STUCK_DEPLOY_MS
  ) {
    findings.push({
      severity: 'high',
      factor: 'recent_deployment_failures',
      issue: 'Deployment stuck in progress >24h',
      hint: deployLogsHint(appUuid, latestUuid),
    });
  } else {
    const recentOlderFail = sorted.slice(1).find((dep) => {
      const status = String(dep.status ?? '').toLowerCase();
      const ts = deploymentTimestamp(dep);
      return status === 'failed' && ts > 0 && nowMs - ts <= RECENT_FAIL_MS;
    });
    if (recentOlderFail) {
      const failUuid =
        recentOlderFail.deployment_uuid != null
          ? String(recentOlderFail.deployment_uuid)
          : undefined;
      findings.push({
        severity: 'info',
        factor: 'recent_deployment_failures',
        issue: 'A recent deployment failed within the last 7 days',
        hint: deployLogsHint(appUuid, failUuid),
      });
    }
  }

  return factorFromFindings(findings);
}

async function collectDnsReadinessFactor(
  env: EnvConfig,
  app: Record<string, unknown>,
): Promise<FactorResult> {
  const fqdn = String(app.fqdn ?? '').trim();
  const hasGit = Boolean(app.git_repository);
  const findings: DeployPreflightFinding[] = [];

  if (hasGit && !fqdn) {
    findings.push({
      severity: 'high',
      factor: 'dns_readiness',
      issue: 'Public git application has no fqdn configured',
      hint: {
        tool: 'application',
        action: 'update',
        args: { uuid: String(app.uuid ?? '') },
        label: 'Configure application domains',
        available_in_phase: 4,
      },
    });
  }

  const serverUuid = app.server_uuid ?? app.destination_uuid;
  if (fqdn && serverUuid) {
    try {
      const domains = await fetchServerDomains(
        env.COOLIFY_URL,
        env.COOLIFY_TOKEN,
        String(serverUuid),
        env.COOLIFY_VERIFY_SSL,
      );
      if (Array.isArray(domains) && domains.length === 0) {
        findings.push({
          severity: 'info',
          factor: 'dns_readiness',
          issue: 'Server has no custom domains configured',
          hint: {
            tool: 'docs',
            action: 'fqdn',
            args: {},
            label: 'Review Coolify domain configuration docs',
            available_in_phase: 10,
          },
        });
      }
    } catch {
      findings.push({
        severity: 'info',
        factor: 'dns_readiness',
        issue: 'Could not load server domain configuration',
        hint: {
          tool: 'server',
          action: 'get',
          args: { uuid: String(serverUuid) },
          label: 'Inspect server domain settings',
          available_in_phase: 3,
        },
      });
    }
  }

  return factorFromFindings(findings);
}

type FactorKey =
  | 'instance_health'
  | 'env_completeness'
  | 'recent_deployment_failures'
  | 'dns_readiness';

async function settleFactor(
  key: FactorKey,
  promise: Promise<FactorResult>,
): Promise<FactorResult> {
  try {
    return await promise;
  } catch (error) {
    return {
      severity: 'ok',
      findings: [],
      partial: true,
      error: error instanceof Error ? error.message : String(error),
      counts: { critical: 0, high: 0, info: 0 },
    };
  }
}

export type DeployPreflightReport = {
  application_uuid: string;
  risk_score: number;
  risk_level: DeployRiskLevel;
  blocking: boolean;
  factors: Record<FactorKey, FactorResult>;
  findings: DeployPreflightFinding[];
  recommended_actions: FollowUpHint[];
  advisory: true;
  score_breakdown: DeployRiskScoreResult['score_breakdown'];
  partial_factors?: string[];
};

export async function buildDeployPreflightReport(
  env: EnvConfig,
  appUuid: string,
): Promise<DeployPreflightReport> {
  const appRaw = await fetchApplication(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    appUuid,
    env.COOLIFY_VERIFY_SSL,
  );
  const app = isRecord(appRaw) ? appRaw : {};
  const nowMs = Date.now();

  const deployments = await fetchAppDeployments(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    appUuid,
    env.COOLIFY_VERIFY_SSL,
  );

  const [instance_health, env_completeness, recent_deployment_failures, dns_readiness] =
    await Promise.all([
      settleFactor(
        'instance_health',
        collectInstanceHealthFactor(env, appUuid, app),
      ),
      settleFactor(
        'env_completeness',
        collectEnvCompletenessFactor(env, appUuid),
      ),
      settleFactor(
        'recent_deployment_failures',
        collectRecentDeploymentFailuresFactor(env, appUuid, nowMs, deployments),
      ),
      settleFactor('dns_readiness', collectDnsReadinessFactor(env, app)),
    ]);

  const factors = {
    instance_health,
    env_completeness,
    recent_deployment_failures,
    dns_readiness,
  };

  const allFindings = Object.values(factors).flatMap((f) => f.findings);
  const { risk_score, risk_level, score_breakdown } =
    computeDeployRiskScore(allFindings);

  const latest = sortDeploymentsNewestFirst(deployments)[0];
  const latestInProgress =
    latest != null &&
    ['in_progress', 'queued'].includes(
      String(latest.status ?? '').toLowerCase(),
    );

  const blocking = risk_level === 'critical' || latestInProgress;

  const recommended_actions: FollowUpHint[] = [];
  if (blocking) {
    recommended_actions.push({
      tool: 'diagnose',
      action: 'logs',
      args: { uuid: appUuid },
      label: 'Inspect application logs before deploying',
      available_in_phase: 26,
    });
    if (latestInProgress && latest?.deployment_uuid != null) {
      recommended_actions.push({
        tool: 'deployment',
        action: 'get',
        args: {
          deployment_uuid: String(latest.deployment_uuid),
        },
        label: 'Inspect in-progress deployment',
        available_in_phase: 4,
      });
    } else if (
      latest != null &&
      String(latest.status ?? '').toLowerCase() === 'failed' &&
      latest.deployment_uuid != null
    ) {
      recommended_actions.push({
        tool: 'deployment',
        action: 'get',
        args: {
          deployment_uuid: String(latest.deployment_uuid),
        },
        label: 'Inspect failed deployment',
        available_in_phase: 4,
      });
    }
  } else {
    recommended_actions.push({
      tool: 'application',
      action: 'deploy',
      args: { uuid: appUuid },
      label: 'Deploy application after preflight',
      available_in_phase: 4,
    });
  }

  const partial_factors = Object.entries(factors)
    .filter(([, factor]) => factor.partial)
    .map(([key]) => key);

  return {
    application_uuid: appUuid,
    risk_score,
    risk_level,
    blocking,
    factors,
    findings: allFindings,
    recommended_actions,
    advisory: true,
    score_breakdown,
    ...(partial_factors.length > 0 ? { partial_factors } : {}),
  };
}

export type RollbackPreview = {
  application_uuid: string;
  rollback_target: {
    deployment_uuid: string;
    status: string;
    git_commit_sha?: string;
    docker_registry_image_tag?: string;
    finished_at?: string;
  };
  would_redeploy_commit?: string;
  would_redeploy_tag?: string;
};

export async function executeDeploymentRollback(
  env: EnvConfig,
  appUuid: string,
  options: {
    confirm?: boolean;
    force?: boolean;
    wait?: boolean;
    timeout?: number;
  },
): Promise<Record<string, unknown>> {
  const deployments = await fetchAppDeployments(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    appUuid,
    env.COOLIFY_VERIFY_SSL,
  );
  const target = findLastSuccessfulDeployment(deployments);
  if (!target) {
    const sorted = sortDeploymentsNewestFirst(deployments);
    const newest = sorted[0];
    const newestIsFinished =
      newest != null &&
      String(newest.status ?? '').toLowerCase() === 'finished';
    const finishedCount = sorted.filter(
      (dep) => String(dep.status ?? '').toLowerCase() === 'finished',
    ).length;
    const alreadyOnLast = newestIsFinished && finishedCount === 1;

    throw new CoolifyApiError({
      code: 'COOLIFY_ROLLBACK_UNAVAILABLE',
      message: alreadyOnLast
        ? 'Application is already on the last successful deployment; no prior version to roll back to.'
        : 'No finished deployment found to roll back to.',
      recoveryHints: RECOVERY_HINTS.COOLIFY_ROLLBACK_UNAVAILABLE,
    });
  }

  const targetUuid = String(target.deployment_uuid ?? '');
  const commit = target.git_commit_sha != null ? String(target.git_commit_sha) : '';
  const dockerTag =
    target.docker_registry_image_tag != null
      ? String(target.docker_registry_image_tag)
      : '';

  const preview: RollbackPreview = {
    application_uuid: appUuid,
    rollback_target: {
      deployment_uuid: targetUuid,
      status: String(target.status ?? 'finished'),
      ...(commit ? { git_commit_sha: commit } : {}),
      ...(dockerTag ? { docker_registry_image_tag: dockerTag } : {}),
      ...(target.finished_at != null
        ? { finished_at: String(target.finished_at) }
        : {}),
    },
    ...(commit ? { would_redeploy_commit: commit } : {}),
    ...(dockerTag ? { would_redeploy_tag: dockerTag } : {}),
  };

  if (options.confirm !== true) {
    throw new CoolifyApiError({
      code: 'COOLIFY_CONFIRM_REQUIRED',
      message: "Action 'rollback' requires confirm:true before mutating.",
      recoveryHints: RECOVERY_HINTS.COOLIFY_CONFIRM_REQUIRED,
      data: preview as unknown as Record<string, unknown>,
    });
  }

  const appRaw = await fetchApplication(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    appUuid,
    env.COOLIFY_VERIFY_SSL,
  );
  const app = isRecord(appRaw) ? appRaw : {};
  const buildPack = String(app.build_pack ?? '').toLowerCase();

  if (buildPack === 'dockerimage' && !dockerTag) {
    throw new CoolifyApiError({
      code: 'COOLIFY_ROLLBACK_UNAVAILABLE',
      message:
        'Rollback target deployment has no docker_registry_image_tag; cannot pin docker rollback.',
      recoveryHints: RECOVERY_HINTS.COOLIFY_ROLLBACK_UNAVAILABLE,
      data: preview as unknown as Record<string, unknown>,
    });
  }

  if (buildPack !== 'dockerimage' && !commit) {
    throw new CoolifyApiError({
      code: 'COOLIFY_ROLLBACK_UNAVAILABLE',
      message:
        'Rollback target deployment has no git_commit_sha; cannot pin git rollback.',
      recoveryHints: RECOVERY_HINTS.COOLIFY_ROLLBACK_UNAVAILABLE,
      data: preview as unknown as Record<string, unknown>,
    });
  }

  if (buildPack !== 'dockerimage' && commit) {
    if (!GIT_COMMIT_SHA_RE.test(commit)) {
      throw new CoolifyApiError({
        code: 'COOLIFY_422',
        message: 'Rollback target git_commit_sha is not a valid commit SHA.',
        recoveryHints: RECOVERY_HINTS.COOLIFY_422,
      });
    }
    await updateApplication(
      env.COOLIFY_URL,
      env.COOLIFY_TOKEN,
      appUuid,
      { git_commit_sha: commit },
      env.COOLIFY_VERIFY_SSL,
    );
  }

  const deployRaw = await triggerDeploy(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    appUuid,
    options.force ?? false,
    env.COOLIFY_VERIFY_SSL,
    buildPack === 'dockerimage' && dockerTag ? { dockerTag } : undefined,
  );

  const deploymentUuid = extractDeploymentUuid(deployRaw);
  const rolled_back_to: Record<string, unknown> = {
    deployment_uuid: targetUuid,
    ...(commit ? { commit } : {}),
    ...(dockerTag ? { docker_tag: dockerTag } : {}),
  };
  let terminal: Record<string, unknown> | undefined;

  if (options.wait === true) {
    const timeoutMs = (options.timeout ?? 300) * 1000;
    terminal = await pollDeploymentUntilTerminal(
      async () => {
        const raw = await fetchDeployment(
          env.COOLIFY_URL,
          env.COOLIFY_TOKEN,
          deploymentUuid,
          env.COOLIFY_VERIFY_SSL,
        );
        return isRecord(raw) ? raw : { status: 'in_progress', deployment_uuid: deploymentUuid };
      },
      timeoutMs,
    );

    const status = String(terminal.status ?? '');
    if (status === 'failed') {
      throw new CoolifyApiError({
        code: 'COOLIFY_DEPLOYMENT_FAILED',
        message: `Rollback deployment failed with status: ${status}.`,
        recoveryHints: RECOVERY_HINTS.COOLIFY_DEPLOYMENT_FAILED,
        data: { deployment_uuid: deploymentUuid, rolled_back_to },
      });
    }
    if (status === 'timeout') {
      throw new CoolifyApiError({
        code: 'COOLIFY_WATCH_TIMEOUT',
        message:
          'Rollback watch timed out before deployment reached a terminal state.',
        recoveryHints: RECOVERY_HINTS.COOLIFY_WATCH_TIMEOUT,
        data: { deployment_uuid: deploymentUuid, rolled_back_to },
      });
    }
  }

  const hints: FollowUpHint[] = [
    {
      tool: 'deployment',
      action: 'get',
      args: { deployment_uuid: deploymentUuid },
      label: 'Inspect rollback deployment',
      available_in_phase: 4,
    },
    {
      tool: 'deployment',
      action: 'preflight',
      args: { uuid: appUuid },
      label: 'Run deploy preflight before next deploy',
      available_in_phase: 30,
    },
  ];

  return {
    application_uuid: appUuid,
    deployment_uuid: deploymentUuid,
    rolled_back_to,
    rollback_target: preview.rollback_target,
    status: terminal?.status ?? 'queued',
    hints,
    limitations: [
      'Docker rollbacks require the image tag to still exist on the server.',
    ],
  };
}
