import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  pollDeploymentUntilTerminal,
  TERMINAL_DEPLOYMENT_STATES,
  DEFAULT_POLL_INTERVAL_MS,
} from './deploy-poll.js';

describe('TERMINAL_DEPLOYMENT_STATES', () => {
  it('is exactly finished, failed, cancelled-by-user', () => {
    expect(TERMINAL_DEPLOYMENT_STATES).toEqual([
      'finished',
      'failed',
      'cancelled-by-user',
    ]);
  });
});

describe('DEFAULT_POLL_INTERVAL_MS', () => {
  it('is 3000', () => {
    expect(DEFAULT_POLL_INTERVAL_MS).toBe(3000);
  });
});

describe('pollDeploymentUntilTerminal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('exits immediately when fetcher returns status finished', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      deployment_uuid: 'dep-1',
      status: 'finished',
    });

    const resultPromise = pollDeploymentUntilTerminal(fetcher, 30000);
    const result = await resultPromise;

    expect(result.status).toBe('finished');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('exits on failed terminal state', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      deployment_uuid: 'dep-1',
      status: 'failed',
    });

    const result = await pollDeploymentUntilTerminal(fetcher, 30000);
    expect(result.status).toBe('failed');
  });

  it('exits on cancelled-by-user terminal state', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      deployment_uuid: 'dep-1',
      status: 'cancelled-by-user',
    });

    const result = await pollDeploymentUntilTerminal(fetcher, 30000);
    expect(result.status).toBe('cancelled-by-user');
  });

  it('polls every 3000ms and exits when terminal arrives on 3rd poll', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ deployment_uuid: 'dep-1', status: 'in_progress' })
      .mockResolvedValueOnce({ deployment_uuid: 'dep-1', status: 'in_progress' })
      .mockResolvedValueOnce({
        deployment_uuid: 'dep-1',
        status: 'finished',
        finished_at: '2026-07-13T00:00:00Z',
      });

    const resultPromise = pollDeploymentUntilTerminal(fetcher, 30000);

    await vi.advanceTimersByTimeAsync(3000);
    await vi.advanceTimersByTimeAsync(3000);

    const result = await resultPromise;

    expect(result.status).toBe('finished');
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('returns status timeout when elapsed >= timeoutMs without terminal', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      deployment_uuid: 'dep-1',
      status: 'in_progress',
      commit: 'abc123',
    });

    const resultPromise = pollDeploymentUntilTerminal(fetcher, 6000, 3000);

    await vi.advanceTimersByTimeAsync(3000);
    await vi.advanceTimersByTimeAsync(3000);

    const result = await resultPromise;

    expect(result.status).toBe('timeout');
    expect(result.deployment_uuid).toBe('dep-1');
    expect(result.commit).toBe('abc123');
  });
});
