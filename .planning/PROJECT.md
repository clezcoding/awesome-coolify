# Coolify MCP Server

## What This Is

Open-Source MCP-Server für Coolify (API 4.1.x) — self-hosted und Coolify Cloud. Package `awesome-coolify-mcp` **1.1.2** shipped, public repo `clezcoding/awesome-coolify`. Agent kann deployen, Logs lesen, diagnostizieren, Emergency-Ops, volle Infrastruktur-CRUD, Multi-Instance-Routing, lokale Manifest-Caches, Setup-Wizard + IDE-Skills, Recipes, Deploy-Watch, OpenAPI-Coverage-Audit, und Live-UAT gegen echte Coolify-Daten.

## Core Value

Ein AI-Agent (Cursor, Claude, etc.) kann über einen einzigen, gut dokumentierten MCP-Server Coolify-Instanzen operieren — deployen, Logs lesen, Probleme diagnostizieren, und Infrastruktur von Grund auf anlegen — ohne Workarounds oder drei parallele MCP-Implementierungen.

## Current State (v3.2 shipped 2026-07-29)

| Metric | Value |
|--------|-------|
| Package | `awesome-coolify-mcp` **1.1.1** |
| Tools / Actions | 19 / ~120 |
| TypeScript LOC | ~36k (`src/`) |
| Milestone | v3.2 Observability & DX — **shipped** (Phases 24–27) |
| Repo | Single public `clezcoding/awesome-coolify` |
| Distribution | OIDC Release path + pack allowlist verified (PUB-02) |
| Live UAT | `npm run uat:live` harness (Phase 18) |

**v3.1 shipped:** Flat MCP schemas + action catalogs + 4 MCP prompts; dynamic `service.list-types` + `recipe` tool; `deployment.watch` with jitter/backoff; setup wizard + 4 IDE skill packs; OpenAPI coverage map (`docs/COVERAGE.md`); npm 1.0.0 Changeset; `set_env` → `envs:sync` delegation (Phase 23.1).

**v3.0 shipped:** Multi-instance registry + routing, Coolify Cloud error/branding path, `.coolify/manifest.json` sync + auto-hooks, live UAT CLI harness.

<details>
<summary>v1.0 baseline metrics (archived)</summary>

| Metric | Value |
|--------|-------|
| Timeline | 2026-07-12 → 2026-07-16 (5 days) |
| Live UAT | 32/32 on https://puzzlesstool.online |
| TypeScript LOC | ~16,800 (src + tests) |

</details>

<details>
<summary>v2.0 milestone metrics (archived)</summary>

| Metric | Value |
|--------|-------|
| Timeline | 2026-07-16 → 2026-07-21 (5 days) |
| Phases | 6 (Phases 8–13) |
| Requirements | 50/50 validated |
| TypeScript LOC | ~33,500 (src + tests) |

</details>

<details>
<summary>v3.0 milestone metrics (archived)</summary>

| Metric | Value |
|--------|-------|
| Timeline | 2026-07-21 → 2026-07-23 (~3 days) |
| Phases | 4 (Phases 15–18) |
| Plans / Tasks | 18 / 35 |
| Requirements | 21/21 validated |
| Closeout | `override_closeout` (4 deferred todos) |

</details>

<details>
<summary>v3.1 milestone metrics (archived)</summary>

| Metric | Value |
|--------|-------|
| Timeline | 2026-07-24 → 2026-07-27 (~4 days) |
| Phases | 6 (19–23 + 23.1) |
| Plans / Tasks | 27 / 62 |
| Requirements | 21/21 validated |
| Closeout | `verified_closeout` (milestone audit passed) |

</details>

<details>
<summary>v3.2 milestone metrics (archived)</summary>

| Metric | Value |
|--------|-------|
| Timeline | 2026-07-27 → 2026-07-29 (~3 days) |
| Phases | 4 (24–27) |
| Plans / Tasks | 18 / 43 |
| Requirements | 11/11 validated |
| Closeout | `verified_closeout` (all phases verified; artifact audit clear) |
| Code delta (src/docs/scripts) | ~42 files, +3.3k / −0.4k LOC |

</details>

## Current Milestone: v3.3 Agent Intelligence

**Goal:** Composite intelligence layer on existing Coolify 4.1.x tools — agents reason about risk, drift, dependencies, and remediation without waiting for Coolify 4.2 log endpoints.

**Target features:**
- Deploy Guard — preflight, risk score, rollback to last green deployment
- Drift & Heal — manifest.audit vs live state, env.promote, remediation hints
- Dependency Map — app↔DB↔service graph, impact before delete/restart
- Log Brain — pattern detection on existing application logs (OOM, 5xx spikes, crash loops)
- Ops Playbooks — parameterized incident/rollback/maintenance MCP prompts
- Smart Recipes — stack description → one-click + env + deploy plan
- Instance Scorecard — per-instance health score with breakdown
- Resource Janitor — orphaned/stopped/exited resources with safe cleanup suggestions

## Next Milestone Goals

- **v3.4 (blocked):** SVC-04/05/06 service/DB/sub-service logs when Coolify 4.2.0+ is stable installable
- **Backlog:** OpenAPI gap rows in `docs/COVERAGE.md` (~57 paths); cross-instance fan-out (deferred)

## Requirements

### Validated (v1.0)

- ✓ MCP-Server TypeScript + `@modelcontextprotocol/sdk` — v1.0 Phase 1
- ✓ Action-basiertes Tool-Schema (10 Domänen-Tools, 32 Actions) — v1.0 Phase 1–7
- ✓ Single-Instance Auth via env (`COOLIFY_URL`/`COOLIFY_TOKEN`) + verify — v1.0 Phase 1 (CTX-01–03, CTX-07)
- ✓ Structured Error Codes + Recovery-Hints + Retry — v1.0 Phase 1 (ERR-01–03)
- ✓ Zod-validated action schemas — v1.0 Phase 1 (DX-01–02)
- ✓ Discovery, Read, Diagnose, Deploy, Logs, Service/DB Ops — v1.0 Phases 2–5
- ✓ Emergency ops + credential masking + confirm gates — v1.0 Phase 6
- ✓ npm publish-ready + README EN/DE + GitHub Pages configurator — v1.0 Phase 7 (DIST-01–03)

### Validated (v2.0)

- ✓ Keys & Server CRUD — v2.0 Phase 8 (KEY-01..05, SRV-01..05)
- ✓ Project & Environment CRUD — v2.0 Phase 9 (PROJ-01..05)
- ✓ Application CRUD & Safety — v2.0 Phase 10 (APP-12..21, SAF-01..04)
- ✓ Service & Database CRUD — v2.0 Phase 11 (SVC-06..10, DB-01..04)
- ✓ Environment Variables & Smart Sync — v2.0 Phase 12 (ENV-01..06)
- ✓ Database Backups — v2.0 Phase 13 (BAK-01..06)

### Validated (v3.0)

- ✓ Multi-Instance Registry & Routing — Phase 15 (CTX-04, CTX-05, CTX-06, CTX-08, CTX-09)
- ✓ Coolify Cloud & Server Branding — Phase 16 (CLD-01, CLD-02, CLD-03, BRND-01, BRND-02, BRND-03)
- ✓ Local Manifest & Sync — Phase 17 (MAN-01, MAN-02, MAN-03, MAN-04)
- ✓ Live UAT CLI harness — Phase 18 (UAT-01..06)

### Validated (v3.1)

- ✓ Flat schemas + action catalogs + MCP prompts — Phase 19 (DX-01, DX-02, PROMPT-01..04)
- ✓ Recipes + service.list-types — Phase 20 (RECIPE-01..04)
- ✓ Deploy watch — Phase 21 (WATCH-01, WATCH-02)
- ✓ Setup wizard + IDE skills + set_env delegation — Phases 22, 23.1 (SETUP-*, SKILL-*)
- ✓ OpenAPI coverage map + npm pack allowlist + milestone Changeset 1.0.0 — Phase 23 (OAPI-01, OAPI-02, PUB-01, PUB-02)

### Validated (v3.2)

- ✓ Capabilities + deployment.logs — Phase 24 (CAP-01, CAP-02, OBS-01)
- ✓ Application log follow — Phase 25 (OBS-02, OBS-03)
- ✓ diagnose.logs + incident prompt + coolify-setup troubleshooting — Phase 26 (DIAG-01, PROMPT-01, SKILL-01)
- ✓ MCP icon workarounds + docs parity at 1.0.1 — Phase 27 (BRND-01, BRND-02, DOC-01)

### Active (v3.3)

- Deploy Guard, Drift & Heal, Dependency Map, Log Brain, Ops Playbooks, Smart Recipes, Instance Scorecard, Resource Janitor — see `.planning/REQUIREMENTS.md`

### Out of Scope

- Service/DB bounded log tail — v3.4 (SVC-04, requires Coolify 4.2.0+ stable; 4.1.2 has no endpoints; deferred from interim v3.3)
- Own YAML/stack template catalog — Coolify one-click + coolify-examples are source of truth
- Cursor MCP list icon rendering — v3.2 attempts workarounds; may remain client limitation (D-09)
- Cross-instance fan-out queries — rate limits / security
- Shared manifest committed to git — leak/merge risk
- Execute Command in Container — API broken/fehlt in Coolify 4.1.x

## Context

- **Tech stack:** TypeScript, `@modelcontextprotocol/sdk`, ofetch, Zod, tsup, vitest
- **Target API:** Coolify REST 4.1.x (+ Coolify Cloud hostname path)
- **Repos:** Single public `clezcoding/awesome-coolify`
- **Known debt:** Cursor MCP list icon is documented client limitation (D-09); Phase 18 has 4 human_needed live paths; OpenAPI coverage gaps tracked in `docs/COVERAGE.md` (future tool work)
- **Known API quirks:** Coolify 4.1.x omits nested `project` on resources (fixed via `environment_id` index); service stop defaults `docker_cleanup=true` (MCP sends `false`); deployment list `{count, deployments}` envelope; plain-YAML compose on 4.1.2 (projectServiceCompose fallback)

## Constraints

- **API**: Coolify REST API 4.1.x — Cloud supported via same tool surface + cloud-specific error hints
- **Tech**: TypeScript + `@modelcontextprotocol/sdk`
- **Security**: API-Tokens in env/config/registry, nie in Tool-Responses; Credentials maskieren; `reveal: true` opt-in; registry `0o700`/`0o600`
- **Distribution**: npm + GitHub Pages + README EN/DE parity enforced by docs-parity test; live UAT harness excluded from npm tarball

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Ersetzt alle drei bestehenden Tools | Ein MCP, eine Wahrheit, Community-DX | ✓ Good — v1.0 ships unified surface |
| v1 = Ops-MVP | Schneller nutzbarer Wert in Cursor | ✓ Good — 7 phases in 5 days |
| Action-Schema ab v1 | Vermeidet 60+ Einzeltools | ✓ Good — 16 tools / ~87 actions |
| Multi-Instance via `instances.json` | Zentral, portabel | ✓ Good — Phase 15 shipped |
| v3.0 split: setup + skills → v3.1 | Platform first, DX wizard second | ✓ Good — v3.0 closed; v3.1 next |
| Create/Delete → v2 | Reduziert v1-Komplexität | ✓ Good — v2.0 shipped 2026-07-21 |
| Structured errors in v1 | Bessere Agent-Recovery | ✓ Good — COOLIFY_* codes + hints |
| TypeScript + MCP SDK | Community-Standard | ✓ Good |
| Dediziertes `emergency`-Tool | High-impact Ops getrennt | ✓ Good — Phase 6 |
| Confirm-Gate auf deletes | SAF-01 across CRUD | ✓ Good — v2 canonical in Phase 10 |
| `reveal` MCP-seitig only | Secrets nie versehentlich exposed | ✓ Good |
| No stub tools for missing API | User: "KEINE Tools die nicht funktionieren" | ✓ Good — SVC-04 omitted not 501 |
| `docker_cleanup=false` on service stop | Coolify 4.1.x one-click stop fix | ✓ Good — UAT gap 29 closed |
| App create soft-success on deploy queue fail | Keep UUID; no auto-rollback (D-08) | ✓ Good — UAT D-08 passed |
| App delete safe defaults false | Coolify API defaults true; MCP Zod overrides SAF-02 | ✓ Good — Phase 10 |
| Transparent compose base64 | Agent sees YAML only (SVC-07) | ✓ Good — Phase 11 |
| envs:sync app-only | D-09 scope control | ✓ Good — Phase 12 |
| backup:* on database tool | Reuse existing tool surface | ✓ Good — Phase 13 |
| Soft-start without credentials | Boot `instance` tool first; env optional | ✓ Good — Phase 15 |
| Per-request `resolveCredentials` | No cross-instance credential leakage | ✓ Good — Phase 15 |
| Cloud errors via request URL | No module-level mutable cloud flag | ✓ Good — Phase 16 |
| Dedicated `manifest` domain tool | D-01 — not folded into meta/project | ✓ Good — Phase 17 |
| Manifest is cache, not source of truth | D-15 — 404 hints only, no mid-call auto-sync | ✓ Good — Phase 17 |
| Auto-hooks on app/service/DB mutations | Best-effort `_meta.manifestWarning` | ✓ Good — Phase 17 |
| Hybrid live UAT (stdio + in-process) | Cover MCP wire + handler paths | ✓ Good — Phase 18 |
| UAT harness not in npm tarball | Maintainer-only; D-02/D-03 | ✓ Good — Phase 18 |
| v3.1: recipes over template forks | Coolify 200+ one-click + build packs; avoid stale YAML | ✓ Good — Phase 20 |
| v3.1: npm publish in-milestone | Release workflow, maintainer-triggered | ✓ Good — Changeset 1.0.0 shipped; OIDC publish on Version Packages merge |
| v3.1: recipes over template forks | Coolify catalog is source of truth | ✓ Good — Phase 20 |
| Flat schemas for Cursor UX | Mitigate empty `oneOf` parameter panels | ✓ Good — Phase 19 |
| v3.2: capabilities on system.version only | meta.version stays identity-only; agents discover features before calling | ✓ Good — Phase 24 |
| v3.2: deployment.logs separate from application.logs | Build logs by deployment_uuid without app routing | ✓ Good — Phase 24 |
| v3.2: follow via application.logs follow:true | Reuse existing tool; zodDefaultFields strip on one-shot paths | ✓ Good — Phase 25 |
| v3.2: diagnose.logs composite | Triage + bounded tail in one action; soft-partial on triage fail | ✓ Good — Phase 26 |
| v3.2: dual data URI + jsDelivr icons | BRND-01 spec workarounds; Cursor UI limitation accepted (D-05) | ✓ Good — Phase 27 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
**v3.2 shipped:** `system.version` capability flags, `deployment.logs`, `application.logs` follow, `diagnose.logs`, incident prompt + coolify-setup troubleshooting, dual-icon MCP branding, npm 1.0.1 docs parity. **v3.3 in progress:** Agent Intelligence layer (composite smart ops on 4.1.x). Service/DB logs deferred to v3.4 pending Coolify 4.2 stable.

*Last updated: 2026-07-30 — milestone v3.3 Agent Intelligence started*
