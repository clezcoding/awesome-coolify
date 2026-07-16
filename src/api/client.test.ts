import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import https from 'node:https';
import {
  createCoolifyClient,
  createRetryOptions,
  fetchProjects,
  fetchProject,
  fetchResources,
  fetchServers,
  fetchAppDeployments,
  fetchApplicationLogs,
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
} from './client.js';
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

  it('triggerServiceStop POST /services/{uuid}/stop', async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ message: 'Service stopping request queued.' }, { status: 200 }),
    );

    await triggerServiceStop(
      'https://coolify.example.com',
      'test-token',
      'svc-uuid-1',
    );

    expect(fetchMock.mock.calls[0][0]).toContain(
      '/api/v1/services/svc-uuid-1/stop',
    );
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
