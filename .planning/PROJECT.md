# Coolify MCP Server

## What This Is

Open-Source MCP-Server für Coolify (API 4.1.x) — self-hosted und Coolify Cloud. Package `awesome-coolify-mcp` (v0.2.0), public repo `clezcoding/awesome-coolify`. Agent kann deployen, Logs lesen, diagnostizieren, Emergency-Ops, volle Infrastruktur-CRUD, Multi-Instance-Routing, lokale Manifest-Caches, und Live-UAT gegen echte Coolify-Daten.

## Core Value

Ein AI-Agent (Cursor, Claude, etc.) kann über einen einzigen, gut dokumentierten MCP-Server Coolify-Instanzen operieren — deployen, Logs lesen, Probleme diagnostizieren, und Infrastruktur von Grund auf anlegen — ohne Workarounds oder drei parallele MCP-Implementierungen.

## Current State (v3.0 shipped 2026-07-23)

| Metric | Value |
|--------|-------|
| Package | `awesome-coolify-mcp` v0.2.0 |
| Tools / Actions | 16 / ~87 |
| TypeScript LOC | ~35.6k (`src/`) |
| Milestone | ✅ v3.0 Platform Foundation shipped |
| Repo | Single public `clezcoding/awesome-coolify` |
| Distribution | npm publish-ready; GitHub Pages `docs/install.html` |
| Live UAT | `npm run uat:live` harness shipped (Phase 18) |

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

## Next Milestone Goals

- **v3.1:** Setup wizard (`gh` preflight + Coolify wiring) + IDE skills package
- **v1.1:** SVC-04 service/DB logs when Coolify API available (v4.1.3+)
- **Backlog:** Official Coolify OpenAPI spec integration / coverage mapping
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
- ✓ Local Manifest & Sync — Phase 17 (MAN-01, MAN-02, MAN-03, MAN-04)
- ✓ Live UAT CLI harness — Phase 18 (UAT-01..06)

### Active (v3.1 — next)

- [ ] Standard setup tool — gh preflight + Coolify wizard (SETUP-01..03)
- [ ] Custom IDE skills — Cursor, Claude Code, Codex (SKILL-01..02)

### Out of Scope

- Service/DB bounded log tail — v1.1 (SVC-04, Coolify API gap)
- Live npm publish — maintainer task
- Cross-instance fan-out queries — rate limits / security
- Shared manifest committed to git — leak/merge risk
- Execute Command in Container — API broken/fehlt in Coolify 4.1.x

## Context

- **Tech stack:** TypeScript, `@modelcontextprotocol/sdk`, ofetch, Zod, tsup, vitest
- **Target API:** Coolify REST 4.1.x (+ Coolify Cloud hostname path)
- **Repos:** Single public `clezcoding/awesome-coolify`
- **Known debt:** OpenAPI spec files not yet wired into coverage/planning; Cursor MCP list icon is documented client limitation (D-09); Phase 18 has 4 human_needed live paths
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

## Evolution

This document evolves at phase transitions and milestone boundaries.

---
*Last updated: 2026-07-23 after v3.0 milestone*
