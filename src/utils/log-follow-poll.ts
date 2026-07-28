import { nextDelayMs, sleep } from './deploy-watch-poll.js';
import { CoolifyApiError } from './errors.js';

export type LogFollowOutcome = {
  aggregate: string[];
  stoppedReason: 'idle' | 'timeout';
  pollCount: number;
  elapsedMs: number;
};

/** Suffix-overlap dedup: append only non-overlapping tail of incoming snapshot. */
export function appendDedupedLines(
  aggregate: string[],
  incoming: string[],
): string[] {
  if (!Array.isArray(incoming) || incoming.length === 0) {
    return aggregate;
  }
  if (aggregate.length === 0) {
    return [...incoming];
  }

  const maxOverlap = Math.min(aggregate.length, incoming.length);
  for (let overlap = maxOverlap; overlap > 0; overlap--) {
    let matches = true;
    for (let i = 0; i < overlap; i++) {
      if (aggregate[aggregate.length - overlap + i] !== incoming[i]) {
        matches = false;
        break;
      }
    }
    if (matches) {
      return [...aggregate, ...incoming.slice(overlap)];
    }
  }
  return [...aggregate, ...incoming];
}

function remainingMs(startTime: number, timeoutMs: number): number {
  return timeoutMs - (Date.now() - startTime);
}

export async function followApplicationLogs(options: {
  fetchSnapshot: () => Promise<string[]>;
  timeoutMs: number;
  idleTimeoutMs: number;
  minIntervalMs: number;
  maxIntervalMs: number;
  random?: () => number;
  isRetryableRateLimit?: (err: unknown) => { retryAfterMs?: number } | null;
}): Promise<LogFollowOutcome> {
  const random = options.random ?? Math.random;
  const isRetryableRateLimit = options.isRetryableRateLimit;

  const startTime = Date.now();
  let aggregate: string[] = [];
  let pollCount = 0;
  let lastNewLineTime: number | null = null;
  let attempt = 0;

  const timeoutOutcome = (elapsedMs: number): LogFollowOutcome => ({
    aggregate,
    stoppedReason: 'timeout',
    pollCount,
    elapsedMs,
  });

  while (true) {
    try {
      const snapshot = await options.fetchSnapshot();
      pollCount++;
      const newAggregate = appendDedupedLines(aggregate, snapshot);
      const hadNewLines = newAggregate.length > aggregate.length;
      aggregate = newAggregate;

      if (pollCount === 1 && !hadNewLines && lastNewLineTime === null) {
        lastNewLineTime = Date.now();
      } else if (hadNewLines) {
        lastNewLineTime = Date.now();
      } else if (
        lastNewLineTime !== null &&
        Date.now() - lastNewLineTime >= options.idleTimeoutMs
      ) {
        return {
          aggregate,
          stoppedReason: 'idle',
          pollCount,
          elapsedMs: Date.now() - startTime,
        };
      }
    } catch (err) {
      const rateLimitInfo = isRetryableRateLimit?.(err);
      if (rateLimitInfo !== null && rateLimitInfo !== undefined) {
        if (Date.now() - startTime >= options.timeoutMs) {
          return timeoutOutcome(Date.now() - startTime);
        }

        const remaining = remainingMs(startTime, options.timeoutMs);
        if (remaining <= 0) {
          return timeoutOutcome(Date.now() - startTime);
        }

        const backoffMs = nextDelayMs(
          attempt,
          options.minIntervalMs,
          options.maxIntervalMs,
          random,
        );
        const computedDelay = Math.max(backoffMs, rateLimitInfo.retryAfterMs ?? 0);
        const delayMs = Math.min(computedDelay, remaining);
        await sleep(delayMs);
        attempt++;
        continue;
      }

      if (err instanceof CoolifyApiError) {
        throw new CoolifyApiError({
          ...err.envelope,
          data: {
            ...err.envelope.data,
            logs_lines: aggregate,
            poll_count: pollCount,
          },
        });
      }
      throw err;
    }

    if (Date.now() - startTime >= options.timeoutMs) {
      return timeoutOutcome(Date.now() - startTime);
    }

    const remaining = remainingMs(startTime, options.timeoutMs);
    if (remaining <= 0) {
      return timeoutOutcome(Date.now() - startTime);
    }

    const delayMs = Math.min(
      nextDelayMs(
        attempt,
        options.minIntervalMs,
        options.maxIntervalMs,
        random,
      ),
      remaining,
    );
    await sleep(delayMs);
    attempt++;
  }
}
