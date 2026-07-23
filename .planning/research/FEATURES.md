# Feature Research: v3.1 Setup, Skills & DX

**Domain:** Setup Wizard, IDE Skills, Richer Descriptions, MCP Prompts, Service Recipes, OpenAPI Coverage, Deployment Watch, and Release Workflow
**Researched:** Friday Jul 24, 2026
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **GitHub CLI Preflight Checks** | Users executing a setup wizard expect automatic verification of local prerequisites before kicking off resource provisioning. | LOW | Verifies `gh --version` and checks authentication via `gh auth status`. If unauthorized, pauses and provides a step-by-step login guide instead of failing silently. |
| **Richer Tool Descriptions & Flat Schemas** | Cursor flattens nested `oneOf` or `anyOf` schema fields to a generic "No parameters" UI. Users need a surface that works out-of-the-box. | MEDIUM | Replace complex Zod unions with flat, optional top-level schemas or unconstrained object types, then handle custom multi-variant validation on the server side. |
| **Service Type Discovery (`service.list-types`)** | Users need to discover which database and application services can be spun up on their specific Coolify instance. | LOW | Queries the active Coolify instance's built-in catalog dynamically via the REST API, avoiding hardcoded, static client-side template definitions. |
| **Release Workflow (Changesets + OIDC)** | Maintainers need a secure, non-interactive automated npm release process without long-lived, high-privilege publish tokens. | MEDIUM | Leverages the official GitHub `changesets/action` combined with npm OIDC (Trusted Publishing). Publishes automatically only when the release PR is merged. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Interactive Setup Wizard** | Allows a developer to initialize, configure, and push a new codebase to Git and map it to a remote Coolify environment in one go. | HIGH | Coordinates local directory initialization, runs `gh repo create --source . --private`, calls MCP to provision a project/env, and writes `.coolify/manifest.json`. |
| **Custom IDE Skills Package** | Packages standard, reusable instructions for agents (Cursor, Claude Code, Codex) to handle manifest syncing and deployment monitoring. | LOW | Deploys identical instruction structures to `.cursor/skills/`, `.agents/skills/`, and `.codex/skills/` so agents automatically align with our conventions. |
| **MCP Prompts Registry** | Exposes built-in prompt templates for `deploy`, `diagnose`, `new-project`, and `incident` workflows directly to MCP-compatible IDEs. | MEDIUM | Exposes a standardized prompts list via the MCP `prompts/list` capability. Enables IDEs to retrieve parameterized, structured message blocks via `prompts/get`. |
| **Non-blocking Deployment Watcher** | Lets developers monitor long-running deployments asynchronously without locking the agent chat session or triggering timeouts. | HIGH | Implements `deployment.watch` using the native MCP Tasks extension or background resource updates, notifying the client via notifications when terminal status is reached. |
| **OpenAPI Coverage Mapping** | Evaluates and maps the official Coolify API spec (`docs/coolify_openapi.json`) against the MCP tool handlers to identify coverage gaps. | MEDIUM | Scans spec paths and compares them to registered TypeScript handlers. Generates a live markdown gap report (`COVERAGE.md`) to guide future API parity. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Self-Hosted Compose Template Catalog** | Users want the MCP to store separate, local Docker Compose stacks for 200+ Coolify one-click services. | Quickly becomes outdated, duplicates upstream efforts, and bloats the repository size significantly. | Use `service.list-types` to dynamically fetch supported templates from the user's active Coolify instance. |
| **Synchronous Blocking Polling** | Users want the `deployment.watch` tool to block and await completion before returning a response. | Triggers tool timeouts, blocks parallel agent processes, and wastes API connection limits. | Return a non-blocking `taskId` or `watchId` immediately and rely on async polling or resource notifications. |
| **Global Auto-Push on Git Init** | Users want the wizard to automatically push commits directly to the remote repository. | Risks pushing unfinished modifications, bypasses branch protection rules, and lacks human verification. | Perform repo creation and initial remote linking, then output the suggested command for the user to push manually. |

## Feature Dependencies

```
[service.list-types] ───────┐
                            ▼
[OpenAPI Coverage Map] ──► [Richer Tool Descriptions] ──► [Interactive Setup Wizard]
                            ▲
[deployment.watch] ─────────┘

[Unified IDE Skills Package] ──utilized_by──► [MCP Prompts Registry]
```

### Dependency Notes

- **[Interactive Setup Wizard] requires [Richer Tool Descriptions]:** The wizard parameters must be flat and well-documented so that the agent's IDE can render the setup arguments correctly without showing "No parameters".
- **[Interactive Setup Wizard] requires [service.list-types]:** The wizard needs to resolve valid one-click database and service types from Coolify before provisioning them.
- **[deployment.watch] depends on [Richer Tool Descriptions]:** Monitoring tasks require flat input arguments (`deploymentUuid`, `serverId`, etc.) that are correctly mapped by the client.
- **[OpenAPI Coverage Map] feeds into [Richer Tool Descriptions]:** Resolving API schema gaps ensures that tool schemas exactly mirror the upstream parameters while remaining agent-friendly.
- **[MCP Prompts Registry] utilizes [Unified IDE Skills Package]:** Prompt templates reference specific runbook instructions located in the skills files to direct model behavior.

## MVP Definition

### Launch With (v3.1)

Minimum viable product — what's needed to establish standard setup, skills, and close major DX/schema gaps.

- [ ] **GitHub CLI Preflight Checks** — Pre-checks for `gh` presence and active credentials before proceeding with automated configuration.
- [ ] **Richer Tool Descriptions** — Standardize Zod schemas of all tools to flatten unions, ensuring Cursor never displays a generic "No parameters" UI.
- [ ] **Unified IDE Skills Package** — Deploy identical skill instruction sets under `.cursor/skills/`, `.agents/skills/`, and `.codex/skills/`.
- [ ] **MCP Prompts Registry** — Expose `deploy`, `diagnose`, `new-project`, and `incident` templates via the standard MCP prompts endpoints.
- [ ] **OpenAPI Coverage Mapping** — Create a CLI utility/script that audits `docs/coolify_openapi.json` and outputs an active coverage gap analysis.
- [ ] **Release Workflow via Changesets** — Configure a robust GitHub Actions runner that automatically publishes releases to npm using OIDC Trusted Publishing.

### Add After Validation (v3.2)

Features to add once core DX is verified.

- [ ] **Non-blocking Deployment Watcher (`deployment.watch`)** — Shift watch implementation to standard MCP Tasks / background resource updates.
- [ ] **Service Type List-Types** — Extend the existing `service` toolset to dynamically fetch and display active instance catalog templates.

### Future Consideration (v3.3+)

Features to defer until integration adoption is complete.

- [ ] **Custom Recipes Deployment** — Create custom compose stacks directly from a curated, offline stack recipe file (such as app + database bindings) based on user-supplied codebases.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| **GitHub CLI Preflight Checks** | HIGH | LOW | P1 |
| **Richer Tool Descriptions & Flat Schemas** | HIGH | MEDIUM | P1 |
| **Unified IDE Skills Package** | HIGH | LOW | P1 |
| **MCP Prompts Registry** | HIGH | MEDIUM | P1 |
| **OpenAPI Coverage Mapping** | MEDIUM | MEDIUM | P1 |
| **Release Workflow (Changesets + OIDC)** | HIGH | MEDIUM | P1 |
| **Non-blocking Deployment Watcher** | HIGH | HIGH | P2 |
| **Service Type List-Types** | MEDIUM | LOW | P2 |
| **Custom Recipes Deployment** | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | CoolifyEx (Elixir) | coolify-deploy (cdeploy) | Our Approach (awesome-coolify-mcp) |
|---------|--------------------|--------------------------|-------------------------------------|
| **Interactive Wizard** | No, requires manual Elixir config definition. | No, designed only for single-target deployment configs. | **Yes, interactive Setup Wizard with GitHub CLI preflight checks and manifest configuration.** |
| **IDE Custom Skills** | No. | No. | **Yes, native skill packages for Cursor, Claude Code, and Codex.** |
| **MCP Prompts** | No, strictly library-driven. | No. | **Yes, structured prompts for common operations (deploy, diagnose, incident).** |
| **Deployment Watch** | Yes, synchronous blocking process. | Yes, blocking tailing log. | **Yes, asynchronous, non-blocking deploy.watch utilising the MCP Tasks / resource updates.** |
| **OpenAPI Mapping** | No, manual client wrapper maintenance. | No. | **Yes, OpenAPI coverage gap analysis mapping docs/coolify_openapi.json directly to handlers.** |

## Sources

- [Model Context Protocol Prompts Specification](https://modelcontextprotocol.io/specification/2025-03-26/server/prompts)
- [Model Context Protocol Tasks Extension](https://modelcontextprotocol.io/extensions/tasks/overview)
- [GitHub CLI Manual](https://cli.github.com/manual/)
- [Changesets GitHub Actions Action Documentation](https://github.com/changesets/action)
- [npm Trusted Publishing Guide](https://docs.npmjs.com/trusted-publishers/)
- [Cursor Community Forum - MCP Schema Flattening Issues](https://forum.cursor.com/t/mcp-tools-parameter-schema-not-displaying-correctly-shows-generic-random-string-instead-of-actual-schema/109840)

---
*Feature research for: Coolify v3.1 Setup, Skills & DX features*
*Researched: Friday Jul 24, 2026*
