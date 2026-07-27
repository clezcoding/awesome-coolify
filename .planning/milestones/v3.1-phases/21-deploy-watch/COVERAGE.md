# API Coverage — Phase 21 Deploy Watch

> Full coverage by default. Opt-outs are explicit, reasoned decisions.

## Detector outcome

Phase 21 adds a **new action** `deployment.watch` on the existing `deployment`
MCP tool, plus a watch-only Equal Jitter poll helper and dual-signal timeout /
failure error envelopes. It integrates one external surface:

1. **Coolify REST API** (v4.1.x) — repeated `GET /deployments/{uuid}` polling
   until a terminal status (`finished` / `failed` / `cancelled-by-user`) or a
   hard timeout, with HTTP **429** `Retry-After` honor on rate limits.

No new Coolify endpoints, no new MCP tools, no CDN/template fetches. Docs
(`deploy` MCP prompt + README EN/DE Watch sections) steer agents to the
watch-primary flow without changing the Coolify API surface.

The API-Coverage gate fires on MCP + API wiring terms in phase docs, so this
matrix records the integrate/opt-out decisions for the Phase 21 surface.

## Capability surface

| capability | decision | reason |
|---|---|---|
| `deployment.watch` action on existing `deployment` tool | INTEGRATE | WATCH-01; D-01 |
| Watch-only poll helper `pollDeploymentWithBackoff` (Equal Jitter) | INTEGRATE | D-03, D-06; `src/utils/deploy-watch-poll.ts` |
| Default timeout 300s when agent omits `timeout` | INTEGRATE | D-05 |
| Agent-visible `timeout?` / `min_interval?` / `max_interval?` | INTEGRATE | D-07; Zod defaults 300/3/30 |
| Interval band start 3s, Exponential backoff + Equal Jitter, cap 30s | INTEGRATE | D-06 |
| `include_logs?` default `false`; capped logs only when true | INTEGRATE | D-04, D-12; WR-02 |
| Soft instance routing (`instance?`) on watch | INTEGRATE | Phase 15/19 pattern; catalog params |
| Dual-signal timeout: soft deployment snapshot + error flag | INTEGRATE | D-09; `COOLIFY_WATCH_TIMEOUT` |
| Terminal `finished` → OK summary projection | INTEGRATE | D-11, D-12 |
| Terminal `failed` → clear error (`COOLIFY_DEPLOYMENT_FAILED`) | INTEGRATE | D-11 |
| Terminal `cancelled-by-user` → clear error (`COOLIFY_DEPLOYMENT_CANCELLED`) | INTEGRATE | D-11 |
| Re-watch recovery hint on timeout (same `deployment_uuid`) | INTEGRATE | D-10; RECOVERY_HINTS |
| Fail/cancel recovery hints → `deployment.get` / `include_logs` | INTEGRATE | D-11; RECOVERY_HINTS |
| HTTP 429 continue (no hard abort solely for 429) | INTEGRATE | D-08 |
| Honor `Retry-After` (delta-seconds + HTTP-date) as `data.retry_after` ms | INTEGRATE | D-08; `toStructuredError` |
| Sleep clamp to remaining timeout budget (`remainingMs`) | INTEGRATE | D-05; CR-01 / WR-01 — hostile Retry-After cannot exceed timeout |
| `createFlatActionSchema` `zodDefaultFields` for watch-only defaults | INTEGRATE | Plan 21-02; prevent phantom defaults on list/get/cancel |
| Recursive `redactEnvelopeData` for nested deployment snapshot in errors | INTEGRATE | Plan 21-02; preserve structured `error.data.deployment` |
| Deploy MCP prompt watch-primary 4-step flow | INTEGRATE | WATCH-02; D-13, D-14 |
| README EN/DE Watch / Beobachten sections + `deployment.watch` table rows | INTEGRATE | WATCH-02; D-13 |
| Document `wait:true` as legacy; recommend watch | INTEGRATE | D-02, D-15 |
| Phase 22 SKILL-02 note (watch must be documented in IDE skills) | INTEGRATE | D-16 obligation noted; packs deferred |
| Coolify REST: GET `/deployments/{uuid}` (`fetchDeployment`) for watch poll | INTEGRATE | WATCH-01; `src/api/client.ts:1061` — existing client, reused |
| Keep `application.deploy wait:true` fixed 3s poller unchanged | INTEGRATE | D-02, D-03; `pollDeploymentUntilTerminal` regression gate |
| Reuse existing summary projection helpers for watch OK payload | INTEGRATE | D-12; no new projector |
| New top-level MCP tool for watch | OPT-OUT | D-01; action on existing `deployment` tool only |
| Put watch on `application` tool | OPT-OUT | D-01; deployment-scoped action |
| Upgrade `wait:true` to share backoff helper | OPT-OUT | D-03; explicit reject this phase — revisit only if policy unification needed |
| Synchronous watch without timeout | OPT-OUT | REQUIREMENTS out-of-scope; forever-block risk (Pitfall 12) |
| Always-on incremental log streaming during watch | OPT-OUT | D-04; optional `include_logs` only |
| New Coolify REST endpoints / API changes | OPT-OUT | reuses existing GET `/deployments/{uuid}` only |
| New npm packages | OPT-OUT | backoff/jitter local; no new deps |
| IDE skill packs documenting watch | OPT-OUT | deferred to Phase 22 per D-16 / SKILL-01/SKILL-02 |
| Setup wizard | OPT-OUT | deferred to Phase 22 per ROADMAP |
| OpenAPI coverage map | OPT-OUT | deferred to Phase 23 per ROADMAP |
| Live Coolify REST changes for deploy trigger / cancel | OPT-OUT | watch is read-poll only — deploy/cancel unchanged from Phase 4 |

---

*Authored: 2026-07-25 — Phase 21 verify-work API coverage checkpoint*
