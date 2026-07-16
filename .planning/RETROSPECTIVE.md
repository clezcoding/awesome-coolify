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

## Cross-Milestone Trends

### Process Evolution

| Milestone | Days | Phases | Key Change |
|-----------|------|--------|------------|
| v1.0 | 5 | 7 | Vertical MVP slices + action-based tools |

### Cumulative Quality

| Milestone | Tests | Build | Live UAT |
|-----------|-------|-------|----------|
| v1.0 | 505 | green | 32/32 |

### Top Lessons (Verified Across Milestones)

1. No stub tools for missing APIs — defer explicitly
2. Integration tests at handler level catch cross-phase wiring early

---
