import { describe, expect, it } from 'vitest';
import {
  computeDeployRiskScore,
  findLastSuccessfulDeployment,
  sortDeploymentsNewestFirst,
  type DeployPreflightFinding,
} from './deploy-preflight.js';

const mixedDeployments = [
  {
    deployment_uuid: 'dep-failed',
    status: 'failed',
    created_at: '2026-07-12T03:00:00.000Z',
  },
  {
    deployment_uuid: 'dep-finished',
    status: 'finished',
    git_commit_sha: 'abc123',
    created_at: '2026-07-12T02:00:00.000Z',
  },
  {
    deployment_uuid: 'dep-progress',
    status: 'in_progress',
    created_at: '2026-07-12T04:00:00.000Z',
  },
  {
    deployment_uuid: 'dep-queued',
    status: 'queued',
    created_at: '2026-07-12T01:00:00.000Z',
  },
  {
    deployment_uuid: 'dep-cancelled',
    status: 'cancelled-by-user',
    created_at: '2026-07-12T00:00:00.000Z',
  },
];

describe('sortDeploymentsNewestFirst', () => {
  it('orders by newest created_at first', () => {
    const sorted = sortDeploymentsNewestFirst(mixedDeployments);
    expect(sorted[0]?.deployment_uuid).toBe('dep-progress');
    expect(sorted[sorted.length - 1]?.deployment_uuid).toBe('dep-cancelled');
  });
});

describe('findLastSuccessfulDeployment', () => {
  it(
    'returns newest finished deployment skipping failed, in_progress, queued, cancelled (GUARD-03)',
    () => {
      const target = findLastSuccessfulDeployment(mixedDeployments);
      expect(target?.deployment_uuid).toBe('dep-finished');
    },
  );

  it('returns null when no finished deployment exists (GUARD-03)', () => {
    const target = findLastSuccessfulDeployment([
      { deployment_uuid: 'd1', status: 'failed', created_at: '2026-01-01T00:00:00.000Z' },
      { deployment_uuid: 'd2', status: 'in_progress', created_at: '2026-01-02T00:00:00.000Z' },
    ]);
    expect(target).toBeNull();
  });
});

describe('computeDeployRiskScore', () => {
  it(
    'applies critical −30, high −15, info −5 deductions clamped 0–100 (GUARD-02)',
    () => {
      const findings: DeployPreflightFinding[] = [
        { severity: 'critical', factor: 'instance_health', issue: 'server down' },
        { severity: 'high', factor: 'env_completeness', issue: 'empty env' },
        { severity: 'info', factor: 'dns_readiness', issue: 'no wildcard' },
      ];
      const result = computeDeployRiskScore(findings);
      expect(result.risk_score).toBe(50);
      expect(result.score_breakdown.deductions).toEqual({
        critical: 30,
        high: 15,
        info: 5,
      });
    },
  );

  it('risk_level critical when any critical finding (GUARD-02)', () => {
    const result = computeDeployRiskScore([
      { severity: 'critical', factor: 'instance_health', issue: 'down' },
    ]);
    expect(result.risk_level).toBe('critical');
  });

  it('risk_level high when score below 70 without critical (GUARD-02)', () => {
    const result = computeDeployRiskScore([
      { severity: 'high', factor: 'env_completeness', issue: 'a' },
      { severity: 'high', factor: 'recent_deployment_failures', issue: 'b' },
      { severity: 'high', factor: 'dns_readiness', issue: 'c' },
    ]);
    expect(result.risk_score).toBe(55);
    expect(result.risk_level).toBe('high');
  });

  it('risk_level medium when score below 85 (GUARD-02)', () => {
    const result = computeDeployRiskScore([
      { severity: 'high', factor: 'env_completeness', issue: 'a' },
      { severity: 'info', factor: 'dns_readiness', issue: 'b' },
    ]);
    expect(result.risk_score).toBe(80);
    expect(result.risk_level).toBe('medium');
  });

  it('risk_level low when score 85+ (GUARD-02)', () => {
    const result = computeDeployRiskScore([
      { severity: 'info', factor: 'dns_readiness', issue: 'hint only' },
    ]);
    expect(result.risk_score).toBe(95);
    expect(result.risk_level).toBe('low');
  });
});
