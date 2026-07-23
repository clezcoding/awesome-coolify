# Phase 16: Coolify Cloud & Server Branding - Research

**Researched:** 2026-07-22
**Domain:** Model Context Protocol Server Metadata, HTTP/Error Translation, Multi-Instance Routing, Technical Topic Documentation
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Use dedicated cloud error codes where useful; generic 403/404 remains fallback.
- **D-02:** Two focus codes: `COOLIFY_CLOUD_FORBIDDEN` (token/team permission) and `COOLIFY_CLOUD_UNSUPPORTED` (endpoint unavailable/different on Cloud). Keep existing `COOLIFY_403_SENSITIVE_REQUIRED` for sensitive API.
- **D-03:** Apply cloud codes only when instance is known cloud: registry `type: cloud` **or** hostname `*.coolify.io` / `coolify.io` (reuse `inferInstanceType` logic). No guesswork from response body alone on self-hosted.
- **D-04:** Recovery hints are actionable agent steps in English (check/regenerate team-scoped token, note self-hosted-only alternative if known, point to Cloud docs). Not long user prose.
- **D-05:** Ship a **dedicated** MCP list icon (192×192): export from Hex Robot Helper (`docs/assets/mascot-d2-robot-hex.png`) on brand violet — not reuse of `favicon-192.png` as the MCP icon file.
- **D-06:** Host via jsDelivr from the single public repo: `https://cdn.jsdelivr.net/gh/clezcoding/awesome-coolify@main/docs/assets/<mcp-icon>.png`.
- **D-07:** **Single repo only:** `https://github.com/clezcoding/awesome-coolify`. Dual-repo / separate `awesome-coolify-mcp` git remote is retired; npm already points here. Downstream agents must not plan sync-to-second-repo steps; update outdated dual-repo notes in `.planning/codebase/CONVENTIONS.md` when touched.
- **D-08:** MCP metadata (Claude discretion, package-aligned):
  - `title`: `Awesome Coolify`
  - `description`: match `package.json` description
  - `websiteUrl`: `https://github.com/clezcoding/awesome-coolify`
  - SDK/`bin` `name` stays `awesome-coolify-mcp` unless MCP SDK requires a different field split (planner verifies exact `McpServer` constructor API).
- **D-09:** **Aggressive verify gate:** Phase 16 is not done without a screenshot proving Cursor MCP server list shows the awesome-coolify icon after reconnect. Document client icon limitation only if that verify fails (with evidence).
- **D-10:** Depth = setup + smoke + known limits (not a full Cloud API handbook).
- **D-11:** Docs pattern shift: topic gets its own clear doc; README EN/DE keep a **quick overview + links** only. Phase 16 ships Cloud as the first topic under locale folders; full README section split is deferred.
- **D-12:** Files: `docs/en/cloud.md` + `docs/de/cloud.md`.
- **D-13:** Smoke path (Claude discretion): agent-first — after connect, `instance.add` / `import-env` (cloud) → `system` or `meta.version` / light list. Optional one-liner curl for token sanity only.
- **D-14:** Same tool surface for Cloud as self-hosted. On `instance.add`/`update`: still + infer `type`; no soft `_meta.cloudNote` warning; no hard rule that `type: cloud` requires `*.coolify.io` URL.
- **D-15:** Env-only Cloud (`COOLIFY_URL=https://app.coolify.io`) uses the same host-infer at runtime for cloud codes/hints — no registry entry required.
- **D-16:** Add `instance` action `cloud-info` (local/static only — no live API probe): reports `isCloud`, `url`, `source` (registry|env|infer), setup hints, known limits, link to `docs/en|de/cloud.md`.
- **D-17:** `cloud-info` supports optional instance routing like other tools (`instance` param → else Env/default resolution).

### Claude's Discretion
- Exact hint string copy for the two cloud codes (keep short, EN, actionable).
- Exact MCP icon filename under `docs/assets/` (suggest `mcp-icon-192.png` or similar).
- Exact `McpServer` / SDK field wiring for `icons`, `title`, `description`, `websiteUrl` after Context7/SDK check.
- Optional curl one-liner wording in cloud docs.
- How aggressively to refresh dual-repo language in CONVENTIONS (touch when docs/branding work lands).

### Deferred Ideas (OUT OF SCOPE)
- Full README → `docs/en|de/*` split for all sections (Phase 16 only ships Cloud topic docs)
- `.coolify/manifest.json` — Phase 17
- Live UAT harness — Phase 18
- Live `cloud-info` API probe / capability matrix — rejected for v1 of this action
- Billing/plan/rate-limit specific error code zoo — rejected without live evidence
</user_constraints>

## Project Constraints (from .cursor/rules/)
- **Spike findings for awesome-coolify:** Adhere to GSD skill-findings patterns (including structured errors, action-based tool schemas, and uniform formatters).
- **Caveman mode:** Technical response communication follows concise, terse, caveman-style rules.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **CLD-01** | Connect to `https://app.coolify.io` with a team-scoped token using same tool surface as self-hosted | Same client ofetch architecture, credentials routing from Phase 15. |
| **CLD-02** | Cloud failures return structured codes & actionable hints (COOLIFY_CLOUD_FORBIDDEN / COOLIFY_CLOUD_UNSUPPORTED) | Extended error pipeline to capture status 403 and 404 on cloud hostnames. |
| **CLD-03** | Cloud setup path & smoke test documented in EN/DE locale topic docs | Topic docs pattern shift; `docs/en/cloud.md` + `docs/de/cloud.md` with overview in README. |
| **BRND-01** | expose `serverInfo.icons` in MCP `initialize` handshake response | MCP SDK constructor supports `icons` array within first parameter. |
| **BRND-02** | Dedicated 192x192 PNG icon exported from Hex Robot Helper on brand violet via jsDelivr CDN | Crop/create `mcp-icon-192.png` from `docs/assets/mascot-d2-robot-hex.png`. |
| **BRND-03** | Expose fallback title, description, and websiteUrl metadata | Add `title`, `description`, and `websiteUrl` as fallback fields. |
</phase_requirements>

## Summary

Phase 16 is focused on extending the Coolify MCP Server to work with Coolify Cloud (`https://app.coolify.io`) with the same user-experience and tool surface as self-hosted. Additionally, the phase introduces official branding metadata (including title, description, websiteUrl, and a dedicated 192x192 Circular PNG icon) returned during the MCP initialization handshake.

**Primary recommendation:** Use ofetch's request URL extraction to infer cloud status in the global error mapping pipeline dynamically, avoiding the need for global mutable state, and pass exact `icons`, `title`, `description`, and `websiteUrl` fields directly to the `McpServer` constructor.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Coolify Cloud Connection | API / Backend | — | Uses the `ofetch` client with Bearer auth to dispatch requests to `app.coolify.io`. |
| Cloud Error Mapping | API / Backend | — | Captures HTTP status 403/404 on cloud hostnames and translates them to Cloud error codes. |
| MCP Server Branding | API / Handshake | — | Emits icons, title, description, and websiteUrl during the `initialize` JSON-RPC handshake. |
| Cloud-Info Action | API / Tool Handler | — | Local/static action returning registry/env credentials status and cloud limits without live API probes. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@modelcontextprotocol/server` | `^2.0.0-beta.4` | MCP server protocol handling and tools registration | Official TypeScript SDK for Model Context Protocol by Anthropic. [VERIFIED: npm registry] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `ofetch` | `^1.5.1` | HTTP client for making API calls to Coolify | Internal HTTP pipeline in client.ts. [VERIFIED: npm registry] |
| `zod` | `^4.4.3` | Schema definition and validation | Validates incoming tool parameters and registry schemas. [VERIFIED: npm registry] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@modelcontextprotocol/server` | `@modelcontextprotocol/sdk` (legacy) | Older monolithic SDK version; current beta split packages (`/server` and `/client`) provide lighter and more robust TypeScript interfaces. |

**Installation:**
No new packages need to be installed in this phase. Existing package `@modelcontextprotocol/server` is already present.

## Package Legitimacy Audit

No external packages are installed in this phase.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `@modelcontextprotocol/server` | npm | 1 day | 181,734/wk | `github.com/modelcontextprotocol/typescript-sdk` | [OK] | Already Approved |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
[Cursor/MCP Client]
       │ (1) initialize handshake
       ├──► [McpServer] ──► Exposes icons, title, description, websiteUrl
       │
       │ (2) instance.cloud-info
       ├──► [instance.ts] ──► Reads local registry & process.env (No live API probe)
       │
       │ (3) application.list / database.start etc.
       └──► [client.ts] ──► HTTP fetch to Coolify Cloud (app.coolify.io)
                 │
                 ▼ (error thrown)
            [errors.ts]
                 │
                 ├──► checks requestUrl (is *.coolify.io / coolify.io)
                 │
                 ├──► [403] ──► COOLIFY_CLOUD_FORBIDDEN (actionable hint)
                 └──► [404] ──► COOLIFY_CLOUD_UNSUPPORTED (actionable hint)
```

### Recommended Project Structure
```
src/
├── mcp/
│   ├── server.ts     # Update McpServer constructor with metadata
│   └── tools/
│       └── instance.ts # Implement 'cloud-info' action branch
└── utils/
    └── errors.ts     # Add COOLIFY_CLOUD_FORBIDDEN and COOLIFY_CLOUD_UNSUPPORTED mapping
```

### Pattern 1: Exposing MCP Server Branding
**What:** Expose branding options in `McpServer` constructor parameters.
**When to use:** On server startup in `src/mcp/server.ts`.
**Example:**
```typescript
// Source: [CITED: ts.sdk.modelcontextprotocol.io/v2/classes/_modelcontextprotocol_server.server_mcp.McpServer.html]
const server = new McpServer({
  name: 'awesome-coolify-mcp',
  version: '0.1.2',
  title: 'Awesome Coolify',
  description: 'MCP server for Coolify 4.1.x — deploy, diagnose, and CRUD for keys, servers, projects, and environments via action-based tools',
  websiteUrl: 'https://github.com/clezcoding/awesome-coolify',
  icons: [
    {
      src: 'https://cdn.jsdelivr.net/gh/clezcoding/awesome-coolify@main/docs/assets/mcp-icon-192.png',
      mimeType: 'image/png',
      sizes: ['192x192']
    }
  ]
});
```

### Anti-Patterns to Avoid
- **Guessing Cloud error codes based on response body only:** Do not check the response body for "cloudness" on self-hosted instances. Always rely strictly on hostname (`*.coolify.io` or `coolify.io`) or registry instance `type: 'cloud'` to avoid false positives.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Global cloud tracking state | Global mutable context variables tracking active connection | Parse ofetch `FetchError.request` URL dynamically in error pipeline | Global states fail during concurrent requests routing to multiple different instances (D-03). |

**Key insight:** Mapping errors dynamically by inspect of request URL allows multi-instance parallel fetches to self-hosted and cloud servers without state bleed.

## Runtime State Inventory

None — Greenfield branding & cloud integration phase.

## Common Pitfalls

### Pitfall 1: jsDelivr CDN Caching Lag
**What goes wrong:** The MCP icon URL is requested immediately during testing but returns a 404 or old cached asset.
**Why it happens:** jsDelivr `@main` cache is aggressive and is only populated after the icon is pushed to the `main` branch.
**How to avoid:** Commit and push the icon `docs/assets/mcp-icon-192.png` early in the branch, or use a temporary local or direct GitHub raw URL during draft testing.

### Pitfall 2: Cursor Icon Client Limitation
**What goes wrong:** The icon does not render in the Cursor MCP server list after a successful handshake.
**Why it happens:** Client-side limitations or caching in Cursor sometimes ignore `icons` inside `serverInfo`.
**How to avoid:** Rely on D-08 displaying the fallback title and description, and verify using the MCP Inspector or Console logs that the server is returning the correct structure.

## Code Examples

### Map Cloud API Error dynamically
```typescript
// Source: [VERIFIED: mapApiError in src/utils/errors.ts]
function isCloudUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname === 'coolify.io' || hostname.endsWith('.coolify.io');
  } catch {
    return false;
  }
}

// Inside toStructuredError:
const fetchError = error as { request?: unknown; response?: { status?: number } };
const requestUrl = typeof fetchError.request === 'string' ? fetchError.request : undefined;
const isCloud = requestUrl ? isCloudUrl(requestUrl) : false;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Bare HTTP status codes | Structured codes with `recoveryHints` | Phase 2+ | Agents recover gracefully without infinite feedback loops. |
| Global single-instance env | Per-request instance resolution & routing | Phase 15 | Allows seamless operation across self-hosted and cloud instances. |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Cursor client icon rendering is inconsistent/limited | Common Pitfalls | User won't see the robot icon in the sidebar directly, but fallback title and description guarantee usability. |

## Open Questions (RESOLVED)

1. **When will Cursor fully support rendering custom icons?** — RESOLVED (Phase 16, D-09): Out of scope to predict Cursor release timing; instead Phase 16 ships an aggressive verify gate (D-09 screenshot of Cursor MCP server list after reconnect) as the source of truth. If the screenshot shows the icon rendering, the question is moot. If the screenshot shows the icon NOT rendering, the client limitation is documented with evidence (screenshot showing fallback `title`/`description` rendering + MCP Inspector output proving `serverInfo.icons` is emitted in the initialize handshake) per RESEARCH Pitfall 2 / Assumption A1. No further research is required in Phase 16; the verify gate replaces the timeline question.
   - What we know: Cursor fixed `Icon.sizes` validation, but still does not consistently render custom icons in all UI surfaces.
   - What's unclear: Exact release timeline for stable custom icon rendering in Cursor.
   - Phase-bound resolution: D-09 aggressive screenshot verify is the answer — document client limitation only if that verify fails (with Inspector evidence). Always supply rich `title` and `description` fallbacks regardless.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | ✓ | v26.5.0 | — |
| npm | Dependency Management | ✓ | 11.17.0 | — |
| git | Source Control | ✓ | 2.50.1 | — |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest v4.1.10 |
| Config file | none (configured via package.json) |
| Quick run command | `npx vitest run src/utils/errors.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| **CLD-02** | Cloud error mapping of 403 to `COOLIFY_CLOUD_FORBIDDEN` | unit | `npx vitest run src/utils/errors.test.ts` | ✅ |
| **CLD-02** | Cloud error mapping of 404 to `COOLIFY_CLOUD_UNSUPPORTED` | unit | `npx vitest run src/utils/errors.test.ts` | ✅ |
| **BRND-01** | McpServer handshake contains `icons` metadata | unit | `npx vitest run src/mcp/server.test.ts` | ✅ |
| **BRND-03** | McpServer contains title/description/websiteUrl fallbacks | unit | `npx vitest run src/mcp/server.test.ts` | ✅ |

### Wave 0 Gaps
- [ ] Append RED scaffolds to existing `src/mcp/server.test.ts` to assert that the `McpServer` constructor correctly populates and returns `icons`, `title`, `description`, and `websiteUrl` inside `serverInfo` (file already exists with tool-registration tests — append, do not recreate).
- [ ] Add tests inside `src/utils/errors.test.ts` representing cloud hostnames mapping 403 and 404 errors.
- [ ] Add tests in `src/mcp/tools/instance.test.ts` for the newly added `cloud-info` action.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Bearer token Authorization header; token masking on list/get and logging paths. |
| V4 Access Control | yes | Error translation of HTTP 403 on app.coolify.io to `COOLIFY_CLOUD_FORBIDDEN` (token/team permission error). |
| V5 Input Validation | yes | `zod` schema parsing for tool arguments and `cloud-info` action. |
| V6 Cryptography | yes | TLS/HTTPS connection to `https://app.coolify.io` (verifySsl true by default). |

### Known Threat Patterns for Phase 16

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Token exposure in logs | Information Disclosure | `redactSecrets` filter in `mapApiError` and `wrapMcpError` masks the bearer token to `***` before stdout/stderr write. |
| Host redirection / DNS spoofing | Spoofing | Rely strictly on hostname `*.coolify.io` or `coolify.io` to assert cloud status (D-03). |

## Sources

### Primary (HIGH confidence)
- `@modelcontextprotocol/server` - Class definition of McpServer showing constructor options support for `icons`, `title`, `description`, and `websiteUrl`.
- `ofetch` - FetchError structure.
- Local codebase inspection of `src/utils/errors.ts` and `src/api/client.ts`.

### Secondary (MEDIUM confidence)
- Context7 library ID `/kongyo2/my-modelcontextprotocol-doc` - MCP-TypeScript-SDK.txt examples.

### Tertiary (LOW confidence)
- Exa / WebSearch - Discussion on Cursor's current limitations in rendering custom MCP icons.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Verified via npm view and official typescript-sdk documentation.
- Architecture: HIGH - Fully aligned with Phase 15 multi-instance routing design.
- Pitfalls: HIGH - Identified real-world Cursor and jsDelivr limitations with solid workarounds.

**Research date:** 2026-07-22
**Valid until:** 2026-08-21
