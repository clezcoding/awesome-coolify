import { TERMINAL_DEPLOYMENT_STATES } from './deploy-poll.js';

export type WatchPollOutcome =
  | { kind: 'terminal'; deployment: Record<string, unknown> }
  | { kind: 'timeout'; deployment: Record<string, unknown>; elapsedMs: number };

const DEFAULT_MIN_INTERVAL_MS = 3000;
const DEFAULT_MAX_INTERVAL_MS = 30000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isTerminalStatus(status: unknown): boolean {
  return (
    typeof status === 'string' &&
    (TERMINAL_DEPLOYMENT_STATES as readonly string[]).includes(status)
  );
}

function nextDelayMs(
  attempt: number,
  minIntervalMs: number,
  maxIntervalMs: number,
  random: () => number,
): number {
  const exp = Math.min(maxIntervalMs, minIntervalMs * 2 ** attempt);
  const equal = Math.floor(exp / 2 + random() * (exp / 2));
  return Math.max(minIntervalMs, Math.min(maxIntervalMs, equal));
}

export async function pollDeploymentWithBackoff(
  fetcher: () => Promise<Record<string, unknown>>,
  options: {
    timeoutMs: number;
    minIntervalMs?: number;
    maxIntervalMs?: number;
    random?: () => number;
    isRetryableRateLimit?: (err: unknown) => { retryAfterMs?: number } | null;
  },
): Promise<WatchPollOutcome> {
  const minIntervalMs = options.minIntervalMs ?? DEFAULT_MIN_INTERVAL_MS;
  const maxIntervalMs = options.maxIntervalMs ?? DEFAULT_MAX_INTERVAL_MS;
  const random = options.random ?? Math.random;
  const isRetryableRateLimit = options.isRetryableRateLimit;

  const startTime = Date.now();
  let deployment: Record<string, unknown> = {};
  let attempt = 0;

  while (true) {
    try {
      deployment = await fetcher();
    } catch (err) {
      const rateLimitInfo = isRetryableRateLimit?.(err);
      if (rateLimitInfo !== null && rateLimitInfo !== undefined) {
        if (Date.now() - startTime >= options.timeoutMs) {
          return {
            kind: 'timeout',
            deployment,
            elapsedMs: Date.now() - startTime,
          };
        }

        const backoffMs = nextDelayMs(attempt, minIntervalMs, maxIntervalMs, random);
        const delayMs = Math.max(backoffMs, rateLimitInfo.retryAfterMs ?? 0);
        await sleep(delayMs);
        attempt++;
        continue;
      }

      throw err;
    }

    if (isTerminalStatus(deployment.status)) {
      return { kind: 'terminal', deployment };
    }

    if (Date.now() - startTime >= options.timeoutMs) {
      return {
        kind: 'timeout',
        deployment,
        elapsedMs: Date.now() - startTime,
      };
    }

    const delayMs = nextDelayMs(attempt, minIntervalMs, maxIntervalMs, random);
    await sleep(delayMs);
    attempt++;
  }
}
