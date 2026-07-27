# Phase 25: Application Log Follow - Pattern Map

**Mapped:** 2026-07-28
**Files analyzed:** 13 new/modified files
**Analogs found:** 12 / 13

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/utils/log-follow-poll.ts` | utility | streaming (bounded poll loop) | `src/utils/deploy-watch-poll.ts` | exact |
| `src/utils/log-follow-poll.test.ts` | test | streaming | `src/utils/deploy-watch-poll.test.ts` | exact |
| `src/utils/deploy-watch-poll.ts` | utility | streaming | self (export `nextDelayMs`/`sleep`) | exact |
| `src/mcp/tools/application.ts` | route/handler | streaming + request-response | `src/mcp/tools/deployment.ts` (`handleDeploymentWatch`) + existing `handleApplicationLogs` | exact |
| `src/mcp/tools/application.test.ts` | test | streaming + request-response | `src/mcp/tools/deployment.test.ts` + existing runtime golden tests | exact |
| `src/mcp/capabilities.ts` | config | request-response | `application_logs` entry in same file | exact |
| `src/utils/errors.ts` | utility | request-response | `COOLIFY_WATCH_TIMEOUT` in same file | exact |
| `src/mcp/tools/system.test.ts` | test | request-response | existing `capabilities` describe block | exact |
| `tests/integration/logs-service-db-flow.test.ts` | test | request-response | same file `application.logs` describe | role-match |
| `docs/coverage-map.yaml` | config | — | `application.logs` row in same file | exact |
| `docs/COVERAGE.md` | config | — | `application.logs` row in same file | exact |
| `README.md` | config | — | capability callout ~L732 | role-match |
| `README.de.md` | config | — | capability callout ~L732 | role-match |

## Pattern Assignments

### `src/utils/log-follow-poll.ts` (utility, streaming)

**Analog:** `src/utils/deploy-watch-poll.ts`

**Imports pattern** (lines 1-1):

```typescript
import { TERMINAL_DEPLOYMENT_STATES } from './deploy-poll.js';
```

New file should import exported interval helpers from `./deploy-watch-poll.js` (not `deploy-poll.js`).

**Core poll loop pattern** (lines 40-113):

```typescript
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
  // ...
  while (true) {
    try {
      deployment = await fetcher();
      hadSuccessfulFetch = true;
    } catch (err) {
      const rateLimitInfo = isRetryableRateLimit?.(err);
      if (rateLimitInfo !== null && rateLimitInfo !== undefined) {
        // remaining clamp + backoff + continue
      }
      throw err;
    }
    // terminal check differs — log follow uses idle timer + dedup instead
    const delayMs = Math.min(
      nextDelayMs(attempt, minIntervalMs, maxIntervalMs, random),
      remaining,
    );
    await sleep(delayMs);
    attempt++;
  }
}
```

**Backoff math to reuse** (lines 25-34):

```typescript
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
```

**Outcome type pattern** — mirror discriminated union (lines 3-11), adapt kinds to `idle | timeout | api_error`:

```typescript
export type WatchPollOutcome =
  | { kind: 'terminal'; deployment: Record<string, unknown> }
  | {
      kind: 'timeout';
      deployment: Record<string, unknown>;
      elapsedMs: number;
      noSuccessfulFetch?: boolean;
    };
```

Log-follow should export `LogFollowOutcome` with `stoppedReason: 'idle' | 'timeout'`, `aggregate: string[]`, `pollCount`, `elapsedMs`.

**Dedup** — no codebase analog; implement suffix-overlap per RESEARCH.md Pattern 3 (planner discretion).

---

### `src/utils/log-follow-poll.test.ts` (test, streaming)

**Analog:** `src/utils/deploy-watch-poll.test.ts`

**Imports + fake timers** (lines 1-10):

```typescript
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

describe('pollDeploymentWithBackoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });
```

**Dynamic import pattern** (lines 12-13):

```typescript
const { pollDeploymentWithBackoff } = await import('./deploy-watch-poll.js');
```

Use same dynamic import for `log-follow-poll.js` to respect module isolation.

**Timeout test pattern** (lines 38-66):

```typescript
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
```

Add parallel tests: idle stop (no new lines for `idleTimeoutMs`), dedup overlap, 429 backoff continuation.

---

### `src/utils/deploy-watch-poll.ts` (utility refactor)

**Analog:** self — export only `nextDelayMs` and `sleep`; keep `pollDeploymentWithBackoff` unchanged.

**Export surface** (lines 16, 25-34):

```typescript
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function nextDelayMs(
  attempt: number,
  minIntervalMs: number,
  maxIntervalMs: number,
  random: () => number,
): number { /* ... */ }
```

Change to `export function nextDelayMs` and `export const sleep` (or `export { sleep }`). Do not alter watch loop semantics.

---

### `src/mcp/tools/application.ts` (route/handler, streaming + request-response)

**Analog (follow branch):** `src/mcp/tools/deployment.ts` `handleDeploymentWatch`
**Analog (one-shot branch):** existing `handleApplicationLogs` (lines 1431-1491)

**Schema — flat action + action-gated fields** (deployment.ts lines 63-137, 199-210):

```typescript
export const deploymentToolSchema = createFlatActionSchema(
  ['list', 'get', 'cancel', 'watch', 'logs'],
  {
    timeout: z.number().int().min(10).max(1800).default(300).optional()
      .describe('Watch timeout in seconds (default 300)'),
    min_interval: z.number().int().min(1).default(3).optional()
      .describe('Minimum poll interval in seconds (default 3)'),
    max_interval: z.number().int().min(1).default(30).optional()
      .describe('Maximum poll interval in seconds (default 30)'),
    // ...
  },
  {
    watch: [
      'deployment_uuid',
      'timeout',
      'min_interval',
      'max_interval',
      // ...
    ],
  },
  // extraRefine for min_interval <= max_interval when action === 'watch'
  {
    timeout: 300,
    min_interval: 3,
    max_interval: 30,
    // ...
  },
);
```

Extend `applicationActionSchema` shape with `follow`, `idle_timeout`, reuse existing flat `timeout`/`min_interval`/`max_interval`. Add to `logs` in `actionAllowedFields` (currently lines 451-462):

```typescript
logs: [
  'uuid',
  'name',
  'fqdn',
  'deployment_uuid',
  'offset',
  'lines',
  'max_chars',
  'format',
  'include_hidden',
  'type',
],
```

Add: `'follow', 'timeout', 'idle_timeout', 'min_interval', 'max_interval'`.

**Pass 6th arg `zodDefaultFields`** — `applicationActionSchema` currently omits it (closes line 776). Add as deployment does; **do not** set global `timeout: 120` if it would affect `deploy wait:true` — apply 120s default in handler when `follow:true` only (RESEARCH open Q2).

**superRefine for logs** (application.ts lines 662-686) — extend:

```typescript
if (data.action === 'logs') {
  const hasRuntimeId = !!(data.uuid || data.name || data.fqdn);
  // existing XOR runtime vs deployment_uuid ...
  if (data.follow === true && data.deployment_uuid) {
    ctx.addIssue({
      code: 'custom',
      message: 'follow:true is only supported for runtime logs (uuid|name|fqdn), not deployment_uuid build logs',
      params: { code: 'COOLIFY_422' },
    });
  }
}
```

Mirror same guard in standalone `applicationLogsSchema` (lines 155-207).

**One-shot path — OBS-03 golden, do not touch** (lines 1431-1491):

```typescript
async function handleApplicationLogs(
  parsed: LogsAction,
  env: EnvConfig,
): Promise<ApplicationLogsResult> {
  const lines = parsed.lines ?? 100;
  // ...
  if (parsed.deployment_uuid) {
    // build path unchanged
  }
  const uuid = await resolveAppMutationUuid(parsed, env);
  const raw = await fetchApplicationLogs(/* ... */);
  const allLines = sliceLogBlob(logsStr, lines, offset);
  const capped = capLogOutput(allLines.join('\n'), parsed.max_chars);
  return buildReadResponse({ uuid, logs_lines: cappedLines, /* ... */ }, /* ... */);
}
```

Branch at top: `if (parsed.follow === true) return handleApplicationLogsFollow(parsed, env);`

**Follow handler — mirror watch** (deployment.ts lines 389-447):

```typescript
function isRetryableRateLimit(err: unknown): { retryAfterMs?: number } | null {
  const envelope =
    err instanceof CoolifyApiError ? err.envelope : toStructuredError(err);
  if (envelope.httpStatus === 429) {
    const retryAfter = envelope.data?.retry_after;
    return { retryAfterMs: typeof retryAfter === 'number' ? retryAfter : undefined };
  }
  return null;
}

async function handleDeploymentWatch(/* ... */) {
  const outcome = await pollDeploymentWithBackoff(fetcher, {
    timeoutMs,
    minIntervalMs,
    maxIntervalMs,
    isRetryableRateLimit,
  });
  if (outcome.kind === 'timeout') {
    throw new CoolifyApiError({
      code: 'COOLIFY_WATCH_TIMEOUT',
      message: `Deployment watch timed out after ${elapsedSeconds}s — ${statusNote}.`,
      recoveryHints: RECOVERY_HINTS.COOLIFY_WATCH_TIMEOUT,
      data: { deployment: summary, timed_out: true, elapsed_seconds: elapsedSeconds },
    });
  }
}
```

Follow variant: call `followApplicationLogs`, `capLogOutput` on aggregate, idle → `buildReadResponse` with `stopped_reason: 'idle'`, timeout → `COOLIFY_LOG_FOLLOW_TIMEOUT` with partial `logs_lines` in `data`.

**Catalog string** (lines 289-294):

```typescript
export const applicationActionsCatalog =
  'Actions: get(uuid, format?, projection?, reveal?) · start(uuid) · stop(uuid) · restart(uuid) · deploy(uuid, force?) · ' +
  'logs(uuid, lines?) · create(source_type, server_uuid) · update(uuid) · delete(uuid, confirm) · delete_preview(uuid) · ' +
  // ...
```

Extend `logs(...)` token: `logs(uuid, lines?, follow?, timeout?, idle_timeout?, min_interval?, max_interval?)` + short capability note per D-04.

---

### `src/mcp/tools/application.test.ts` (test)

**Analog (flip follow rejection):** current test lines 1087-1096
**Analog (one-shot golden):** lines 1049-1064
**Analog (timeout dual-signal):** `deployment.test.ts` lines 524-570

**Current rejection test to flip** (lines 1087-1096):

```typescript
it('applicationLogsSchema rejects follow param with unrecognized_keys', () => {
  const result = applicationLogsSchema.safeParse({
    action: 'logs',
    uuid: 'x',
    follow: true,
  });
  expect(result.success).toBe(false);
  if (result.success) return;
  expect(result.error.issues[0]?.code).toBe('unrecognized_keys');
});
```

Replace with acceptance + handler behavior tests.

**One-shot regression golden** (lines 1049-1064):

```typescript
it('runtime logs default lines=100 when omitted', async () => {
  vi.mocked(fetchApplicationLogs).mockResolvedValue({ logs: 'a\nb' });
  await handleApplicationAction({ action: 'logs', uuid: 'app-uuid-1' }, testEnv);
  expect(fetchApplicationLogs).toHaveBeenCalledWith(
    testEnv.COOLIFY_URL,
    testEnv.COOLIFY_TOKEN,
    'app-uuid-1',
    100,
    testEnv.COOLIFY_VERIFY_SSL,
  );
});
```

Keep unchanged when `follow` absent — add explicit test that `follow: false` hits same call args.

**Dual-signal timeout pattern** (deployment.test.ts lines 524-565):

```typescript
it('returns dual-signal timeout with COOLIFY_WATCH_TIMEOUT', async () => {
  vi.useFakeTimers();
  try {
    const resultPromise = handleDeploymentAction({
      action: 'watch',
      deployment_uuid: 'dep-timeout',
      timeout: 10,
      min_interval: 1,
      max_interval: 1,
    }, testEnv);
    for (let i = 0; i < 12; i++) {
      await vi.advanceTimersByTimeAsync(1000);
    }
    const result = await resultPromise;
    expect(isDeploymentErrorResult(result)).toBe(true);
    expect(result.structuredContent.error.code).toBe('COOLIFY_WATCH_TIMEOUT');
    expect(errorData.timed_out).toBe(true);
  } finally {
    vi.useRealTimers();
  }
});
```

Mirror for `follow:true` → `COOLIFY_LOG_FOLLOW_TIMEOUT` + partial `logs_lines` in `error.data`.

---

### `src/mcp/capabilities.ts` (config)

**Analog:** `application_logs` entry (lines 1-6)

```typescript
export const COOLIFY_412_CAPABILITIES = {
  application_logs: {
    supported: true,
    coolify_min_version: '4.0.0',
    note: 'Runtime logs via application.logs + uuid (GET /applications/{uuid}/logs)',
  },
  // ...
} as const satisfies Record<
  string,
  { supported: boolean; coolify_min_version: string; note?: string }
>;
```

Add sibling:

```typescript
application_logs_follow: {
  supported: true,
  coolify_min_version: '4.1.2',
  note: 'Bounded runtime log follow via application.logs follow:true (MCP polling on GET /applications/{uuid}/logs)',
},
```

Surfaced automatically via `system.ts` line 188: `capabilities: COOLIFY_412_CAPABILITIES`.

---

### `src/utils/errors.ts` (utility)

**Analog:** `COOLIFY_WATCH_TIMEOUT` (lines 26, 137-140)

```typescript
export type CoolifyErrorCode =
  // ...
  | 'COOLIFY_WATCH_TIMEOUT'
  // add: | 'COOLIFY_LOG_FOLLOW_TIMEOUT'

export const RECOVERY_HINTS: Record<CoolifyErrorCode, string[]> = {
  COOLIFY_WATCH_TIMEOUT: [
    'Re-call deployment.watch with the same deployment_uuid to continue polling.',
    'Optionally increase timeout (seconds, max 1800) if the build typically runs longer than the default 300s.',
  ],
};
```

Add `COOLIFY_LOG_FOLLOW_TIMEOUT` with hints referencing `application.logs` + same app id + optional timeout increase (default 120s).

---

### `src/mcp/tools/system.test.ts` (test)

**Analog:** lines 139-169

```typescript
describe('capabilities', () => {
  const CAPABILITY_KEYS = [
    'application_logs',
    'deployment_logs',
    'deployment_watch',
    'deploy_watch',
  ] as const;

  it('system.version capabilities has exactly four D-03 keys', async () => {
    expect(Object.keys(result.capabilities ?? {}).sort()).toEqual(
      [...CAPABILITY_KEYS].sort(),
    );
  });
});
```

Update to five keys; add `'application_logs_follow'`; fix test title count.

---

### `tests/integration/logs-service-db-flow.test.ts` (test)

**Analog:** lines 186-193

```typescript
it('rejects follow:true per D-05', () => {
  const parsed = applicationActionSchema.safeParse({
    action: 'logs',
    uuid: 'x',
    follow: true,
  });
  expect(parsed.success).toBe(false);
});
```

Flip to `expect(parsed.success).toBe(true)` or rename + add handler integration test. Note: Phase 25 D-05 is idle/timeout semantics — rename test to avoid CONTEXT collision.

---

### `docs/coverage-map.yaml` + `docs/COVERAGE.md` (config)

**Analog:** `application.logs` row (coverage-map.yaml lines 18-20):

```yaml
  - action: application.logs
    client: [fetchApplicationLogs, fetchDeployment]
    openapi: ["GET /applications/{uuid}/logs", "GET /deployments/{uuid}"]
```

Add note column or inline comment: MCP-side `follow:true` bounded polling (OBS-02). Regen or hand-update COVERAGE.md row at line 30.

---

### `README.md` + `README.de.md` (config)

**Analog:** EN callout (README.md line 732):

```markdown
> **Capability discovery & build logs:** `system({ action: "version" })` returns `coolifyVersion` ... `capabilities` map ... For deployment **build** logs, prefer `deployment({ action: "logs", ... })`. The `application.logs` path with `deployment_uuid` still works for back-compat.
```

Append one sentence: runtime log follow via `application.logs` + `follow:true`; check `capabilities.application_logs_follow`. Mirror in DE README ~L732.

---

## Shared Patterns

### Flat action schema + action-gated params

**Source:** `src/mcp/tools/shared-read-params.ts` (lines 22-80)
**Apply to:** `applicationActionSchema` follow params

```typescript
export function createFlatActionSchema<...>(
  actions: [TAction, ...TAction[]],
  shape: TShape,
  actionAllowedFields: Record<TAction, (keyof TShape | 'action')[]>,
  actionRequiredFields?: Partial<Record<TAction, (keyof TShape)[]>>,
  extraRefine?: (...) => void,
  zodDefaultFields?: Partial<Record<keyof TShape & string, unknown>>,
) {
  // strict + per-action allowed field strip via zodDefaultFields phantom defaults
}
```

### 429 rate-limit retry in poll loops

**Source:** `src/mcp/tools/deployment.ts` (lines 389-398)
**Apply to:** `handleApplicationLogsFollow` → pass to `followApplicationLogs`

```typescript
function isRetryableRateLimit(err: unknown): { retryAfterMs?: number } | null {
  const envelope =
    err instanceof CoolifyApiError ? err.envelope : toStructuredError(err);
  if (envelope.httpStatus === 429) {
    const retryAfter = envelope.data?.retry_after;
    return { retryAfterMs: typeof retryAfter === 'number' ? retryAfter : undefined };
  }
  return null;
}
```

### Log aggregate capping

**Source:** `src/utils/log-helpers.ts` (lines 62-68)
**Apply to:** follow handler final response (D-12 — cap once on full aggregate)

```typescript
export function capLogOutput(
  logs: string,
  max_chars: number,
): { text: string; truncated: boolean } {
  const result = truncateAndGuard(logs, max_chars);
  return { text: result.text, truncated: result.truncated };
}
```

### Dual-signal timeout error envelope

**Source:** `src/mcp/tools/deployment.ts` (lines 432-447) + `deployment.test.ts` (lines 553-562)
**Apply to:** follow timeout only (idle = success per D-11)

```typescript
throw new CoolifyApiError({
  code: 'COOLIFY_WATCH_TIMEOUT',
  message: `Deployment watch timed out after ${elapsedSeconds}s — ${statusNote}.`,
  recoveryHints: RECOVERY_HINTS.COOLIFY_WATCH_TIMEOUT,
  data: { deployment: summary, timed_out: true, elapsed_seconds: elapsedSeconds },
});
```

### Soft capability flags (no Zod gate)

**Source:** `src/mcp/capabilities.ts` + Phase 24 D-04/D-19
**Apply to:** document in catalog/README; do **not** block `follow:true` in schema when capability unsupported.

### API error hard stop with partial data (D-07)

**Source:** `CoolifyApiError` throw from poll loop on non-429 errors
**Apply to:** `log-follow-poll.ts` — rethrow after attaching `aggregate` in handler catch or return `kind: 'api_error'` with partial lines.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| Suffix-overlap dedup helper | utility | transform | No existing log dedup util — implement inline in `log-follow-poll.ts` per RESEARCH Pattern 3 |

## Metadata

**Analog search scope:** `src/utils/`, `src/mcp/tools/`, `src/mcp/capabilities.ts`, `tests/integration/`, `docs/`
**Files scanned:** ~18
**Pattern extraction date:** 2026-07-28
