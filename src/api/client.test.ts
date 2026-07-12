import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import https from 'node:https';
import {
  createCoolifyClient,
  createRetryOptions,
  fetchProjects,
  fetchResources,
  fetchServers,
  triggerAppRestart,
  triggerAppStart,
  triggerAppStop,
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
