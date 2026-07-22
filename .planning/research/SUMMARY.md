# Project Research Summary

**Project:** Coolify MCP Server
**Domain:** DevOps & Infrastructure Orchestration (MCP Server & Client Platform Foundation)
**Researched:** Tuesday Jul 21, 2026
**Confidence:** HIGH

## Executive Summary

Coolify MCP Server is an open-source platform enabling AI agents (e.g., Cursor, Claude Code) to seamlessly operate, provision, and diagnose self-hosted and cloud-hosted Coolify instances. Transitioning into v3.0 (Platform Foundation), the product evolves from a single-target configuration to a robust multi-instance architecture. This transition allows agents to manage multiple staging and production targets concurrently and persist project environment configurations (such as application, service, and database UUIDs) directly inside local workspace directories.

The recommended implementation approach shifts the REST client from a static singleton model to a stateless per-request instantiated factory. By dynamically resolving active credentials—prioritizing local environment variables and falling back to a global, restricted-permission named registry (`~/.coolify-mcp/instances.json`)—the server eliminates cross-instance leakage. Locally, workspaces are dynamically mapped to remote resources through a gitignored state manifest (`.coolify/manifest.json`). This ensures the agent preserves context across sessions without manual user prompting or scanning remote APIs redundantly.

The critical risks in this phase involve security leaks, filesystem write race conditions, and cloud REST boundary mismatches. To prevent exposure of plaintext bearer tokens, the global configuration directory and files must be generated with strictly locked POSIX permissions (`0o700` and `0o600`), and all tool responses must redact secrets dynamically. Additionally, file-write race conditions in concurrent multi-agent environments must be mitigated using atomic file-swapping operations (`fs.rename`). Lastly, since Coolify Cloud does not support low-level system operations (such as validating remote Docker hosts), the server must proactively intercept these actions and provide structured recovery guidance to avoid frustrating agent loops.

## Key Findings

### Recommended Stack

The v3.0 stack leverages standard, high-performance Node.js built-ins combined with lightweight, strongly-typed libraries, completely bypassing heavy or buggy external dependencies like `conf` or `fs-extra`.

**Core technologies:**
- **Node.js (>=22.14.0):** Runtime — standard runtime enabling modern ES Modules, native fetch API, and performant filesystem interaction.
- **TypeScript (^5.3.3):** Language — provides robust compile-time safety, auto-completion, and precise interfaces for multi-instance tool configuration schemas.
- **@modelcontextprotocol/server (^2.0.0-beta.4):** Core Framework — Anthropic's official SDK for building stdio-based MCP servers with robust request/response handling.
- **Zod (^4.4.3):** Schema Validation — declarative runtime schema verification ensuring strict verification of environment, registry inputs, and dynamic tool parameters.
- **ofetch (^1.5.1):** HTTP Client — lightweight fetch wrapper from UnJS with built-in retry mechanics, intelligent error hooks, and structured JSON parsing.
- **yaml (^2.9.0):** YAML Parser — parse multi-line Docker Compose configs and service templates reliably without brittle regex manipulation.

### Expected Features

**Must have (table stakes):**
- **Multi-Instance JSON Config Registry (`~/.coolify-mcp/instances.json`):** A global, secure store for named instances and keys.
- **Active Default Instance Selection:** Setting the current target instance with env variables (`COOLIFY_URL`/`COOLIFY_TOKEN`) serving as the high-priority override.
- **Coolify Cloud Support (`https://app.coolify.io`):** Native compatibility for Cloud connections, including correct URL handling and team-scoped token resolution.
- **Local Project Manifest File (`.coolify/manifest.json`):** Standard schema storing project, server, and environment mappings to speed up agent context loads.
- **Auto-Gitignore Enforcement:** Programmatic injection of `.coolify/` into local `.gitignore` on manifest creation to prevent credential or environment leaks.

**Should have (competitive):**
- **Per-Request Dynamic Routing:** Adding an optional `instance` override parameter to all 14 tool schemas, allowing ad-hoc operations on non-default instances.
- **Temporary Request Override Credentials:** In-memory `url_override` and `token_override` inputs for debugging or emergency tasks on unconfigured endpoints.
- **Agent-Side Manifest Sync:** Automatic background updates to `.coolify/manifest.json` whenever resource mutations (create/delete) occur.

**Defer (v2+ / v3.1+):**
- **Interactive Setup Wizard:** Guided workspace mapping and preflight checks (deferred to v3.1).
- **Custom IDE Skills Package:** Markdown-based agent guides (deferred to v3.1).
- **Cross-Instance Migration & Sync:** Advanced replication of apps/DBs across distinct control planes (deferred to v3.2+).

### Architecture Approach

The architecture separates the MCP protocol execution, stateless API communication, and localized configuration management. This maintains absolute request isolation and enables safe concurrent agent runs.

**Major components:**
1. **`InstanceManager` (`src/utils/instance.ts`):** Manages the global multi-instance registry, resolves active target credentials, and enforces strict file permissions.
2. **`ManifestManager` (`src/utils/manifest.ts`):** Controls local repository mappings, provides gitignore safety, and updates cached resource references.
3. **`CoolifyClient` (`src/api/client.ts`):** Stateless client wrapper mapping requests dynamically using credentials passed from the active tool resolver.

### Critical Pitfalls

1. **Static Configuration Pollution (Global State Leakage):** Hardcoding active URL/token singleton objects causes concurrent calls to execute commands on the wrong server. **How to avoid:** Build stateless client factories that resolve and instantiate connection details on every single tool execution.
2. **Atomic File Write Failures (State Corruption):** Concurrent writes to `instances.json` by parallel agents can corrupt the config. **How to avoid:** Implement atomic file writes using a temporary staging file swapped with `fs.renameSync`.
3. **Insecure Plaintext Token Storage:** Exposing tokens globally to other processes on the host. **How to avoid:** Restrict config folder to POSIX `0o700` and config file to `0o600`. Strip bearer tokens from list responses.
4. **Manifest Desynchronization (Stale Cache):** Operating on deleted resources because the cache is stale. **How to avoid:** Treat local manifest as a directory lookup index; perform GET preflights or catch API 404s to sync state dynamically.
5. **Relative Path Manifest Resolution Failures:** Running the agent from deep directories creates fragmented `.coolify/` folders. **How to avoid:** Implement an upward-climbing project root resolver to target the workspace root consistently.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 15: Multi-Instance Core & Registry CRUD (Platform Foundation)
**Rationale:** Establishing secure dynamic credentials is the blocker for all downstream features.
**Delivers:** `InstanceManager` utility, secure file I/O layer with atomic writes and locked permissions, update to `src/config/env.ts` for dynamic routing, and registration of the new `instance` tool.
**Addresses:** Multi-instance JSON Registry, Active Default Instance Selection, Per-Request Routing.
**Avoids:** Pitfall 1 (Static Config Pollution), Pitfall 2 (Atomic File Corruption), Pitfall 3 (Plaintext Token Leakage).

### Phase 16: Coolify Cloud Integration
**Rationale:** Restructures API clients to handle app.coolify.io specifics before introducing workspace manifests.
**Delivers:** Robust connection mapping for cloud subdomains, retry interceptors for rate limiting, and custom cloud 403 error diagnostics.
**Uses:** Dynamic fetch mapping on `ofetch`.
**Implements:** `CoolifyClient` dynamic overrides.

### Phase 17: Local Project Manifest & Sync
**Rationale:** Uses the stable multi-instance and cloud capabilities to enable localized environment preservation.
**Delivers:** `ManifestManager` with automatic gitignore injection, mutations hooks on applications, databases, and services, and a `manifest:sync` reconciliation tool.
**Addresses:** Local manifest schema, Gitignore enforcement, and Agent-Side Sync.
**Avoids:** Pitfall 4 (Stale Manifest state), Pitfall 6 (Relative Path Failures).

### Phase Ordering Rationale

- Setting up the central instances registry first (Phase 15) ensures we can reliably authenticate and run tools before addressing the public-cloud specifics (Phase 16).
- Integrating local manifest synchronization (Phase 17) is placed last because it depends on the CRUD mutation endpoints of existing resource tools correctly targetting the dynamically resolved multi-instance connection.
- This grouping enforces complete isolation between global credentials and local non-sensitive metadata, preventing security leaks by design.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 16 (Cloud Integration):** Requires detailed testing of the Cloud rate-limit behavior (429 handling) and mapping team authorization scopes to return intelligible recovery suggestions.

Phases with standard patterns (skip research-phase):
- **Phase 15 (Multi-Instance Core):** Follows highly standardized global JSON file manipulation patterns (e.g. from ServiceNow/Odoo MCP).
- **Phase 17 (Local Project Manifest):** Implements typical gitignore appending and JSON cache sync structures common to CLI tooling.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Node.js built-ins and Zod/ofetch are highly stable, verified across standard ESM-first environments. |
| Features | HIGH | Table-stakes features are fully aligned with competitor patterns (e.g., cdeploy, CoolifyEx). |
| Architecture | HIGH | Component diagram and dynamic request flows are clear and well-scoped. |
| Pitfalls | HIGH | Deep understanding of security, permissions, pathing, and cloud-specific limitations. |

**Overall confidence:** HIGH

### Gaps to Address

- **Gap (Rate-Limiting on Cloud):** Dynamic rate limit recovery must be coded carefully using UnJS `ofetch` custom error hooks.
- **Gap (Manifest Verification Preflight):** Verification of manifest entries during runtime to avoid 404 loops must gracefully trigger a cache sync.

## Sources

### Primary (HIGH confidence)
- `/unjs/ofetch` — UnJS ofetch client specification and retry options.
- `https://github.com/coollabsio/coolify` — Coolify source repo, official REST OpenAPI specs.
- `https://app.coolify.io/api/v1` — Verified live Coolify Cloud endpoint behaviors and team token schema.

### Secondary (MEDIUM confidence)
- [CoolifyEx Guide](https://github.com/nshkrdotcom/coolify_ex/blob/main/guides/manifest.md) — Elixir multi-instance manifest patterns.
- [ServiceNow MCP](https://github.com/aartiq/servicenow-mcp/blob/main/docs/MULTI_INSTANCE.md) — Multi-instance JSON configuration architecture.

---
*Research completed: Tuesday Jul 21, 2026*
*Ready for roadmap: yes*
