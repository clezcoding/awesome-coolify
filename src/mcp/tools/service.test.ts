import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  handleServiceAction,
  isServiceErrorResult,
  serviceActionSchema,
} from './service.js';
import type { EnvConfig } from '../../config/env.js';

vi.mock('../../api/client.js', () => ({
  fetchService: vi.fn(),
  fetchResources: vi.fn(),
  fetchProjects: vi.fn(),
  fetchProject: vi.fn(),
  triggerServiceStart: vi.fn(),
  triggerServiceStop: vi.fn(),
  triggerServiceRestart: vi.fn(),
  createService: vi.fn(),
  updateService: vi.fn(),
  deleteService: vi.fn(),
}));

vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
}));

import {
  fetchService,
  fetchResources,
  fetchProjects,
  fetchProject,
  triggerServiceRestart,
  triggerServiceStart,
  triggerServiceStop,
  createService,
  updateService,
  deleteService,
} from '../../api/client.js';
import { readFileSync } from 'node:fs';

const testEnv: EnvConfig = {
  COOLIFY_URL: 'https://coolify.example.com',
  COOLIFY_TOKEN: 'test-token-value-xyz',
  COOLIFY_VERIFY_SSL: true,
  COOLIFY_MCP_LOG: 'info',
};

const mockService = {
  uuid: 'svc-uuid-1',
  name: 'redis',
  status: 'running:healthy',
  fqdn: 'https://redis.example.com',
  project: { name: 'proj-a', uuid: 'proj-uuid-1' },
  server: { name: 'srv-1', uuid: 'srv-uuid-1' },
  updated_at: '2026-07-01T00:00:00Z',
  env: { REDIS_PASSWORD: 'secret-redis' },
};

describe('serviceActionSchema', () => {
  it('accepts get action with uuid only per D-02', () => {
    expect(
      serviceActionSchema.safeParse({
        action: 'get',
        uuid: 'svc-uuid-1',
      }).success,
    ).toBe(true);
  });

  it('rejects list action', () => {
    expect(
      serviceActionSchema.safeParse({ action: 'list' }).success,
    ).toBe(false);
  });
});

describe('handleServiceAction get', () => {
  beforeEach(() => {
    vi.mocked(fetchService).mockReset();
    vi.mocked(fetchService).mockResolvedValue(mockService);
    vi.mocked(fetchProjects).mockResolvedValue([]);
    vi.mocked(fetchProject).mockResolvedValue({});
  });

  it('returns summary projection by default', async () => {
    const result = await handleServiceAction(
      { action: 'get', uuid: 'svc-uuid-1' },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(false);
    if (isServiceErrorResult(result)) return;

    expect(result.data).toMatchObject({
      uuid: 'svc-uuid-1',
      name: 'redis',
      status: 'running:healthy',
      fqdn: 'https://redis.example.com',
      project_name: 'proj-a',
      server_name: 'srv-1',
    });
    expect(result._formattedText).toBeTruthy();
  });

  it('returns sanitized full projection with include_full alias', async () => {
    const result = await handleServiceAction(
      {
        action: 'get',
        uuid: 'svc-uuid-1',
        include_full: true,
      },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(false);
    if (isServiceErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    const env = data.env as Record<string, unknown>;
    expect(env.REDIS_PASSWORD).toBe('***');
  });

  it('rejects format table on full projection per D-11', async () => {
    const result = await handleServiceAction(
      {
        action: 'get',
        uuid: 'svc-uuid-1',
        projection: 'full',
        format: 'table',
      },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(true);
    if (!isServiceErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_422');
    expect(fetchService).not.toHaveBeenCalled();
  });

  it('includes restart hint for unhealthy service per OUT-06 D-16', async () => {
    vi.mocked(fetchService).mockResolvedValue({
      ...mockService,
      status: 'unhealthy',
    });

    const result = await handleServiceAction(
      { action: 'get', uuid: 'svc-uuid-1' },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(false);
    if (isServiceErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    expect(Array.isArray(data.hints)).toBe(true);
    const hints = data.hints as Array<Record<string, unknown>>;
    expect(hints.some((h) => h.action === 'restart' && h.available_in_phase === 5)).toBe(
      true,
    );
    expect(result.data).toMatchObject({
      uuid: 'svc-uuid-1',
      name: 'redis',
    });
  });

  it('returns empty hints for healthy running service', async () => {
    const result = await handleServiceAction(
      { action: 'get', uuid: 'svc-uuid-1' },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(false);
    if (isServiceErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    expect(data.hints).toEqual([]);
  });
});

describe('handleServiceAction get reveal (OUT-02)', () => {
  beforeEach(() => {
    vi.mocked(fetchService).mockReset();
    vi.mocked(fetchService).mockResolvedValue({
      ...mockService,
      token: 'tok-123',
    });
    vi.mocked(fetchProjects).mockResolvedValue([]);
    vi.mocked(fetchProject).mockResolvedValue({});
  });

  it('masks secrets on full projection when reveal is false', async () => {
    const result = await handleServiceAction(
      { action: 'get', uuid: 'svc-uuid-1', projection: 'full' },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(false);
    if (isServiceErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    expect(data.token).toBe('***');
  });

  it('returns plaintext secrets on full projection when reveal is true', async () => {
    const result = await handleServiceAction(
      {
        action: 'get',
        uuid: 'svc-uuid-1',
        projection: 'full',
        reveal: true,
      },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(false);
    if (isServiceErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    expect(data.token).toBe('tok-123');
  });
});

const mockResourceService1 = {
  uuid: 'svc-uuid-1',
  type: 'service',
  name: 'redis',
  status: 'running:healthy',
  project: { name: 'proj-a', uuid: 'proj-uuid-1' },
  environment: { name: 'production', uuid: 'env-uuid-1' },
  updated_at: '2026-07-01T00:00:00Z',
};

const mockResourceService2 = {
  uuid: 'svc-uuid-2',
  type: 'service',
  name: 'redis-staging',
  status: 'running:healthy',
  project: { name: 'proj-b', uuid: 'proj-uuid-2' },
  environment: { name: 'staging', uuid: 'env-uuid-2' },
  updated_at: '2026-07-01T00:00:00Z',
};

describe('handleServiceAction lifecycle mutations (SVC-03/SVC-05)', () => {
  beforeEach(() => {
    vi.mocked(fetchResources).mockReset();
    vi.mocked(triggerServiceStart).mockReset();
    vi.mocked(triggerServiceStop).mockReset();
    vi.mocked(triggerServiceRestart).mockReset();
    vi.mocked(triggerServiceStart).mockResolvedValue({
      message: 'Service starting request queued.',
    });
    vi.mocked(triggerServiceStop).mockResolvedValue({
      message: 'Service stopping request queued.',
    });
    vi.mocked(triggerServiceRestart).mockResolvedValue({
      message: 'Service restarting request queued.',
    });
  });

  it('start by uuid returns fire-and-forget response without deployment_uuid', async () => {
    const result = await handleServiceAction(
      { action: 'start', uuid: 'svc-uuid-1' },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(false);
    if (isServiceErrorResult(result)) return;

    expect(result.data).toEqual({
      uuid: 'svc-uuid-1',
      action: 'start',
      status: 'requested',
    });
    expect(result.data).not.toHaveProperty('deployment_uuid');
    expect(result.data).not.toHaveProperty('wait');
  });

  it('deploy by uuid returns pull_latest in response without deployment_uuid', async () => {
    const result = await handleServiceAction(
      { action: 'deploy', uuid: 'svc-uuid-1', pull_latest: true },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(false);
    if (isServiceErrorResult(result)) return;

    expect(result.data).toEqual({
      uuid: 'svc-uuid-1',
      action: 'deploy',
      status: 'requested',
      pull_latest: true,
    });
    expect(result.data).not.toHaveProperty('deployment_uuid');
    expect(result.data).not.toHaveProperty('wait');
  });

  it('start without identifier fails schema validation', () => {
    expect(serviceActionSchema.safeParse({ action: 'start' }).success).toBe(false);
  });

  it('start by uuid calls triggerServiceStart with correct uuid', async () => {
    const result = await handleServiceAction(
      { action: 'start', uuid: 'svc-uuid-1' },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(false);
    expect(triggerServiceStart).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'svc-uuid-1',
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('start by name single-hit resolves and calls triggerServiceStart', async () => {
    vi.mocked(fetchResources).mockResolvedValue([mockResourceService1]);

    const result = await handleServiceAction(
      { action: 'start', name: 'redis' },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(false);
    expect(triggerServiceStart).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'svc-uuid-1',
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('stop by name single-hit calls triggerServiceStop', async () => {
    vi.mocked(fetchResources).mockResolvedValue([mockResourceService1]);

    const result = await handleServiceAction(
      { action: 'stop', name: 'redis' },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(false);
    expect(triggerServiceStop).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'svc-uuid-1',
      false,
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('restart by name single-hit calls triggerServiceRestart with latest=false', async () => {
    vi.mocked(fetchResources).mockResolvedValue([mockResourceService1]);

    const result = await handleServiceAction(
      { action: 'restart', name: 'redis' },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(false);
    expect(triggerServiceRestart).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'svc-uuid-1',
      false,
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('deploy by uuid with pull_latest=false calls triggerServiceRestart with latest=false', async () => {
    const result = await handleServiceAction(
      { action: 'deploy', uuid: 'svc-uuid-1', pull_latest: false },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(false);
    expect(triggerServiceRestart).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'svc-uuid-1',
      false,
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('deploy by uuid with pull_latest=true calls triggerServiceRestart with latest=true', async () => {
    const result = await handleServiceAction(
      { action: 'deploy', uuid: 'svc-uuid-1', pull_latest: true },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(false);
    expect(triggerServiceRestart).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'svc-uuid-1',
      true,
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('deploy by name single-hit resolves and calls triggerServiceRestart with pull_latest default', async () => {
    vi.mocked(fetchResources).mockResolvedValue([mockResourceService1]);

    const result = await handleServiceAction(
      { action: 'deploy', name: 'redis' },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(false);
    expect(triggerServiceRestart).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'svc-uuid-1',
      false,
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('start by name multi-hit returns COOLIFY_AMBIGUOUS_MATCH with project+env context', async () => {
    vi.mocked(fetchResources).mockResolvedValue([
      mockResourceService1,
      mockResourceService2,
    ]);

    const result = await handleServiceAction(
      { action: 'start', name: 'redis' },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(true);
    if (!isServiceErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_AMBIGUOUS_MATCH');
    const hints = result.structuredContent.error.recoveryHints.join(' ');
    expect(hints).toContain('redis');
    expect(hints).toContain('svc-uuid-1');
    expect(hints).toContain('project=proj-a');
    expect(hints).toContain('environment=production');
    expect(hints).toContain('project=proj-b');
    expect(hints).toContain('environment=staging');
    expect(triggerServiceStart).not.toHaveBeenCalled();
  });

  it('zero-match returns COOLIFY_404', async () => {
    vi.mocked(fetchResources).mockResolvedValue([mockResourceService1]);

    const result = await handleServiceAction(
      { action: 'start', name: 'nope' },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(true);
    if (!isServiceErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_404');
    expect(triggerServiceStart).not.toHaveBeenCalled();
  });

  it('restart rejects pull_latest param per D-16', () => {
    expect(
      serviceActionSchema.safeParse({
        action: 'restart',
        uuid: 'svc-uuid-1',
        pull_latest: true,
      }).success,
    ).toBe(false);
  });
});

const baseServiceCreateFields = {
  project_uuid: 'proj-uuid-1',
  environment_name: 'production',
  server_uuid: 'srv-uuid-1',
};

const sampleComposeYaml = 'services:\n  redis:\n    image: redis:7';
const sampleComposeBase64 = Buffer.from(sampleComposeYaml, 'utf8').toString('base64');

const mockResourceServiceDup1 = {
  uuid: 'svc-uuid-1',
  type: 'service',
  name: 'redis',
  status: 'running:healthy',
  project: { name: 'proj-a', uuid: 'proj-uuid-1' },
  environment: { name: 'production', uuid: 'env-uuid-1' },
  updated_at: '2026-07-01T00:00:00Z',
};

const mockResourceServiceDup2 = {
  uuid: 'svc-uuid-2',
  type: 'service',
  name: 'redis',
  status: 'running:healthy',
  project: { name: 'proj-b', uuid: 'proj-uuid-2' },
  environment: { name: 'staging', uuid: 'env-uuid-2' },
  updated_at: '2026-07-01T00:00:00Z',
};

describe('service get compose decode (D-06)', () => {
  beforeEach(() => {
    vi.mocked(fetchService).mockReset();
    vi.mocked(fetchService).mockResolvedValue({
      ...mockService,
      docker_compose_raw: sampleComposeBase64,
    });
    vi.mocked(fetchProjects).mockResolvedValue([]);
    vi.mocked(fetchProject).mockResolvedValue({});
  });

  it('returns decoded compose YAML and strips docker_compose_raw per D-06', async () => {
    const result = await handleServiceAction(
      { action: 'get', uuid: 'svc-uuid-1', projection: 'full' },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(false);
    if (isServiceErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    expect(data.compose).toBe(sampleComposeYaml);
    expect(data.docker_compose_raw).toBeUndefined();
  });
});

describe('service create', () => {
  beforeEach(() => {
    vi.mocked(createService).mockReset();
    vi.mocked(readFileSync).mockReset();
    vi.mocked(triggerServiceStart).mockReset();
    vi.mocked(createService).mockResolvedValue({
      uuid: 'svc-new-uuid',
      name: 'actualbudget',
    });
    vi.mocked(triggerServiceStart).mockResolvedValue({
      message: 'Service starting request queued.',
    });
  });

  it('creates one-click service with type actualbudget per SVC-06', async () => {
    const result = await handleServiceAction(
      {
        action: 'create',
        type: 'actualbudget',
        ...baseServiceCreateFields,
      },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(false);
    expect(createService).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      expect.objectContaining({ type: 'actualbudget' }),
      testEnv.COOLIFY_VERIFY_SSL,
    );
    if (isServiceErrorResult(result)) return;

    expect(result.data).toMatchObject({ uuid: 'svc-new-uuid' });
  });

  it('creates compose service with base64-encoded docker_compose_raw per SVC-07', async () => {
    vi.mocked(createService).mockResolvedValue({
      uuid: 'svc-compose-uuid',
      docker_compose_raw: sampleComposeBase64,
    });

    await handleServiceAction(
      {
        action: 'create',
        compose: sampleComposeYaml,
        ...baseServiceCreateFields,
      },
      testEnv,
    );

    expect(createService).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      expect.objectContaining({
        docker_compose_raw: sampleComposeBase64,
      }),
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('reads compose_file and encodes to base64 per SVC-07', async () => {
    vi.mocked(readFileSync).mockReturnValue(sampleComposeYaml);

    await handleServiceAction(
      {
        action: 'create',
        compose_file: '/path/to/docker-compose.yml',
        ...baseServiceCreateFields,
      },
      testEnv,
    );

    expect(readFileSync).toHaveBeenCalledWith('/path/to/docker-compose.yml', 'utf8');
    expect(createService).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      expect.objectContaining({
        docker_compose_raw: sampleComposeBase64,
      }),
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('rejects create with both type and compose per SVC-07 XOR', async () => {
    const result = await handleServiceAction(
      {
        action: 'create',
        type: 'actualbudget',
        compose: sampleComposeYaml,
        ...baseServiceCreateFields,
      },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(true);
    if (!isServiceErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_VALIDATION_ERROR');
    expect(createService).not.toHaveBeenCalled();
  });

  it('rejects create with neither type nor compose per SVC-07 XOR', async () => {
    const result = await handleServiceAction(
      {
        action: 'create',
        ...baseServiceCreateFields,
      },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(true);
    if (!isServiceErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_VALIDATION_ERROR');
    expect(createService).not.toHaveBeenCalled();
  });

  it('defaults instant_deploy to true on one-click create per D-11', async () => {
    await handleServiceAction(
      {
        action: 'create',
        type: 'actualbudget',
        ...baseServiceCreateFields,
      },
      testEnv,
    );

    expect(createService).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      expect.objectContaining({ instant_deploy: true }),
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('defaults instant_deploy to true on compose create per D-11', async () => {
    await handleServiceAction(
      {
        action: 'create',
        compose: sampleComposeYaml,
        ...baseServiceCreateFields,
      },
      testEnv,
    );

    expect(createService).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      expect.objectContaining({ instant_deploy: true }),
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('maps HTTP 409 domain conflicts to COOLIFY_409 with force_domain_override hint per SVC-10', async () => {
    const conflicts = [{ domain: 'redis.example.com', message: 'Domain in use' }];
    vi.mocked(createService).mockRejectedValue(
      Object.assign(new Error('Conflict'), {
        response: {
          status: 409,
          _data: { conflicts },
        },
      }),
    );

    const result = await handleServiceAction(
      {
        action: 'create',
        type: 'actualbudget',
        ...baseServiceCreateFields,
      },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(true);
    if (!isServiceErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_409');
    expect(result.structuredContent.error.data?.conflicts).toEqual(conflicts);
    expect(
      result.structuredContent.error.recoveryHints.join(' '),
    ).toMatch(/force_domain_override:\s*true/i);
  });

  it('passes force_domain_override:true on create happy path per SVC-10', async () => {
    const result = await handleServiceAction(
      {
        action: 'create',
        type: 'actualbudget',
        ...baseServiceCreateFields,
        force_domain_override: true,
      },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(false);
    expect(createService).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      expect.objectContaining({ force_domain_override: true }),
      testEnv.COOLIFY_VERIFY_SSL,
    );
    if (isServiceErrorResult(result)) return;

    expect(result.data).toMatchObject({ uuid: 'svc-new-uuid' });
  });

  it('returns decoded compose on create success per D-06', async () => {
    vi.mocked(createService).mockResolvedValue({
      uuid: 'svc-compose-uuid',
      docker_compose_raw: sampleComposeBase64,
    });

    const result = await handleServiceAction(
      {
        action: 'create',
        compose: sampleComposeYaml,
        ...baseServiceCreateFields,
      },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(false);
    if (isServiceErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    expect(data.compose).toBe(sampleComposeYaml);
    expect(data.docker_compose_raw).toBeUndefined();
  });

  it('rejects create with unknown field before API call per SAF-03', async () => {
    const result = await handleServiceAction(
      {
        action: 'create',
        type: 'actualbudget',
        ...baseServiceCreateFields,
        unexpected_field: 'foo',
      },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(true);
    if (!isServiceErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_VALIDATION_ERROR');
    expect(createService).not.toHaveBeenCalled();
  });

  it('rejects create without project_uuid or project_name per D-02', async () => {
    const result = await handleServiceAction(
      {
        action: 'create',
        type: 'actualbudget',
        environment_name: 'production',
        server_uuid: 'srv-uuid-1',
      },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(true);
    if (!isServiceErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_VALIDATION_ERROR');
    expect(createService).not.toHaveBeenCalled();
  });
});

describe('service update', () => {
  beforeEach(() => {
    vi.mocked(updateService).mockReset();
    vi.mocked(fetchResources).mockReset();
    vi.mocked(fetchService).mockReset();
    vi.mocked(updateService).mockResolvedValue({
      ...mockService,
      docker_compose_raw: sampleComposeBase64,
    });
    vi.mocked(fetchService).mockResolvedValue({
      ...mockService,
      docker_compose_raw: sampleComposeBase64,
    });
  });

  it('patches compose via base64-encoded docker_compose_raw per SVC-08', async () => {
    await handleServiceAction(
      {
        action: 'update',
        uuid: 'svc-uuid-1',
        compose: sampleComposeYaml,
      },
      testEnv,
    );

    expect(updateService).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'svc-uuid-1',
      expect.objectContaining({
        docker_compose_raw: sampleComposeBase64,
      }),
      testEnv.COOLIFY_VERIFY_SSL,
    );
  });

  it('returns decoded compose on update success per D-06', async () => {
    const result = await handleServiceAction(
      {
        action: 'update',
        uuid: 'svc-uuid-1',
        compose: sampleComposeYaml,
      },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(false);
    if (isServiceErrorResult(result)) return;

    const data = result.data as Record<string, unknown>;
    expect(data.compose).toBe(sampleComposeYaml);
    expect(data.docker_compose_raw).toBeUndefined();
  });

  it('returns COOLIFY_AMBIGUOUS_MATCH on update by name multi-match per D-18', async () => {
    vi.mocked(fetchResources).mockResolvedValue([
      mockResourceServiceDup1,
      mockResourceServiceDup2,
    ]);

    const result = await handleServiceAction(
      {
        action: 'update',
        name: 'redis',
        compose: sampleComposeYaml,
      },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(true);
    if (!isServiceErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_AMBIGUOUS_MATCH');
    expect(updateService).not.toHaveBeenCalled();
  });

  it('rejects unknown update fields via strict schema per SAF-03', async () => {
    const result = await handleServiceAction(
      {
        action: 'update',
        uuid: 'svc-uuid-1',
        unexpected_field: 'foo',
      },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(true);
    if (!isServiceErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_VALIDATION_ERROR');
    expect(updateService).not.toHaveBeenCalled();
  });
});

describe('service delete', () => {
  beforeEach(() => {
    vi.mocked(deleteService).mockReset();
    vi.mocked(fetchResources).mockReset();
    vi.mocked(deleteService).mockResolvedValue({ message: 'Service deleted.' });
  });

  it('deletes service when confirm:true with safe defaults per SVC-09', async () => {
    const result = await handleServiceAction(
      { action: 'delete', uuid: 'svc-uuid-1', confirm: true },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(false);
    expect(deleteService).toHaveBeenCalledWith(
      testEnv.COOLIFY_URL,
      testEnv.COOLIFY_TOKEN,
      'svc-uuid-1',
      {
        delete_volumes: false,
        delete_configurations: false,
        docker_cleanup: false,
        delete_connected_networks: false,
      },
      testEnv.COOLIFY_VERIFY_SSL,
    );
    if (isServiceErrorResult(result)) return;

    expect(result.data).toMatchObject({ ok: true, uuid: 'svc-uuid-1' });
  });

  it('returns COOLIFY_CONFIRM_REQUIRED when confirm is false per SVC-09', async () => {
    const result = await handleServiceAction(
      { action: 'delete', uuid: 'svc-uuid-1', confirm: false },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(true);
    if (!isServiceErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_CONFIRM_REQUIRED');
    expect(deleteService).not.toHaveBeenCalled();
  });

  it('returns COOLIFY_AMBIGUOUS_MATCH on delete by name multi-match per D-18', async () => {
    vi.mocked(fetchResources).mockResolvedValue([
      mockResourceServiceDup1,
      mockResourceServiceDup2,
    ]);

    const result = await handleServiceAction(
      { action: 'delete', name: 'redis', confirm: true },
      testEnv,
    );

    expect(isServiceErrorResult(result)).toBe(true);
    if (!isServiceErrorResult(result)) return;

    expect(result.structuredContent.error.code).toBe('COOLIFY_AMBIGUOUS_MATCH');
    expect(deleteService).not.toHaveBeenCalled();
  });
});

describe('service delete_preview', () => {
  beforeEach(() => {
    vi.mocked(deleteService).mockReset();
    vi.mocked(fetchService).mockReset();
    vi.mocked(fetchResources).mockReset();
    vi.mocked(fetchService).mockResolvedValue(mockService);
  });

  it('returns would_delete preview without calling deleteService', async () => {
    vi.mocked(fetchResources).mockResolvedValue([
      { uuid: 'child-1', name: 'linked-resource', type: 'application' },
    ]);

    const result = await handleServiceAction(
      { action: 'delete_preview', uuid: 'svc-uuid-1' },
      testEnv,
    );

    expect(deleteService).not.toHaveBeenCalled();
    expect(isServiceErrorResult(result)).toBe(false);
    if (isServiceErrorResult(result)) return;

    expect(result.data).toMatchObject({
      uuid: 'svc-uuid-1',
      would_delete: true,
    });
    const data = result.data as Record<string, unknown>;
    expect(Array.isArray(data.child_resources)).toBe(true);
  });
});
