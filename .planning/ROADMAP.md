# Roadmap: Coolify MCP Server

## Milestones

- ✅ **v1.0 Ops MVP** — Phases 1–7 (shipped 2026-07-16) → [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v2.0 Creation & CRUD** — Phases 8–13 (shipped 2026-07-21) → [archive](milestones/v2.0-ROADMAP.md)
- ✅ **v3.0 Platform Foundation** — Phases 15–18 (shipped 2026-07-23) → [archive](milestones/v3.0-ROADMAP.md)
- ✅ **v3.1 Setup, Skills & DX** — Phases 19–23 + 23.1 (shipped 2026-07-27) → [archive](milestones/v3.1-ROADMAP.md)
- 🚧 **v3.2 Observability & DX** — Phases 24–27 (in progress)

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

<details>
<summary>✅ v3.0 Platform Foundation (Phases 15–18) — SHIPPED 2026-07-23</summary>

- [x] Phase 15: Multi-Instance Registry & Routing (5/5) — completed 2026-07-21
- [x] Phase 16: Coolify Cloud & Server Branding (5/5) — completed 2026-07-22
- [x] Phase 17: Local Manifest & Sync (4/4) — completed 2026-07-22
- [x] Phase 18: Live UAT Harness (4/4) — completed 2026-07-23

Full phase details: [milestones/v3.0-ROADMAP.md](milestones/v3.0-ROADMAP.md)

</details>

<details>
<summary>✅ v3.1 Setup, Skills & DX (Phases 19–23 + 23.1) — SHIPPED 2026-07-27</summary>

- [x] Phase 19: DX Schemas & MCP Prompts (3/3) — completed 2026-07-24
- [x] Phase 20: Recipes & Service List-Types (5/5) — completed 2026-07-25
- [x] Phase 21: Deploy Watch (5/5) — completed 2026-07-25
- [x] Phase 22: Setup Wizard & IDE Skills (4/4) — completed 2026-07-27
- [x] Phase 23: OpenAPI Coverage & npm Release (5/5) — completed 2026-07-27
- [x] Phase 23.1: set_env + Nyquist validation (5/5) — completed 2026-07-27 (INSERTED)

Full phase details: [milestones/v3.1-ROADMAP.md](milestones/v3.1-ROADMAP.md)

</details>

### 🚧 v3.2 Observability & DX (In Progress)

**Milestone Goal:** App/deployment log observability, capability discovery, incident flows, and MCP branding — Coolify 4.1.2 only (no service/DB logs).

- [x] **Phase 24: Capabilities & Deployment Logs** - `system.version` capability flags + `deployment.logs` action (completed 2026-07-27)
- [ ] **Phase 25: Application Log Follow** - Bounded watch-style app log follow + no regression on existing logs
- [ ] **Phase 26: Diagnose Logs & Incident DX** - `diagnose.logs` + incident prompt + coolify-setup skill updates
- [ ] **Phase 27: Branding & Docs Stale Fix** - MCP icon workarounds + npm 1.0.1 docs parity

## Phase Details

### Phase 24: Capabilities & Deployment Logs

**Goal**: Agent discovers Coolify 4.1.2 capabilities via `system.version` and fetches deployment build logs via a dedicated `deployment.logs` action
**Depends on**: Nothing (first v3.2 phase; foundation for follow/diagnose)
**Requirements**: CAP-01, CAP-02, OBS-01
**Success Criteria** (what must be TRUE):

  1. Agent calls `system.version` and receives both Coolify server version and `awesome-coolify-mcp` package version
  2. `system.version` returns capability flags for features known on Coolify 4.1.2 (`application_logs`, `deployment_watch`, `deploy_watch`, etc.) so agents skip unsupported APIs
  3. Agent fetches deployment build logs via `deployment.logs` by `deployment_uuid` without routing through `application.logs`

**Plans:** 4/4 plans complete

Plans:
**Wave 1**

- [x] 24-00-PLAN.md — Wave 0 Nyquist RED scaffolds (system/meta/deployment.logs/errors + coverage-map row)
- [x] 24-01-PLAN.md — CAP-01/CAP-02: system.version + capabilities + package version (D-07 gate)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 24-02-PLAN.md — OBS-01: deployment.logs + shared build-log processor + NO_DEPLOYMENTS

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 24-03-PLAN.md — Coverage regen + README EN/DE + deploy prompt discovery

### Phase 25: Application Log Follow

**Goal**: Agent can follow application runtime logs with bounded polling (watch-style) while existing `application.logs` paths stay unchanged
**Depends on**: Phase 24
**Requirements**: OBS-02, OBS-03
**Success Criteria** (what must be TRUE):

  1. Agent follows application logs with bounded polling until timeout or terminal condition (`application.logs:follow` or equivalent)
  2. Existing `application.logs` runtime path (by app uuid) still returns bounded logs unchanged
  3. Existing `application.logs` build path (by `deployment_uuid`) still returns build logs unchanged

**Plans**: TBD

### Phase 26: Diagnose Logs & Incident DX

**Goal**: Agent gets a one-shot diagnose+logs shortcut and updated incident/setup guidance for app-only log troubleshooting
**Depends on**: Phase 25
**Requirements**: DIAG-01, PROMPT-01, SKILL-01
**Success Criteria** (what must be TRUE):

  1. Agent calls `diagnose.logs` for an application and receives diagnose triage plus a bounded log tail in one action
  2. MCP prompt `incident` documents `deployment.logs`, application log follow, and `diagnose.logs` (application-only; no service/DB log steps)
  3. `coolify-setup` skill documents app log troubleshooting, capability discovery via `system.version`, and links to incident/deploy/diagnose skills

**Plans**: TBD

### Phase 27: Branding & Docs Stale Fix

**Goal**: MCP advertise icon workarounds and public docs reflect shipped npm `1.0.1` without stale pending-release wording
**Depends on**: Phase 26
**Requirements**: BRND-01, BRND-02, DOC-01
**Success Criteria** (what must be TRUE):

  1. MCP `initialize` advertises icons via spec-compliant workarounds (data URI and/or multi-size PNG entries)
  2. Maintainer re-verify gate documents outcome for Cursor `dist/` and npm (`npx awesome-coolify-mcp`) paths; client limitation accepted if UI still omits custom icon
  3. PROJECT.md and README EN/DE reflect npm `1.0.1` shipped state (no stale “pending Version Packages” wording)

**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1–7 | v1.0 | 37/37 | Complete | 2026-07-16 |
| 8–13 | v2.0 | 36/36 | Complete | 2026-07-21 |
| 14 | v3.0 | 0/0 | Archived (feasibility audit) | 2026-07-21 |
| 15 | v3.0 | 5/5 | Complete | 2026-07-21 |
| 16 | v3.0 | 5/5 | Complete | 2026-07-22 |
| 17 | v3.0 | 4/4 | Complete | 2026-07-22 |
| 18 | v3.0 | 4/4 | Complete | 2026-07-23 |
| 19 | v3.1 | 3/3 | Complete | 2026-07-24 |
| 20 | v3.1 | 5/5 | Complete | 2026-07-25 |
| 21 | v3.1 | 5/5 | Complete | 2026-07-25 |
| 22 | v3.1 | 4/4 | Complete | 2026-07-27 |
| 23 | v3.1 | 5/5 | Complete | 2026-07-27 |
| 23.1 | v3.1 | 5/5 | Complete | 2026-07-27 |
| 24 | v3.2 | 4/4 | Complete    | 2026-07-27 |
| 25 | v3.2 | 0/? | Not started | - |
| 26 | v3.2 | 0/? | Not started | - |
| 27 | v3.2 | 0/? | Not started | - |

**Next:** `/gsd-plan-phase 24`

---

*Last updated: 2026-07-27 — v3.2 Observability & DX roadmap created (Phases 24–27)*
