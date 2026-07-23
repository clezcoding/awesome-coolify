# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — Ops MVP

**Shipped:** 2026-07-16
**Phases:** 7 | **Plans:** 37 | **Tasks:** 86

### What Was Built

- MCP stdio server (`awesome-coolify-mcp`) with 10 tools, 32 actions, structured errors, secret redaction
- Full ops surface: discovery, diagnose, deploy lifecycle, logs, service/DB lifecycle, emergency ops
- npm publish-ready packaging + README EN/DE parity + GitHub Pages install configurator (16 clients)
- 505 automated tests; live UAT 32/32 against Coolify 4.1.2

### What Worked

- Vertical MVP phases — each phase agent-testable before next layer
- Action-based tool schema kept surface at 10 tools vs 60+ granular alternatives
- Handler-level integration tests caught cross-phase wiring (hints, logs_available, reveal)
- Live API spikes before implementing (SVC-04 deferral, deployment envelope fix, docker_cleanup)
- docs-parity test locked README ↔ code action table

### What Was Inefficient

- REQUIREMENTS.md traceability drifted — 13 rows stale until milestone archive
- Phase 1 named "Multi-Instance" but scoped single-instance — naming confused audit
- Debug session files left open after fixes (07-04, 07-05)
- Nyquist validation incomplete on Phases 1 and 7 despite verification passed

### Patterns Established

- `buildReadResponse` uniform envelope with `_meta`, pagination, `max_chars` guard
- `COOLIFY_*` error codes + recovery hints on every failure path
- No stub tools for missing Coolify API endpoints
- Confirm gate only on emergency tool; preview block on `confirm: false`
- Coolify 4.1.x API quirks documented in spikes + debug notes

### Key Lessons

1. Spike missing API endpoints before planning tools — saved shipping broken SVC-04
2. Update traceability at phase verify, not at milestone close
3. Child-process MCP schema regression test catches SDK `additionalProperties:false` traps
4. `environment_id` → project name index required for Coolify 4.1.x read projections

### Cost Observations

- Timeline: 5 days (2026-07-12 → 2026-07-16)
- 7 phases, 37 plans, ~16.8k LOC TypeScript
- yolo mode + vertical slices enabled fast ship with deferred scope

---

## Milestone: v2.0 — Creation & CRUD

**Shipped:** 2026-07-21
**Phases:** 6 (8–13) | **Plans:** 36 | **Requirements:** 50/50

### What Was Built

- Full infrastructure CRUD: `private_key`, `server`, `project`, `environment`, `application`, `service`, `database`
- Cross-cutting SAF patterns: confirm gates, safe delete defaults, Zod validation, secret masking
- `envs:*` CRUD + bulk-update + app-only `.env` smart-sync with conflict policies
- `backup:*` schedule management with S3 masking and execution history
- 835 automated tests; 14 MCP tools; live UAT on puzzlesstool.online

### What Worked

- Phase 10 SAF patterns reused as canonical reference in Phases 11–13
- Wave 0 RED `it.fails` scaffolds kept husky green during TDD flips
- Handler-level integration tests caught cross-tool wiring (env masking, compose base64)
- Gap-closure phases (11-06) for live API quirks without blocking ship
- Milestone audit + integration checker validated 7/7 E2E flows before close

### What Was Inefficient

- REQUIREMENTS traceability drifted until audit cleanup (KEY/SRV rows stale)
- ROADMAP Phase 12 plan checkboxes lagged behind shipped code
- Nyquist validation incomplete on Phases 8–11, 13 (only Phase 12 fully compliant)
- Phase directories archived mid-milestone — init.manager lost phase visibility

### Patterns Established

- Transparent compose base64 encode/decode (agent never sees base64)
- D-12 public-access confirm gate on database create/update
- App-only `envs:sync` with dry_run, conflict_policy, always-masked disposition
- `projectServiceCompose` 3-step fallback for Coolify 4.1.2 plain-YAML responses
- `backup-shared.ts` centralizes frequency schemas, S3 masking, confirm gates

### Key Lessons

1. Sync traceability checkboxes at phase verify, not milestone close
2. Live API spikes before planning — saved shipping broken compose projection (G-11-3/4)
3. Reuse SAF reference from Phase 10 — reduced safety regressions in later CRUD phases
4. Optional live UAT script valuable for human_needed verification gaps

### Cost Observations

- Timeline: 5 days (2026-07-16 → 2026-07-21) for v2.0; 9 days total project
- 6 phases, 36 plans, ~33.5k LOC TypeScript
- yolo mode + vertical slices enabled parallel phase execution

---

## Milestone: v3.0 — Platform Foundation

**Shipped:** 2026-07-23
**Phases:** 4 (15–18) | **Plans:** 18 | **Tasks:** 35
**Closeout:** `override_closeout` (4 deferred todos)

### What Was Built

- Multi-instance registry + per-request `instance` routing on all API tools; soft-start without credentials
- Coolify Cloud path (`isCloudUrl`, cloud error codes/hints, `instance.cloud-info`) + MCP list branding
- Workspace `.coolify/manifest.json` with sync/diff, auto-gitignore, stale-404 hints, mutation auto-hooks
- Live UAT harness (`npm run uat:live`) — matrix-driven stdio + in-process runners, JSON/Markdown reports

### What Worked

- Wave 0 `it.fails` RED scaffolds kept husky green across Phases 15–18
- Reusing `resolveCredentials` / strip-before-parse kept strict Zod schemas intact under routing
- Manifest as cache (404 hints only) avoided mid-call auto-sync complexity
- Hybrid UAT (stdio + in-process) covers wire protocol and handler paths without shipping harness in npm tarball

### What Was Inefficient

- Milestone audit ran mid-milestone (2026-07-21) and went stale — close used override + phase verifications
- Pending todo files for shipped work (manifest, cloud) left open until close acknowledgment
- ROADMAP Phase 18 checkbox lagged until milestone close
- Phase 18 verification left 4 `human_needed` live paths (credentials/fixtures required)

### Patterns Established

- Soft-start MCP boot + COOLIFY_NO_INSTANCE envelope when no creds
- Per-request credential resolution; never mix env URL with registry token
- Cloud classification from request URL (no module-level mutable flag)
- Dedicated domain tools for platform concerns (`instance`, `manifest`)
- Maintainer-only live UAT script outside npm `files` allowlist

### Key Lessons

1. Re-run `/gsd-audit-milestone` after final phase — mid-milestone audit is not close evidence
2. Close or resolve pending todos when their phase ships (don't wait for milestone close)
3. Document client limitations (D-09 Cursor icons) as verified outcomes, not open bugs
4. Live UAT harness is the right home for `human_needed` truths — keep them out of unit gates

### Cost Observations

- Timeline: ~3 days (2026-07-21 → 2026-07-23)
- 4 phases, 18 plans, ~35.6k LOC TypeScript in `src/`
- yolo mode + phase branches; closeout deferred 4 backlog todos to v3.1 / OpenAPI work

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Days | Phases | Key Change |
|-----------|------|--------|------------|
| v1.0 | 5 | 7 | Vertical MVP slices + action-based tools |
| v2.0 | 5 | 6 | CRUD + SAF canonical patterns + env/backup layers |
| v3.0 | 3 | 4 | Multi-instance + cloud + manifest + live UAT harness |

### Cumulative Quality

| Milestone | Tests | Build | Live UAT |
|-----------|-------|-------|----------|
| v1.0 | 505 | green | 32/32 |
| v2.0 | 835 | green | optional script passed |
| v3.0 | ~955+ | green | `npm run uat:live` harness shipped |

### Top Lessons (Verified Across Milestones)

1. No stub tools for missing APIs — defer explicitly
2. Integration tests at handler level catch cross-phase wiring early
3. Update traceability at phase verify, not milestone close
4. Reuse SAF reference implementation across CRUD phases
5. Mid-milestone audits go stale — re-audit before close or accept override

---

