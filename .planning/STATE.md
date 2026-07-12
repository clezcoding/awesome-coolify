---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 4
current_phase_name: App Deploy Lifecycle
status: "Phase 04 plan 01 complete — Wave 2 ready (04-02 deploy)"
stopped_at: Phase 4 plan 01 complete
last_updated: "2026-07-13T00:00:00.000Z"
last_activity: 2026-07-13
last_activity_desc: Phase 04-01 complete — app lifecycle start/stop/restart (APP-03)
progress:
  total_phases: 7
  completed_phases: 3
  total_plans: 22
  completed_plans: 18
  percent: 46
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-12)

**Core value:** AI agent manages multiple self-hosted Coolify instances — deploy, logs, diagnose — via one MCP server.
**Current focus:** Phase 04 — App Deploy Lifecycle (planned)

## Current Position

Phase: 4 — App Deploy Lifecycle
Plan: 04-02 next (Wave 2 — single deploy + wait-mode)
Status: Phase 04 plan 01 complete — Wave 2 ready (04-02 deploy)
Last activity: 2026-07-13 — Phase 04-01 complete — app lifecycle start/stop/restart (APP-03)

Progress: [█████████████████████░░░░] 18/22 plans

## Performance Metrics

**Velocity:**

- Total plans completed: 33
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| — | — | — | — |
| 1 | 2 | - | - |
| Phase 02 P01 | 4min | 3 tasks | 6 files |
| Phase 02 P02 | 5min | 3 tasks | 8 files |
| Phase 02-discovery-read-projections P03 | 7min | 3 tasks | 10 files |
| Phase 02-discovery-read-projections P04 | 3min | 3 tasks | 6 files |
| Phase 02-discovery-read-projections P05 | 5 | 3 tasks | 5 files |
| 02 | 5 | - | - |
| Phase 03 P01 | 5min | 4 tasks | 13 files |
| Phase 03 P02 | 8 | 2 tasks | 4 files |
| Phase 03 P03 | 6 | 1 tasks | 2 files |
| Phase 03 P04 | 8min | 1 tasks | 2 files |
| Phase 03 P05 | 5min | 1 tasks | 6 files |
| Phase 03 P06 | 5min | 2 tasks | 5 files |
| Phase 03 P07 | 8min | 3 tasks | 5 files |
| 03 | 7 | - | - |

## Accumulated Context

### Decisions

- v1 = Ops MVP only; Create/Delete deferred to v2 (PROJECT.md D-05)
- Action-based tool schema from Phase 1 — no 60+ granular tools (DX-01)
- Multi-instance via `~/.coolify-mcp/instances.json` (CTX-04, CTX-05)
- 7 vertical MVP phases; standard granularity; mvp mode per phase
- sanitizeFullProjection masks password/token/secret/private/env keys — OUT-02 reveal deferred to Phase 6 (02-01)
- truncateAndGuard hard-caps output when footer exceeds small max_chars (02-01)
- buildReadResponse exported as reusable helper for P2 read tool handlers (02-01)
- Handlers parse args through Zod schema at entry for read param defaults (02-02)
- infrastructure_overview on system tool per ecosystem spike D-04 (02-02)
- rejectTableFormatOnFullProjection returns COOLIFY_422 for table+full per D-11 (02-03)
- Domain tools get-only — list via resource tool per D-02 (02-03)
- [Phase 02-discovery-read-projections]: find caps at 10 ranked matches — no ambiguity error per D-19 — Agent picks UUID from ranked list instead of erroring on multiple matches
- [Phase 02-discovery-read-projections]: docs tool uses static DOCS_INDEX not live API fetch per D-03 — Curated troubleshooting catalog avoids external fetch attack surface
- [Phase 02-discovery-read-projections]: docs.search empty results preserve notice via buildReadResponse with data: [] — Uniform envelope without losing no-results UX from 02-04
- [Phase 02-discovery-read-projections]: system infrastructure_overview structuredContent splits data and _meta like domain tools — Consistent _meta exposure for agent truncation recovery per D-12 D-14
- [Phase 03-diagnose-issue-scan]: Diagnose projectors in projections.ts not separate file — CONTEXT.md wins over RESEARCH.md file placement
- [Phase 03-diagnose-issue-scan]: fetchServer base in 03-01 — 03-03 server handler does not add conditionally
- [Phase 03-diagnose-issue-scan]: 03-01 Wave 1 foundation only — handleDiagnoseAction not-implemented; first vertical slice in 03-02
- [Phase 03-diagnose-issue-scan]: Inline test mocks in diagnose.test.ts avoid tsc rootDir fixture import — tests/fixtures outside src/ triggers TS6059; inline mocks match application.test.ts pattern
- [Phase 03-diagnose-issue-scan]: First agent-callable diagnose vertical slice shipped in 03-02 (SYS-04 app only) — server/scan remain stubs until 03-03/03-04 per wave plan
- [Phase 03-diagnose-issue-scan]: Server diagnose shipped in 03-03 (SYS-05) — 4-way Promise.allSettled, trigger_validate default true, scan remains stub until 03-04
- [Phase 03-diagnose-issue-scan]: Reachable server hints[] empty — generateHints server branch only emits hints for unreachable status
- [Phase 03-diagnose-issue-scan]: Global issue scan shipped in 03-04 (SYS-03) — 2-call enumeration, all 3 diagnose branches complete — Promise.all fetchServers+fetchResources; classifyIssues severity buckets; scan was last stub
- [Phase 03-diagnose-issue-scan]: Scan pagination meta only — full severity buckets in data — paginateArray drives _meta page/per_page/total; bucket content not sliced per page
- [Phase 03-diagnose-issue-scan]: P2 get handlers attach hints at handler level after projection — projectors unchanged per D-16 additive retrofit; generateHints single source for get and diagnose
- [Phase 03-diagnose-issue-scan]: Handler-level integration only for diagnose-flow — real MCP stdio E2E MANUAL-ONLY per P1 01-05 pattern
- [Phase 03-diagnose-issue-scan]: tsc --noEmit has pre-existing errors predating Phase 3 — npm run build (tsup) is green sign-off gate
- [Phase 03-diagnose-issue-scan]: toolOutputSchema must declare _meta/_formattedText/_size_warning matching ReadResponse — JSON Schema additionalProperties:false caused live MCP -32602 when _meta omitted (03-07)
- [Phase 03-diagnose-issue-scan]: MCP schema regression via child-process test + z.toJSONSchema key parity — in-process SDK validation alone strips unknown keys without failing (03-07)
- [Phase 04-app-deploy-lifecycle]: COOLIFY_AMBIGUOUS_MATCH error on mutation multi-match — NO mutation executes; ranked Top 10 in recoveryHints (D-16)
- [Phase 04-app-deploy-lifecycle]: Strict mutation identifier uuid|name|fqdn only — no fuzzy query on start/stop/restart/deploy (D-15)
- [Phase 04-app-deploy-lifecycle]: application tool drops readOnlyHint — openWorldHint only for mutating lifecycle (D-05)
- [Phase 04-app-deploy-lifecycle]: restart schema .strict() rejects force param — deploy-only rebuild flag (D-22)
- [Phase 04-app-deploy-lifecycle]: resolveAppMutationUuid colocated in application.ts — reuse by 04-02 deploy and 04-04 batch

### Pending Todos

- Validate deploy wait-mode polling against slow builds (research flag from SUMMARY.md)

### Blockers/Concerns

- Coolify 4.1.x: `execute_command` endpoint broken/missing — out of scope v1
- Global deployments list unreliable — per-app list only (APP-07)

## Session Continuity

Last session: 2026-07-13T00:00:00.000Z
Stopped at: Phase 4 plan 01 complete
Resume file: .planning/phases/04-app-deploy-lifecycle/04-02-PLAN.md
