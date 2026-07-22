# API Coverage — Phase 16 Coolify Cloud & Server Branding

> Full coverage by default. Opt-outs are explicit, reasoned decisions.

## Detector outcome

Phase 16 brands the MCP server surface and documents Coolify Cloud connect
paths. It reuses the existing Coolify REST client (Phases 1–13) — no new
Cloud-only REST endpoints. New work is (a) hostname-based cloud error codes,
(b) local/static `instance.cloud-info`, (c) MCP `serverInfo` icons/title/metadata,
and (d) EN/DE Cloud docs + README quicklinks.

The API-Coverage gate fires on Cloud + MCP SDK terms, so this matrix records
the integrate/opt-out decisions for the Phase 16 surface.

## Capability surface

| capability | decision | reason |
|---|---|---|
| cloud.connect team Bearer via existing client | INTEGRATE | |
| cloud.error 403→COOLIFY_CLOUD_FORBIDDEN | INTEGRATE | |
| cloud.error 404→COOLIFY_CLOUD_UNSUPPORTED | INTEGRATE | |
| docs.cloud EN/DE setup+smoke+limits | INTEGRATE | |
| readme.cloud quick overview EN/DE | INTEGRATE | |
| instance.cloud-info local/static discovery | INTEGRATE | |
| mcp.serverInfo.icons 192 jsDelivr PNG | INTEGRATE | |
| asset mcp-icon-192.png from Hex Robot | INTEGRATE | |
| mcp.serverInfo title/description/websiteUrl | INTEGRATE | |
| cursor MCP list icon render verify (D-09) | INTEGRATE | |
| conventions.md single-repo cleanup | INTEGRATE | |
| coolify cloud full REST re-map | OPT-OUT | same tool surface as self-hosted already exists (Phases 1–13); no new Cloud-only endpoints |
| cloud-info live API probe / capability matrix | OPT-OUT | explicitly rejected by D-16 — cloud-info is local/static only |
| billing/plan/rate-limit error code zoo | OPT-OUT | not needed yet — no live evidence; deferred in CONTEXT |
| full README to docs/en+de split all sections | OPT-OUT | explicitly out of scope per D-11 — Cloud is first topic only |
| .coolify/manifest.json | OPT-OUT | not needed yet — Phase 17 scope |
| live UAT harness | OPT-OUT | not needed yet — Phase 18 scope |

---

*Authored: 2026-07-22 — Phase 16 planning*
*Fixed: 2026-07-22 — canonical capability/decision/reason table for verify:pre gate*
