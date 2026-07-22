# Phase 16 — API Coverage Matrix

**Phase:** 16 — Coolify Cloud & Server Branding
**Detector fired:** yes (Cloud + MCP SDK metadata surface)
**Scope:** MCP branding surface (serverInfo.icons + title/description/websiteUrl) + Coolify Cloud error/docs/cloud-info capabilities.
**Out of scope:** Coolify Cloud full REST surface — same tool surface as self-hosted already exists from Phases 1–13; no new Cloud-only endpoints are added. Coolify Cloud REST surface is NOT re-mapped here.

## Capability Matrix

| Capability | Surface | In scope? | Plan | Requirement | Notes |
|------------|---------|-----------|------|-------------|-------|
| Connect to https://app.coolify.io with team-scoped Bearer token | Existing client (src/api/client.ts) — same ofetch pipeline | yes (verify) | 16-02 (cloud-info), 16-04 (docs) | CLD-01 | No new client fork; same 14 tools work with cloud URL. inferInstanceType classifies *.coolify.io as cloud. |
| Cloud error mapping (403 → COOLIFY_CLOUD_FORBIDDEN, 404 → COOLIFY_CLOUD_UNSUPPORTED) | src/utils/errors.ts toStructuredError/mapApiError | yes | 16-01 | CLD-02 | Hostname-based detection (D-03); no response-body guesswork on self-hosted. |
| Cloud setup + smoke docs EN/DE | docs/en/cloud.md, docs/de/cloud.md | yes | 16-04 | CLD-03 | Depth = setup + smoke + known limits per D-10. |
| README Cloud quick overview EN/DE | README.md, README.de.md | yes | 16-04 | CLD-03 | Quick overview + links only per D-11. |
| instance.cloud-info local/static discovery | src/mcp/tools/instance.ts | yes | 16-02 | CLD-01 (discoverability) | Local/static only — no live API probe per D-16. |
| MCP serverInfo.icons (192x192 jsDelivr PNG) | src/mcp/server.ts McpServer constructor | yes | 16-03 | BRND-01 | Dedicated asset per D-05; jsDelivr @main per D-06. |
| Dedicated 192x192 MCP list icon asset | docs/assets/mcp-icon-192.png | yes | 16-03 | BRND-02 | Exported from Hex Robot Helper mascot on brand violet. |
| MCP serverInfo.title/description/websiteUrl fallback | src/mcp/server.ts McpServer constructor | yes | 16-03 | BRND-03 | Package-aligned per D-08. |
| Cursor MCP list icon rendering (D-09 verify) | Manual screenshot | yes (verify gate) | 16-04 | BRND-02 (verify) | Aggressive verify per D-09; client limitation documented with evidence if icon does not render. |
| Single-repo CONVENTIONS cleanup | .planning/codebase/CONVENTIONS.md | yes | 16-04 | D-07 | Retire dual-repo layout. |

## Opt-outs (reasoned)

| Surface | Reason |
|---------|--------|
| Coolify Cloud full REST surface (servers, projects, applications, etc.) | Same tool surface as self-hosted already exists from Phases 1–13; Cloud connects with the same client. No new Cloud-only endpoints are added in Phase 16. |
| Live cloud-info API probe / capability matrix | Rejected per D-16 — cloud-info is local/static only. |
| Billing/plan/rate-limit error code zoo | Rejected per CONTEXT deferred ideas — no live evidence. |
| Full README → docs/en|de/* split for all sections | Deferred per D-11 — Phase 16 ships Cloud as the first topic only. |
| .coolify/manifest.json | Phase 17 scope. |
| Live UAT harness | Phase 18 scope. |

## Requirement → Plan Coverage

| Requirement | Plan(s) | Covered |
|-------------|---------|---------|
| CLD-01 | 16-02 (cloud-info), 16-04 (docs) | ✅ |
| CLD-02 | 16-01 (errors) | ✅ |
| CLD-03 | 16-04 (docs + README) | ✅ |
| BRND-01 | 16-03 (McpServer icons) | ✅ |
| BRND-02 | 16-03 (icon asset), 16-04 (D-09 verify) | ✅ |
| BRND-03 | 16-03 (title/description/websiteUrl) | ✅ |

## Decision Coverage (D-01..D-17)

| Decision | Plan | How |
|----------|------|-----|
| D-01 | 16-01 | Dedicated cloud codes; generic 403/404 fallback preserved |
| D-02 | 16-01 | COOLIFY_CLOUD_FORBIDDEN + COOLIFY_CLOUD_UNSUPPORTED |
| D-03 | 16-01 | isCloudUrl hostname check; no body-based guesswork |
| D-04 | 16-01 | Recovery hints actionable EN |
| D-05 | 16-03 | Dedicated mcp-icon-192.png; no favicon reuse |
| D-06 | 16-03 | jsDelivr @main URL |
| D-07 | 16-04 | CONVENTIONS single-repo cleanup |
| D-08 | 16-03 | title/description/websiteUrl/icons; name unchanged |
| D-09 | 16-04 | Manual verify checkpoint (screenshot) |
| D-10 | 16-04 | Docs depth = setup + smoke + limits |
| D-11 | 16-04 | README quick overview + links |
| D-12 | 16-04 | docs/en/cloud.md + docs/de/cloud.md |
| D-13 | 16-04 | Smoke path agent-first; optional curl |
| D-14 | 16-02 | No soft _meta.cloudNote; no hard type:cloud URL rule |
| D-15 | 16-02 | Env-only Cloud uses host-infer at runtime |
| D-16 | 16-02 | cloud-info local/static; source registry|env|infer |
| D-17 | 16-02 | cloud-info supports optional instance routing |
