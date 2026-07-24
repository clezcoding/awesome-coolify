# API Coverage — Phase 19 DX Schemas & MCP Prompts

> Full coverage by default. Opt-outs are explicit, reasoned decisions.

## Detector outcome

Phase 19 reshapes the **existing** Coolify MCP agent surface for Cursor DX:
flat Zod/JSON Schema input shapes, co-located `actionsCatalog` + `safetyFooter`
description constants, `composeToolDescription` wiring, and a greenfield MCP
**prompts** registry (`deploy` / `diagnose` / `new-project` / `incident`).

It **consumes** the Coolify REST client and the 16 registered domain tools from
Phases 1–18 — **no new Coolify REST endpoints** and **no new MCP `registerTool`
names**. Prompt handlers return static parameterized guidance (soft manifest
Note only; no disk I/O). Catalog string alignment (19-03) is documentation-level
DX, not a new API.

The API-Coverage gate fires on MCP + API wiring terms in phase docs, so this
matrix records the integrate/opt-out decisions for the Phase 19 DX surface.

## Capability surface

| capability | decision | reason |
|---|---|---|
| createFlatActionSchema helper (flat z.object + per-action superRefine) | INTEGRATE | |
| sharedReadParamsFlatShape / sharedLogParamsFlatShape (no Zod defaults at MCP boundary) | INTEGRATE | |
| Migrate all 16 registered domain tools to flat top-level inputSchema | INTEGRATE | |
| Co-located `<domain>ActionsCatalog` + `<domain>SafetyFooter` on every domain tool | INTEGRATE | |
| Action-aware COOLIFY_VALIDATION_ERROR recoveryHints via parseWithInstanceRouting | INTEGRATE | |
| composeToolDescription(purpose, catalog, footer) on every registerTool | INTEGRATE | |
| Catalog tokens use schema field names (env_uuid, entries) — no key/envs aliases | INTEGRATE | |
| Concrete action(param) catalog tokens — no envs:*/backup:* wildcards | INTEGRATE | |
| MCP prompt `deploy` (optional args, deploy + watch guidance) | INTEGRATE | |
| MCP prompt `diagnose` (app/server/scan guidance) | INTEGRATE | |
| MCP prompt `new-project` (setup/recipe onboarding guidance) | INTEGRATE | |
| MCP prompt `incident` (emergency/redeploy triage guidance) | INTEGRATE | |
| registerCoolifyPrompts after registerCoolifyTools in createAndConnectServer | INTEGRATE | |
| Prompt soft manifest Note (no hard-fail / no filesystem read) | INTEGRATE | |
| Unit/regression tests for schema flatness, Actions:/Safety: prefixes, catalog field names | INTEGRATE | |
| README EN/DE MCP Prompts documentation | INTEGRATE | |
| New Coolify REST endpoints | OPT-OUT | explicitly out of scope — DX reshapes existing client surface only |
| New MCP registerTool names | OPT-OUT | explicitly out of scope — same 16 tools; prompts are registerPrompt only |
| New Coolify OpenAPI coverage map | OPT-OUT | deferred to Phase 23 per ROADMAP |
| deployment.watch implementation | OPT-OUT | deferred to Phase 21 — deploy prompt forward-refs only |
| Setup wizard / IDE skill packs | OPT-OUT | deferred to Phase 22 per ROADMAP |
| Recipes / service.list-types | OPT-OUT | deferred to Phase 20 per ROADMAP |
| Live Coolify REST changes for prompt handlers | OPT-OUT | explicitly rejected — prompts are static guidance over existing tools |
| Custom Cursor loading UI / host chrome | OPT-OUT | explicitly out of scope — host-owned per UI-SPEC backstop |

---

*Authored: 2026-07-24 — Phase 19 verify:pre gate unblock*
