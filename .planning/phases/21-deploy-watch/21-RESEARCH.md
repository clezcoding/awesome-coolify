# Phase 21: Deploy Watch - Research

**Researched:** 2026-07-25
**Domain:** MCP tool action + bounded deployment polling (Coolify 4.1.x)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Watch Surface
- **D-01:** Implement `deployment.watch` as an action on the existing `deployment` MCP tool only (not a new top-level tool; not on `application`).
- **D-02:** Keep `application.deploy wait:true` for backward compatibility. Docs and the `deploy` prompt steer agents to `watch` as the recommended path.
- **D-03:** Add a **new** backoff/jitter poll helper used only by `watch`. Leave the existing fixed-interval `pollDeploymentUntilTerminal` (3s) for `wait:true` unchanged.
- **D-04:** Optional `include_logs?` on `watch`, **default `false`**. When true, attach capped logs; otherwise status/summary only with hint to `deployment.get` if needed.

#### Polling Policy
- **D-05:** Default timeout **300 seconds** when the agent omits `timeout`.
- **D-06:** Interval band: start **3s**, exponential backoff **+ jitter**, cap **30s**.
- **D-07:** Agent-visible params: `timeout?`, `min_interval?`, `max_interval?` (plus required `deployment_uuid` / routing fields per existing patterns). Backoff math otherwise internal.
- **D-08:** On HTTP **429**, honor `Retry-After` when present; otherwise continue the backoff schedule (no immediate hard abort solely because of 429).

#### Timeout & Recovery Response
- **D-09:** On timeout: return a **soft body** (last known deployment snapshot) **and** an **error flag** (dual signal — not silent success).
- **D-10:** Resume guidance: re-call `deployment.watch` with the same `deployment_uuid` (optional adjusted `timeout`).
- **D-11:** Terminal `finished` → normal OK with summary projection. Terminal `failed` and `cancelled-by-user` → **clear error message + user-facing output** (not a quiet OK with buried `status`).
- **D-12:** Success payload uses the existing **summary** projection; logs only when `include_logs` is true.

#### Documentation (WATCH-02)
- **D-13:** In this phase: sharpen MCP prompt `deploy` **and** add a short Watch section to README.md + README.de.md.
- **D-14:** Prompt depth: **2–4 concrete steps** — deploy → watch → on timeout re-watch → on fail surface clear error output (stay within Phase 19 short-prompt style; no long playbook).
- **D-15:** Document `wait:true` as legacy / back-compat; recommend `watch`.
- **D-16:** IDE skill packs deferred to Phase 22; those skills **must** document `deployment.watch` (timeout, non-blocking-forever rule, recovery) per SKILL-02.

### Claude's Discretion
- Exact backoff formula / jitter implementation details within D-06.
- Exact MCP error code / envelope fields for timeout dual-signal (D-09) and failed/cancelled user messaging (D-11), as long as both are unambiguous to agents.
- Exact README section placement and German/English wording.
- How Phase 22 skill packs structure watch docs (D-16 only requires that they cover it).

### Deferred Ideas (OUT OF SCOPE)
- Full IDE skill packs (Cursor / Claude Code / Codex) documenting watch — Phase 22 (SKILL-01/SKILL-02)
- Upgrading `application.deploy wait:true` to share the backoff helper — explicitly rejected for this phase (D-03); revisit only if a future phase wants policy unification
- Incremental log streaming always-on during watch — rejected; optional `include_logs` only (D-04)
- Custom Skills pro IDE für Coolify → Phase 22 (SKILL-*)
- Lokale Projekt-Manifest-Datei für Coolify-Metadaten → already covered in v3.0 / Phase 17
- Standard-Setup Tool für neue Coolify-Projekte → Phase 22 (SETUP-*)
- Integrate official Coolify OpenAPI specs → Phase 23 (OAPI-*)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WATCH-01 | Agent can call `deployment.watch` to poll a deployment until terminal status with backoff and bounded timeout | New watch-only poll helper + `deployment` action; defaults timeout=300s, min_interval=3s, max_interval=30s; 429 continues with Retry-After; dual-signal timeout; failed/cancelled → isError |
| WATCH-02 | Skill and/or prompt documents watch usage (non-blocking forever; timeout/recovery guidance) | Update `deploy` prompt (2–4 steps); README.md + README.de.md Watch section; IDE skills deferred to Phase 22 but D-16 obligates coverage there |
</phase_requirements>

## Summary

Phase 21 adds `deployment.watch` on the existing `deployment` MCP tool. The action polls Coolify `GET /deployments/{uuid}` until a terminal status (`finished` | `failed` | `cancelled-by-user`) or a bounded timeout elapses. Unlike `application.deploy wait:true` (fixed 3s interval, soft success with synthetic `status: "timeout"`), watch uses a **new** exponential-backoff + jitter helper, defaults timeout to **300s**, and returns a **dual-signal** on timeout (`isError: true` + last snapshot in `error.data`). Failed/cancelled terminals also surface as tool execution errors with clear user-facing text — not quiet OK JSON.

No new npm packages. Reuse `fetchDeployment`, `projectDeploymentSummary` / capped logs, flat Zod + `actionsCatalog`, `wrapMcpError`, and Vitest fake-timer patterns from `deploy-poll.test.ts`. Documentation closes WATCH-02 via the `deploy` prompt and bilingual README; IDE skill packs stay Phase 22.

**Primary recommendation:** Add `src/utils/deploy-watch-poll.ts` (Equal-Jitter clamped to `[min_interval, max_interval]`), wire `watch` into `deployment.ts`, map timeout/failed/cancelled through `McpErrorResult` with new error codes, preserve `Retry-After` on 429 in the error path, then update prompt + READMEs.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `deployment.watch` MCP action | API / Backend (MCP server process) | — | Tool handler owns poll loop; Coolify is remote |
| Exponential backoff + jitter schedule | API / Backend | — | Server-side sleep between `fetchDeployment` calls |
| HTTP 429 / Retry-After handling | API / Backend (client + watch poller) | — | ofetch retries 429 but does not parse Retry-After; watch must not hard-abort |
| Terminal status classification | API / Backend | — | Same terminal set as `deploy-poll.ts` |
| Dual-signal timeout / fail envelopes | API / Backend → Browser / Client (agent) | — | MCP `isError` + `structuredContent.error` for LLM self-correction |
| Prompt `deploy` guidance | Frontend Server (MCP prompts) | Browser / Client | Short step text steers agent tool calls |
| README Watch docs | CDN / Static (repo docs) | — | Human/agent-readable EN/DE |
| IDE skill packs | — | Deferred Phase 22 | D-16 / SKILL-02 |

## Project Constraints (from .cursor/rules/)

| Directive | Implication for this phase |
|-----------|----------------------------|
| Spike findings skill (`spike-findings-awesome-coolify`) | Coolify 4.1.x only; action-based tools; no stub tools; deploy returns `deployment_uuid`; poll until terminal; logs inline on deployment object |
| GSD ship labels | After `/gsd-ship` / `gh pr create`, run `./scripts/gsd-ship-post.sh <pr>` — no `[ci skip]` on PR tip |
| Caveman response style | Planning/research docs stay normal English; code/commits normal |
| Graphify | Knowledge graph optional; GSD graphify currently disabled — do not block on it |
| Context7 / wigolo for library & web docs | Used for MCP `isError`, ofetch retry, AWS backoff guidance |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@modelcontextprotocol/sdk` | 1.29.0 (installed) | MCP tool/prompt registration, `CallToolResult.isError` | Already used for all tools [VERIFIED: npm registry / package.json] |
| `zod` | 4.4.3 (installed) | Flat action schema + refine for `watch` params | Phase 19 flat-schema pattern [VERIFIED: npm registry / package.json] |
| `ofetch` | 1.5.1 (installed) | Coolify REST client (`fetchDeployment`) | Existing client; retries 429/5xx [VERIFIED: npm registry / package.json] |
| `vitest` | 4.1.10 (installed) | Unit tests with `vi.useFakeTimers` | Existing `deploy-poll.test.ts` pattern [VERIFIED: npm registry / package.json] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node.js built-ins | Node 20+ (dev: v24.18.0) | `setTimeout` / sleep in poll helpers | No extra deps for backoff |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New watch-only helper | Overload `pollDeploymentUntilTerminal` | Rejected by D-03 — keeps wait:true behavior stable |
| MCP Tasks / background notifications | Synchronous bounded watch | FEATURES.md floated Tasks; CONTEXT locks bounded sync watch with timeout |
| ofetch-only 429 retry | Watch-level Retry-After | ofetch does not parse Retry-After; D-08 requires watch to honor it |

**Installation:** None — no new packages.

```bash
# verify existing stack only
npm view ofetch version   # 1.5.1
npm view zod version      # 4.4.3
npm view vitest version   # 4.1.10
```

**Version verification:** Confirmed 2026-07-25 via `npm view` against registry. [VERIFIED: npm registry]

## Package Legitimacy Audit

> Phase installs **no** new external packages. Existing stack re-checked for completeness.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| ofetch | npm | mature | ~25M/wk | github.com/unjs/ofetch | OK | Approved (existing) |
| zod | npm | mature | ~239M/wk | github.com/colinhacks/zod | OK | Approved (existing) |
| @modelcontextprotocol/sdk | npm | mature | ~45M/wk | github.com/modelcontextprotocol/typescript-sdk | OK | Approved (existing) |
| vitest | npm | mature | ~81M/wk | github.com/vitest-dev/vitest | SUS (too-new signal) | Approved existing — already in repo; do not reinstall |

**Packages removed due to [SLOP] verdict:** none  
**Packages flagged as suspicious [SUS]:** vitest (seam `too-new` only; already pinned in project — no checkpoint needed for install)

## Architecture Patterns

### System Architecture Diagram

```
[Agent / IDE]
    │  MCP tool call: deployment({ action:"watch", deployment_uuid, timeout?, ... })
    ▼
[McpServer.registerTool('deployment')]
    │
    ▼
[handleDeploymentAction → handleDeploymentWatch]
    │  resolveRoutingEnv(instance?)
    │  timeoutMs = (timeout ?? 300) * 1000
    │  minMs/maxMs from min_interval?/max_interval? (defaults 3s / 30s)
    ▼
[pollDeploymentWithBackoff] ──┐
    │                         │ sleep(equalJitter(attempt))
    │  fetcher()              │ on 429: sleep(max(backoff, Retry-After)); continue
    ▼                         │
[fetchDeployment] ────────────┘
    │  Coolify GET /api/v1/deployments/{uuid}
    ▼
 Decision:
   ├─ status ∈ {finished}           → OK + projectDeploymentSummary (+ logs if include_logs)
   ├─ status ∈ {failed,cancelled-by-user} → isError + clear message + summary in error.data
   └─ elapsed ≥ timeout             → isError + last snapshot in error.data + re-watch hints
```

### Recommended Project Structure

```
src/
├── utils/
│   ├── deploy-poll.ts              # KEEP unchanged (wait:true)
│   ├── deploy-poll.test.ts         # KEEP
│   ├── deploy-watch-poll.ts        # NEW — backoff + jitter + 429 continue
│   └── deploy-watch-poll.test.ts   # NEW — fake timers + jitter/429/timeout
├── mcp/
│   ├── tools/
│   │   ├── deployment.ts           # ADD watch action + catalog
│   │   └── deployment.test.ts      # ADD watch handler cases
│   ├── prompts.ts                  # UPDATE deploy prompt steps
│   └── server.ts                   # description picks up catalog (no new tool)
tests/mcp/
└── prompts.test.ts                 # UPDATE expectations (watch primary, not "future")
README.md / README.de.md            # ADD Watch section; mark wait:true legacy
```

### Pattern 1: Watch-only backoff poller (D-03 / D-06)

**What:** Separate helper from fixed-interval `pollDeploymentUntilTerminal`.  
**When to use:** Only `deployment.watch`.  
**Recommended formula (Equal Jitter, min-clamped)** — Claude discretion within D-06 [CITED: aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/]:

```typescript
// Source: AWS Architecture Blog — Equal Jitter adapted to enforce min_interval
// delay ∈ [minIntervalMs, maxIntervalMs]
function nextDelayMs(attempt: number, minIntervalMs: number, maxIntervalMs: number): number {
  const exp = Math.min(maxIntervalMs, minIntervalMs * 2 ** attempt);
  const equal = Math.floor(exp / 2 + Math.random() * (exp / 2));
  return Math.max(minIntervalMs, Math.min(maxIntervalMs, equal));
}
```

Return a structured result discriminated by outcome (`terminal` | `timeout`) so the handler can apply D-09 / D-11 — do **not** synthesize `status: "timeout"` on the deployment object for watch (that is the wait:true pattern and would look like soft success).

### Pattern 2: Dual-signal MCP tool errors (D-09 / D-11)

**What:** Use MCP tool execution errors (`isError: true`) with payload in `structuredContent.error.data`.  
**When to use:** Watch timeout; terminal failed/cancelled.  
**Example:**

```typescript
// Source: MCP spec 2025-11-25 CallToolResult.isError
// https://modelcontextprotocol.io/specification/2025-11-25/server/tools
return {
  isError: true,
  content: [{ type: 'text', text: JSON.stringify(envelope, null, 2) }],
  structuredContent: { ok: false, error: envelope },
};
```

Recommended new codes (discretion):

| Outcome | Code | `error.data` |
|---------|------|--------------|
| Timeout | `COOLIFY_WATCH_TIMEOUT` | `{ deployment: DeploymentSummary, timed_out: true, elapsed_seconds }` |
| Failed | `COOLIFY_DEPLOYMENT_FAILED` | `{ deployment: DeploymentSummary }` |
| Cancelled | `COOLIFY_DEPLOYMENT_CANCELLED` | `{ deployment: DeploymentSummary }` |

`toolOutputSchema` already allows `error.data` as `z.record(z.string(), z.unknown())` — dual-signal fits without schema breakage. [VERIFIED: codebase `src/mcp/server.ts`]

### Pattern 3: Flat Zod watch params (Phase 19)

Extend `createFlatActionSchema` actions with `'watch'`:

| Field | Zod | Notes |
|-------|-----|-------|
| `deployment_uuid` | required string | Same as `get`/`cancel` |
| `timeout` | optional int seconds, default **300**, recommend min 10 / max 1800 (align with wait) | D-05 |
| `min_interval` | optional int seconds, default **3** | D-06/D-07; reject `< 1` or `> max_interval` |
| `max_interval` | optional int seconds, default **30** | Must be `>= min_interval` |
| `include_logs` | optional boolean, default false | D-04 |
| `format` / `max_chars` / `instance` | shared read/routing | Existing patterns |

Convert seconds → ms inside the helper.

### Anti-Patterns to Avoid

- **Overloading `pollDeploymentUntilTerminal` for backoff:** Violates D-03; risks changing wait:true semantics.
- **Soft-success timeout (`status: "timeout"` OK):** Violates D-09; agents treat as success.
- **Quiet OK on failed/cancelled:** Violates D-11.
- **MCP Tasks / forever background watch:** Out of scope; "non-blocking forever" means **bounded timeout + re-call**, not infinite tool hang.
- **Always-on log streaming:** Rejected (D-04); optional `include_logs` only.
- **Hard abort on first 429:** Violates D-08.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Terminal state set | Custom string lists per file | Export/share `TERMINAL_DEPLOYMENT_STATES` from `deploy-poll.ts` | Single source of truth [VERIFIED: codebase] |
| Summary projection | Ad-hoc field picking | `projectDeploymentSummary` / `projectDeploymentFull` + `truncateLogs` | Consistency with `deployment.get` [VERIFIED: codebase] |
| MCP error envelope | Custom JSON | `wrapMcpError` / `McpErrorResult` + new codes in `CoolifyErrorCode` | Agents already parse this shape |
| HTTP client | New axios/fetch layer | Existing `fetchDeployment` | Retries + TLS + token headers already wired |
| Flat action schema | New oneOf union | `createFlatActionSchema` | Cursor DX / DX-02 |

**Key insight:** Phase is mostly composition of existing Coolify client + projections + MCP error patterns; the only greenfield algorithm is backoff/jitter + 429 continue policy.

## Common Pitfalls

### Pitfall 1: Polling storms (Pitfall 12)

**What goes wrong:** Fixed short intervals → 429 / Cloud rate limits / hung IDE.  
**Why it happens:** Copying CLI `--follow` 2s loop or wait:true 3s forever.  
**How to avoid:** New helper with min 3s, expo+jitter, cap 30s, hard timeout 300s default. [CITED: .planning/research/PITFALLS.md Pitfall 12]  
**Warning signs:** Many `fetchDeployment` calls/minute in tests without advancing attempt backoff.

### Pitfall 2: Soft timeout looks like success

**What goes wrong:** Agent sees `ok: true` + `status: "timeout"` and stops.  
**Why it happens:** wait:true pattern returns soft body only. [VERIFIED: codebase `application.ts` wait path]  
**How to avoid:** Watch timeout → `isError: true` + snapshot in `error.data` + recoveryHints (D-09/D-10).  
**Warning signs:** Tests asserting `ok: true` on timeout for watch.

### Pitfall 3: ofetch eats Retry-After; 429 maps to COOLIFY_500

**What goes wrong:** After ofetch's 3 retries, watch aborts or cannot honor Retry-After.  
**Why it happens:** ofetch `retryDelay` is caller-supplied — **no Retry-After parsing** [CITED: Context7 /unjs/ofetch]; `statusToCode` default maps unknown statuses (incl. 429) to `COOLIFY_500` [VERIFIED: codebase `errors.ts`]; `toStructuredError` does not read response headers.  
**How to avoid:**
1. In `toStructuredError`, when `status === 429`, attach `data.retry_after` from `response.headers.get('retry-after')` (seconds or HTTP-date → delay ms).
2. Watch poller: if `httpStatus === 429`, sleep `max(nextBackoff, retryAfterMs)` and **continue** (D-08).
3. Do not treat 429 alone as watch failure.
**Warning signs:** Watch returns COOLIFY_500 mid-poll on rate limit.

### Pitfall 4: Prompt still says "Future (Phase 21)"

**What goes wrong:** Agents keep manual `deployment.get` loops.  
**Why it happens:** Phase 19 forward-ref left in `prompts.ts` + test expects get-before-watch. [VERIFIED: codebase]  
**How to avoid:** Rewrite deploy prompt to 2–4 steps with watch primary; update `tests/mcp/prompts.test.ts`.  
**Warning signs:** Prompt contains "do not call watch until it exists".

### Pitfall 5: STACK.md / ARCHITECTURE.md drift

**What goes wrong:** Planner reuses `pollDeploymentUntilTerminal` or builds log-incremental streaming.  
**Why it happens:** Older research said reuse deploy-poll / always stream logs.  
**How to avoid:** CONTEXT D-03/D-04 win — new helper; optional `include_logs` only.  
**Warning signs:** Plan tasks editing backoff into `deploy-poll.ts`.

### Pitfall 6: Fake timers + random jitter flakiness

**What goes wrong:** Tests flake on `Math.random`.  
**Why it happens:** Equal/Full jitter uses RNG.  
**How to avoid:** Inject `random: () => number` into helper for tests; assert delay bounds and attempt growth with controlled RNG.  
**Warning signs:** Intermittent timer advancement failures.

## Code Examples

### Existing fixed poller (do not modify for watch)

```typescript
// Source: src/utils/deploy-poll.ts [VERIFIED: codebase]
export async function pollDeploymentUntilTerminal(
  fetcher: () => Promise<Record<string, unknown>>,
  timeoutMs: number,
  intervalMs = DEFAULT_POLL_INTERVAL_MS, // 3000
): Promise<Record<string, unknown>> {
  // fixed interval; on timeout returns { ...deployment, status: 'timeout' }
}
```

### Recommended watch helper shape

```typescript
// Recommended — new file src/utils/deploy-watch-poll.ts
export type WatchPollOutcome =
  | { kind: 'terminal'; deployment: Record<string, unknown> }
  | { kind: 'timeout'; deployment: Record<string, unknown>; elapsedMs: number };

export async function pollDeploymentWithBackoff(
  fetcher: () => Promise<Record<string, unknown>>,
  options: {
    timeoutMs: number;
    minIntervalMs?: number; // default 3000
    maxIntervalMs?: number; // default 30000
    random?: () => number;  // default Math.random
    isRetryableRateLimit?: (err: unknown) => { retryAfterMs?: number } | null;
  },
): Promise<WatchPollOutcome> { /* ... */ }
```

### Deploy prompt target shape (WATCH-02 / D-14)

```text
1. application({ action: "deploy", uuid, wait: false }) → capture deployment_uuid
2. deployment({ action: "watch", deployment_uuid, timeout?: 300 })
3. On watch timeout error: re-call deployment.watch with same uuid (raise timeout if needed)
4. On failed/cancelled error: surface the error message/logs hint to the user — do not treat as success
Note: application.deploy wait:true is legacy; prefer watch.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Agent loops `deployment.get` manually | `deployment.watch` with backoff + timeout | Phase 21 | Fewer agent turns; fewer API storms |
| `wait:true` fixed 3s + soft timeout | Keep for compat; docs steer to watch | Phase 4 → 21 | Dual paths; clear recommendation |
| Synchronous watch without timeout | Explicitly out of scope | REQUIREMENTS | Prevents forever-block |
| MCP Tasks async watcher (FEATURES.md) | Bounded sync watch (CONTEXT) | Discuss-phase lock | Simpler; no Tasks dependency |

**Deprecated/outdated for this phase:**
- STACK.md advice to "reuse `pollDeploymentUntilTerminal` for watch" — superseded by D-03.
- ARCHITECTURE.md "log-incremental streaming" as default — superseded by D-04.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Equal Jitter clamped to `[min,max]` is acceptable within D-06 | Architecture Patterns | User may prefer Full Jitter or decorrelated; formula is discretion — easy to change |
| A2 | New error codes `COOLIFY_WATCH_TIMEOUT` / `COOLIFY_DEPLOYMENT_FAILED` / `COOLIFY_DEPLOYMENT_CANCELLED` are preferred over reusing `COOLIFY_TIMEOUT` / `COOLIFY_500` | Pattern 2 | Naming only; must stay unambiguous to agents |
| A3 | Agent-facing interval params in **seconds** (not ms) match `application.deploy` timeout UX | Pattern 3 | If docs say ms, agents may pass 3000 meaning 3000s |
| A4 | Watch timeout Zod bounds min 10 / max 1800 (same as wait) | Pattern 3 | CONTEXT only locks default 300; bounds are discretion |
| A5 | Preserving Retry-After via `toStructuredError` header read is acceptable scope for D-08 | Pitfall 3 | Could instead use watch-only raw fetch; slightly broader change |

## Open Questions (RESOLVED)

1. **Should `min_interval` allow values below 3s if the agent passes them?**
   - What we know: D-06 sets the default band start at 3s; D-07 exposes `min_interval?`.
   - What's unclear: Hard floor vs soft default.
   - Recommendation: Default 3s; allow agent override down to **1s** minimum; reject `< 1` to prevent storms. Document that defaults follow D-06.
   - **RESOLVED:** Hard floor `min_interval ≥ 1s`; Zod/schema default **3s** (D-06). Agent may override down to 1s; reject `< 1`. Matches Plan 02 schema bounds.

2. **Does preserving Retry-After require changing shared `toStructuredError`, or only the watch fetcher?**
   - What we know: headers currently dropped; ofetch error may still hold `response`.
   - Recommendation: Small shared enhancement in `toStructuredError` for `status === 429` — benefits Cloud rate limits beyond watch.
   - **RESOLVED:** Shared `toStructuredError` attaches `data.retry_after` (ms) when HTTP status is 429 by parsing `Retry-After` (delta-seconds or HTTP-date). Matches Plan 01 Task 2; watch poller reads that field via `isRetryableRateLimit`.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build/test/runtime | ✓ | v24.18.0 | — |
| npm | Scripts | ✓ | 11.16.0 | — |
| vitest | Unit tests | ✓ | 4.1.10 | — |
| Live Coolify API | Optional UAT only | N/A for unit plan | — | Mock `fetchDeployment` in tests |

**Missing dependencies with no fallback:** none  
**Missing dependencies with fallback:** none  

Step 2.6: External runtime Coolify not required for implementation — unit tests mock the client.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.10 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/utils/deploy-watch-poll.test.ts src/mcp/tools/deployment.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WATCH-01 | Exits on `finished` with OK summary | unit | `npx vitest run src/mcp/tools/deployment.test.ts -t "watch"` | ❌ Wave 0 |
| WATCH-01 | Backoff delays grow within [min,max] and include jitter | unit | `npx vitest run src/utils/deploy-watch-poll.test.ts` | ❌ Wave 0 |
| WATCH-01 | Timeout → `isError` + last snapshot + re-watch hint | unit | `npx vitest run src/mcp/tools/deployment.test.ts -t "timeout"` | ❌ Wave 0 |
| WATCH-01 | `failed` / `cancelled-by-user` → `isError` clear message | unit | `npx vitest run src/mcp/tools/deployment.test.ts -t "failed\|cancelled"` | ❌ Wave 0 |
| WATCH-01 | 429 → continue poll (no hard abort); honors Retry-After when present | unit | `npx vitest run src/utils/deploy-watch-poll.test.ts -t "429"` | ❌ Wave 0 |
| WATCH-01 | Defaults: timeout 300s, min 3s, max 30s; `include_logs` false | unit | schema + handler tests | ❌ Wave 0 |
| WATCH-01 | `pollDeploymentUntilTerminal` still fixed 3s (regress) | unit | `npx vitest run src/utils/deploy-poll.test.ts` | ✅ |
| WATCH-02 | Deploy prompt: deploy → watch → timeout re-watch; wait:true legacy | unit | `npx vitest run tests/mcp/prompts.test.ts` | ✅ (needs update) |

### Sampling Rate

- **Per task commit:** targeted vitest files above
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/utils/deploy-watch-poll.test.ts` — covers backoff bounds, timeout outcome, 429 continue, injectable RNG
- [ ] `src/mcp/tools/deployment.test.ts` — add `watch` action cases (schema + handler outcomes)
- [ ] `tests/mcp/prompts.test.ts` — replace "future Phase 21" / get-before-watch ordering assertions
- [ ] Optional: README presence smoke (string check) only if repo already tests README — otherwise manual/verify-phase

*(Existing `deploy-poll.test.ts` remains the regression gate that wait:true helper is untouched.)*

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (unchanged) | Existing Bearer token via `resolveRoutingEnv` |
| V3 Session Management | no | — |
| V4 Access Control | yes (soft) | Optional `instance` routing; no cross-instance leakage |
| V5 Input Validation | yes | Zod flat schema: timeout/interval bounds, required `deployment_uuid` |
| V6 Cryptography | no | — |

### Known Threat Patterns for Coolify MCP watch

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| API credential leakage in watch errors/logs | Information Disclosure | Reuse `redactSecrets` / `wrapMcpError`; `include_logs` uses capped logs + existing reveal defaults (false) |
| Agent-triggered polling storm / DoS of Coolify | Denial of Service | min_interval floor, max_interval cap, hard timeout, jitter |
| Oversized log payload blows context | Denial of Service | `truncateLogs` / `max_chars` when `include_logs: true` |
| Prompt injection via deployment log text | Tampering | Treat logs as untrusted data; do not execute; cap size |

## Sources

### Primary (HIGH confidence)

- Codebase: `src/utils/deploy-poll.ts`, `src/mcp/tools/deployment.ts`, `src/mcp/tools/application.ts` (wait path), `src/utils/errors.ts`, `src/mcp/prompts.ts`, `src/mcp/server.ts` `toolOutputSchema`
- `.planning/phases/21-deploy-watch/21-CONTEXT.md` — locked decisions D-01–D-16
- `.planning/research/PITFALLS.md` — Pitfall 12
- `.cursor/skills/spike-findings-awesome-coolify/references/coolify-api.md` — deploy → poll terminal states; logs on deployment object
- Context7 `/websites/modelcontextprotocol_io_specification_2025-11-25` — `CallToolResult.isError`
- Context7 `/unjs/ofetch` — retry options; no Retry-After auto-parse
- npm registry — ofetch 1.5.1, zod 4.4.3, vitest 4.1.10, `@modelcontextprotocol/sdk` 1.29.0

### Secondary (MEDIUM confidence)

- AWS Architecture Blog — Exponential Backoff And Jitter (Equal/Full Jitter)
- AWS Builder Center — Timeouts, retries, and backoff with jitter
- `.planning/research/ARCHITECTURE.md` Pattern 2 (partially superseded by CONTEXT on logs)

### Tertiary (LOW confidence)

- Older STACK.md / FEATURES.md guidance on reusing deploy-poll / MCP Tasks — superseded by CONTEXT; do not plan from these alone

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; versions verified on registry
- Architecture: HIGH — CONTEXT locks surface; codebase seams mapped
- Pitfalls: HIGH — Pitfall 12 + verified 429/Retry-After gap in client/errors

**Research date:** 2026-07-25  
**Valid until:** 2026-08-24 (30 days — stable domain; MCP/ofetch APIs slow-moving)
