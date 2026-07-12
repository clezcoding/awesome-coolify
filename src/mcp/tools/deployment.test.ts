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
