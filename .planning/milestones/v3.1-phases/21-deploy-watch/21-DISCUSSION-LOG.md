# Phase 21: Deploy Watch - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-25
**Phase:** 21-Deploy Watch
**Mode:** `--batch` (German UI; recommendations marked ★)
**Areas discussed:** Watch-Heimat, Polling-Policy, Timeout-Recovery, WATCH-02 Docs

---

## Todos (cross-reference)

| Todo | Folded | Notes |
|------|--------|-------|
| Custom Skills pro IDE für Coolify | | Reviewed → Phase 22 |
| Lokale Projekt-Manifest-Datei | | Reviewed → v3.0 already |
| Standard-Setup Tool | | Reviewed → Phase 22 |
| Integrate official Coolify OpenAPI specs | | Reviewed → Phase 23 |

**User's choice:** `todos: keine`

---

## Watch-Heimat

| Option | Description | Selected |
|--------|-------------|----------|
| 1a ★ | `deployment.watch` only on `deployment` tool | ✓ |
| 1b | New top-level `deploy-watch` tool | |
| 1c | Action on `application` instead | |
| 2a ★ | Keep `wait:true`; docs steer to `watch` | ✓ |
| 2b | Point `wait:true` at same backoff poller | |
| 2c | Deprecate/remove `wait:true` this phase | |
| 3a ★ | Extend shared poller for watch + optional wait | |
| 3b | New helper for watch only; keep fixed 3s for wait | ✓ |
| 3c | Claude decides | |
| 4a ★ | Status-only + hint to `deployment.get` | |
| 4b | Incremental log tail always in watch result | |
| 4c | Optional `include_logs?` default off | ✓ |

**User's choice:** `1a;2a;3b;4c`
**Notes:** Split poller path (3b) deliberately diverges from ★ recommendation to preserve wait behavior.

---

## Polling-Policy

| Option | Description | Selected |
|--------|-------------|----------|
| 1a | Default timeout 120s | |
| 1b ★ | Default timeout 300s | ✓ |
| 1c | Default timeout 600s | |
| 1d | No default — agent must set | |
| 2a ★ | Start 3s → expo + jitter → cap 30s | ✓ |
| 2b | Start 5s → cap 60s | |
| 2c | Fixed 3s + jitter only | |
| 3a ★ | Only `timeout?` visible | |
| 3b | `timeout?` + `min_interval?` + `max_interval?` | ✓ |
| 3c | Full policy knobs including jitter | |
| 4a ★ | Honor `Retry-After` on 429 | ✓ |
| 4b | Abort immediately on 429 | |
| 4c | Claude decides | |

**User's choice:** `1b;2a;3b;4a`
**Notes:** Wider agent param surface (3b) accepted over minimal-schema ★.

---

## Timeout-Recovery

| Option | Description | Selected |
|--------|-------------|----------|
| 1a ★ | Soft-success `status: timeout` + hints | |
| 1b | Structured error only | |
| 1c | Soft body + error flag (dual signal) | ✓ |
| 2a | Resume via `deployment.get` only | |
| 2b ★ | Re-call `deployment.watch` same UUID | ✓ |
| 2c | Document both; watch preferred | |
| 3a ★ | failed/cancelled as OK with status | |
| 3b | failed → error; cancelled → OK | |
| 3c | Any non-finished → error | |
| 3 freeform | Clear error message + user-facing output | ✓ |
| 4a ★ | Summary projection; logs if `include_logs` | ✓ |
| 4b | Always full projection + capped logs | |
| 4c | Minimal status + uuid + hint | |

**User's choice:** `1c;2b;3: eine klare fehlermeldung und ausgabe an den user;4a`
**Notes:** Confirmed interpretation: `finished` → OK summary; `failed` and `cancelled-by-user` → clear error path (user chose `a` on confirm).

---

## WATCH-02 Docs

| Option | Description | Selected |
|--------|-------------|----------|
| 1a | Prompt `deploy` only | |
| 1b ★ | Prompt + README EN/DE | ✓ |
| 1c | Prompt + README + skill stub now | |
| 1d | README only | |
| 2a ★ | 2–4 concrete steps | ✓ |
| 2b | Long playbook | |
| 2c | One-liner only | |
| 3a ★ | `wait:true` as legacy; recommend watch | ✓ |
| 3b | Omit `wait` from docs | |
| 3c | Document wait and watch as equals | |
| 4a | Create skill files in Phase 21 | |
| 4b ★ | Defer skills to Phase 22; note must document watch | |
| 4c | Claude decides | ✓ |

**User's choice:** `1b;2a;3a;4c`
**Notes:** Claude discretion locked as: defer skill packs to Phase 22; CONTEXT requires watch coverage there (SKILL-02).

---

## Claude's Discretion

- Backoff/jitter implementation details within locked interval band
- Exact error envelope codes for timeout dual-signal and failed/cancelled messaging
- README EN/DE wording/placement
- Phase 22 skill structure for watch docs (coverage required)

## Deferred Ideas

- IDE skill packs (Phase 22)
- Unifying `wait:true` onto backoff helper (future; rejected this phase)
- Always-on incremental log streaming during watch
