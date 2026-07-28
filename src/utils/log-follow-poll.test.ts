import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { CoolifyApiError } from './errors.js';

describe('followApplicationLogs', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it(
    'appends only new tail lines when snapshots overlap (dedup)',
    async () => {
      const { followApplicationLogs } = await import('./log-follow-poll.js');

      const fetchSnapshot = vi
        .fn()
        .mockResolvedValueOnce(['line1', 'line2', 'line3'])
        .mockResolvedValueOnce(['line2', 'line3', 'line4'])
        .mockResolvedValue(['line2', 'line3', 'line4']);

      const resultPromise = followApplicationLogs({
        fetchSnapshot,
        timeoutMs: 60_000,
        idleTimeoutMs: 1000,
        minIntervalMs: 1000,
        maxIntervalMs: 1000,
        random: () => 0,
      });

      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(1000);

      const outcome = await resultPromise;

      expect(outcome.aggregate).toEqual(['line1', 'line2', 'line3', 'line4']);
      expect(fetchSnapshot.mock.calls.length).toBeGreaterThanOrEqual(2);
    },
  );

  it(
    'stops with stoppedReason idle when no new deduped lines for idleTimeoutMs',
    async () => {
      const { followApplicationLogs } = await import('./log-follow-poll.js');

      const fetchSnapshot = vi.fn().mockResolvedValue(['static line']);

      const resultPromise = followApplicationLogs({
        fetchSnapshot,
        timeoutMs: 120_000,
        idleTimeoutMs: 5000,
        minIntervalMs: 1000,
        maxIntervalMs: 1000,
        random: () => 0,
      });

      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(5000);

      const outcome = await resultPromise;

      expect(outcome.stoppedReason).toBe('idle');
    },
  );

  it(
    'stops with stoppedReason timeout when budget exhausted',
    async () => {
      const { followApplicationLogs } = await import('./log-follow-poll.js');

      let callCount = 0;
      const fetchSnapshot = vi.fn().mockImplementation(async () => {
        callCount++;
        return [`trickle-${callCount}`];
      });

      const resultPromise = followApplicationLogs({
        fetchSnapshot,
        timeoutMs: 6000,
        idleTimeoutMs: 60_000,
        minIntervalMs: 2000,
        maxIntervalMs: 2000,
        random: () => 0,
      });

      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(2000);
      await vi.advanceTimersByTimeAsync(2000);

      const outcome = await resultPromise;

      expect(outcome.stoppedReason).toBe('timeout');
    },
  );

  it(
    'continues poll loop on 429 when isRetryableRateLimit returns retry info',
    async () => {
      const { followApplicationLogs } = await import('./log-follow-poll.js');

      const rateLimitError = new CoolifyApiError({
        code: 'COOLIFY_429',
        message: 'Too Many Requests',
        recoveryHints: [],
        httpStatus: 429,
      });

      const fetchSnapshot = vi
        .fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce(['after rate limit'])
        .mockResolvedValue(['after rate limit']);

      const isRetryableRateLimit = (err: unknown) => {
        if (err instanceof CoolifyApiError && err.envelope.httpStatus === 429) {
          return { retryAfterMs: 1000 };
        }
        return null;
      };

      const resultPromise = followApplicationLogs({
        fetchSnapshot,
        timeoutMs: 60_000,
        idleTimeoutMs: 1000,
        minIntervalMs: 1000,
        maxIntervalMs: 1000,
        random: () => 0,
        isRetryableRateLimit,
      });

      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(1000);

      const outcome = await resultPromise;

      expect(outcome.stoppedReason).toBe('idle');
      expect(fetchSnapshot).toHaveBeenCalledTimes(3);
    },
  );
});
