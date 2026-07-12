export const TERMINAL_DEPLOYMENT_STATES = [
  'finished',
  'failed',
  'cancelled-by-user',
] as const;

export const DEFAULT_POLL_INTERVAL_MS = 3000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isTerminalStatus(status: unknown): boolean {
  return (
    typeof status === 'string' &&
    (TERMINAL_DEPLOYMENT_STATES as readonly string[]).includes(status)
  );
}

export async function pollDeploymentUntilTerminal(
  fetcher: () => Promise<Record<string, unknown>>,
  timeoutMs: number,
  intervalMs = DEFAULT_POLL_INTERVAL_MS,
): Promise<Record<string, unknown>> {
  const startTime = Date.now();
  let deployment: Record<string, unknown> = {};

  while (true) {
    deployment = await fetcher();

    if (isTerminalStatus(deployment.status)) {
      return deployment;
    }

    if (Date.now() - startTime >= timeoutMs) {
      return { ...deployment, status: 'timeout' };
    }

    await sleep(intervalMs);
  }
}
