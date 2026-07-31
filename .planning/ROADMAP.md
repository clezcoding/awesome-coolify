# Roadmap: Coolify MCP Server

## Milestones

- ✅ **v1.0 Ops MVP** — Phases 1–7 (shipped 2026-07-16) → [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v2.0 Creation & CRUD** — Phases 8–13 (shipped 2026-07-21) → [archive](milestones/v2.0-ROADMAP.md)
- ✅ **v3.0 Platform Foundation** — Phases 15–18 (shipped 2026-07-23) → [archive](milestones/v3.0-ROADMAP.md)
- ✅ **v3.1 Setup, Skills & DX** — Phases 19–23 + 23.1 (shipped 2026-07-27) → [archive](milestones/v3.1-ROADMAP.md)
- ✅ **v3.2 Observability & DX** — Phases 24–27 (shipped 2026-07-29) → [archive](milestones/v3.2-ROADMAP.md)
- 🚧 **v3.3 Agent Intelligence** — Phases 28–31 (in progress)

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

<details>
<summary>✅ v3.2 Observability & DX (Phases 24–27) — SHIPPED 2026-07-29</summary>

- [x] Phase 24: Capabilities & Deployment Logs (4/4) — completed 2026-07-27
- [x] Phase 25: Application Log Follow (6/6) — completed 2026-07-28
- [x] Phase 26: Diagnose Logs & Incident DX (4/4) — completed 2026-07-28
- [x] Phase 27: Branding & Docs Stale Fix (4/4) — completed 2026-07-29

Full phase details: [milestones/v3.2-ROADMAP.md](milestones/v3.2-ROADMAP.md)

</details>

### 🚧 v3.3 Agent Intelligence (Phases 28–31)

**Milestone Goal:** Composite intelligence layer on existing Coolify 4.1.x tools — agents reason about risk, drift, dependencies, and remediation without new REST endpoints.

- [x] **Phase 28: Instance Intelligence** - Scorecard, dependency graph, and safe resource janitor (completed 2026-07-30)
- [x] **Phase 29: Drift & Heal** - Manifest audit, env promotion, and remediation hints (completed 2026-07-30)
- [ ] **Phase 30: Deploy Guard** - Preflight checks, risk scoring, and rollback
- [ ] **Phase 31: Agent Playbooks** - Log brain, ops playbooks, and smart recipes

## Phase Details

### Phase 28: Instance Intelligence

**Goal**: Agent can assess instance health, map resource dependencies, and identify safe cleanup candidates
**Depends on**: Phase 27 (v3.2 shipped)
**Requirements**: INTEL-01, INTEL-02, GRAPH-01, GRAPH-02, JANI-01, JANI-02
**Success Criteria** (what must be TRUE):

  1. Agent fetches per-instance health scorecard with factor breakdown (deployments, backups, exited resources, diagnose.scan summary) and severity-tagged findings with recovery hints
  2. Agent builds live dependency graph from resources showing application ↔ database ↔ service links
  3. Agent queries impact analysis before delete or restart ("what breaks if resource X goes down")
  4. Agent lists orphaned, stopped, or long-exited resources with safe cleanup suggestions
  5. Janitor destructive cleanup mutations blocked without explicit confirm gate per SAF pattern

**Plans:** 5/5 plans complete

Plans:

- [x] 28-00-PLAN.md — Wave 0 Nyquist RED scaffolds for INTEL/GRAPH/JANI
- [x] 28-01-PLAN.md — Tracer: intelligence tool + UUID graph + server registration
- [x] 28-02-PLAN.md — Scorecard composite factors + findings + soft partials
- [x] 28-03-PLAN.md — Advisory impact + read-only janitor
- [x] 28-04-PLAN.md — Confirm-gated cleanup + capabilities/docs (D-13 gate)

### Phase 29: Drift & Heal

**Goal**: Agent can detect configuration drift between local manifest and live state and receive actionable remediation guidance
**Depends on**: Phase 28
**Requirements**: DRIFT-01, DRIFT-02, DRIFT-03
**Success Criteria** (what must be TRUE):

  1. Agent runs manifest audit comparing local `.coolify/manifest.json` vs live Coolify state with remediation steps
  2. Agent compares environment variables across environments and receives promotion suggestions via `env.promote`
  3. Audit and drift results include concrete fix hints, not raw diff only

**Plans**: 4/4 plans complete

- [x] 29-00-PLAN.md
- [x] 29-01-PLAN.md
- [x] 29-02-PLAN.md
- [x] 29-03-PLAN.md

### Phase 30: Deploy Guard

**Goal**: Agent can assess deploy risk before mutation and recover from failed deployments
**Depends on**: Phase 29
**Requirements**: GUARD-01, GUARD-02, GUARD-03
**Success Criteria** (what must be TRUE):

  1. Agent runs deploy preflight before mutation covering instance health, env completeness, recent deployment failures, and DNS readiness
  2. Preflight returns deploy risk score with named factor breakdown
  3. Agent rolls back an application to its last successful deployment

**Plans**: 4/4 plans executed

Plans:

- [x] 30-00-PLAN.md — Wave 0 Nyquist RED scaffolds for GUARD preflight/rollback
- [x] 30-01-PLAN.md — Tracer: deployment.preflight + deploy-preflight util (GUARD-01/02)
- [x] 30-02-PLAN.md — deployment.rollback composite with confirm gate (GUARD-03)
- [x] 30-03-PLAN.md — Capabilities, coverage map, README EN/DE

### Phase 31: Agent Playbooks

**Goal**: Agent can analyze logs via rule-based patterns, follow orchestrated playbooks, and get smart stack recommendations
**Depends on**: Phase 30
**Requirements**: BRAIN-01, BRAIN-02, PLAY-01, PLAY-02, SREC-01, SREC-02
**Success Criteria** (what must be TRUE):

  1. Agent analyzes existing application runtime logs for rule-based patterns (OOM, 5xx spike, crash loop, connection refused) with severity and suggested next actions
  2. Log analysis links to diagnose and playbook flows — no ML/statistical anomaly detection
  3. Parameterized MCP prompts exist for incident response, rollback, and maintenance-window flows composing existing atomic tools
  4. Agent requests stack recommendation (e.g. "Next.js + Postgres") and receives one-click service + env + deploy plan from live `service.list-types` catalog

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
| 24 | v3.2 | 4/4 | Complete | 2026-07-27 |
| 25 | v3.2 | 6/6 | Complete | 2026-07-28 |
| 26 | v3.2 | 4/4 | Complete | 2026-07-28 |
| 27 | v3.2 | 4/4 | Complete | 2026-07-29 |
| 28 | v3.3 | 5/5 | Complete    | 2026-07-30 |
| 29 | v3.3 | 4/4 | Complete   | 2026-07-30 |
| 30 | v3.3 | 4/4 | In Progress|  |
| 31 | v3.3 | 0/TBD | Not started | - |

**Next:** `/gsd-execute-phase 30` — Deploy Guard (preflight, risk score, rollback)

---

*Last updated: 2026-07-30 — v3.3 Agent Intelligence roadmap created (Phases 28–31)*
