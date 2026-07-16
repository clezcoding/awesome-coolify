# Coolify MCP Server

## What This Is

Open-Source MCP-Server für self-hosted Coolify-Instanzen (API 4.1.x). v1.0 (**Ops MVP**) ist shipped: 10 Tools, 32 Actions, npm publish-ready (`awesome-coolify-mcp`), GitHub Pages Install-Configurator, 505 Tests grün. Agent kann deployen, Logs lesen, diagnostizieren, Emergency-Ops — ohne Coolify UI. Single-Instance via `COOLIFY_URL`/`COOLIFY_TOKEN`; Multi-Instance CRUD folgt v2. Create/Delete und volle CLI/MCP-Parität folgen v2.

## Core Value

Ein AI-Agent (Cursor, Claude, etc.) kann über einen einzigen, gut dokumentierten MCP-Server Coolify-Instanzen operieren — deployen, Logs lesen, Probleme diagnostizieren — ohne Workarounds oder drei parallele MCP-Implementierungen.

## Current State (v1.0 — shipped 2026-07-16)

| Metric | Value |
|--------|-------|
| Package | `awesome-coolify-mcp` v0.1.0 |
| Tools / Actions | 10 / 32 |
| Tests | 505 green |
| TypeScript LOC | ~16,800 (src + tests) |
| Timeline | 2026-07-12 → 2026-07-16 (5 days) |
| Live UAT | 32/32 on https://puzzlesstool.online |
| Distribution | npm publish-ready; GitHub Pages `docs/install.html` |

**Shipped capabilities:** stdio MCP, structured errors + retry, discovery/read projections, diagnose + issue scan, app deploy lifecycle (wait-mode, batch), app logs + service/DB lifecycle, emergency ops + reveal masking, README EN/DE + install configurator.

## Next Milestone Goals

- **v1.1:** SVC-04 service/DB logs when Coolify API available (v4.1.3+)
- **v2:** Multi-instance (`instances.json`), Create/Delete CRUD, full feature parity — see [milestones/v1.0-REQUIREMENTS.md](milestones/v1.0-REQUIREMENTS.md) § v2
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

### Active (next milestones)

- [ ] Multi-Instance CRUD (`instances.json`) — v2 (CTX-04–06 deferred from v1.0)
- [ ] Service/DB bounded log tail — v1.1 (SVC-04, Coolify API gap)
- [ ] Live npm publish — maintainer task
- [ ] v2 scope → phases via `/gsd-new-milestone`

### Out of Scope

- Create/Delete von Apps, Services, DBs, Servern — v2
- Execute Command in Container — API broken/fehlt in Coolify 4.1.x
- Section-21-Wunschfeatures — v2+ (siehe archived REQUIREMENTS § v2)

## Context

- **Tech stack:** TypeScript, `@modelcontextprotocol/sdk`, ofetch, Zod, tsup, vitest
- **Target API:** Coolify REST 4.1.x
- **Repos:** Private dev repo + public `awesome-coolify-mcp` distribution
- **Known API quirks:** Coolify 4.1.x omits nested `project` on resources (fixed via `environment_id` index); service stop defaults `docker_cleanup=true` (MCP sends `false`); deployment list `{count, deployments}` envelope

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
| Action-Schema ab v1 | Vermeidet 60+ Einzeltools | ✓ Good — 10 tools / 32 actions |
| Multi-Instance via `instances.json` | Zentral, portabel | ⚠️ Revisit — deferred v2; v1.0 single env |
| Create/Delete → v2 | Reduziert v1-Komplexität | ✓ Good — on track for v2 |
| Structured errors in v1 | Bessere Agent-Recovery | ✓ Good — COOLIFY_* codes + hints |
| TypeScript + MCP SDK | Community-Standard | ✓ Good |
| v2 in REQUIREMENTS + ROADMAP dokumentieren | Features nicht vergessen | ✓ Good — archived in milestones/ |
| Dediziertes `emergency`-Tool | High-impact Ops getrennt | ✓ Good — Phase 6 |
| Confirm-Gate nur auf EMG-Aktionen | P4/P5 ohne Gate | ✓ Good |
| `reveal` MCP-seitig only | Secrets nie versehentlich exposed | ✓ Good |
| No stub tools for missing API | User: "KEINE Tools die nicht funktionieren" | ✓ Good — SVC-04 omitted not 501 |
| `docker_cleanup=false` on service stop | Coolify 4.1.x one-click stop fix | ✓ Good — UAT gap 29 closed |

## Evolution

This document evolves at phase transitions and milestone boundaries.

---
*Last updated: 2026-07-16 after v1.0 milestone (Ops MVP shipped)*
