# Coolify MCP Server

## What This Is

Ein Open-Source MCP-Server für self-hosted Coolify-Instanzen (API 4.1.x), der Coolify CLI, user-coolify MCP und coolify-backup-mcp langfristig vollständig ersetzt. Zielgruppe ist die Community — jeder mit eigener Coolify-Installation. v1 liefert Ops-fähige Tools (Deploy, Logs, Diagnose, Multi-Instance); Create/Delete und volle Feature-Parität folgen in v2.

## Core Value

Ein AI-Agent (Cursor, Claude, etc.) kann über einen einzigen, gut dokumentierten MCP-Server mehrere self-hosted Coolify-Instanzen verwalten — deployen, Logs lesen und Probleme diagnostizieren — ohne Workarounds oder drei parallele MCP-Implementierungen.

## Requirements

### Validated

- [x] MCP-Server in TypeScript mit `@modelcontextprotocol/sdk` — Validated in Phase 1: Foundation & Multi-Instance Auth
- [x] Action-basiertes Tool-Schema ab v1 (Domänen + `action`, keine 60+ Einzeltools) — Validated in Phase 1
- [x] Multi-Instance via `~/.coolify-mcp/instances.json` (add, list, get, update, delete, set-default, switch, verify) — Validated in Phase 1
- [x] Diagnose (App/Server) + Global Issue-Scan + Follow-Up Hints — Validated in Phase 3: Diagnose & Issue Scan (SYS-03, SYS-04, SYS-05, OUT-06)
- [x] Ops-Tools v1: Infrastructure-Overview, Diagnose (App/Server), Deploy (inkl. wait-poll), Logs (limitiert/follow), Global Issue-Scan — Infrastructure-Overview + Discovery/Read validated in Phase 2; Diagnose + Issue-Scan + Hints validated in Phase 3 (Deploy/Logs folgen in Phasen 4–6)
- [x] Structured Error Codes mit Recovery-Hints (401/404/422/500 etc.) — Validated in Phase 1

### Active

- [ ] Sensitive-Werte default maskiert, reveal opt-in
- [ ] Destructive-Ops Confirmation Gate (`confirm: true`)
- [ ] npm-Paket + GitHub-Repo mit vollständiger README
- [ ] v2-Scope detailliert in REQUIREMENTS.md und ROADMAP.md dokumentiert

### Out of Scope

- Create/Delete von Apps, Services, DBs, Servern — v2 (bewusst deferred für schnelleres v1)
- Execute Command in Container — API broken/fehlt in Coolify 4.1.x
- Section-21-Wunschfeatures ohne v1-Priorität — v2+ (siehe REQUIREMENTS.md v2)

## Context

- Feature-Katalog in `mcp_features.md`: Union aus Coolify CLI, user-coolify MCP, coolify-backup-mcp (Live-Audit Jul 2026, Coolify 4.1.2 gegen hostunlimited)
- Bestehende MCPs haben Überlappung, inkonsistentes Schema und 60+ granulare Tools
- Action-basiertes Schema (z.B. `application({ action: 'deploy' })`) ist bewusste DX-Entscheidung für v1
- Repo: `awesome-coolify` — Greenfield, kein bestehender Server-Code
- Ziel-Audience: Community OSS, nicht nur interne Nutzung

## Constraints

- **API**: Coolify REST API 4.1.x — keine Abhängigkeit von Cloud-only Features
- **Tech**: TypeScript + `@modelcontextprotocol/sdk`
- **Security**: API-Tokens in Config-Datei, nie in Tool-Responses; Credentials maskieren
- **v1 Scope**: Ops-only — Agent kann deployen, logs lesen, diagnose ohne Create/Delete
- **Distribution**: npm (`npx coolify-mcp`) + dediziertes GitHub-Repo mit ausführlicher README
- **Documentation**: v2-Features müssen in REQUIREMENTS.md und ROADMAP.md vollständig und detailliert vermerkt sein

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Ersetzt alle drei bestehenden Tools | Ein MCP, eine Wahrheit, Community-DX | — Pending |
| v1 = Ops-MVP (Deploy/Logs/Diagnose/Multi-Instance) | Schneller nutzbarer Wert in Cursor | — Pending |
| Action-Schema ab v1 | Vermeidet 60+ Einzeltools von Anfang an | — Pending |
| Multi-Instance via `~/.coolify-mcp/instances.json` | Zentral, portabel, nicht pro MCP-Config-Eintrag | — Pending |
| Create/Delete → v2 | Reduziert v1-Komplexität und API-Surface | — Pending |
| Structured errors in v1 | Bessere Agent-Recovery ohne volle Parität | — Pending |
| TypeScript + MCP SDK | Standard-Stack für MCP-Server, Community-freundlich | — Pending |
| v2 in REQUIREMENTS + ROADMAP dokumentieren | User-Anforderung: spätere Features nicht vergessen | — Pending |

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
*Last updated: 2026-07-12 after Phase 3 gap closure (03-07 — toolOutputSchema _meta fix, UAT healed 42/42)*
