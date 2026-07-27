import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  deploymentToolSchema,
  handleDeploymentAction,
  isDeploymentErrorResult,
} from './deployment.js';
import type { EnvConfig } from '../../config/env.js';
import { CoolifyApiError } from '../../utils/errors.js';

vi.mock('../../api/client.js', () => ({
  fetchAppDeployments: vi.fn(),
  fetchDeployment: vi.fn(),
  cancelDeployment: vi.fn(),
}));

import {
  fetchAppDeployments,
  fetchDeployment,
  cancelDeployment,
} from '../../api/client.js';

const testEnv: EnvConfig = {
  COOLIFY_URL: 'https://coolify.example.com',
  COOLIFY_TOKEN: 'test-token-value-xyz',
  COOLIFY_VERIFY_SSL: true,
  COOLIFY_MCP_LOG: 'info',
};

const mockDeployments = [
  {
    deployment_uuid: 'dep-1',
    git_commit_sha: 'abc123',
    status: 'finished',
    created_at: '2026-07-12T01:00:00.000Z',
    finished_at: '2026-07-12T01:05:00.000Z',
  },
  {
    deployment_uuid: 'dep-2',
    git_commit_sha: 'def456',
    status: 'failed',
    created_at: '2026-07-12T02:00:00.000Z',
    finished_at: '2026-07-12T02:10:00.000Z',
  },
  {
    deployment_uuid: 'dep-3',
    git_commit_sha: 'ghi789',
    status: 'in_progress',
    created_at: '2026-07-12T03:00:00.000Z',
    finished_at: '',
  },
];

const mockDeploymentFull = {
  deployment_uuid: 'dep-uuid-1',
  git_commit_sha: 'commit-sha-1',
  status: 'finished',
  created_at: '2026-07-12T01:00:00.000Z',
  finished_at: '2026-07-12T01:05:00.000Z',
  logs: 'Build log line 1\nBuild log line 2\n'.repeat(500),
  env: { DATABASE_PASSWORD: 'super-secret', PORT: '3000' },
  api_token: 'token-value-xyz',
};

describe('deploymentToolSchema', () => {
  it('accepts list action with application_uuid', () => {
    expect(
      deploymentToolSchema.safeParse({
        action: 'list',
        application_uuid: 'app-uuid-1',
      }).success,
    ).toBe(true);
  });

  it('rejects list per_page above 50', () => {
    expect(
      deploymentToolSchema.safeParse({
        action: 'list',
        application_uuid: 'app-uuid-1',
        per_page: 99,
      }).success,
    ).toBe(false);
  });

  it('accepts get and cancel actions', () => {
    expect(
      deploymentToolSchema.safeParse({
        action: 'get',
        deployment_uuid: 'dep-uuid-1',
      }).success,
    ).toBe(true);
    expect(
      deploymentToolSchema.safeParse({
        action: 'cancel',
        deployment_uuid: 'dep-uuid-1',
      }).success,
    ).toBe(true);
  });
});

describe('handleDeploymentAction list', () => {
  beforeEach(() => {
    vi.mocked(fetchAppDeployments).mockReset();
    vi.mocked(fetchAppDeployments).mockResolvedValue(mockDeployments);
  });

  it('returns paginated DeploymentSummary[] with _meta', async () => {
    const result = await handleDeploymentAction(
      { action: 'list', application_uuid: 'app-uuid-1' },
      testEnv,
    );

    expect(isDeploymentErrorResult(result)).toBe(false);
    if (isDeploymentErrorResult(result)) return;

    expect(fetchAppDeployments).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'app-uuid-1',
      testEnv.COOLIFY_VERIFY_SSL,
    );
    expect(result.ok).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data).toHaveLength(3);
    expect(result.data[0]).toMatchObject({
      deployment_uuid: 'dep-1',
      commit: 'abc123',
      status: 'finished',
    });
    expect(result._meta).toMatchObject({
      page: 1,
      per_page: 10,
      total: 3,
    });
  });

  it('defaults per_page to 10 and caps page slice', async () => {
    const result = await handleDeploymentAction(
      {
        action: 'list',
        application_uuid: 'app-uuid-1',
        per_page: 2,
        page: 2,
      },
      testEnv,
    );

    expect(isDeploymentErrorResult(result)).toBe(false);
    if (isDeploymentErrorResult(result)) return;

    expect(result.data).toHaveLength(1);
    expect(result.data[0].deployment_uuid).toBe('dep-3');
    expect(result._meta?.per_page).toBe(2);
    expect(result._meta?.total).toBe(3);
  });
});

describe('handleDeploymentAction get', () => {
  beforeEach(() => {
    vi.mocked(fetchDeployment).mockReset();
    vi.mocked(fetchDeployment).mockResolvedValue(mockDeploymentFull);
  });

  it('returns summary projection by default', async () => {
    const result = await handleDeploymentAction(
      { action: 'get', deployment_uuid: 'dep-uuid-1' },
      testEnv,
    );

    expect(isDeploymentErrorResult(result)).toBe(false);
    if (isDeploymentErrorResult(result)) return;

    expect(fetchDeployment).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'dep-uuid-1',
      testEnv.COOLIFY_VERIFY_SSL,
    );
    expect(result.data).toMatchObject({
      deployment_uuid: 'dep-uuid-1',
      commit: 'commit-sha-1',
      status: 'finished',
      created_at: '2026-07-12T01:00:00.000Z',
      finished_at: '2026-07-12T01:05:00.000Z',
    });
    expect(result.data).not.toHaveProperty('logs');
    expect(result.data).not.toHaveProperty('raw_deployment');
  });

  it('full projection includes capped logs and sanitized raw_deployment', async () => {
    const result = await handleDeploymentAction(
      {
        action: 'get',
        deployment_uuid: 'dep-uuid-1',
        projection: 'full',
        max_chars: 1000,
      },
      testEnv,
    );

    expect(isDeploymentErrorResult(result)).toBe(false);
    if (isDeploymentErrorResult(result)) return;

    const data = result.data as {
      logs?: string;
      raw_deployment: Record<string, unknown>;
    };
    expect(data.logs).toBeDefined();
    expect(data.logs!.length).toBeLessThanOrEqual(1000 + '…[truncated]'.length);
    expect(data.raw_deployment).toMatchObject({
      env: { DATABASE_PASSWORD: '***', PORT: '3000' },
      api_token: '***',
    });
  });

  it('rejects table format on full projection', async () => {
    const result = await handleDeploymentAction(
      {
        action: 'get',
        deployment_uuid: 'dep-uuid-1',
        format: 'table',
        projection: 'full',
      },
      testEnv,
    );

    expect(isDeploymentErrorResult(result)).toBe(true);
    if (!isDeploymentErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_422');
  });
});

describe('handleDeploymentAction get reveal (OUT-02)', () => {
  beforeEach(() => {
    vi.mocked(fetchDeployment).mockReset();
    vi.mocked(fetchDeployment).mockResolvedValue({
      ...mockDeploymentFull,
      api_token: 'tok-reveal-test',
    });
  });

  it('masks raw_deployment secrets when reveal is false', async () => {
    const result = await handleDeploymentAction(
      {
        action: 'get',
        deployment_uuid: 'dep-uuid-1',
        projection: 'full',
      },
      testEnv,
    );

    expect(isDeploymentErrorResult(result)).toBe(false);
    if (isDeploymentErrorResult(result)) return;

    const data = result.data as { raw_deployment: Record<string, unknown> };
    expect(data.raw_deployment.api_token).toBe('***');
  });

  it('returns plaintext raw_deployment secrets when reveal is true', async () => {
    const result = await handleDeploymentAction(
      {
        action: 'get',
        deployment_uuid: 'dep-uuid-1',
        projection: 'full',
        reveal: true,
      },
      testEnv,
    );

    expect(isDeploymentErrorResult(result)).toBe(false);
    if (isDeploymentErrorResult(result)) return;

    const data = result.data as { raw_deployment: Record<string, unknown> };
    expect(data.raw_deployment.api_token).toBe('tok-reveal-test');
  });

  it('omits raw_deployment on summary projection even when reveal is true', async () => {
    const result = await handleDeploymentAction(
      {
        action: 'get',
        deployment_uuid: 'dep-uuid-1',
        projection: 'summary',
        reveal: true,
      },
      testEnv,
    );

    expect(isDeploymentErrorResult(result)).toBe(false);
    if (isDeploymentErrorResult(result)) return;

    expect(result.data).not.toHaveProperty('raw_deployment');
  });
});

describe('handleDeploymentAction cancel', () => {
  beforeEach(() => {
    vi.mocked(cancelDeployment).mockReset();
    vi.mocked(fetchDeployment).mockReset();
  });

  it('returns cancelled true on in-progress deployment', async () => {
    vi.mocked(cancelDeployment).mockResolvedValue({ message: 'cancelled' });

    const result = await handleDeploymentAction(
      { action: 'cancel', deployment_uuid: 'dep-in-progress' },
      testEnv,
    );

    expect(isDeploymentErrorResult(result)).toBe(false);
    if (isDeploymentErrorResult(result)) return;

    expect(cancelDeployment).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'dep-in-progress',
      testEnv.COOLIFY_VERIFY_SSL,
    );
    expect(result.data).toEqual({
      cancelled: true,
      deployment_uuid: 'dep-in-progress',
    });
  });

  it('returns graceful envelope on already-finished 400 without throwing', async () => {
    vi.mocked(cancelDeployment).mockRejectedValue(
      new CoolifyApiError({
        code: 'COOLIFY_422',
        message: 'Deployment already finished',
        recoveryHints: ['Review the request payload for missing or invalid fields.'],
        httpStatus: 400,
      }),
    );
    vi.mocked(fetchDeployment).mockResolvedValue({
      deployment_uuid: 'dep-finished',
      status: 'finished',
    });

    const result = await handleDeploymentAction(
      { action: 'cancel', deployment_uuid: 'dep-finished' },
      testEnv,
    );

    expect(isDeploymentErrorResult(result)).toBe(false);
    if (isDeploymentErrorResult(result)) return;

    expect(fetchDeployment).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'dep-finished',
      testEnv.COOLIFY_VERIFY_SSL,
    );
    expect(result.data).toEqual({
      cancelled: false,
      already_finished: true,
      status: 'finished',
      deployment_uuid: 'dep-finished',
    });
  });

  it('propagates non-400 cancel errors as isError', async () => {
    vi.mocked(cancelDeployment).mockRejectedValue(
      new CoolifyApiError({
        code: 'COOLIFY_404',
        message: 'Deployment not found',
        recoveryHints: ['Check that the resource UUID or path exists on this Coolify instance.'],
        httpStatus: 404,
      }),
    );

    const result = await handleDeploymentAction(
      { action: 'cancel', deployment_uuid: 'dep-missing' },
      testEnv,
    );

    expect(isDeploymentErrorResult(result)).toBe(true);
    if (!isDeploymentErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_404');
    expect(fetchDeployment).not.toHaveBeenCalled();
  });
});

describe('deployment watch', () => {
  beforeEach(() => {
    vi.mocked(fetchDeployment).mockReset();
  });

  it('schema accepts watch with deployment_uuid only', () => {
    const result = deploymentToolSchema.safeParse({
      action: 'watch',
      deployment_uuid: 'dep-uuid-1',
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.action).toBe('watch');
    expect(result.data.deployment_uuid).toBe('dep-uuid-1');
  });

  it('schema defaults timeout 300, min_interval 3, max_interval 30, include_logs false', () => {
    const result = deploymentToolSchema.safeParse({
      action: 'watch',
      deployment_uuid: 'dep-uuid-1',
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data).toMatchObject({
      action: 'watch',
      timeout: 300,
      min_interval: 3,
      max_interval: 30,
      include_logs: false,
    });
  });

  it('schema rejects min_interval greater than max_interval', () => {
    const result = deploymentToolSchema.safeParse({
      action: 'watch',
      deployment_uuid: 'dep-uuid-1',
      min_interval: 60,
      max_interval: 10,
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    const minIssue = result.error.issues.find((issue) =>
      issue.path.includes('min_interval'),
    );
    expect(minIssue?.message).toMatch(
      /less than or equal to max_interval|must not exceed max_interval|min_interval must be/i,
    );
  });

  it('schema rejects min_interval less than 1', () => {
    const result = deploymentToolSchema.safeParse({
      action: 'watch',
      deployment_uuid: 'dep-uuid-1',
      min_interval: 0,
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(
      result.error.issues.some(
        (issue) =>
          issue.path.includes('min_interval') &&
          (issue.code === 'too_small' ||
            /at least 1|minimum.*1|greater than or equal to 1/i.test(issue.message)),
      ),
    ).toBe(true);
  });

  it('returns OK summary when deployment finishes', async () => {
    vi.mocked(fetchDeployment).mockResolvedValue({
      deployment_uuid: 'dep-finished',
      git_commit_sha: 'abc123',
      status: 'finished',
      created_at: '2026-07-12T01:00:00.000Z',
      finished_at: '2026-07-12T01:05:00.000Z',
    });

    const result = await handleDeploymentAction(
      { action: 'watch', deployment_uuid: 'dep-finished' },
      testEnv,
    );

    expect(isDeploymentErrorResult(result)).toBe(false);
    if (isDeploymentErrorResult(result)) return;

    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({
      deployment_uuid: 'dep-finished',
      commit: 'abc123',
      status: 'finished',
    });
    expect(result.data).not.toHaveProperty('logs');
    // WR-01 / IN-04: watch must disable nested ofetch 429 retries so Retry-After is honored.
    expect(fetchDeployment).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'dep-finished',
      testEnv.COOLIFY_VERIFY_SSL,
      { retry: false },
    );
  });

  it('returns capped logs without raw_deployment when include_logs true on success (WR-02)', async () => {
    const maxChars = 1000;
    const longLogs = 'x'.repeat(maxChars + 500);
    vi.mocked(fetchDeployment).mockResolvedValue({
      deployment_uuid: 'dep-finished-logs',
      git_commit_sha: 'abc123',
      status: 'finished',
      created_at: '2026-07-12T01:00:00.000Z',
      finished_at: '2026-07-12T01:05:00.000Z',
      logs: longLogs,
    });

    const result = await handleDeploymentAction(
      {
        action: 'watch',
        deployment_uuid: 'dep-finished-logs',
        include_logs: true,
        max_chars: maxChars,
      },
      testEnv,
    );

    expect(isDeploymentErrorResult(result)).toBe(false);
    if (isDeploymentErrorResult(result)) return;

    expect(result.ok).toBe(true);
    expect(typeof result.data.logs).toBe('string');
    expect(result.data.logs).toBe('x'.repeat(maxChars) + '…[truncated]');
    expect(result.data.logs!.length).toBeLessThan(longLogs.length);
    expect(result.data).not.toHaveProperty('raw_deployment');
  });

  it(
    'returns dual-signal timeout with COOLIFY_WATCH_TIMEOUT',
    async () => {
      vi.useFakeTimers();
      try {
        vi.mocked(fetchDeployment).mockResolvedValue({
          deployment_uuid: 'dep-timeout',
          git_commit_sha: 'abc123',
          status: 'in_progress',
          created_at: '2026-07-12T01:00:00.000Z',
        });

        const resultPromise = handleDeploymentAction(
          {
            action: 'watch',
            deployment_uuid: 'dep-timeout',
            timeout: 10,
            min_interval: 1,
            max_interval: 1,
          },
          testEnv,
        );

        for (let i = 0; i < 12; i++) {
          await vi.advanceTimersByTimeAsync(1000);
        }

        const result = await resultPromise;

        expect(isDeploymentErrorResult(result)).toBe(true);
        if (!isDeploymentErrorResult(result)) return;

        expect(result.structuredContent.error.code).toBe('COOLIFY_WATCH_TIMEOUT');
        const errorData = result.structuredContent.error.data as {
          deployment?: { status?: string };
          timed_out?: boolean;
        };
        expect(errorData.timed_out).toBe(true);
        expect(errorData.deployment?.status).toBe('in_progress');
        expect(result.structuredContent.error.recoveryHints?.join(' ')).toMatch(
          /deployment\.watch|watch/i,
        );
      } finally {
        vi.useRealTimers();
      }
    },
    15000,
  );

  it('returns COOLIFY_DEPLOYMENT_FAILED with clear error on failed terminal', async () => {
    vi.mocked(fetchDeployment).mockResolvedValue({
      deployment_uuid: 'dep-failed',
      git_commit_sha: 'abc123',
      status: 'failed',
      created_at: '2026-07-12T01:00:00.000Z',
      finished_at: '2026-07-12T01:05:00.000Z',
    });

    const result = await handleDeploymentAction(
      { action: 'watch', deployment_uuid: 'dep-failed' },
      testEnv,
    );

    expect(isDeploymentErrorResult(result)).toBe(true);
    if (!isDeploymentErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_DEPLOYMENT_FAILED');
    expect(result.structuredContent.error.message).toMatch(/fail/i);
  });

  it('returns COOLIFY_DEPLOYMENT_CANCELLED on cancelled-by-user terminal', async () => {
    vi.mocked(fetchDeployment).mockResolvedValue({
      deployment_uuid: 'dep-cancelled',
      git_commit_sha: 'abc123',
      status: 'cancelled-by-user',
      created_at: '2026-07-12T01:00:00.000Z',
      finished_at: '2026-07-12T01:05:00.000Z',
    });

    const result = await handleDeploymentAction(
      { action: 'watch', deployment_uuid: 'dep-cancelled' },
      testEnv,
    );

    expect(isDeploymentErrorResult(result)).toBe(true);
    if (!isDeploymentErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_DEPLOYMENT_CANCELLED');
  });
});

describe('deployment logs', () => {
  beforeEach(() => {
    vi.mocked(fetchDeployment).mockReset();
    vi.mocked(fetchAppDeployments).mockReset();
  });

  it('schema accepts logs with deployment_uuid only', () => {
    const result = deploymentToolSchema.safeParse({
      action: 'logs',
      deployment_uuid: 'dep-uuid-1',
    });
    expect(result.success).toBe(true);
  });

  it('schema accepts logs with application_uuid only', () => {
    const result = deploymentToolSchema.safeParse({
      action: 'logs',
      application_uuid: 'app-uuid-1',
    });
    expect(result.success).toBe(true);
  });

  it('schema rejects logs with both deployment_uuid and application_uuid', () => {
    const result = deploymentToolSchema.safeParse({
      action: 'logs',
      deployment_uuid: 'dep-uuid-1',
      application_uuid: 'app-uuid-1',
    });
    expect(result.success).toBe(false);
  });

  it('schema rejects logs with neither deployment_uuid nor application_uuid', () => {
    const result = deploymentToolSchema.safeParse({
      action: 'logs',
    });
    expect(result.success).toBe(false);
  });

  it('schema rejects logs with format table', () => {
    const result = deploymentToolSchema.safeParse({
      action: 'logs',
      deployment_uuid: 'dep-uuid-1',
      format: 'table',
    });
    expect(result.success).toBe(false);
  });

  it('returns logs_lines envelope when fetching by deployment_uuid', async () => {
    vi.mocked(fetchDeployment).mockResolvedValue({
      deployment_uuid: 'dep-uuid-1',
      status: 'finished',
      logs: JSON.stringify([
        { output: 'build line 1', type: 'stdout', hidden: false },
        { output: 'build line 2', type: 'stdout', hidden: false },
      ]),
    });

    const result = await handleDeploymentAction(
      { action: 'logs', deployment_uuid: 'dep-uuid-1' },
      testEnv,
    );

    expect(isDeploymentErrorResult(result)).toBe(false);
    if (isDeploymentErrorResult(result)) return;

    expect(result.ok).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.deployment_uuid).toBe('dep-uuid-1');
    expect(Array.isArray(data.logs_lines)).toBe(true);
    expect((data.logs_lines as string[]).length).toBeGreaterThan(0);
  });

  it('application_uuid resolves newest deployment by created_at (dep-3)', async () => {
    vi.mocked(fetchAppDeployments).mockResolvedValue(mockDeployments);
    vi.mocked(fetchDeployment).mockResolvedValue({
      deployment_uuid: 'dep-3',
      status: 'in_progress',
      logs: 'line from dep-3',
    });

    const result = await handleDeploymentAction(
      { action: 'logs', application_uuid: 'app-uuid-1' },
      testEnv,
    );

    expect(isDeploymentErrorResult(result)).toBe(false);
    if (isDeploymentErrorResult(result)) return;

    expect(fetchAppDeployments).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'app-uuid-1',
      testEnv.COOLIFY_VERIFY_SSL,
    );
    expect(fetchDeployment).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'dep-3',
      testEnv.COOLIFY_VERIFY_SSL,
    );
    const data = result.data as Record<string, unknown>;
    expect(data.deployment_uuid).toBe('dep-3');
  });

  it('empty deployments list returns COOLIFY_NO_DEPLOYMENTS error', async () => {
    vi.mocked(fetchAppDeployments).mockResolvedValue([]);

    const result = await handleDeploymentAction(
      { action: 'logs', application_uuid: 'app-no-deploys' },
      testEnv,
    );

    expect(isDeploymentErrorResult(result)).toBe(true);
    if (!isDeploymentErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_NO_DEPLOYMENTS');
    expect(result.structuredContent.error.recoveryHints?.join(' ')).toMatch(
      /application\.deploy|deployment\.list/i,
    );
  });

  it('empty logs string returns soft OK with empty logs_lines and hint', async () => {
    vi.mocked(fetchDeployment).mockResolvedValue({
      deployment_uuid: 'dep-empty-logs',
      status: 'finished',
      logs: '',
    });

    const result = await handleDeploymentAction(
      { action: 'logs', deployment_uuid: 'dep-empty-logs' },
      testEnv,
    );

    expect(isDeploymentErrorResult(result)).toBe(false);
    if (isDeploymentErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    expect(data.logs_lines).toEqual([]);
    expect(result._meta?.hint ?? data.hint).toBeTruthy();
  });

  it('missing logs field returns COOLIFY_403_SENSITIVE_REQUIRED', async () => {
    vi.mocked(fetchDeployment).mockResolvedValue({
      deployment_uuid: 'dep-sensitive',
      status: 'finished',
    });

    const result = await handleDeploymentAction(
      { action: 'logs', deployment_uuid: 'dep-sensitive' },
      testEnv,
    );

    expect(isDeploymentErrorResult(result)).toBe(true);
    if (!isDeploymentErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe(
      'COOLIFY_403_SENSITIVE_REQUIRED',
    );
  });

  it('non-string logs field returns COOLIFY_403_SENSITIVE_REQUIRED', async () => {
    vi.mocked(fetchDeployment).mockResolvedValue({
      deployment_uuid: 'dep-bad-logs',
      status: 'finished',
      logs: 12345,
    });

    const result = await handleDeploymentAction(
      { action: 'logs', deployment_uuid: 'dep-bad-logs' },
      testEnv,
    );

    expect(isDeploymentErrorResult(result)).toBe(true);
    if (!isDeploymentErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe(
      'COOLIFY_403_SENSITIVE_REQUIRED',
    );
  });
});
