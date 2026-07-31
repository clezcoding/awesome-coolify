import type { FollowUpHint } from './diagnose-hints.js';

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deploymentTimestamp(dep: Record<string, unknown>): number {
  const raw =
    dep.updated_at ?? dep.finished_at ?? dep.created_at ?? dep.createdAt;
  const ms = typeof raw === 'string' ? Date.parse(raw) : NaN;
  return Number.isFinite(ms) ? ms : 0;
}

/** Newest-first deployment ordering (shared with intelligence scorecard). */
export function sortDeploymentsNewestFirst(
  deployments: unknown[],
): Record<string, unknown>[] {
  return deployments
    .filter(isRecord)
    .slice()
    .sort((a, b) => deploymentTimestamp(b) - deploymentTimestamp(a));
}

/** Wave 0 stub — implemented in 30-01/30-02. */
export function findLastSuccessfulDeployment(
  _deployments: unknown[],
): Record<string, unknown> | null {
  throw new Error('not implemented');
}

/** Wave 0 stub — implemented in 30-01. */
export function computeDeployRiskScore(
  _findings: DeployPreflightFinding[],
): DeployRiskScoreResult {
  throw new Error('not implemented');
}
