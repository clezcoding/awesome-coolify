# Roadmap: Coolify MCP Server

## Milestones

- ✅ **v1.0 Ops MVP** — Phases 1–7 (shipped 2026-07-16) → [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v2.0 Creation & CRUD** — Phases 8–13 (shipped 2026-07-21) → [archive](milestones/v2.0-ROADMAP.md)
- ✅ **v3.0 Platform Foundation** — Phases 15–18 (shipped 2026-07-23) → [archive](milestones/v3.0-ROADMAP.md)
- 📋 **v3.1 Setup, Skills & DX** — Phases 19–23 (planned)

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

### 📋 v3.1 Setup, Skills & DX (Planned)

- [x] **Phase 19: DX Schemas & MCP Prompts** - Flat tool schemas + action catalogs + prompts registry (deploy/diagnose/new-project/incident) (completed 2026-07-24)
- [x] **Phase 20: Recipes & Service List-Types** - Dynamic `service.list-types` + recipes (git-app, app+db, one-click) from Coolify catalog (completed 2026-07-25)
- [x] **Phase 21: Deploy Watch** - Non-blocking `deployment.watch` action with backoff/timeout + skill/prompt docs (completed 2026-07-25)
- [x] **Phase 22: Setup Wizard & IDE Skills** - Headless-safe `gh` preflight + Coolify wiring wizard + Cursor/Claude Code/Codex skill packs (completed 2026-07-27)
- [x] **Phase 23: OpenAPI Coverage & npm Release** - Coverage map (Coolify OpenAPI → MCP surface/gaps) + maintainer OIDC Release publish (completed 2026-07-27)

## Phase Details

### Phase 19: DX Schemas & MCP Prompts

**Goal**: Agent sees rich action catalogs and visible parameters in every tool, and can invoke parameterized MCP prompts for the four canonical workflows
**Depends on**: Nothing (first v3.1 phase; foundation for wizard/skills)
**Requirements**: DX-01, DX-02, PROMPT-01, PROMPT-02, PROMPT-03, PROMPT-04
**Success Criteria** (what must be TRUE):

  1. Agent opens any Coolify MCP tool in Cursor and sees action names plus key parameters in the description (no empty `properties: {}` UI)
  2. Agent can call every existing tool with parameters visible at the top-level schema shape while action routing still works
  3. User/agent invokes MCP prompt `deploy` and receives parameterized guidance covering deploy + watch flow
  4. User/agent invokes MCP prompts `diagnose`, `new-project`, and `incident` and each returns workflow guidance with the right arguments

**Plans**:
3/3 plans executed

- [x] 19-01-PLAN.md — Flat schema helper + migrate all 17 domain tools to flat z.object + co-located actionsCatalog/safetyFooter constants

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 19-02-PLAN.md — Compose tool descriptions from catalogs + ship MCP prompts registry (deploy/diagnose/new-project/incident) + tests + docs

**Wave 3** *(gap closure — fixes CR-01 BLOCKER + D-05 catalog completeness)*

- [x] 19-03-PLAN.md — Align actionsCatalog constants with schema field names (env_uuid/entries, no wildcards) + regression test

**UI hint**: yes

### Phase 20: Recipes & Service List-Types

**Goal**: Agent discovers Coolify one-click service types dynamically and runs recipes that wire real applications + databases without a forked YAML catalog
**Depends on**: Phase 19 (flat schemas make recipe outputs agent-callable)
**Requirements**: RECIPE-01, RECIPE-02, RECIPE-03, RECIPE-04
**Success Criteria** (what must be TRUE):

  1. Agent calls `service.list-types` and receives the active Coolify instance's one-click service types (no local YAML catalog maintained)
  2. Agent runs recipe `git-app` end-to-end: detects build_pack from a git repo and creates/wires an application on the target Coolify instance
  3. Agent runs recipe `app+db` end-to-end: creates application + database and wires `DATABASE_URL` (or equivalent) env between them
  4. Agent runs recipe `one-click`: creates a service from a type returned by `list-types` on the target instance

**Plans**: 5/5 plans executed

Plans:
**Wave 1**

- [x] 20-00-PLAN.md — Wave 0 RED scaffolds for recipe.test.ts (create-git-app, create-app-db, create-one-click) via dynamic import + it.fails husky pattern
- [x] 20-01-PLAN.md — Wave 1 service.list-types (RECIPE-01): fetchServiceTemplates helper (CDN + GitHub Raw fallback, version pin, hard error) + slim { id, label }[] response

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 20-02-PLAN.md — Wave 2 recipe tool foundation (RECIPE-02, RECIPE-04): create-git-app with build_pack detection + create-one-click with type validation against list-types; create-app-db stubs to COOLIFY_NOT_IMPLEMENTED

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 20-03-PLAN.md — Wave 3 create-app-db wiring (RECIPE-03) + recipe tool registration in server.ts + README docs

**Wave 4** *(gap_closure — blocked on Wave 3)*

- [x] 20-04-PLAN.md — Gap D-20 / truth #14: append MANIFEST_HINT on create-git-app Zod + CoolifyApiError paths + recipe.test.ts D-20 assertion

**UI hint**: yes

### Phase 21: Deploy Watch

**Goal**: Agent monitors a deployment to terminal status without blocking the MCP session or storming the Coolify API
**Depends on**: Phase 19 (prompts/skills can reference watch); reuses deploy-poll patterns from v1
**Requirements**: WATCH-01, WATCH-02
**Success Criteria** (what must be TRUE):

  1. Agent calls `deployment.watch` with a deployment uuid and the action returns when the deployment reaches a terminal status or the bounded timeout elapses
  2. Polling uses exponential backoff with jitter and a minimum interval — no 429 storms against Coolify during long builds
  3. Skill and/or prompt documents `deployment.watch` usage including non-blocking behavior, timeout, and recovery guidance

**Plans**: 5/5 plans executed

Plans:
**Wave 1**

- [x] 21-00-PLAN.md — Wave 0 RED scaffolds (deploy-watch-poll + deployment.watch + deploy prompt)
- [x] 21-01-PLAN.md — Backoff/jitter poll helper + 429 Retry-After attach

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 21-02-PLAN.md — deployment.watch action + dual-signal error codes

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 21-03-PLAN.md — deploy prompt + README EN/DE Watch docs

**Wave 4** *(gap_closure — blocked on Wave 3)*

- [x] 21-04-PLAN.md — Clamp sleep to remaining timeout (CR-01/WR-01) + include_logs success test (WR-02)

### Phase 22: Setup Wizard & IDE Skills

**Goal**: A new user runs one setup flow that verifies `gh`, wires Coolify project/environment/server linkage, and ships consistent Coolify skill packs across Cursor, Claude Code, and Codex
**Depends on**: Phase 19 (flat schemas + prompts), Phase 20 (list-types/recipes used by wizard), Phase 21 (watch referenced by skills)
**Requirements**: SETUP-01, SETUP-02, SETUP-03, SKILL-01, SKILL-02
**Success Criteria** (what must be TRUE):

  1. User runs setup flow and, if `gh` is missing or unauthenticated, receives install/login guidance without the agent blocking indefinitely on a TTY
  2. Setup wizard wires a Coolify project + environment + server linkage and updates the workspace `.coolify/manifest.json` accordingly
  3. Setup supports a non-interactive / ask-human pause path so an agent can resume after the user completes `gh auth`
  4. Repo ships Coolify skill packs for Cursor, Claude Code, and Codex with consistent workflows
  5. Skills document recipes, deploy watch, prompts, and safety rules (confirm gates, reveal opt-in)

**Plans**: 4/4 plans executed

Plans:
**Wave 1**

- [x] 22-00-PLAN.md — Wave 0 RED scaffolds (gh-preflight, setup pause/resume, skills manifest tests)
- [x] 22-01-PLAN.md — Tracer: setup preflight/resume + server registration + coolify-setup skill

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 22-02-PLAN.md — wire link-existing/greenfield, optional flags, deploy_and_watch bounded

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 22-03-PLAN.md — Remaining skills + docs (install, setup guide, README EN/DE)

**UI hint**: yes

### Phase 23: OpenAPI Coverage & npm Release

**Goal**: Maintainer can audit MCP surface against the official Coolify OpenAPI and trigger a Release that publishes `awesome-coolify-mcp` to npm via OIDC trusted publishing
**Depends on**: Phase 19–22 (audits the complete extended surface; publishes the v3.1 tarball)
**Requirements**: OAPI-01, OAPI-02, PUB-01, PUB-02
**Success Criteria** (what must be TRUE):

  1. Maintainer runs coverage tooling that maps Coolify OpenAPI paths/operations to the MCP/client surface
  2. Coverage tooling produces a gap report available as a committed artifact and/or CI output
  3. Maintainer-triggered Release workflow publishes `awesome-coolify-mcp` to npm via OIDC / trusted publishing
  4. Published tarball excludes the UAT harness, secrets, and non-package paths (allowlist verified)

**Plans**: 5/5 plans executed

Plans:
**Wave 1**

- [x] 23-00-PLAN.md — Wave 0 RED scaffolds (openapi-coverage + npm-pack allowlist it.fails)
- [x] 23-01-PLAN.md — Tracer: minimal 3-layer generator → COVERAGE.md → --check (Scalar human-verify)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 23-02-PLAN.md — Full coverage-map + v4.1.2 OpenAPI pin + OPENAPI.md provenance
- [x] 23-03-PLAN.md — PUB-02 npm pack --dry-run forbidden-path gate

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 23-04-PLAN.md — PUB-01 milestone Changeset 1.0.0 (decision gate + trusted publisher verify)

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
| 19 | v3.1 | 3/3 | Complete    | 2026-07-24 |
| 20 | v3.1 | 5/5 | Complete    | 2026-07-25 |
| 21 | v3.1 | 5/5 | Complete    | 2026-07-25 |
| 22 | v3.1 | 4/4 | Complete    | 2026-07-27 |
| 23 | v3.1 | 5/5 | Complete    | 2026-07-27 |

**Next:** `/gsd-discuss-phase 23` — OpenAPI Coverage & npm Release

---

*Last updated: 2026-07-27 — Phase 22 shipped (PR #87, follow-up PR #88)*

### Phase 23.1: Address tech debt: set_env + Nyquist validation (INSERTED)

**Goal:** Close set_env no-op via application envs:sync delegation and earn Nyquist validation for v3.1 phases 19–23 (100% REQ-row coverage) before milestone close
**Requirements**: SETUP-02 (primary); Nyquist reconciliation for DX-01/02, PROMPT-01..04, RECIPE-01..04, WATCH-01/02, SETUP-01/03, SKILL-01/02, OAPI-01/02, PUB-01/02
**Depends on:** Phase 23
**Plans:** 5/5 plans executed

Plans:
**Wave 1**

- [x] 23.1-01-PLAN.md — Tracer: set_env → envs:sync + green tests (SETUP-02)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 23.1-02-PLAN.md — Nyquist validate-phase 19→21 (DX/PROMPT/RECIPE/WATCH)
- [x] 23.1-04-PLAN.md — Docs/skills: env_file XOR env_content for set_env

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 23.1-03-PLAN.md — Nyquist validate-phase 22→23 (SETUP/SKILL/OAPI/PUB)

**Wave 4** *(gap closure — D-05/D-07 conflict stop)*

- [x] 23.1-05-PLAN.md — Omit conflict_policy + fix conflict test + align docs/skill (CR-01)
