import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

describe('pollDeploymentWithBackoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('exits with terminal outcome when fetcher returns finished', async () => {
    const { pollDeploymentWithBackoff } = await import('./deploy-watch-poll.js');

    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ deployment_uuid: 'dep-1', status: 'in_progress' })
      .mockResolvedValueOnce({
        deployment_uuid: 'dep-1',
        status: 'finished',
        finished_at: '2026-07-13T00:00:00Z',
      });

    const resultPromise = pollDeploymentWithBackoff(fetcher, {
      timeoutMs: 30000,
      minIntervalMs: 3000,
      maxIntervalMs: 30000,
    });

    await vi.advanceTimersByTimeAsync(3000);
    const outcome = await resultPromise;

    expect(outcome.kind).toBe('terminal');
    expect(outcome.deployment.status).toBe('finished');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it(
    'returns timeout outcome without synthesizing status timeout on deployment',
    async () => {
      const { pollDeploymentWithBackoff } = await import('./deploy-watch-poll.js');

      const fetcher = vi.fn().mockResolvedValue({
        deployment_uuid: 'dep-1',
        status: 'in_progress',
        commit: 'abc123',
      });

      const resultPromise = pollDeploymentWithBackoff(fetcher, {
        timeoutMs: 6000,
        minIntervalMs: 3000,
        maxIntervalMs: 30000,
        random: () => 0,
      });

      await vi.advanceTimersByTimeAsync(3000);
      await vi.advanceTimersByTimeAsync(3000);

      const outcome = await resultPromise;

      expect(outcome.kind).toBe('timeout');
      expect(outcome.elapsedMs).toBeGreaterThanOrEqual(6000);
      expect(outcome.deployment.status).toBe('in_progress');
      expect(outcome.deployment.status).not.toBe('timeout');
    },
  );

  it(
    'keeps Equal Jitter delays within [minIntervalMs, maxIntervalMs] with injectable random',
    async () => {
      const { pollDeploymentWithBackoff } = await import('./deploy-watch-poll.js');

      const randomValues = [0, 0.5, 1, 0.25];
      let randomIndex = 0;
      const random = () => randomValues[randomIndex++ % randomValues.length]!;

      const fetcher = vi.fn().mockResolvedValue({
        deployment_uuid: 'dep-1',
        status: 'in_progress',
      });

      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

      const resultPromise = pollDeploymentWithBackoff(fetcher, {
        timeoutMs: 120000,
        minIntervalMs: 3000,
        maxIntervalMs: 30000,
        random,
      });

      await vi.advanceTimersByTimeAsync(3000);
      await vi.advanceTimersByTimeAsync(30000);
      await vi.advanceTimersByTimeAsync(30000);
      void resultPromise;

      const delays = setTimeoutSpy.mock.calls
        .map((call) => call[1] as number | undefined)
        .filter((ms): ms is number => typeof ms === 'number' && ms > 0);

      for (const delay of delays) {
        expect(delay).toBeGreaterThanOrEqual(3000);
        expect(delay).toBeLessThanOrEqual(30000);
      }
      expect(delays.length).toBeGreaterThan(0);
      if (delays.length >= 2) {
        expect(delays[1]!).toBeGreaterThanOrEqual(delays[0]!);
      }

      setTimeoutSpy.mockRestore();
    },
  );

  it('continues polling after 429 with Retry-After instead of hard abort', async () => {
    const { pollDeploymentWithBackoff } = await import('./deploy-watch-poll.js');

    const rateLimitError = Object.assign(new Error('Too Many Requests'), {
      response: { status: 429, headers: { get: () => '2' } },
    });

    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValueOnce({ deployment_uuid: 'dep-1', status: 'in_progress' })
      .mockResolvedValueOnce({
        deployment_uuid: 'dep-1',
        status: 'finished',
      });

    const isRetryableRateLimit = (err: unknown) => {
      const response = (err as { response?: { status?: number; headers?: { get: (h: string) => string | null } } })
        .response;
      if (response?.status === 429) {
        const retryAfter = response.headers?.get('retry-after');
        return { retryAfterMs: retryAfter ? Number(retryAfter) * 1000 : undefined };
      }
      return null;
    };

    const resultPromise = pollDeploymentWithBackoff(fetcher, {
      timeoutMs: 60000,
      minIntervalMs: 3000,
      maxIntervalMs: 30000,
      random: () => 0,
      isRetryableRateLimit,
    });

    await vi.advanceTimersByTimeAsync(3000);
    await vi.advanceTimersByTimeAsync(3000);

    const outcome = await resultPromise;

    expect(outcome.kind).toBe('terminal');
    expect(outcome.deployment.status).toBe('finished');
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('defaults minIntervalMs to 3000 and maxIntervalMs to 30000 when omitted', async () => {
    const { pollDeploymentWithBackoff } = await import('./deploy-watch-poll.js');

    const fetcher = vi.fn().mockResolvedValue({
      deployment_uuid: 'dep-1',
      status: 'in_progress',
    });

    const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

    const resultPromise = pollDeploymentWithBackoff(fetcher, {
      timeoutMs: 120000,
      random: () => 0.5,
    });

    await vi.advanceTimersByTimeAsync(3000);
    void resultPromise;

    const delays = setTimeoutSpy.mock.calls
      .map((call) => call[1] as number | undefined)
      .filter((ms): ms is number => typeof ms === 'number' && ms > 0);

    expect(delays.length).toBeGreaterThan(0);
    expect(delays[0]).toBeGreaterThanOrEqual(3000);
    expect(delays[0]).toBeLessThanOrEqual(30000);

    setTimeoutSpy.mockRestore();
  });

  it(
    'returns timeout when Retry-After exceeds timeoutMs — remaining clamp (CR-01)',
    async () => {
      const { pollDeploymentWithBackoff } = await import('./deploy-watch-poll.js');

      const rateLimitError = new Error('Too Many Requests');
      const fetcher = vi.fn().mockRejectedValue(rateLimitError);

      const isRetryableRateLimit = () => ({ retryAfterMs: 3_600_000 });

      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

      const timeoutMs = 5000;
      const resultPromise = pollDeploymentWithBackoff(fetcher, {
        timeoutMs,
        minIntervalMs: 1000,
        maxIntervalMs: 2000,
        random: () => 0,
        isRetryableRateLimit,
      });

      await vi.advanceTimersByTimeAsync(timeoutMs + 100);

      const outcome = await resultPromise;

      expect(outcome.kind).toBe('timeout');
      expect(outcome.elapsedMs).toBeLessThanOrEqual(timeoutMs + 100);
      if (outcome.kind === 'timeout') {
        expect(outcome.noSuccessfulFetch).toBe(true);
        expect(outcome.deployment).toEqual({});
      }

      const delays = setTimeoutSpy.mock.calls
        .map((call) => call[1] as number | undefined)
        .filter((ms): ms is number => typeof ms === 'number' && ms > 0);

      expect(delays.length).toBeGreaterThan(0);
      for (const delay of delays) {
        expect(delay).toBeLessThanOrEqual(timeoutMs);
      }

      setTimeoutSpy.mockRestore();
    },
  );

  it('marks noSuccessfulFetch on timeout when every fetcher call is 429', async () => {
    const { pollDeploymentWithBackoff } = await import('./deploy-watch-poll.js');

    const rateLimitError = new Error('Too Many Requests');
    const fetcher = vi.fn().mockRejectedValue(rateLimitError);
    const isRetryableRateLimit = () => ({ retryAfterMs: 1000 });

    const resultPromise = pollDeploymentWithBackoff(fetcher, {
      timeoutMs: 5000,
      minIntervalMs: 1000,
      maxIntervalMs: 2000,
      random: () => 0,
      isRetryableRateLimit,
    });

    await vi.advanceTimersByTimeAsync(5500);
    const outcome = await resultPromise;

    expect(outcome.kind).toBe('timeout');
    if (outcome.kind !== 'timeout') return;
    expect(outcome.noSuccessfulFetch).toBe(true);
    expect(outcome.deployment).toEqual({});
  });
});