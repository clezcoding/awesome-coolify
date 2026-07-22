# Debug: UAT gap #29 — service stop/start COOLIFY_422

**Date:** 2026-07-16  
**Target:** `uat-uptime-a` (`poo9i3gvbpa0euukp8m36zte`) on Coolify **4.1.2**  
**UAT test:** 29 — service stop then start cycle  
**Symptom:** `service({ action: "stop"|"start", uuid })` → `COOLIFY_422` / HTTP 400; `restart` and `deploy` succeed; service stayed `running:healthy`.

---

## Executive summary

Not a missing endpoint or one-click API ban. Coolify **4.1.2** service stop defaults `docker_cleanup=true`; on one-click compose services (e.g. `uptime-kuma`) that often **queues stop (HTTP 200) without actually stopping** the service. A follow-up **start** on still-running service returns HTTP 400 `"Service is already running."`, which MCP maps to generic `COOLIFY_422` and **drops Coolify's message**. MCP `triggerServiceStop` never sends `docker_cleanup=false`.

---

## Reproduction (live instance)

| Step | Endpoint | HTTP | Coolify body | Service status after |
|------|----------|------|--------------|----------------------|
| GET | `/services/{uuid}` | 200 | — | `running:healthy` |
| POST stop (default) | `/services/{uuid}/stop` | 200 | `Service stopping request queued.` | **`running:healthy`** (12s later) |
| POST start | `/services/{uuid}/start` | 400 | `Service is already running.` | `running:healthy` |
| POST stop `?docker_cleanup=false` | `/services/{uuid}/stop` | 200 | `Service stopping request queued.` | `exited` (~8s) |
| POST start (from exited) | `/services/{uuid}/start` | 200 | `Service starting request queued.` | `starting:unhealthy` → `running:healthy` |
| POST stop (on exited) | `/services/{uuid}/stop` | 400 | `Service is already stopped.` | `exited` |
| POST restart | `/services/{uuid}/restart` | 200 | `Service restarting request queued.` | `running:healthy` |

**MCP tool parity:**

- `service({ action: "stop", uuid })` on **running** → MCP success `{ status: "requested" }` (Coolify 200 even when ineffective).
- `service({ action: "start", uuid })` on **running** → `COOLIFY_422`, message `"Coolify API returned HTTP 400"` (Coolify said `"Service is already running."`).
- `service({ action: "stop", uuid })` on **exited** → `COOLIFY_422` (Coolify `"Service is already stopped."`).

Service type: one-click **`uptime-kuma`** (`service_type: "uptime-kuma"`), compose-managed with external network volume.

---

## Code path review

### 1. `src/mcp/tools/service.ts`

Handlers are thin wrappers — no special one-click logic:

- `start` → `triggerServiceStart`
- `stop` → `triggerServiceStop`
- `restart` → `triggerServiceRestart(..., latest=false)`
- `deploy` → `triggerServiceRestart(..., pull_latest)`

All mutations return fire-and-forget `{ status: "requested" }` on HTTP success. **No post-mutation status check.**

### 2. `src/api/client.ts`

```typescript
// triggerServiceStop — no query params
return client(`/services/${uuid}/stop`, { method: 'POST' });

// triggerServiceRestart — supports ?latest=true (used by deploy)
return client(`/services/${uuid}/restart`, {
  method: 'POST',
  query: latest ? { latest: true } : undefined,
});
```

**Gap:** Coolify 4.1.2 documents `docker_cleanup` (boolean, default `true`) on service stop. MCP never passes it. Same omission exists for `triggerAppStop` / `triggerDatabaseStop`, but UAT app cycle (#27) passed — issue appears specific to compose one-click services + docker cleanup.

### 3. Coolify 4.1.2 `ServicesController` (upstream)

- **`/services/{uuid}/start`** → `action_deploy`: 400 if status contains `running` (`"Service is already running."`).
- **`/services/{uuid}/stop`** → `action_stop`: 400 if status contains `stopped`/`exited` (`"Service is already stopped."`); dispatches `StopService` with `$dockerCleanup = $request->boolean('docker_cleanup', true)`.
- **`/services/{uuid}/restart`** → no running/stopped guard; always queues restart.

Restart/deploy bypass the start/stop state guards — explains UAT pass on tests 24 & 26.

Related upstream: [coolify#7758](https://github.com/coollabsio/coolify/issues/7758) — API service stop always performed docker cleanup; `docker_cleanup=false` added in 4.1.x.

### 4. Error mapping — Coolify message lost

`src/utils/errors.ts` → `mapApiError(null, httpStatus)`:

```typescript
message: sanitizeMessage(`Coolify API returned HTTP ${httpStatus}`),
```

`toStructuredError` reads status from ofetch/FetchError but **never parses `response._data.message`**. Confirmed: MCP start on running service shows generic `"Coolify API returned HTTP 400"` instead of `"Service is already running."`.

---

## UAT "both stop and start COOLIFY_422" reconciliation

| Action | When | MCP result | Coolify HTTP |
|--------|------|------------|--------------|
| stop | `running:healthy`, default cleanup | **Success** (200 queued, often no-op) | 200 |
| start | still `running:healthy` | **COOLIFY_422** | 400 |
| stop | `exited` | **COOLIFY_422** | 400 |

Most likely UAT sequence after tests 24/26 (restart/deploy left service running):

1. **stop** → Coolify 200, MCP success, service **still running** (default cleanup no-op).
2. **start** → Coolify 400 → MCP **COOLIFY_422**.

Reporter may have counted stop as failed (no state change) alongside start 422, or a second stop attempt hit `exited`/transitional state (400 already stopped). **Start 422 is fully reproduced.** Stop 422 occurs on already-stopped state, not on healthy running.

---

## Root cause (one sentence)

Coolify 4.1.2 service stop defaults `docker_cleanup=true`, which on one-click compose services often returns HTTP 200 without stopping the container, so the subsequent start hits HTTP 400 `"Service is already running."` — mapped to generic `COOLIFY_422` with the Coolify message discarded because MCP omits `docker_cleanup=false` and `mapApiError` ignores response bodies.

---

## Artifacts

| Path | Issue |
|------|-------|
| `src/api/client.ts` | `triggerServiceStop` POSTs `/services/{uuid}/stop` with no `docker_cleanup=false` query param |
| `src/mcp/tools/service.ts` | Fire-and-forget success on HTTP 200 even when stop job does not change service state |
| `src/utils/errors.ts` | `mapApiError` / `toStructuredError` map HTTP 400→`COOLIFY_422` with generic message; Coolify JSON `message` not extracted from ofetch error body |

---

## Recommended fix steps (not implemented)

1. **Pass `docker_cleanup=false`** in `triggerServiceStop` (default for MCP; optional tool param for destructive cleanup).
2. **Parse Coolify error body** in `toStructuredError` / `mapApiError` — use `response._data.message` when present; include in envelope `message` and optionally `data`.
3. **Optional:** expose `docker_cleanup` on `service` stop action schema for advanced users.
4. **Optional:** document one-click service stop/start caveat in README / docs tool.
5. **Add integration test** (or fixture-backed test) asserting stop query includes `docker_cleanup=false`.
6. **Re-run UAT #29** after fix: stop → verify `exited`, start → verify `running:healthy`.

---

## Post-debug service state

Service restored to **`running:healthy`** via `restart` after diagnostic stop/start cycles.

---

## Resolution

**Status:** resolved  
**Verified:** 2026-07-20  
**Originally marked resolved in STATE:** 2026-07-16 (07-05)  
**Verification:** client + service + errors suites green (bundled run: 192 tests)

### Fix confirmation

| Layer | Expected | Actual |
|-------|----------|--------|
| Stop default | `docker_cleanup=false` | ✓ `triggerServiceStop(..., dockerCleanup = false)` |
| Optional override | `docker_cleanup=true` when requested | ✓ query param honored |
| Error message | Coolify body `message` surfaced | ✓ `mapApiError` / `toStructuredError` use `_data.message` |
| Unit coverage | Default false + override + message extract | ✓ client.test.ts + errors.test.ts |

### Files changed (already shipped)

- `src/api/client.ts` — stop query `docker_cleanup`
- `src/mcp/tools/service.ts` — schema + pass-through
- `src/utils/errors.ts` — Coolify message extraction
- matching unit tests

**Root cause:** Coolify stop defaulted `docker_cleanup=true` (often no-op on one-click compose); start then 400; MCP dropped Coolify message.

**Fix:** MCP default `docker_cleanup=false`; parse Coolify error body into envelope message.
