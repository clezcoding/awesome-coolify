# Roadmap: Coolify MCP Server

## Milestones

- ✅ **v1.0 Ops MVP** — Phases 1–7 (shipped 2026-07-16) → [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v2.0 Creation & CRUD** — Phases 8–13 (shipped 2026-07-21) → [archive](milestones/v2.0-ROADMAP.md)
- 📋 **v3.0+** — Not planned yet → `/gsd-new-milestone`

## Phases

<details>
<summary>✅ v1.0 Ops MVP (Phases 1–7) — SHIPPED 2026-07-16</summary>

- [x] Phase 1: Foundation & Multi-Instance Auth (5/5) — completed 2026-07-12
- [x] Phase 2: Discovery & Read Projections (5/5) — completed 2026-07-12
- [x] Phase 3: Diagnose & Issue Scan (7/7) — completed 2026-07-12
- [x] Phase 4: App Deploy Lifecycle (5/5) — completed 2026-07-13
- [x] Phase 5: Logs & Service/DB Ops (5/5) — completed 2026-07-16 (SVC-04 deferred v1.1)
- [x] Phase 6: Bulk, Emergency & Safety (3/3) — completed 2026-07-16
- [x] Phase 7: Distribution & Docs (7/7) — completed 2026-07-16

Full phase details: [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)

</details>

<details>
<summary>✅ v2.0 Creation & CRUD (Phases 8–13) — SHIPPED 2026-07-21</summary>

- [x] Phase 8: Keys & Server CRUD (5/5) — completed 2026-07-16
- [x] Phase 9: Project & Environment CRUD (6/6) — completed 2026-07-18
- [x] Phase 10: Application CRUD & Safety (5/5) — completed 2026-07-19
- [x] Phase 11: Service & Database CRUD (7/7) — completed 2026-07-19
- [x] Phase 12: Environment Variables & Smart Sync (7/7) — completed 2026-07-21
- [x] Phase 13: Database Backups (5/5) — completed 2026-07-21

Full phase details: [milestones/v2.0-ROADMAP.md](milestones/v2.0-ROADMAP.md)

</details>

## Progress

| Phase | Milestone | Status | Completed |
|-------|-----------|--------|-----------|
| 1–7 | v1.0 | Complete | 2026-07-16 |
| 8–13 | v2.0 | Complete | 2026-07-21 |

**Next:** Run `/gsd-new-milestone` to define v3.0 scope.

---

## Backlog

> Items here are unsequenced. Promote with `/gsd-review-backlog` when ready for active planning.

### Phase 999.1: Feasibility Audit — Milestone-Ideen Jul 2026 (BACKLOG)

**Gate:** ✅ v2.0 shipped 2026-07-21 — eligible for promotion via `/gsd-review-backlog`.

**Goal:** Capture explore-session feasibility findings for four post-v2.0 ideas; use as input for v3.0 milestone scoping.

**Requirements:** TBD (promote to REQ-IDs when v3.0 is opened)

**Plans:** 0 plans

**Findings summary:**

| Idea | Verdict | Blocker / Dependency |
|------|---------|----------------------|
| Coolify Cloud MCP support | ✅ Likely works today (`COOLIFY_URL=https://app.coolify.io`) | Docs/branding + live smoke test |
| Standard-Setup Tool (incl. `gh` repo create) | ✅ API ready; MCP Create-CRUD needed first | v2.0 Phases 8–11; GitHub CLI preflight |
| Custom Skills pro IDE | ✅ Pure DX, no API | Content + per-IDE install paths |
| Lokale Manifest-Datei (UUIDs, Domains) | ✅ Agent-side only | Schema + `.gitignore` convention |

**Setup-Tool design note (Idee 2):** On first invoke, preflight `gh` CLI — check installed + authenticated. If missing, emit step-by-step setup guide and pause until user confirms ready. Repo creation via `gh repo create`; Coolify wiring via existing GitHub App + Create endpoints (post-v2.0).

Plans:

- [ ] TBD (promote with `/gsd-review-backlog`)

---
*Last updated: 2026-07-21 after v2.0 milestone shipped*
