# Project Research Summary

**Project:** Coolify MCP Server
**Domain:** MCP Server & DX Tools
**Researched:** Friday, Jul 24, 2026
**Confidence:** HIGH

## Executive Summary

The Coolify MCP Server (v3.1 Setup, Skills & DX) is designed to provide a unified, developer-friendly Model Context Protocol (MCP) interface for interacting with both self-hosted and cloud Coolify instances. This milestone shifts the focus from core platform capabilities (established in v3.0) to developer experience (DX), interactive onboarding, and IDE integrations. Experts build these tools by focusing on stateless, robust, and highly-contextualized integrations that empower AI agents (such as Cursor, Claude Code, and Codex) to perform complex infrastructure operations autonomously without blocking client sessions or triggering timeouts.

The recommended approach is to establish a strong DX foundation by flattening tool parameter schemas to bypass IDE rendering limitations, implementing standard MCP Prompts for guided workflows, and introducing a non-blocking asynchronous deployment watcher. This is followed by a dynamic, API-driven service recipe discovery mechanism and an interactive, headless-safe Setup Wizard CLI. Finally, we ensure long-term maintainability through automated OpenAPI coverage mapping and a secure, OIDC-driven npm release workflow.

The key risks in this milestone include:
1. **Cursor `oneOf` rendering defects** causing tools to display as having "No parameters", which we mitigate by standardizing on flat, optional top-level schemas validated internally via Zod.
2. **Headless execution blocks** during interactive GitHub CLI (`gh`) preflight checks, which we avoid by checking TTY status and supporting environment variable fallbacks.
3. **Polling storms and timeouts** during deployment monitoring, which we address through progressive stateless polling with exponential backoff and log-incremental streaming.

## Key Findings

### Recommended Stack

The recommended stack focuses on modern, lightweight, and zero-dependency TypeScript-native libraries that integrate seamlessly with the existing Model Context Protocol and Node.js environment.

**Core technologies:**
- `@modelcontextprotocol/server` (`^2.0.0-beta.4`): MCP Server core framework — Provides the standard protocol implementation for tools, resources, and the new Prompts API.
- `@clack/prompts` (`^0.9.1`): Interactive CLI Setup Wizard — Modern, beautifully designed terminal prompt library used by Vite and Astro, offering superior UX over older alternatives.
- `@scalar/openapi-parser` (`^0.25.3`): OpenAPI Specification Parsing — Modern, zero-dependency, TypeScript-native OpenAPI parser that supports OpenAPI 3.0/3.1/3.2, perfect for mapping coverage.
- `ofetch` (`^1.5.1`): Dynamic recipe and template fetching — Used to fetch the official `service-templates.json` from Coolify's repository at runtime, avoiding static catalog bloat (already installed).
- `@scalar/openapi-types` (`^0.6.0`): Strict OpenAPI TypeScript types — Used alongside `@scalar/openapi-parser` for type-safe manipulation of the OpenAPI document.
- `zod` (`^4.4.3`): Schema validation & Prompt arguments — Used to define and validate action inputs, outputs, and Prompts API arguments (already installed).

### Expected Features

The feature landscape for v3.1 is prioritized to establish baseline setup capabilities, deploy IDE skills, and close critical DX and schema gaps.

**Must have (table stakes):**
- **GitHub CLI Preflight Checks:** Verifies `gh` CLI presence and authentication status, providing a step-by-step fallback guide if unauthorized.
- **Richer Tool Descriptions & Flat Schemas:** Replaces complex Zod unions with flat, optional top-level schemas to bypass Cursor's rendering limitations.
- **Service Type Discovery (`service.list-types`):** Dynamically queries the active Coolify instance's catalog via the REST API rather than hardcoding static templates.
- **Release Workflow (Changesets + OIDC):** Automates npm publishing securely using GitHub Actions and npm OIDC Trusted Publishing.

**Should have (competitive):**
- **Interactive Setup Wizard:** Guides developers through workspace initialization, git repository linking, and Coolify environment mapping.
- **Custom IDE Skills Package:** Deploys identical instruction structures to `.cursor/skills/`, `.agents/skills/`, and `.codex/skills/` to align agent behaviors.
- **MCP Prompts Registry:** Exposes parameterized prompt templates (`deploy`, `diagnose`, `new-project`, `incident`) to MCP-compatible IDEs.
- **Non-blocking Deployment Watcher:** Implements progressive stateless polling with incremental log streaming to monitor long-running builds asynchronously.
- **OpenAPI Coverage Mapping:** Audits `docs/coolify_openapi.json` against registered handlers to generate a live `COVERAGE.md` gap report.

**Defer (v2+):**
- **Self-Hosted Compose Template Catalog:** Avoided as an anti-feature; duplicates upstream efforts and causes rapid configuration drift.
- **Synchronous Blocking Polling:** Avoided as an anti-feature; triggers tool timeouts and blocks parallel agent processes.
- **Global Auto-Push on Git Init:** Avoided as an anti-feature; bypasses human verification and branch protection rules.
- **Custom Recipes Deployment:** Deferred to v3.3+ as a future consideration.

### Architecture Approach

The architecture extends the existing v3.0 platform foundation by segregating CLI-only interactive scripts from the core MCP runtime process. This keeps build sizes slim and prevents interactive libraries from interfering with MCP stdio pipes.

**Major components:**
1. `SetupWizard` (`src/cli/setup-wizard.ts`) — Guides users through workspace preflights and links local repositories directly to Coolify endpoints.
2. `McpPrompts` (`src/mcp/prompts.ts`) — Registers LLM workflow prompt templates on the MCP server layer using Zod arguments validation.
3. `OpenAPICoverage` (`src/cli/openapi-coverage.ts`) — Maps the official Coolify OpenAPI specification against the implemented API client and tool endpoints.
4. `RecipesCatalog` (`src/utils/service-recipes.ts`) — Catalogs Coolify’s 200+ native service templates and provides local fallback structures when the API is offline.
5. `CoolifyClient` (`src/api/client.ts`) — Extended stateless HTTP client supporting dynamic service list types and deployment log streaming.

### Critical Pitfalls

The top critical pitfalls identified in research must be explicitly addressed during implementation:

1. **Cursor `oneOf` Schema Rendering Defect** — Cursor renders complex schema unions as "No parameters". *Prevention:* Standardize on flat schemas with optional top-level fields and validate mutually-exclusive constraints internally using Zod.
2. **Interactive `gh` Preflight Blocks Headless Agents** — Interactive CLI prompts block indefinitely in headless agent environments. *Prevention:* Detect non-interactive TTY environments, pass `--non-interactive` flags, and support env-based token fallbacks.
3. **Deploy Watch Polling Storms & Timeouts** — Aggressive polling triggers rate limits (429) or hangs on slow builds. *Prevention:* Implement progressive stateless polling with exponential backoff, jitter, minimum 3s-5s intervals, and strict timeouts.
4. **Stale YAML Recipe Duplication** — Embedding static Docker Compose templates leads to rapid configuration drift. *Prevention:* Query Coolify's native `service.list-types` dynamically and link to `coolify-examples` as hints only.
5. **MCP Prompts vs. Tools Confusion** — Implementing complex multi-step workflows inside atomic tool handlers bloats code and bypasses LLM reasoning. *Prevention:* Keep tools atomic and use MCP Prompts to define workflow templates and context.

## Implications for Roadmap

Based on research, the suggested phase structure for the v3.1 milestone is ordered logically to resolve schema blockers first, build the dynamic capabilities, and then layer on the interactive setup and verification tools.

### Phase 1: Prompts & Richer Tool Descriptions
- **Rationale:** Cursor's `oneOf` rendering defect is a critical blocker for tool usability. Resolving this and exposing the Prompts API provides an immediate, high-value DX foundation.
- **Delivers:** Flattened Zod schemas for all tools, standard prompts registry (`deploy`, `diagnose`, `new-project`, `incident`).
- **Addresses:** Richer Tool Descriptions & Flat Schemas (DX-DESC-*), MCP Prompts Registry (PROMPT-*).
- **Avoids:** Pitfall 10 (Cursor `oneOf` Schema Rendering Defect), Pitfall 9 (MCP Prompts vs. Tools Confusion).

### Phase 2: Recipes & Service List-Types
- **Rationale:** Dynamic service discovery is a prerequisite for the setup wizard and prevents the maintenance nightmare of static template duplication.
- **Delivers:** `service.list-types` action, dynamic fetching of `service-templates.json` via `ofetch` with local static fallback.
- **Addresses:** Service Type Discovery (`service.list-types`) (RECIPE-*).
- **Avoids:** Pitfall 8 (Stale YAML Recipe Duplication).

### Phase 3: Deploy Watch
- **Rationale:** Non-blocking deployment monitoring is a major differentiator that prevents agent timeouts and session hangs during long-running builds.
- **Delivers:** `deployment.watch` action, progressive stateless polling with incremental log streaming in `src/utils/deploy-poll.ts`.
- **Addresses:** Non-blocking Deployment Watcher (WATCH-*).
- **Avoids:** Pitfall 12 (Deploy Watch Polling Storms & Timeouts).

### Phase 4: Setup Wizard & IDE Skills
- **Rationale:** Wizards and skills are the core entry points for new developers. They depend on flat schemas and list-types to function correctly.
- **Delivers:** Interactive Setup Wizard CLI (using `@clack/prompts` and non-interactive `gh` checks), unified IDE skills package (.cursorrules, .claudecoderules, .codex/skills).
- **Addresses:** GitHub CLI Preflight Checks (SETUP-*), Interactive Setup Wizard (SETUP-*), Custom IDE Skills Package (SKILL-*).
- **Avoids:** Pitfall 7 (Interactive `gh` Preflight Blocks Headless Agents), Pitfall 14 (Skills Teaching Incorrect Tool Call Patterns), Pitfall 6 (Relative Path Resolution Failures for Manifest).

### Phase 5: OpenAPI Coverage Mapping & npm Release
- **Rationale:** Ensures long-term API compliance and automates the release workflow to npm using OIDC.
- **Delivers:** OpenAPI mapping script, `COVERAGE.md` gap analysis, GitHub Actions publish workflow with changesets and npm OIDC.
- **Addresses:** OpenAPI Coverage Mapping (OAPI-*), Release Workflow (Changesets + OIDC) (PUB-*).
- **Avoids:** Pitfall 11 (OpenAPI Coverage Drift), Pitfall 13 (Accidental Release of Secrets or Test Harness).

### Phase Ordering Rationale

- **Dependency-Driven Order:** We resolve schema blockers (Phase 1) and dynamic discovery (Phase 2) first, because the Setup Wizard (Phase 4) depends on flat, well-documented tool schemas and valid service types to function.
- **Architecture Segregation:** We build the non-blocking polling mechanism (Phase 3) before wrapping it in the Setup Wizard and IDE skills (Phase 4) so that the skills can teach correct, non-blocking monitoring patterns.
- **Pitfall Avoidance:** By placing the OpenAPI Coverage Mapping (Phase 5) at the end, we can audit the complete, extended tool surface against the official OpenAPI specification and establish a robust, validated release baseline.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Deploy Watch):** Needs careful API research on how Coolify handles log streaming endpoints and whether there are differences between self-hosted and Cloud deployment log payloads.
- **Phase 5 (OpenAPI Coverage Mapping):** Complex AST parsing of TypeScript client files and matching them against the OpenAPI JSON paths require prototyping to avoid brittle regex-based solutions.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Prompts & Richer Tool Descriptions):** Follows standard MCP SDK prompt registration patterns and standard Zod schema flattening.
- **Phase 2 (Recipes & Service List-Types):** Reuses the existing stateless `ofetch` client and standard JSON parsing.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified with official MCP, Clack, and Scalar documentation. |
| Features | HIGH | Directly maps to validated user requirements and Cursor community feedback. |
| Architecture | HIGH | Clear segregation of CLI and MCP boundaries; robust patterns for polling and prompts. |
| Pitfalls | HIGH | Comprehensive analysis of filesystem, API, security, and IDE-specific failure modes. |

**Overall confidence:** HIGH

### Gaps to Address

- **Coolify API Log Tail Parity:** Coolify 4.1.x API has known gaps regarding service and database log tailing (SVC-04 is deferred to v1.1). We must handle this gracefully by returning clear "not supported by API" hints if requested.
- **Scalar Parser Bundle Size:** `@scalar/openapi-parser` is a powerful tool but we must ensure its inclusion does not bloat the main MCP server runtime bundle. We keep it strictly inside the CLI build boundary.

## Sources

### Primary (HIGH confidence)
- `/modelcontextprotocol/typescript-sdk` — MCP Prompts API and autocompletion standard.
- `https://cursor.com/docs/rules` — Cursor rules and `.mdc` frontmatter specification.
- `https://github.com/scalar/scalar/tree/main/packages/openapi-parser` — Scalar OpenAPI parser capabilities.
- `https://coolify.io/docs/api` — Coolify REST API 4.1.x specifications.

### Secondary (MEDIUM confidence)
- `https://code.claude.com/docs/en/skills` — Claude Code skills specification.
- `https://developers.openai.com/codex/skills` — Codex skills and TOML configuration specification.
- `https://forum.cursor.com/t/mcp-tools-parameter-schema-not-displaying-correctly-shows-generic-random-string-instead-of-actual-schema/109840` — Cursor schema flattening community discussions.

---
*Research completed: Friday, Jul 24, 2026*
*Ready for roadmap: yes*
