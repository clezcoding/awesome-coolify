# Feature Research: v3.0 Platform Foundation

**Domain:** Multi-Instance Management, Cloud Integration, and Local State Manifests
**Researched:** Tuesday Jul 21, 2026
**Confidence:** MEDIUM

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Multi-Instance JSON Config Registry (`~/.coolify-mcp/instances.json`)** | Users manage multiple staging/production instances and need a centralized, secure registry for URLs and API keys without leaking credentials. | MEDIUM | Standard JSON file located at `~/.coolify-mcp/instances.json` (or `%USERPROFILE%\.coolify-mcp\instances.json`). Needs automatic directory creation, safe JSON parsing, and validation using Zod. |
| **Active Default Instance Selection** | Essential for seamless DX so all tool calls target the "active" default instance if no specific instance override is passed. | LOW | Pointer field `"default_instance"` in `instances.json`. Fallback defaults to existing `COOLIFY_URL`/`COOLIFY_TOKEN` env variables if registry is missing. |
| **Coolify Cloud API Support (`https://app.coolify.io`)** | Standard offering for users who do not want to manage their own Coolify control plane. | LOW | Uses the exact same REST API schema. Only requires URL resolution adjustments (allowing `app.coolify.io`) and Bearer token support in the request-handling client. |
| **Local Project Manifest File Schema (`.coolify/manifest.json`)** | Needed to persist environment mapping (UUIDs, FQDNs) locally to eliminate re-querying or asking the user for resource identifiers across chat sessions. | LOW | JSON structure representing local project references: `projectId`, `environmentName`, `serverId`, and arrays of mapped local resources to remote UUIDs. |
| **Automatic `.gitignore` Enforcement** | Crucial to prevent accidental commits of deployment-specific UUIDs, domain mappings, or target servers to public repositories. | LOW | MCP client or helper tool automatically appends `.coolify/` to the workspace `.gitignore` file on initialization. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **On-the-Fly Per-Request Instance Routing (`instance` parameter)** | Allows executing commands on non-default instances dynamically (e.g. duplicating/syncing an environment from staging instance to production in a single session). | MEDIUM | Add an optional `instance` string parameter to all 14 existing tools. Client dynamically overrides client credentials based on the registry definition. |
| **Temporary Request Override Credentials (`token` & `url` parameters)** | Enables agents to perform operations on ad-hoc instances (e.g. emergency hotfix on client-provided server) without writing secrets to persistent local storage. | MEDIUM | Support optional `url_override` and `token_override` arguments in core tool schemas. Credentials are held purely in memory during the execution lifecycle. |
| **Agent-Side Manifest Lifecycle Sync** | Ensures local workspace metadata is kept 100% current with remote infrastructure without manual user intervention. | MEDIUM | MCP tools returning created resources must output clear JSON blocks that the agent can read. When creating apps/DBs/services, the agent actively writes the resulting UUIDs to `.coolify/manifest.json`. |
| **Coolify Cloud Team & Permission Diagnostics** | Detects cloud-specific team configurations, permission ceilings, and provides structured recovery hints when tools fail due to scoping. | HIGH | Cloud uses team-scoped API tokens. Needs custom error parsing for 401/403 responses specifically highlighting cloud role constraints and subscription/team boundaries. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Global Parallel Fan-Out Queries (Cross-Instance Search)** | Users want to find a service/application across all configured Coolify instances simultaneously. | Massive performance degradation, severe rate limiting (especially on Coolify Cloud), security exposure risk, and excessive token usage for agent reasoning. | Enforce explicit instance targeting. Provide a lightweight `instances:list` tool to let agents verify which instances are connected. |
| **Shared Global Manifest Commits** | Teams want to share manifest state across environments via Git. | Leads to constant merge conflicts, path mismatches (local project paths), and leaks private domain configurations or VPS IP structures. | Gitignore `.coolify/manifest.json`. Instead, commit a safe, generic `.coolify-manifest.example.json` template. |
| **Bidirectional Hot-Reload Schema Sync** | Users want remote Coolify changes to immediately auto-update local repository code or docker-compose configurations. | High risk of overwriting local git modifications; complex merge logic is prone to breaking local setups. | Local files remain the single source of truth. Remote configurations are updated unidirectionally via MCP push operations. |

## Feature Dependencies

```
[instances.json Registry] 
       ▲          ▲
       │          │
       │     (requires)
       │          │
 (requires)  [Default Instance Switching]
       │
 [Per-Request Routing] ──overrides──► [Default Instance Url/Token]

 [Existing CRUD Tools] ──complemented_by──► [Coolify Cloud Support]
       ▲
       │
 (updates)
       │
 [Local State Manifest] ──gitignored_by──► [Gitignore Enforcement]
```

### Dependency Notes

- **[Per-Request Routing] requires [instances.json Registry]:** Dynamic routing needs to resolve instance-specific URLs and Bearer tokens from the configuration registry.
- **[Default Instance Switching] requires [instances.json Registry]:** Setting the global active connection requires writing the target default name to the configuration registry.
- **[Local State Manifest] updates [Existing CRUD Tools]:** The agent uses existing creation and deployment tools to fetch UUIDs, then writes them back to the manifest.
- **[Local State Manifest] requires [Gitignore Enforcement]:** To prevent security and metadata leaks, gitignore must be configured before writing the manifest.

## MVP Definition

### Launch With (v3.0 - Platform Foundation)

Minimum viable product — what's needed to establish multiple instance connections, Cloud access, and local repository mappings.

- [ ] **Multi-instance CRUD (`instances.json`)** — Central registry at `~/.coolify-mcp/instances.json` to store named instances securely.
- [ ] **Default Instance Selector & Fallbacks** — Setting active default connection; falls back to env variables if registry is empty.
- [ ] **Per-Request Routing via `instance` Parameter** — Extend Zod schemas of all 14 tools to accept an optional `instance` string.
- [ ] **Coolify Cloud REST Support** — Verify client is compatible with `https://app.coolify.io/api/v1` and handle cloud tokens.
- [ ] **Local Manifest File Schema** — Standardized `.coolify/manifest.json` schema storing `projectId`, `serverId`, and mapped resource UUIDs.
- [ ] **Auto-Gitignore Enforcement** — Add `.coolify/` folder pattern to local `.gitignore` upon first initialization.

### Add After Validation (v3.1 - Scoped Backlog)

Features to add once the foundation is stable.

- [ ] **Standard Setup Wizard** — Interactively guide project setup, including GitHub CLI preflight check and auto-repository mapping.
- [ ] **Custom IDE Skills Package** — Markdown-based system skills in `.agents/skills` / `.cursor/skills` to guide agent manifest updates.
- [ ] **Active Manifest Lifecycle Sync** — Direct API integrations or tool workflows to automatically align local and remote state.

### Future Consideration (v3.2+)

Features to defer until foundation adoption is validated.

- [ ] **Coolify Cloud Granular Role Detection** — Intelligent diagnostics that parse user token scopes (e.g. Member, Owner) to warn agents of restricted actions.
- [ ] **Cross-Instance Sync & Migrations** — Safe duplication or relocation of environment configurations between distinct Coolify servers.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| **Multi-Instance JSON Config (`instances.json`)** | HIGH | MEDIUM | P1 |
| **Default Instance Switching** | HIGH | LOW | P1 |
| **Per-Request `instance` Routing Parameter** | HIGH | MEDIUM | P1 |
| **Coolify Cloud Client Compatibility** | HIGH | LOW | P1 |
| **Local Project Manifest Schema** | HIGH | LOW | P1 |
| **Auto-Gitignore Enforcement** | HIGH | LOW | P1 |
| **Local Manifest Agent Sync Workflows** | MEDIUM | MEDIUM | P2 |
| **Coolify Cloud Role/Scope Diagnostics** | MEDIUM | HIGH | P2 |
| **Cross-Instance Migration Tooling** | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | CoolifyEx (Elixir) | coolify-deploy (cdeploy) | Our Approach (awesome-coolify-mcp) |
|---------|--------------------|--------------------------|-------------------------------------|
| **Multi-Instance Registry** | Yes, via custom `.coolify_ex.exs` configuration structure. | No, designed only for single-target execution via env. | **Yes, centralized `~/.coolify-mcp/instances.json` plus per-request routing override.** |
| **Coolify Cloud Support** | Yes, by manually configuring base URL and token. | Yes, by pointing target URL to app.coolify.io. | **Yes, native compatibility out-of-the-box with customized cloud onboarding and smoke testing.** |
| **Local Project Manifest** | Yes, `.coolify_ex.exs` maps project properties. | Yes, `coolify.manifest.json` maps expected state. | **Yes, `.coolify/manifest.json` with active agent sync, providing robust repository state preservation.** |

## Sources

- [Coolify OpenAPI Specification](https://github.com/coollabsio/coolify/blob/main/openapi.yaml)
- [Coolify REST API documentation](https://deepwiki.com/coollabsio/coolify/8-api-reference)
- [CoolifyEx GitHub Guide](https://github.com/nshkrdotcom/coolify_ex/blob/main/guides/manifest.md)
- [Coolify-Deploy (cdeploy) GitHub Repository](https://github.com/julianstephens/coolify-deploy)
- [ServiceNow MCP & Odoo MCP Multi-Instance Pattern Documentation](https://github.com/aartiq/servicenow-mcp/blob/main/docs/MULTI_INSTANCE.md)

---
*Feature research for: Coolify v3.0 Platform Foundation features*
*Researched: Tuesday Jul 21, 2026*
