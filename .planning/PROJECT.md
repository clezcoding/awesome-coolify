# Coolify MCP Server

## What This Is

Open-Source MCP-Server für self-hosted Coolify-Instanzen (API 4.1.x). v1.0 (**Ops MVP**) shipped 2026-07-16. v2.0 (**Creation & CRUD**) shipped 2026-07-21. Package `awesome-coolify-mcp` v0.1.2, single public repo `clezcoding/awesome-coolify`. Agent kann deployen, Logs lesen, diagnostizieren, Emergency-Ops — plus SSH keys, servers, projects, environments, application/service/database CRUD, env vars, smart sync, und backup schedules with confirm/safe-delete/masking.

## Core Value

Ein AI-Agent (Cursor, Claude, etc.) kann über einen einzigen, gut dokumentierten MCP-Server Coolify-Instanzen operieren — deployen, Logs lesen, Probleme diagnostizieren, und Infrastruktur von Grund auf anlegen — ohne Workarounds oder drei parallele MCP-Implementierungen.

## Current State (v3.0 in progress — Phase 16 complete 2026-07-22)

| Metric | Value |
|--------|-------|
| Package | `awesome-coolify-mcp` v0.1.2 |
| Tools / Actions | 15 / ~80 (v1+v2 + `instance` + `cloud-info`) |
| Tests | 917 green |
| Milestone | v3.0 Platform Foundation — Phase 16 complete |
| Repo | Single public `clezcoding/awesome-coolify` |
| Distribution | npm publish-ready; GitHub Pages `docs/install.html` |

**Phase 16 complete:** Coolify Cloud error codes + `isCloudUrl`, `instance.cloud-info` local discovery, MCP `serverInfo` branding (`title`/`icons`/jsDelivr PNG), EN/DE cloud docs. D-09: Cursor list icon is a documented client limitation (server emits icons; UI shows generic fallback).

**Phase 15 complete:** `InstanceManager` + `instances.json` CRUD, soft-start boot, optional `instance` routing on all 12 API tools, env override precedence, 0o700/0o600 + token redaction.

**v1.0 shipped (2026-07-16):** stdio MCP, structured errors, discovery/read, diagnose, deploy lifecycle, logs, service/DB ops, emergency + masking, README EN/DE + install configurator.

**v2.0 shipped (2026-07-21):** `private_key` + `server` CRUD (Phase 8), `project` + `environment` CRUD (Phase 9), `application` create/update/delete with SAF-01..04 (Phase 10), `service` + `database` CRUD with transparent compose base64 + 8-engine DB provisioning (Phase 11), `envs:*` CRUD + bulk + app-only `envs:sync` (Phase 12), `backup:*` schedule management (Phase 13).

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

## Current Milestone: v3.0 Platform Foundation

**Goal:** Agent can manage multiple Coolify instances (self-hosted + Cloud), switch between them, and persist UUID/domain metadata locally across sessions.

**Target features:**
- Multi-instance CRUD via `~/.coolify-mcp/instances.json` (CTX-04–06)
- Coolify Cloud MCP support (docs, smoke test, cloud-specific quirks)
- Local manifest file (`.coolify/manifest.json`) for UUIDs, domains, project refs
- MCP server list icon via `serverInfo.icons` (BRND-01..03)
- Live UAT CLI harness for all 14 tools against real Coolify data (UAT-01..06)

**Deferred to v3.1:** Standard setup tool (gh + Coolify wizard), custom IDE skills

## Next Milestone Goals

- **v3.1:** Setup wizard + IDE skills package (see deferred todos in `.planning/todos/pending/`)
- **v1.1:** SVC-04 service/DB logs when Coolify API available (v4.1.3+)
- **Maintainer:** Live `npm publish` of `awesome-coolify-mcp`

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

### Active (v3.0)

- [ ] Local manifest file — `.coolify/manifest.json` schema + agent sync
- [ ] Live UAT CLI harness (UAT-01..06)

### Active (v3.1 — deferred)

- [ ] Standard setup tool — gh preflight + Coolify wizard
- [ ] Custom IDE skills — Cursor, Claude Code, Codex, etc.

### Out of Scope (this milestone)

- Service/DB bounded log tail — v1.1 (SVC-04, Coolify API gap)
- Live npm publish — maintainer task
- Standard setup tool + IDE skills — v3.1
- ~~Create/Delete von Services/DBs~~ — shipped Phase 11
- Execute Command in Container — API broken/fehlt in Coolify 4.1.x

## Context

- **Tech stack:** TypeScript, `@modelcontextprotocol/sdk`, ofetch, Zod, tsup, vitest
- **Target API:** Coolify REST 4.1.x
- **Repos:** Single public `clezcoding/awesome-coolify` (dev + distribution consolidated 2026-07-18)
- **Known API quirks:** Coolify 4.1.x omits nested `project` on resources (fixed via `environment_id` index); service stop defaults `docker_cleanup=true` (MCP sends `false`); deployment list `{count, deployments}` envelope; plain-YAML compose on 4.1.2 (projectServiceCompose fallback)

## Constraints

- **API**: Coolify REST API 4.1.x — keine Abhängigkeit von Cloud-only Features
- **Tech**: TypeScript + `@modelcontextprotocol/sdk`
- **Security**: API-Tokens in env/config, nie in Tool-Responses; Credentials maskieren; `reveal: true` opt-in
- **Distribution**: npm + GitHub Pages + README EN/DE parity enforced by docs-parity test

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Ersetzt alle drei bestehenden Tools | Ein MCP, eine Wahrheit, Community-DX | ✓ Good — v1.0 ships unified surface |
| v1 = Ops-MVP | Schneller nutzbarer Wert in Cursor | ✓ Good — 7 phases in 5 days |
| Action-Schema ab v1 | Vermeidet 60+ Einzeltools | ✓ Good — 14 tools / ~75 actions |
| Multi-Instance via `instances.json` | Zentral, portabel | ✓ Good — Phase 15 (InstanceManager + per-request routing) |
| v3.0 split: setup + skills → v3.1 | Platform first, DX wizard second | 🔄 Active — 2026-07-21 scoping |
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

## Evolution

This document evolves at phase transitions and milestone boundaries.

---
*Last updated: 2026-07-22 — Phase 16 complete (Coolify Cloud & Server Branding)*
