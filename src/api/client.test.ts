import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import https from 'node:https';
import {
  createCoolifyClient,
  createRetryOptions,
  fetchProjects,
  fetchProject,
  createProject,
  updateProject,
  deleteProject,
  fetchEnvironments,
  fetchEnvironment,
  createEnvironment,
  deleteEnvironment,
  fetchResources,
  fetchServers,
  fetchAppDeployments,
  fetchApplicationLogs,
  createPublicApplication,
  createPrivateGithubAppApplication,
  createPrivateDeployKeyApplication,
  createDockerfileApplication,
  createDockerimageApplication,
  updateApplication,
  deleteApplication,
  fetchDeployment,
  cancelDeployment,
  triggerAppRestart,
  triggerAppStart,
  triggerAppStop,
  triggerServiceRestart,
  triggerServiceStart,
  triggerServiceStop,
  triggerDatabaseRestart,
  triggerDatabaseStart,
  triggerDatabaseStop,
  triggerDeploy,
  pollServerUntilReachable,
} from './client.js';
import * as clientCrud from './client.js';
import { CoolifyApiError } from '../utils/errors.js';

describe('createRetryOptions', () => {
  it('produces 1000ms 2000ms 4000ms retry delays', () => {
    const options = createRetryOptions('token', true);
    const retryDelay = options.retryDelay as (ctx: {
      options: { retry?: number };
    }) => number;
    expect(retryDelay({ options: { retry: 3 } })).toBe(1000);
    expect(retryDelay({ options: { retry: 2 } })).toBe(2000);
    expect(retryDelay({ options: { retry: 1 } })).toBe(4000);
  });
});

describe('createCoolifyClient retry', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('retries 503 then succeeds on second request', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response('Service Unavailable', { status: 503 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );

    const client = createCoolifyClient(
      'https://coolify.example.com',
      'test-token',
    );

    await client('/teams');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws after 3 retry attempts on persistent 503', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(new Response('Service Unavailable', { status: 503 })),
    );

    const client = createCoolifyClient(
      'https://coolify.example.com',
      'test-token',
    );

    await expect(client('/teams')).rejects.toBeInstanceOf(CoolifyApiError);
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(4);
  }, 15000);

  it('configures https Agent with rejectUnauthorized false when verifySsl is false', () => {
    const options = createRetryOptions('token', false);
    expect(options.agent).toBeInstanceOf(https.Agent);
    expect(
      (options.agent as https.Agent).options.rejectUnauthorized,
    ).toBe(false);
  });
});

describe('fetchResources fetchServers fetchProjects', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetchResources GET /resources returns array', async () => {
    const items = [{ uuid: 'r1', type: 'application' }];
    fetchMock.mockResolvedValueOnce(Response.json(items, { status: 200 }));

    const result = await fetchResources(
      'https://coolify.example.com',
      'test-token',
    );

    expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/resources');
    expect(result).toEqual(items);
  });

  it('fetchResources returns empty array when response is not an array', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ data: [] }, { status: 200 }),
    );

    const result = await fetchResources(
      'https://coolify.example.com',
      'test-token',
    );

    expect(result).toEqual([]);
  });

  it('fetchServers GET /servers returns array', async () => {
    const items = [{ uuid: 's1', name: 'server-1' }];
    fetchMock.mockResolvedValueOnce(Response.json(items, { status: 200 }));

    const result = await fetchServers(
      'https://coolify.example.com',
      'test-token',
    );

    expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/servers');
    expect(result).toEqual(items);
  });

  it('fetchServers returns empty array when response is not an array', async () => {
    fetchMock.mockResolvedValueOnce(Response.json(null, { status: 200 }));

    const result = await fetchServers(
      'https://coolify.example.com',
      'test-token',
    );

    expect(result).toEqual([]);
  });

  it('fetchAppDeployments unwraps { count, deployments } envelope (Coolify 4.1.x)', async () => {
    const items = [
      { deployment_uuid: 'd1', status: 'finished' },
      { deployment_uuid: 'd2', status: 'in_progress' },
    ];
    fetchMock.mockResolvedValueOnce(
      Response.json({ count: 2, deployments: items }, { status: 200 }),
    );

    const result = await fetchAppDeployments(
      'https://coolify.example.com',
      'test-token',
      'app-uuid-1',
    );

    expect(fetchMock.mock.calls[0][0]).toContain(
      '/api/v1/deployments/applications/app-uuid-1',
    );
    expect(result).toEqual(items);
  });

  it('fetchAppDeployments accepts legacy flat array response', async () => {
    const items = [{ deployment_uuid: 'd1', status: 'finished' }];
    fetchMock.mockResolvedValueOnce(Response.json(items, { status: 200 }));

    const result = await fetchAppDeployments(
      'https://coolify.example.com',
      'test-token',
      'app-uuid-1',
    );

    expect(result).toEqual(items);
  });

  it('fetchAppDeployments returns empty array for malformed response', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ unexpected: 'shape' }, { status: 200 }),
    );

    const result = await fetchAppDeployments(
      'https://coolify.example.com',
      'test-token',
      'app-uuid-1',
    );

    expect(result).toEqual([]);
  });

  it('fetchProjects GET /projects returns array', async () => {
    const items = [{ uuid: 'p1', name: 'project-1' }];
    fetchMock.mockResolvedValueOnce(Response.json(items, { status: 200 }));

    const result = await fetchProjects(
      'https://coolify.example.com',
      'test-token',
    );

    expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/projects');
    expect(result).toEqual(items);
  });

  it('fetchProjects returns empty array when response is not an array', async () => {
    fetchMock.mockResolvedValueOnce(Response.json(null, { status: 200 }));

    const result = await fetchProjects(
      'https://coolify.example.com',
      'test-token',
    );

    expect(result).toEqual([]);
  });

  it('fetchProject GET /projects/:uuid returns project payload', async () => {
    const project = {
      uuid: 'p1',
      name: 'project-1',
      environments: [{ id: 23, uuid: 'e1', name: 'production' }],
    };
    fetchMock.mockResolvedValueOnce(Response.json(project, { status: 200 }));

    const result = await fetchProject(
      'https://coolify.example.com',
      'test-token',
      'p1',
    );

    expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/projects/p1');
    expect(result).toEqual(project);
  });
});

describe('triggerAppStart triggerAppStop triggerAppRestart', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('triggerAppStart POST /applications/{uuid}/start', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ message: 'started' }, { status: 200 }),
    );

    await triggerAppStart(
      'https://coolify.example.com',
      'test-token',
      'app-uuid-1',
    );

    expect(fetchMock.mock.calls[0][0]).toContain(
      '/api/v1/applications/app-uuid-1/start',
    );
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST');
  });

  it('triggerAppStop POST /applications/{uuid}/stop', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ message: 'stopped' }, { status: 200 }),
    );

    await triggerAppStop(
      'https://coolify.example.com',
      'test-token',
      'app-uuid-1',
    );

    expect(fetchMock.mock.calls[0][0]).toContain(
      '/api/v1/applications/app-uuid-1/stop',
    );
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST');
  });

  it('triggerAppRestart POST /applications/{uuid}/restart', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ message: 'restarted' }, { status: 200 }),
    );

    await triggerAppRestart(
      'https://coolify.example.com',
      'test-token',
      'app-uuid-1',
    );

    expect(fetchMock.mock.calls[0][0]).toContain(
      '/api/v1/applications/app-uuid-1/restart',
    );
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST');
  });

  it('each helper throws CoolifyApiError on HTTP error via withMappedErrors', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(new Response('Not Found', { status: 404 })),
    );

    await expect(
      triggerAppStart('https://coolify.example.com', 'test-token', 'missing'),
    ).rejects.toBeInstanceOf(CoolifyApiError);
  });
});

describe('triggerServiceStart triggerServiceStop triggerServiceRestart', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('triggerServiceStart POST /services/{uuid}/start', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ message: 'Service starting request queued.' }, { status: 200 }),
    );

    await triggerServiceStart(
      'https://coolify.example.com',
      'test-token',
      'svc-uuid-1',
    );

    expect(fetchMock.mock.calls[0][0]).toContain(
      '/api/v1/services/svc-uuid-1/start',
    );
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST');
  });

  it('triggerServiceStop POST /services/{uuid}/stop with docker_cleanup=false by default', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ message: 'Service stopping request queued.' }, { status: 200 }),
    );

    await triggerServiceStop(
      'https://coolify.example.com',
      'test-token',
      'svc-uuid-1',
    );

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('/api/v1/services/svc-uuid-1/stop');
    expect(url).toContain('docker_cleanup=false');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST');
  });

  it('triggerServiceStop with dockerCleanup=true sends docker_cleanup=true', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ message: 'Service stopping request queued.' }, { status: 200 }),
    );

    await triggerServiceStop(
      'https://coolify.example.com',
      'test-token',
      'svc-uuid-1',
      true,
    );

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('/api/v1/services/svc-uuid-1/stop');
    expect(url).toContain('docker_cleanup=true');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST');
  });

  it('triggerServiceRestart with latest=false POST /services/{uuid}/restart without query', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ message: 'Service restarting request queued.' }, { status: 200 }),
    );

    await triggerServiceRestart(
      'https://coolify.example.com',
      'test-token',
      'svc-uuid-1',
      false,
    );

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('/api/v1/services/svc-uuid-1/restart');
    expect(url).not.toContain('latest=');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST');
  });

  it('triggerServiceRestart with latest=true POST /services/{uuid}/restart?latest=true', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ message: 'Service restarting request queued.' }, { status: 200 }),
    );

    await triggerServiceRestart(
      'https://coolify.example.com',
      'test-token',
      'svc-uuid-1',
      true,
    );

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('/api/v1/services/svc-uuid-1/restart');
    expect(url).toContain('latest=true');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST');
  });

  it('each helper throws CoolifyApiError on HTTP error via withMappedErrors', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(new Response('Not Found', { status: 404 })),
    );

    await expect(
      triggerServiceStart('https://coolify.example.com', 'test-token', 'missing'),
    ).rejects.toBeInstanceOf(CoolifyApiError);
  });
});

describe('triggerDatabaseStart triggerDatabaseStop triggerDatabaseRestart', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('triggerDatabaseStart POST /databases/{uuid}/start', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ message: 'Database started.' }, { status: 200 }),
    );

    await triggerDatabaseStart(
      'https://coolify.example.com',
      'test-token',
      'db-uuid-1',
    );

    expect(fetchMock.mock.calls[0][0]).toContain(
      '/api/v1/databases/db-uuid-1/start',
    );
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST');
  });

  it('triggerDatabaseStop POST /databases/{uuid}/stop', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ message: 'Database stopped.' }, { status: 200 }),
    );

    await triggerDatabaseStop(
      'https://coolify.example.com',
      'test-token',
      'db-uuid-1',
    );

    expect(fetchMock.mock.calls[0][0]).toContain(
      '/api/v1/databases/db-uuid-1/stop',
    );
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST');
  });

  it('triggerDatabaseRestart POST /databases/{uuid}/restart without query', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ message: 'Database restarting request queued.' }, { status: 200 }),
    );

    await triggerDatabaseRestart(
      'https://coolify.example.com',
      'test-token',
      'db-uuid-1',
    );

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('/api/v1/databases/db-uuid-1/restart');
    expect(url).not.toContain('latest=');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST');
  });

  it('each helper throws CoolifyApiError on HTTP error via withMappedErrors', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(new Response('Not Found', { status: 404 })),
    );

    await expect(
      triggerDatabaseStart('https://coolify.example.com', 'test-token', 'missing'),
    ).rejects.toBeInstanceOf(CoolifyApiError);
  });
});

describe('triggerDeploy fetchDeployment', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('triggerDeploy POST /deploy?uuid=&force=false', async () => {
    const deployResp = {
      deployments: [
        {
          deployment_uuid: 'dep-uuid-1',
          resource_uuid: 'app-uuid-1',
          message: 'queued',
        },
      ],
    };
    fetchMock.mockResolvedValueOnce(
      Response.json(deployResp, { status: 200 }),
    );

    const result = await triggerDeploy(
      'https://coolify.example.com',
      'test-token',
      'app-uuid-1',
      false,
    );

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('/api/v1/deploy');
    expect(url).toContain('uuid=app-uuid-1');
    expect(url).toContain('force=false');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST');
    expect(result).toEqual(deployResp);
  });

  it('triggerDeploy passes force=true in query', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ deployments: [] }, { status: 200 }),
    );

    await triggerDeploy(
      'https://coolify.example.com',
      'test-token',
      'app-uuid-1',
      true,
    );

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('force=true');
  });

  it('fetchDeployment GET /deployments/{uuid}', async () => {
    const deployment = {
      deployment_uuid: 'dep-uuid-1',
      status: 'in_progress',
    };
    fetchMock.mockResolvedValueOnce(
      Response.json(deployment, { status: 200 }),
    );

    const result = await fetchDeployment(
      'https://coolify.example.com',
      'test-token',
      'dep-uuid-1',
    );

    expect(fetchMock.mock.calls[0][0]).toContain(
      '/api/v1/deployments/dep-uuid-1',
    );
    expect(fetchMock.mock.calls[0][1]?.method).toBe('GET');
    expect(result).toEqual(deployment);
  });
});

describe('cancelDeployment', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('POST /deployments/{uuid}/cancel', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ message: 'cancelled' }, { status: 200 }),
    );

    await cancelDeployment(
      'https://coolify.example.com',
      'test-token',
      'dep-uuid-1',
    );

    expect(fetchMock.mock.calls[0][0]).toContain(
      '/api/v1/deployments/dep-uuid-1/cancel',
    );
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST');
  });

  it('throws CoolifyApiError with COOLIFY_422 on HTTP 400', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('Deployment already finished', { status: 400 }),
    );

    await expect(
      cancelDeployment(
        'https://coolify.example.com',
        'test-token',
        'dep-uuid-finished',
      ),
    ).rejects.toMatchObject({
      envelope: {
        code: 'COOLIFY_422',
        httpStatus: 400,
      },
    });
  });
});

describe('pollServerUntilReachable', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves immediately when first fetcher returns is_reachable true', async () => {
    const server = { settings: { is_reachable: true }, uuid: 'srv-1' };
    const fetcher = vi.fn().mockResolvedValue(server);

    const promise = pollServerUntilReachable(fetcher);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result).toEqual(server);
  });

  it('returns last-seen server with is_reachable false after exhausting timeout', async () => {
    const server = { settings: { is_reachable: false }, uuid: 'srv-pending' };
    const fetcher = vi.fn().mockResolvedValue(server);

    const promise = pollServerUntilReachable(fetcher, 30000, 2000);
    await vi.advanceTimersByTimeAsync(30000);
    const result = await promise;

    expect(fetcher).toHaveBeenCalledTimes(15);
    expect(result).toEqual(server);
    expect(
      (result.settings as { is_reachable: boolean }).is_reachable,
    ).toBe(false);
  });

  it('returns last-seen server with is_reachable undefined when fetcher never sets the flag', async () => {
    const server = { settings: {}, uuid: 'srv-unknown' };
    const fetcher = vi.fn().mockResolvedValue(server);

    const promise = pollServerUntilReachable(fetcher, 30000, 2000);
    await vi.advanceTimersByTimeAsync(30000);
    const result = await promise;

    expect(fetcher).toHaveBeenCalledTimes(15);
    expect(result).toEqual(server);
    expect(
      (result.settings as { is_reachable?: boolean }).is_reachable,
    ).toBeUndefined();
  });
});

describe('project and environment CRUD', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('createProject POST /projects with name only', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ uuid: 'proj-new' }, { status: 201 }),
    );

    const result = await createProject(
      'https://coolify.example.com',
      'test-token',
      { name: 'My Project' },
    );

    expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/projects');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ name: 'My Project' });
    expect(result).toEqual({ uuid: 'proj-new' });
  });

  it('createProject includes description when provided', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ uuid: 'proj-new' }, { status: 201 }),
    );

    await createProject('https://coolify.example.com', 'test-token', {
      name: 'My Project',
      description: 'A test project',
    });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({
      name: 'My Project',
      description: 'A test project',
    });
  });

  it('updateProject PATCH /projects/{uuid} with defined fields only', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json(
        { uuid: 'proj-1', name: 'Renamed', description: 'Updated' },
        { status: 200 },
      ),
    );

    const result = await updateProject(
      'https://coolify.example.com',
      'test-token',
      'proj-1',
      { name: 'Renamed' },
    );

    expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/projects/proj-1');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ name: 'Renamed' });
    expect(result).toMatchObject({ uuid: 'proj-1', name: 'Renamed' });
  });

  it('deleteProject DELETE /projects/{uuid}', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ message: 'Project deleted.' }, { status: 200 }),
    );

    const result = await deleteProject(
      'https://coolify.example.com',
      'test-token',
      'proj-1',
    );

    expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/projects/proj-1');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('DELETE');
    expect(result).toEqual({ message: 'Project deleted.' });
  });

  it('fetchEnvironments GET /projects/{uuid}/environments returns array', async () => {
    const envs = [{ uuid: 'env-1', name: 'production' }];
    fetchMock.mockResolvedValueOnce(Response.json(envs, { status: 200 }));

    const result = await fetchEnvironments(
      'https://coolify.example.com',
      'test-token',
      'proj-1',
    );

    expect(fetchMock.mock.calls[0][0]).toContain(
      '/api/v1/projects/proj-1/environments',
    );
    expect(result).toEqual(envs);
  });

  it('fetchEnvironments returns empty array when response is not an array', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ data: [] }, { status: 200 }),
    );

    const result = await fetchEnvironments(
      'https://coolify.example.com',
      'test-token',
      'proj-1',
    );

    expect(result).toEqual([]);
  });

  it('fetchEnvironment GET /projects/{uuid}/{name_or_uuid}', async () => {
    const env = { uuid: 'env-1', name: 'production' };
    fetchMock.mockResolvedValueOnce(Response.json(env, { status: 200 }));

    const result = await fetchEnvironment(
      'https://coolify.example.com',
      'test-token',
      'proj-1',
      'production',
    );

    expect(fetchMock.mock.calls[0][0]).toContain(
      '/api/v1/projects/proj-1/production',
    );
    expect(result).toEqual(env);
  });

  it('createEnvironment POST /projects/{uuid}/environments { name }', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ uuid: 'env-new' }, { status: 201 }),
    );

    const result = await createEnvironment(
      'https://coolify.example.com',
      'test-token',
      'proj-1',
      { name: 'staging' },
    );

    expect(fetchMock.mock.calls[0][0]).toContain(
      '/api/v1/projects/proj-1/environments',
    );
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ name: 'staging' });
    expect(result).toEqual({ uuid: 'env-new' });
  });

  it('deleteEnvironment DELETE /projects/{uuid}/environments/{name_or_uuid}', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ message: 'Environment deleted.' }, { status: 200 }),
    );

    const result = await deleteEnvironment(
      'https://coolify.example.com',
      'test-token',
      'proj-1',
      'staging',
    );

    expect(fetchMock.mock.calls[0][0]).toContain(
      '/api/v1/projects/proj-1/environments/staging',
    );
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('DELETE');
    expect(result).toEqual({ message: 'Environment deleted.' });
  });
});

describe('application CRUD', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('createPublicApplication POST /applications/public with JSON body', async () => {
    const payload = {
      project_uuid: 'proj-1',
      server_uuid: 'srv-1',
      environment_name: 'production',
      name: 'my-app',
    };
    fetchMock.mockResolvedValueOnce(
      Response.json({ uuid: 'app-new' }, { status: 201 }),
    );

    const result = await createPublicApplication(
      'https://coolify.example.com',
      'test-token',
      payload,
    );

    expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/applications/public');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(payload);
    expect(result).toEqual({ uuid: 'app-new' });
  });

  it('createPrivateGithubAppApplication POST /applications/private-github-app', async () => {
    const payload = { project_uuid: 'proj-1', name: 'gh-app' };
    fetchMock.mockResolvedValueOnce(
      Response.json({ uuid: 'app-gh' }, { status: 201 }),
    );

    await createPrivateGithubAppApplication(
      'https://coolify.example.com',
      'test-token',
      payload,
    );

    expect(fetchMock.mock.calls[0][0]).toContain(
      '/api/v1/applications/private-github-app',
    );
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(payload);
  });

  it('createPrivateDeployKeyApplication POST /applications/private-deploy-key', async () => {
    const payload = { project_uuid: 'proj-1', name: 'dk-app' };
    fetchMock.mockResolvedValueOnce(
      Response.json({ uuid: 'app-dk' }, { status: 201 }),
    );

    await createPrivateDeployKeyApplication(
      'https://coolify.example.com',
      'test-token',
      payload,
    );

    expect(fetchMock.mock.calls[0][0]).toContain(
      '/api/v1/applications/private-deploy-key',
    );
    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('POST');
  });

  it('createDockerfileApplication POST /applications/dockerfile', async () => {
    const payload = { project_uuid: 'proj-1', name: 'dockerfile-app' };
    fetchMock.mockResolvedValueOnce(
      Response.json({ uuid: 'app-df' }, { status: 201 }),
    );

    await createDockerfileApplication(
      'https://coolify.example.com',
      'test-token',
      payload,
    );

    expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/applications/dockerfile');
    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('POST');
  });

  it('createDockerimageApplication POST /applications/dockerimage', async () => {
    const payload = { project_uuid: 'proj-1', name: 'dockerimage-app' };
    fetchMock.mockResolvedValueOnce(
      Response.json({ uuid: 'app-di' }, { status: 201 }),
    );

    await createDockerimageApplication(
      'https://coolify.example.com',
      'test-token',
      payload,
    );

    expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/applications/dockerimage');
    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('POST');
  });

  it('updateApplication PATCH /applications/{uuid} with JSON body', async () => {
    const payload = { name: 'renamed-app', description: 'updated' };
    fetchMock.mockResolvedValueOnce(
      Response.json({ uuid: 'app-1', name: 'renamed-app' }, { status: 200 }),
    );

    const result = await updateApplication(
      'https://coolify.example.com',
      'test-token',
      'app-1',
      payload,
    );

    expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/applications/app-1');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual(payload);
    expect(result).toMatchObject({ uuid: 'app-1', name: 'renamed-app' });
  });

  it('deleteApplication DELETE /applications/{uuid} with query params', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ message: 'Application deleted.' }, { status: 200 }),
    );

    const params = {
      delete_configurations: true,
      delete_volumes: false,
      docker_cleanup: true,
      delete_connected_networks: false,
    };

    const result = await deleteApplication(
      'https://coolify.example.com',
      'test-token',
      'app-1',
      params,
    );

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('/api/v1/applications/app-1');
    expect(url).toContain('delete_configurations=true');
    expect(url).toContain('delete_volumes=false');
    expect(url).toContain('docker_cleanup=true');
    expect(url).toContain('delete_connected_networks=false');
    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('DELETE');
    expect(result).toEqual({ message: 'Application deleted.' });
  });

  it('throws CoolifyApiError on HTTP error via withMappedErrors', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(new Response('Not Found', { status: 404 })),
    );

    await expect(
      createPublicApplication('https://coolify.example.com', 'test-token', {}),
    ).rejects.toBeInstanceOf(CoolifyApiError);
  });
});

describe('service and database CRUD', () => {
  const fetchMock = vi.fn();
  const crud = clientCrud as Record<
    string,
    ((...args: unknown[]) => Promise<unknown>) | unknown
  >;

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('createService POST /services with JSON body', async () => {
    expect(crud.createService).toBeTypeOf('function');
    const payload = {
      type: 'actualbudget',
      project_uuid: 'proj-1',
      server_uuid: 'srv-1',
      environment_name: 'production',
    };
    fetchMock.mockResolvedValueOnce(
      Response.json({ uuid: 'svc-new' }, { status: 201 }),
    );

    const result = await (crud.createService as typeof createProject)(
      'https://coolify.example.com',
      'test-token',
      payload,
    );

    expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/services');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(payload);
    expect(result).toEqual({ uuid: 'svc-new' });
  });

  it('updateService PATCH /services/{uuid} with JSON body', async () => {
    expect(crud.updateService).toBeTypeOf('function');
    const payload = { name: 'renamed-service' };
    fetchMock.mockResolvedValueOnce(
      Response.json({ uuid: 'svc-1', name: 'renamed-service' }, { status: 200 }),
    );

    const result = await (crud.updateService as typeof updateProject)(
      'https://coolify.example.com',
      'test-token',
      'svc-1',
      payload,
    );

    expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/services/svc-1');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual(payload);
    expect(result).toMatchObject({ uuid: 'svc-1', name: 'renamed-service' });
  });

  it('deleteService DELETE /services/{uuid} with query params', async () => {
    expect(crud.deleteService).toBeTypeOf('function');
    const params = {
      delete_configurations: false,
      delete_volumes: false,
      docker_cleanup: false,
      delete_connected_networks: false,
    };
    fetchMock.mockResolvedValueOnce(
      Response.json({ message: 'Service deleted.' }, { status: 200 }),
    );

    const result = await (crud.deleteService as typeof deleteApplication)(
      'https://coolify.example.com',
      'test-token',
      'svc-1',
      params,
    );

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('/api/v1/services/svc-1');
    expect(url).toContain('delete_configurations=false');
    expect(url).toContain('delete_volumes=false');
    expect(url).toContain('docker_cleanup=false');
    expect(url).toContain('delete_connected_networks=false');
    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('DELETE');
    expect(result).toEqual({ message: 'Service deleted.' });
  });

  it.each([
    ['createPostgresqlDatabase', '/api/v1/databases/postgresql'],
    ['createMysqlDatabase', '/api/v1/databases/mysql'],
    ['createMariadbDatabase', '/api/v1/databases/mariadb'],
    ['createMongodbDatabase', '/api/v1/databases/mongodb'],
    ['createRedisDatabase', '/api/v1/databases/redis'],
    ['createClickhouseDatabase', '/api/v1/databases/clickhouse'],
    ['createDragonflyDatabase', '/api/v1/databases/dragonfly'],
    ['createKeydbDatabase', '/api/v1/databases/keydb'],
  ] as const)('%s POST %s', async (fnName, path) => {
    expect(crud[fnName]).toBeTypeOf('function');
    const payload = {
      project_uuid: 'proj-1',
      server_uuid: 'srv-1',
      environment_name: 'production',
    };
    fetchMock.mockResolvedValueOnce(
      Response.json({ uuid: 'db-new' }, { status: 201 }),
    );

    await (crud[fnName] as typeof createProject)(
      'https://coolify.example.com',
      'test-token',
      payload,
    );

    expect(fetchMock.mock.calls[0][0]).toContain(path);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(payload);
  });

  it('updateDatabase PATCH /databases/{uuid} with JSON body', async () => {
    expect(crud.updateDatabase).toBeTypeOf('function');
    const payload = { is_public: false, public_port: 5432 };
    fetchMock.mockResolvedValueOnce(
      Response.json({ uuid: 'db-1', is_public: false }, { status: 200 }),
    );

    const result = await (crud.updateDatabase as typeof updateProject)(
      'https://coolify.example.com',
      'test-token',
      'db-1',
      payload,
    );

    expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/databases/db-1');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual(payload);
    expect(result).toMatchObject({ uuid: 'db-1', is_public: false });
  });

  it('deleteDatabase DELETE /databases/{uuid} with query params', async () => {
    expect(crud.deleteDatabase).toBeTypeOf('function');
    const params = {
      delete_configurations: false,
      delete_volumes: false,
      docker_cleanup: false,
      delete_connected_networks: false,
    };
    fetchMock.mockResolvedValueOnce(
      Response.json({ message: 'Database deleted.' }, { status: 200 }),
    );

    const result = await (crud.deleteDatabase as typeof deleteApplication)(
      'https://coolify.example.com',
      'test-token',
      'db-1',
      params,
    );

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('/api/v1/databases/db-1');
    expect(url).toContain('delete_configurations=false');
    expect(url).toContain('delete_volumes=false');
    expect(url).toContain('docker_cleanup=false');
    expect(url).toContain('delete_connected_networks=false');
    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('DELETE');
    expect(result).toEqual({ message: 'Database deleted.' });
  });
});

describe('fetchApplicationLogs', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('GET /applications/{uuid}/logs?lines={lines} returns raw response', async () => {
    const response = { logs: 'line1\nline2' };
    fetchMock.mockResolvedValueOnce(Response.json(response, { status: 200 }));

    const result = await fetchApplicationLogs(
      'https://coolify.example.com',
      'test-token',
      'app-uuid-1',
      50,
    );

    expect(fetchMock.mock.calls[0][0]).toContain(
      '/api/v1/applications/app-uuid-1/logs',
    );
    expect(fetchMock.mock.calls[0][0]).toContain('lines=50');
    expect(result).toEqual(response);
  });
});

describe('fetchEnvs', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    ['application', 'app-uuid-1', '/api/v1/applications/app-uuid-1/envs'],
    ['service', 'svc-uuid-1', '/api/v1/services/svc-uuid-1/envs'],
    ['database', 'db-uuid-1', '/api/v1/databases/db-uuid-1/envs'],
  ] as const)(
    'fetchEnvs(%s) GET %s returns env array',
    async (resourceType, uuid, expectedPath) => {
      expect(clientCrud.fetchEnvs).toBeTypeOf('function');
      const envs = [{ uuid: 'env-1', key: 'K', value: 'FAKE_VALUE' }];
      fetchMock.mockResolvedValueOnce(Response.json(envs, { status: 200 }));

      const result = await (
        clientCrud.fetchEnvs as (
          type: string,
          url: string,
          token: string,
          uuid: string,
          verifySsl?: boolean,
        ) => Promise<unknown[]>
      )(
        resourceType,
        'https://coolify.example.com',
        'test-token',
        uuid,
      );

      expect(fetchMock.mock.calls[0][0]).toContain(expectedPath);
      expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('GET');
      expect(result).toEqual(envs);
    },
  );

  it('fetchEnvs throws COOLIFY_500 when response body is not an array', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ data: [] }, { status: 200 }),
    );

    await expect(
      (
        clientCrud.fetchEnvs as (
          type: string,
          url: string,
          token: string,
          uuid: string,
          verifySsl?: boolean,
        ) => Promise<unknown[]>
      )(
        'application',
        'https://coolify.example.com',
        'test-token',
        'app-uuid-1',
      ),
    ).rejects.toMatchObject({
      envelope: expect.objectContaining({ code: 'COOLIFY_500' }),
    });
  });
});

describe('createEnv', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('createEnv(application) POSTs to /applications/{uuid}/envs with flags', async () => {
    expect(clientCrud.createEnv).toBeTypeOf('function');
    const payload = {
      key: 'NEW_KEY',
      value: 'FAKE_SECRET_VALUE',
      is_preview: true,
      is_literal: true,
      is_multiline: false,
      is_shown_once: false,
    };
    fetchMock.mockResolvedValueOnce(
      Response.json({ uuid: 'env-new' }, { status: 201 }),
    );

    await (
      clientCrud.createEnv as (
        type: string,
        url: string,
        token: string,
        uuid: string,
        body: unknown,
        verifySsl?: boolean,
      ) => Promise<unknown>
    )(
      'application',
      'https://coolify.example.com',
      'test-token',
      'app-uuid-1',
      payload,
    );

    expect(fetchMock.mock.calls[0][0]).toContain(
      '/api/v1/applications/app-uuid-1/envs',
    );
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(payload);
  });

  it('createEnv(database) rejects is_preview before HTTP call per D-16', async () => {
    expect(clientCrud.createEnv).toBeTypeOf('function');

    await expect(
      (
        clientCrud.createEnv as (
          type: string,
          url: string,
          token: string,
          uuid: string,
          body: unknown,
          verifySsl?: boolean,
        ) => Promise<unknown>
      )(
        'database',
        'https://coolify.example.com',
        'test-token',
        'db-uuid-1',
        { key: 'K', value: 'v', is_preview: true },
      ),
    ).rejects.toMatchObject({
      envelope: expect.objectContaining({ code: 'COOLIFY_VALIDATION_ERROR' }),
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('updateEnvViaBulk', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('PATCHes /applications/{uuid}/envs/bulk with data array body', async () => {
    expect(clientCrud.updateEnvViaBulk).toBeTypeOf('function');
    const entries = [{ key: 'DATABASE_URL', value: 'updated' }];
    fetchMock.mockResolvedValueOnce(
      Response.json([{ uuid: 'env-1', key: 'DATABASE_URL', value: 'updated' }], {
        status: 200,
      }),
    );

    await (
      clientCrud.updateEnvViaBulk as (
        type: string,
        url: string,
        token: string,
        uuid: string,
        data: unknown[],
        verifySsl?: boolean,
      ) => Promise<unknown>
    )(
      'application',
      'https://coolify.example.com',
      'test-token',
      'app-uuid-1',
      entries,
    );

    expect(fetchMock.mock.calls[0][0]).toContain(
      '/api/v1/applications/app-uuid-1/envs/bulk',
    );
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ data: entries });
  });

  it('updateEnvViaBulk throws COOLIFY_500 when response body is not an array', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ updated: 1 }, { status: 200 }),
    );

    await expect(
      (
        clientCrud.updateEnvViaBulk as (
          type: string,
          url: string,
          token: string,
          uuid: string,
          data: unknown[],
          verifySsl?: boolean,
        ) => Promise<unknown>
      )(
        'application',
        'https://coolify.example.com',
        'test-token',
        'app-uuid-1',
        [{ key: 'A', value: '1' }],
      ),
    ).rejects.toMatchObject({
      envelope: expect.objectContaining({ code: 'COOLIFY_500' }),
    });
  });
});

describe('bulkUpdateEnvs', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is alias for updateEnvViaBulk with multi-element array', async () => {
    expect(clientCrud.bulkUpdateEnvs).toBeTypeOf('function');
    const entries = [
      { key: 'A', value: '1' },
      { key: 'B', value: '2' },
    ];
    fetchMock.mockResolvedValueOnce(
      Response.json(
        [
          { uuid: 'env-a', key: 'A', value: '1' },
          { uuid: 'env-b', key: 'B', value: '2' },
        ],
        { status: 200 },
      ),
    );

    await (
      clientCrud.bulkUpdateEnvs as (
        type: string,
        url: string,
        token: string,
        uuid: string,
        data: unknown[],
        verifySsl?: boolean,
      ) => Promise<unknown>
    )(
      'service',
      'https://coolify.example.com',
      'test-token',
      'svc-uuid-1',
      entries,
    );

    expect(fetchMock.mock.calls[0][0]).toContain(
      '/api/v1/services/svc-uuid-1/envs/bulk',
    );
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toEqual({
      data: entries,
    });
  });
});

describe('deleteEnv', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('DELETEs /applications/{uuid}/envs/{env_uuid}', async () => {
    expect(clientCrud.deleteEnv).toBeTypeOf('function');
    fetchMock.mockResolvedValueOnce(
      Response.json({ message: 'Deleted.' }, { status: 200 }),
    );

    await (
      clientCrud.deleteEnv as (
        type: string,
        url: string,
        token: string,
        uuid: string,
        envUuid: string,
        verifySsl?: boolean,
      ) => Promise<unknown>
    )(
      'application',
      'https://coolify.example.com',
      'test-token',
      'app-uuid-1',
      'env-uuid-1',
    );

    expect(fetchMock.mock.calls[0][0]).toContain(
      '/api/v1/applications/app-uuid-1/envs/env-uuid-1',
    );
    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('DELETE');
  });
});

describe('fetchDatabaseBackups', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.fails('GET /databases/{uuid}/backups returns array', async () => {
    expect(clientCrud.fetchDatabaseBackups).toBeTypeOf('function');
    const schedules = [
      {
        uuid: 'backup-sched-uuid-1',
        frequency: 'daily',
        enabled: true,
        save_s3: false,
      },
    ];
    fetchMock.mockResolvedValueOnce(Response.json(schedules, { status: 200 }));

    const result = await (
      clientCrud.fetchDatabaseBackups as (
        url: string,
        token: string,
        databaseUuid: string,
        verifySsl?: boolean,
      ) => Promise<unknown[]>
    )(
      'https://coolify.example.com',
      'test-token',
      'db-uuid-1',
    );

    expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/databases/db-uuid-1/backups');
    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('GET');
    expect(result).toEqual(schedules);
  });

  it.fails('returns empty array when response is not an array', async () => {
    expect(clientCrud.fetchDatabaseBackups).toBeTypeOf('function');
    fetchMock.mockResolvedValueOnce(
      Response.json({ data: [] }, { status: 200 }),
    );

    const result = await (
      clientCrud.fetchDatabaseBackups as (
        url: string,
        token: string,
        databaseUuid: string,
        verifySsl?: boolean,
      ) => Promise<unknown[]>
    )(
      'https://coolify.example.com',
      'test-token',
      'db-uuid-1',
    );

    expect(result).toEqual([]);
  });

  it.fails('throws CoolifyApiError on HTTP error via mapApiError', async () => {
    expect(clientCrud.fetchDatabaseBackups).toBeTypeOf('function');
    fetchMock.mockImplementation(() =>
      Promise.resolve(new Response('Not Found', { status: 404 })),
    );

    await expect(
      (
        clientCrud.fetchDatabaseBackups as (
          url: string,
          token: string,
          databaseUuid: string,
          verifySsl?: boolean,
        ) => Promise<unknown[]>
      )('https://coolify.example.com', 'test-token', 'missing'),
    ).rejects.toBeInstanceOf(CoolifyApiError);
  });
});

describe('createDatabaseBackup', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.fails('POST /databases/{uuid}/backups with payload returns uuid and message', async () => {
    expect(clientCrud.createDatabaseBackup).toBeTypeOf('function');
    const payload = { frequency: 'daily', save_s3: false };
    const response = {
      uuid: 'backup-sched-uuid-1',
      message: 'Backup schedule created.',
    };
    fetchMock.mockResolvedValueOnce(Response.json(response, { status: 201 }));

    const result = await (
      clientCrud.createDatabaseBackup as (
        url: string,
        token: string,
        databaseUuid: string,
        body: unknown,
        verifySsl?: boolean,
      ) => Promise<{ uuid: string; message: string }>
    )(
      'https://coolify.example.com',
      'test-token',
      'db-uuid-1',
      payload,
    );

    expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/databases/db-uuid-1/backups');
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(payload);
    expect(result).toEqual(response);
  });

  it.fails('throws CoolifyApiError on HTTP error via mapApiError', async () => {
    expect(clientCrud.createDatabaseBackup).toBeTypeOf('function');
    fetchMock.mockImplementation(() =>
      Promise.resolve(new Response('Unprocessable', { status: 422 })),
    );

    await expect(
      (
        clientCrud.createDatabaseBackup as (
          url: string,
          token: string,
          databaseUuid: string,
          body: unknown,
          verifySsl?: boolean,
        ) => Promise<unknown>
      )(
        'https://coolify.example.com',
        'test-token',
        'db-uuid-1',
        { frequency: 'daily' },
      ),
    ).rejects.toBeInstanceOf(CoolifyApiError);
  });
});

describe('updateDatabaseBackup', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.fails('PATCH /databases/{uuid}/backups/{scheduled_backup_uuid} with payload', async () => {
    expect(clientCrud.updateDatabaseBackup).toBeTypeOf('function');
    const payload = { frequency: 'hourly', backup_now: true };
    fetchMock.mockResolvedValueOnce(
      Response.json({ message: 'Backup schedule updated.' }, { status: 200 }),
    );

    const result = await (
      clientCrud.updateDatabaseBackup as (
        url: string,
        token: string,
        databaseUuid: string,
        scheduledBackupUuid: string,
        body: unknown,
        verifySsl?: boolean,
      ) => Promise<{ message: string }>
    )(
      'https://coolify.example.com',
      'test-token',
      'db-uuid-1',
      'backup-sched-uuid-1',
      payload,
    );

    expect(fetchMock.mock.calls[0][0]).toContain(
      '/api/v1/databases/db-uuid-1/backups/backup-sched-uuid-1',
    );
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual(payload);
    expect(result).toEqual({ message: 'Backup schedule updated.' });
  });

  it.fails('throws CoolifyApiError on HTTP error via mapApiError', async () => {
    expect(clientCrud.updateDatabaseBackup).toBeTypeOf('function');
    fetchMock.mockImplementation(() =>
      Promise.resolve(new Response('Not Found', { status: 404 })),
    );

    await expect(
      (
        clientCrud.updateDatabaseBackup as (
          url: string,
          token: string,
          databaseUuid: string,
          scheduledBackupUuid: string,
          body: unknown,
          verifySsl?: boolean,
        ) => Promise<unknown>
      )(
        'https://coolify.example.com',
        'test-token',
        'db-uuid-1',
        'missing-backup',
        { frequency: 'daily' },
      ),
    ).rejects.toBeInstanceOf(CoolifyApiError);
  });
});

describe('deleteDatabaseBackup', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.fails('DELETE /databases/{uuid}/backups/{scheduled_backup_uuid} with delete_s3=false by default', async () => {
    expect(clientCrud.deleteDatabaseBackup).toBeTypeOf('function');
    fetchMock.mockResolvedValueOnce(
      Response.json({ message: 'Backup schedule deleted.' }, { status: 200 }),
    );

    const result = await (
      clientCrud.deleteDatabaseBackup as (
        url: string,
        token: string,
        databaseUuid: string,
        scheduledBackupUuid: string,
        deleteS3?: boolean,
        verifySsl?: boolean,
      ) => Promise<{ message: string }>
    )(
      'https://coolify.example.com',
      'test-token',
      'db-uuid-1',
      'backup-sched-uuid-1',
    );

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain(
      '/api/v1/databases/db-uuid-1/backups/backup-sched-uuid-1',
    );
    expect(url).toContain('delete_s3=false');
    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('DELETE');
    expect(result).toEqual({ message: 'Backup schedule deleted.' });
  });

  it.fails('DELETE forwards delete_s3=true when explicitly passed', async () => {
    expect(clientCrud.deleteDatabaseBackup).toBeTypeOf('function');
    fetchMock.mockResolvedValueOnce(
      Response.json({ message: 'Backup schedule deleted.' }, { status: 200 }),
    );

    await (
      clientCrud.deleteDatabaseBackup as (
        url: string,
        token: string,
        databaseUuid: string,
        scheduledBackupUuid: string,
        deleteS3?: boolean,
        verifySsl?: boolean,
      ) => Promise<{ message: string }>
    )(
      'https://coolify.example.com',
      'test-token',
      'db-uuid-1',
      'backup-sched-uuid-1',
      true,
    );

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('delete_s3=true');
    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('DELETE');
  });

  it.fails('throws CoolifyApiError on HTTP error via mapApiError', async () => {
    expect(clientCrud.deleteDatabaseBackup).toBeTypeOf('function');
    fetchMock.mockImplementation(() =>
      Promise.resolve(new Response('Not Found', { status: 404 })),
    );

    await expect(
      (
        clientCrud.deleteDatabaseBackup as (
          url: string,
          token: string,
          databaseUuid: string,
          scheduledBackupUuid: string,
          deleteS3?: boolean,
          verifySsl?: boolean,
        ) => Promise<unknown>
      )(
        'https://coolify.example.com',
        'test-token',
        'db-uuid-1',
        'missing-backup',
      ),
    ).rejects.toBeInstanceOf(CoolifyApiError);
  });
});

describe('fetchBackupExecutions', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.fails('GET /databases/{uuid}/backups/{scheduled_backup_uuid}/executions returns executions envelope', async () => {
    expect(clientCrud.fetchBackupExecutions).toBeTypeOf('function');
    const response = {
      executions: [
        {
          uuid: 'exec-uuid-1',
          filename: 'backup-2026-07-21.sql',
          size: 1024,
          created_at: '2026-07-21T00:00:00Z',
          status: 'finished',
          message: 'Backup completed.',
        },
      ],
    };
    fetchMock.mockResolvedValueOnce(Response.json(response, { status: 200 }));

    const result = await (
      clientCrud.fetchBackupExecutions as (
        url: string,
        token: string,
        databaseUuid: string,
        scheduledBackupUuid: string,
        verifySsl?: boolean,
      ) => Promise<{ executions: unknown[] }>
    )(
      'https://coolify.example.com',
      'test-token',
      'db-uuid-1',
      'backup-sched-uuid-1',
    );

    expect(fetchMock.mock.calls[0][0]).toContain(
      '/api/v1/databases/db-uuid-1/backups/backup-sched-uuid-1/executions',
    );
    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('GET');
    expect(result).toEqual(response);
    expect(Array.isArray(result.executions)).toBe(true);
  });

  it.fails('throws CoolifyApiError on HTTP error via mapApiError', async () => {
    expect(clientCrud.fetchBackupExecutions).toBeTypeOf('function');
    fetchMock.mockImplementation(() =>
      Promise.resolve(new Response('Not Found', { status: 404 })),
    );

    await expect(
      (
        clientCrud.fetchBackupExecutions as (
          url: string,
          token: string,
          databaseUuid: string,
          scheduledBackupUuid: string,
          verifySsl?: boolean,
        ) => Promise<unknown>
      )(
        'https://coolify.example.com',
        'test-token',
        'db-uuid-1',
        'missing-backup',
      ),
    ).rejects.toBeInstanceOf(CoolifyApiError);
  });
});
