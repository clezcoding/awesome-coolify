# Phase 21: Deploy Watch - Pattern Map

**Mapped:** 2026-07-25
**Files analyzed:** 10
**Analogs found:** 10 / 10

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/utils/deploy-watch-poll.ts` | utility | request-response (poll loop) | `src/utils/deploy-poll.ts` | role-match |
| `src/utils/deploy-watch-poll.test.ts` | test | request-response | `src/utils/deploy-poll.test.ts` | exact |
| `src/mcp/tools/deployment.ts` | controller | request-response | `src/mcp/tools/deployment.ts` (+ wait wiring from `application.ts`) | exact |
| `src/mcp/tools/deployment.test.ts` | test | request-response | `src/mcp/tools/deployment.test.ts` | exact |
| `src/utils/errors.ts` | utility | transform | `src/utils/errors.ts` (409 `conflicts` attach) | exact |
| `src/utils/errors.test.ts` | test | transform | `src/utils/errors.test.ts` (409 suite) | exact |
| `src/mcp/prompts.ts` | config | request-response | `src/mcp/prompts.ts` (`deploy` prompt) | exact |
| `tests/mcp/prompts.test.ts` | test | request-response | `tests/mcp/prompts.test.ts` | exact |
| `README.md` | config | file-I/O (docs) | `README.md` (`deployment` table §) | exact |
| `README.de.md` | config | file-I/O (docs) | `README.de.md` (`deployment` table §) | exact |

**Do not modify:** `src/utils/deploy-poll.ts` / `src/utils/deploy-poll.test.ts` — regression gate for `wait:true` (D-03). Copy patterns only.

## Pattern Assignments

### `src/utils/deploy-watch-poll.ts` (utility, poll loop)

**Analog:** `src/utils/deploy-poll.ts` — reuse terminal set + sleep loop shape; **do not** overload or change fixed-interval behavior.

**Imports / terminal set** (lines 1–16):
```typescript
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
```

**Core poll loop (fixed interval — anti-pattern for watch timeout)** (lines 18–38):
```typescript
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
      return { ...deployment, status: 'timeout' }; // wait:true soft timeout — NOT for watch
    }

    await sleep(intervalMs);
  }
}
```

**Watch helper shape to implement** (from RESEARCH — new file):
```typescript
// NEW — src/utils/deploy-watch-poll.ts
import { TERMINAL_DEPLOYMENT_STATES } from './deploy-poll.js';

export type WatchPollOutcome =
  | { kind: 'terminal'; deployment: Record<string, unknown> }
  | { kind: 'timeout'; deployment: Record<string, unknown>; elapsedMs: number };

export async function pollDeploymentWithBackoff(
  fetcher: () => Promise<Record<string, unknown>>,
  options: {
    timeoutMs: number;
    minIntervalMs?: number; // default 3000
    maxIntervalMs?: number; // default 30000
    random?: () => number;  // default Math.random — inject in tests
    isRetryableRateLimit?: (err: unknown) => { retryAfterMs?: number } | null;
  },
): Promise<WatchPollOutcome> { /* Equal Jitter + 429 continue */ }
```

**Copy:**
- Import/share `TERMINAL_DEPLOYMENT_STATES` from `deploy-poll.ts` (single source of truth).
- Keep `sleep` local or shared privately — same `setTimeout` Promise pattern.
- Return discriminated `WatchPollOutcome` — **never** synthesize `status: "timeout"` on the deployment object (D-09).

**Do not copy:** Soft-success timeout return shape from `pollDeploymentUntilTerminal`.

---

### `src/utils/deploy-watch-poll.test.ts` (test, poll loop)

**Analog:** `src/utils/deploy-poll.test.ts`

**Fake-timer scaffold** (lines 24–31, 66–85):
```typescript
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

describe('pollDeploymentUntilTerminal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
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
});
```

**Timeout soft-body assertion to invert for watch** (lines 88–105):
```typescript
it('returns status timeout when elapsed >= timeoutMs without terminal', async () => {
  // wait:true asserts status === 'timeout' on deployment object
  // watch tests must assert outcome.kind === 'timeout' AND deployment.status !== 'timeout'
});
```

**Copy:**
- `vi.useFakeTimers` / `advanceTimersByTimeAsync` loop.
- Injectable `random: () => number` for deterministic Equal Jitter bounds.
- Separate suites: terminal exit, timeout outcome, 429 continue + Retry-After, delay ∈ `[min,max]`.

---

### `src/mcp/tools/deployment.ts` (controller, request-response)

**Analog (primary):** same file — extend action catalog/schema/switch.  
**Analog (wait wiring — contrast):** `src/mcp/tools/application.ts` lines 1308–1428.

**Imports pattern** (deployment.ts lines 1–31):
```typescript
import * as z from 'zod/v4';
import type { EnvConfig } from '../config/env.js';
import {
  cancelDeployment,
  fetchAppDeployments,
  fetchDeployment,
} from '../../api/client.js';
import {
  projectDeploymentFull,
  projectDeploymentSummary,
  resolveProjection,
  type DeploymentSummary,
} from '../../utils/projections.js';
import {
  CoolifyApiError,
  toStructuredError,
  wrapMcpError,
  type McpErrorResult,
} from '../../utils/errors.js';
import {
  createFlatActionSchema,
  parseWithInstanceRouting,
  rejectTableFormatOnFullProjection,
  resolveRoutingEnv,
  sharedReadParamsFlatShape,
} from './shared-read-params.js';
```

**Catalog + flat schema** (lines 33–91) — add `'watch'`:
```typescript
export const deploymentActionsCatalog =
  'Actions: list(...) · get(...) · cancel(...) · watch(deployment_uuid, timeout?, min_interval?, max_interval?, include_logs?, format?, max_chars?, instance?)';

export const deploymentToolSchema = createFlatActionSchema(
  ['list', 'get', 'cancel', 'watch'],
  {
    // existing fields +
    timeout: z.number().int().min(10).max(1800).optional()
      .describe('Watch timeout in seconds (default 300)'),
    min_interval: z.number().int().min(1).optional()
      .describe('Min poll interval seconds (default 3)'),
    max_interval: z.number().int().min(1).optional()
      .describe('Max poll interval seconds (default 30)'),
    include_logs: z.boolean().optional()
      .describe('Attach capped logs (default false)'),
    ...sharedReadParamsFlatShape,
  },
  {
    // ...
    watch: ['deployment_uuid', 'timeout', 'min_interval', 'max_interval', 'include_logs', 'format', 'max_chars'],
  },
  {
    watch: ['deployment_uuid'],
  },
  (data, ctx) => {
    // existing list per_page refine +
    // min_interval <= max_interval when both set
  },
);
```

**Timeout Zod bounds analog** (`application.ts` lines 327–334):
```typescript
timeout: z
  .number()
  .int()
  .min(10)
  .max(1800)
  .optional()
  .describe('Wait-mode timeout in seconds'),
```

**Fetcher wiring analog** (`application.ts` lines 1400–1412) — reuse for watch, swap poller:
```typescript
const timeoutMs = parsed.timeout * 1000;
const fetcher = async () => {
  const dep = await fetchDeployment(
    env.COOLIFY_URL,
    env.COOLIFY_TOKEN,
    deploymentUuid,
    env.COOLIFY_VERIFY_SSL,
  );
  return (isRecord(dep) ? dep : {}) as Record<string, unknown>;
};

const terminal = await pollDeploymentUntilTerminal(fetcher, timeoutMs);
// WATCH: use pollDeploymentWithBackoff instead; default timeout = 300 when omitted
```

**Summary projection** (`deployment.ts` handleDeploymentGet lines 144–172 + `projections.ts` 328–337):
```typescript
const data =
  projection === 'full'
    ? projectDeploymentFull(rawRecord, parsed.max_chars, parsed.reveal)
    : projectDeploymentSummary(rawRecord);

return buildReadResponse(data, {
  format: parsed.format,
  max_chars: parsed.max_chars,
});
```

For watch success (`finished`): `projectDeploymentSummary`; when `include_logs: true`, attach capped logs via `projectDeploymentFull` / `truncateLogs` (D-04/D-12).

**Handler switch + wrapMcpError** (lines 223–246):
```typescript
export async function handleDeploymentAction(
  args: DeploymentAction,
  env: EnvConfig,
): Promise<DeploymentActionResult> {
  try {
    const parsed = parseWithInstanceRouting(deploymentToolSchema, args);
    const routingEnv = resolveRoutingEnv(env, parsed.instance);

    switch (parsed.action) {
      case 'list':
        return await handleDeploymentList(parsed, routingEnv);
      case 'get':
        return await handleDeploymentGet(parsed, routingEnv);
      case 'cancel':
        return await handleDeploymentCancel(parsed, routingEnv);
      // ADD: case 'watch': return await handleDeploymentWatch(parsed, routingEnv);
      default: {
        const _exhaustive: never = parsed;
        throw new Error(`Unknown deployment action: ${String(_exhaustive)}`);
      }
    }
  } catch (error) {
    return wrapMcpError(error);
  }
}
```

**Dual-signal error throw pattern** (`application.ts` lines 999–1007):
```typescript
throw new CoolifyApiError({
  code: 'COOLIFY_CONFIRM_REQUIRED',
  message: `Action 'delete' on application '${uuid}' requires explicit confirmation.`,
  recoveryHints: RECOVERY_HINTS.COOLIFY_CONFIRM_REQUIRED,
  data: {
    action: 'delete',
    uuid,
  },
});
```

Watch should throw (caught by `wrapMcpError`) for:
| Outcome | Code | `data` |
|---------|------|--------|
| Timeout | `COOLIFY_WATCH_TIMEOUT` | `{ deployment, timed_out: true, elapsed_seconds }` |
| Failed | `COOLIFY_DEPLOYMENT_FAILED` | `{ deployment }` |
| Cancelled | `COOLIFY_DEPLOYMENT_CANCELLED` | `{ deployment }` |

Recovery hints for timeout must include re-call `deployment.watch` with same `deployment_uuid` (D-10).

**Anti-pattern from wait path** (`application.ts` 1414–1422) — soft OK on timeout:
```typescript
return buildReadResponse(
  {
    ...summary,
    ...(summary.status === 'timeout'
      ? {
          hint: `Re-call deployment.get with deployment_uuid=${deploymentUuid} to continue polling`,
        }
      : {}),
  },
  { format: parsed.format, max_chars: parsed.max_chars },
);
```
Watch must **not** return `ok: true` on timeout or failed/cancelled (D-09, D-11).

---

### `src/mcp/tools/deployment.test.ts` (test, request-response)

**Analog:** same file.

**Mock + env fixture** (lines 1–27):
```typescript
vi.mock('../../api/client.js', () => ({
  fetchAppDeployments: vi.fn(),
  fetchDeployment: vi.fn(),
  cancelDeployment: vi.fn(),
}));

const testEnv: EnvConfig = {
  COOLIFY_URL: 'https://coolify.example.com',
  COOLIFY_TOKEN: 'test-token-value-xyz',
  COOLIFY_VERIFY_SSL: true,
  COOLIFY_MCP_LOG: 'info',
};
```

**Schema accept/reject** (lines 64–97):
```typescript
describe('deploymentToolSchema', () => {
  it('accepts get and cancel actions', () => {
    expect(
      deploymentToolSchema.safeParse({
        action: 'get',
        deployment_uuid: 'dep-uuid-1',
      }).success,
    ).toBe(true);
  });
});
```

**Error result guard** (lines 226–230):
```typescript
expect(isDeploymentErrorResult(result)).toBe(true);
if (!isDeploymentErrorResult(result)) return;
expect(result.structuredContent.error.code).toBe('COOLIFY_422');
```

**Copy for watch cases:**
- Schema: defaults (timeout 300 / min 3 / max 30 / include_logs false); reject `min_interval > max_interval`; reject `min_interval < 1`.
- Handler: `finished` → `ok` + summary; timeout → `isError` + `COOLIFY_WATCH_TIMEOUT` + snapshot in `error.data`; `failed`/`cancelled-by-user` → matching codes + clear message.
- Mock `fetchDeployment` sequence; optionally mock `pollDeploymentWithBackoff` if testing handler in isolation.

---

### `src/utils/errors.ts` (utility, transform)

**Analog:** same file — extend codes + attach Retry-After like 409 conflicts.

**Error code union + hints** (lines 4–24, 44–127) — add:
```typescript
| 'COOLIFY_WATCH_TIMEOUT'
| 'COOLIFY_DEPLOYMENT_FAILED'
| 'COOLIFY_DEPLOYMENT_CANCELLED'
```

And matching `RECOVERY_HINTS` entries (timeout → re-call `deployment.watch`; failed → surface logs via `deployment.get` / `include_logs`).

**409 data-attach pattern to mirror for 429** (lines 333–350):
```typescript
if (typeof status === 'number') {
  const envelope = mapApiError(error, status, coolifyMessage, isCloud);
  const responseData = fetchError.response?._data ?? fetchError.data;
  const conflicts =
    status === 409 ? extractConflicts(responseData) : undefined;

  if (conflicts !== undefined) {
    return injectStaleManifestHints({
      ...envelope,
      data: { ...envelope.data, conflicts },
      recoveryHints: [/* ... */],
    });
  }

  return injectStaleManifestHints(envelope);
}
```

**Watch 429 enhancement:** when `status === 429`, parse `response.headers.get('retry-after')` into `data.retry_after` (seconds or HTTP-date → ms). Note: `statusToCode` currently maps unknown statuses (incl. 429) to `COOLIFY_500` (lines 142–156) — watch poller must key off `httpStatus === 429` / `data.retry_after`, not treat as hard abort (D-08).

**MCP dual-signal envelope** (lines 356–396):
```typescript
export interface McpErrorResult {
  isError: true;
  content: [{ type: 'text'; text: string }];
  structuredContent: { ok: false; error: CoolifyErrorEnvelope };
}

export function wrapMcpError(error: unknown): McpErrorResult {
  const raw = toStructuredError(error);
  // redact + return isError: true
}
```

Throw `CoolifyApiError` from watch handler; let outer `wrapMcpError` produce the dual signal.

---

### `src/utils/errors.test.ts` (test, transform)

**Analog:** `describe('409 conflicts passthrough')` (lines 226–248):
```typescript
it('toStructuredError attaches conflicts array from response._data on HTTP 409', () => {
  const fetchError = {
    response: {
      status: 409,
      _data: { message: 'Domain conflict', conflicts },
    },
  };
  const envelope = toStructuredError(fetchError);
  expect(envelope.code).toBe('COOLIFY_409');
  expect(envelope.data?.conflicts).toEqual(conflicts);
});
```

**Copy for 429:** mock `response: { status: 429, headers: { get: (h) => ... }, _data: ... }` and assert `data.retry_after` / ms conversion.

---

### `src/mcp/prompts.ts` (config, prompt)

**Analog:** same file — `deploy` prompt (lines 18–64).

**Current forward-ref to replace** (lines 46–59):
```typescript
content: `Deploy application workflow:

1. Resolve the target application UUID...

2. Trigger deployment via \`application.deploy\`:
   application({ action: "deploy", uuid: "${uuidValue}", force: ${parsedForce}, wait: false${instanceSuffix} })

3. Capture the returned \`deployment_uuid\` from the response.

4. Poll deployment progress with \`deployment.get\` until status is terminal (\`finished\` or \`failed\`):
   deployment({ action: "get", deployment_uuid: "<deployment_uuid>"${instanceSuffix} })
   Future (Phase 21): \`deployment.watch\` will replace polling — do not call watch until it exists.

5. Report the final deployment status and any relevant logs hint to the user.`,
```

**Target shape** (D-14 / RESEARCH — keep Phase 19 short-prompt style, helpers `manifestSoftNote` / `optionalInstanceSuffix`):
```text
1. application({ action: "deploy", uuid, wait: false }) → capture deployment_uuid
2. deployment({ action: "watch", deployment_uuid, timeout?: 300 })
3. On watch timeout error: re-call deployment.watch with same uuid
4. On failed/cancelled error: surface clear error to user — do not treat as success
Note: application.deploy wait:true is legacy; prefer watch.
```

Keep `registerPrompt('deploy', …)` structure and force/instance interpolation.

---

### `tests/mcp/prompts.test.ts` (test, prompt)

**Analog:** same file lines 48–62 — **invert** get-before-watch ordering:

```typescript
it('deploy prompt leads with application.deploy + deployment.get and notes watch as future', async () => {
  // REPLACE with: watch is primary; wait:true marked legacy; no "Future (Phase 21)"
  expect(content).toContain('application.deploy');
  expect(content).toContain('deployment.watch');
  expect(content.indexOf('deployment.get')).toBeLessThan(
    content.indexOf('deployment.watch'),
  );
});
```

**New expectations:**
- `deployment.watch` appears as primary poll step.
- Timeout re-watch / failed messaging present.
- `wait: true` / legacy note present.
- Remove assertion that `deployment.get` precedes `deployment.watch`.

---

### `README.md` / `README.de.md` (config, docs)

**Analog:** deployment table sections.

**EN** (`README.md` lines 384–390):
```markdown
### 📈 `deployment` — deploy tracking

| Action | Purpose |
|--------|---------|
| `list` | Deployments for a given application |
| `get` | Status, commit, and timing details for one deployment |
| `cancel` | Cancel an in-flight deployment cleanly |
```

**DE** (`README.de.md` lines 384–390) — parallel table; add `watch` row in both.

**Also update callout examples** that push `wait: true` as the happy path (`README.md` lines 99, 330, 644; same in DE) — mark `wait:true` legacy / recommend `deployment.watch` (D-15). Short Watch section: timeout default 300s, backoff band, timeout → re-watch, failed/cancelled → clear error (D-13).

---

## Shared Patterns

### Flat action schema + soft instance routing
**Source:** `src/mcp/tools/shared-read-params.ts` (`createFlatActionSchema`, `parseWithInstanceRouting`, `resolveRoutingEnv`)  
**Apply to:** `deployment.ts` watch action  
```typescript
const parsed = parseWithInstanceRouting(deploymentToolSchema, args);
const routingEnv = resolveRoutingEnv(env, parsed.instance);
```

### Structured MCP errors (`isError` dual-signal)
**Source:** `src/utils/errors.ts` `CoolifyApiError` + `wrapMcpError`  
**Apply to:** watch timeout, failed, cancelled  
```typescript
throw new CoolifyApiError({
  code: 'COOLIFY_WATCH_TIMEOUT', // or FAILED / CANCELLED
  message: /* clear user-facing text */,
  recoveryHints: RECOVERY_HINTS.COOLIFY_WATCH_TIMEOUT,
  data: { deployment: summary, timed_out: true, elapsed_seconds },
});
// outer handleDeploymentAction catch → wrapMcpError(error)
```

### Summary projection + capped logs
**Source:** `src/utils/projections.ts` `projectDeploymentSummary` / `projectDeploymentFull` / `truncateLogs`  
**Apply to:** watch success payload; optional `include_logs`  
```typescript
export function projectDeploymentSummary(
  raw: Record<string, unknown>,
): DeploymentSummary {
  return {
    deployment_uuid: String(raw.deployment_uuid ?? raw.id ?? ''),
    commit: String(raw.git_commit_sha ?? raw.commit ?? ''),
    status: String(raw.status ?? 'unknown'),
    created_at: String(raw.created_at ?? ''),
    finished_at: String(raw.finished_at ?? raw.updated_at ?? ''),
  };
}
```

### Terminal deployment states (shared constant)
**Source:** `src/utils/deploy-poll.ts` `TERMINAL_DEPLOYMENT_STATES`  
**Apply to:** watch poller — import, do not duplicate list

### Vitest fake timers for poll helpers
**Source:** `src/utils/deploy-poll.test.ts`  
**Apply to:** `deploy-watch-poll.test.ts` (+ injectable RNG)

### Timeout seconds UX (agent-facing)
**Source:** `src/mcp/tools/application.ts` wait `timeout` Zod bounds  
**Apply to:** watch `timeout` / convert `* 1000` inside helper; defaults differ (watch default **300**, wait keeps its own)

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| — | — | — | All phase files have close analogs. Greenfield algorithm only: Equal Jitter + 429 continue inside new helper (formula from RESEARCH/AWS Equal Jitter). |

## Anti-Patterns (planner must not copy)

| Anti-pattern | Source | Why |
|--------------|--------|-----|
| Soft `status: "timeout"` OK body | `deploy-poll.ts` / `application.ts` wait path | Violates D-09 dual-signal |
| Quiet OK on `failed` / `cancelled-by-user` | wait path returns summary as success | Violates D-11 |
| Overload `pollDeploymentUntilTerminal` with backoff | would edit `deploy-poll.ts` | Violates D-03 |
| Prompt "Future (Phase 21)… do not call watch" | `prompts.ts` line 57 | Stale after this phase |
| Hard abort on first 429 / map only to COOLIFY_500 | `errors.ts` `statusToCode` default | Violates D-08 |

## Metadata

**Analog search scope:** `src/utils/`, `src/mcp/tools/`, `src/mcp/prompts.ts`, `tests/mcp/`, `README.md`, `README.de.md`, `.cursor/skills/spike-findings-awesome-coolify/`  
**Files scanned:** ~15 primary + targeted greps  
**Pattern extraction date:** 2026-07-25
