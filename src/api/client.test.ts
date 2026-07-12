import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import https from 'node:https';
import { createCoolifyClient, createRetryOptions } from './client.js';
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
