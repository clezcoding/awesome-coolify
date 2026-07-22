# Phase 14 — Feasibility Audit: Milestone-Ideen Jul 2026

**Status:** Planned  
**Depends on:** Phase 13 (v2.0 Creation & CRUD — shipped 2026-07-21)

## Source

Explore session 2026-07-16 — researched via Web, Context7 (`/coollabsio/coolify-cli`, `/websites/coolify_io`), awesome-coolify MCP codebase, Coolify OpenAPI.

## Idea 1 — Coolify Cloud MCP

- Same REST API `/api/v1/*`, Bearer auth; docs use `https://app.coolify.io/api/v1/`
- Current `createCoolifyClient()` is URL-agnostic — likely works with `COOLIFY_URL=https://app.coolify.io`
- Caveats: team-scoped tokens, permission levels, GitHub App `system-wide` cloud-only
- Effort: small (smoke test + README rebrand)

## Idea 2 — Standard-Setup Tool

- Coolify API supports project/app/service/DB create — MCP lacks Create actions until v2.0
- **GitHub repo creation:** via GitHub CLI (`gh repo create`), not Coolify API
- **Preflight (once per session/tool invoke):**
  1. `gh --version` — if missing → step-by-step install guide (macOS/Linux/Windows)
  2. `gh auth status` — if unauthenticated → `gh auth login` guide
  3. Pause workflow; tell user: *„Sobald du das erledigt hast, gib Bescheid — dann machen wir weiter.“*
- Then: interactive wizard (project name, repo public/private, one-click services, greenfield vs existing, PRD-driven)
- Depends on: v2.0 Phases 8–11 (Create CRUD)

## Idea 3 — Custom Skills pro IDE

- Markdown skills in `.agents/skills/` / `.cursor/skills/` — no API dependency
- Repo already has `.agents/skills/caveman/` as pattern

## Idea 4 — Lokale Manifest-Datei

- Agent-maintained `.coolify/manifest.json` (or similar), gitignored
- UUIDs/domains synced from `resource.list` / `diagnose` — no new Coolify endpoints

## Recommended v3.0 order (draft)

1. Cloud support (quick win)
2. Manifest file (parallel, low effort)
3. Setup wizard (after Create CRUD + gh preflight)
4. IDE skills (ongoing)
