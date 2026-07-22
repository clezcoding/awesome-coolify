# Pitfalls Research

**Domain:** Coolify MCP Server (v3.0 Platform Foundation)
**Researched:** Tuesday, Jul 21, 2026
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Static Configuration Pollution (Global State Leakage)

**What goes wrong:**
The MCP server is initialized with a single static environment configuration (`COOLIFY_URL`, `COOLIFY_TOKEN`, `COOLIFY_VERIFY_SSL`) from process env. If we introduce multi-instance support but fail to refactor the API client creation, subsequent tool calls will continue to use the initial static credentials. Or, if we store the active instance in a global variable, concurrent tool calls (which can happen in some MCP hosts) might leak credentials or operate on the wrong instance.

**Why it happens:**
Developers often reuse the global `env` object or a singleton client instance instead of resolving the active instance dynamically on every request.

**How to avoid:**
Refactor all tool handlers to resolve the active instance configuration (including URL, token, and SSL verification settings) dynamically on each execution. The client should be instantiated per request using a factory function, e.g., `createCoolifyClient(instance.url, instance.token, instance.verifySsl)`, rather than relying on a global singleton.

**Warning signs:**
Tool calls executing against Instance B are unexpectedly modifying resources on Instance A, or tests for instance switching fail to isolate API calls.

**Phase to address:**
Phase 15 (Multi-instance Core / CRUD)

---

### Pitfall 2: Atomic File Write Failures & State Corruption

**What goes wrong:**
Concurrent file writes to `~/.coolify-mcp/instances.json` (e.g., from multiple concurrent tool calls or parallel agent sessions) can result in partial writes, empty files, or corrupted JSON, rendering the MCP server completely unusable.

**Why it happens:**
Using simple `fs.writeFileSync` or `fs.writeFile` without file locking or atomic write patterns (write to temp file, then rename/replace).

**How to avoid:**
Implement an atomic write strategy. Write the updated JSON content to a temporary file in the same directory (e.g., `instances.json.tmp`), and then use `fs.renameSync` (or `fs.promises.rename`) to atomically replace the original file. This ensures that even if the write is interrupted or fails, the original file remains intact and uncorrupted.

**Warning signs:**
Unhandled JSON parse errors on startup, empty `instances.json` file, or lost instance configurations after concurrent operations.

**Phase to address:**
Phase 15 (Multi-instance Core / CRUD)

---

### Pitfall 3: Insecure Credential Storage (Plaintext Tokens)

**What goes wrong:**
`instances.json` contains plain-text API tokens for multiple production Coolify instances. If the file is created with default system permissions (e.g., `0o644` or `0o755`), other local users or processes on the system can read the sensitive API tokens.

**Why it happens:**
Standard filesystem writes in Node.js do not restrict file permissions by default, and developers often forget to set strict file permissions for configuration files containing secrets.

**How to avoid:**
When creating the `~/.coolify-mcp` directory and `instances.json` file, set strict file permissions. Use `fs.mkdirSync` with mode `0o700` (read/write/execute by owner only) and write the file with mode `0o600` (read/write by owner only). Also, ensure that the redact utility (`src/utils/redact.ts`) is updated to mask any credentials returned in tool outputs when querying instance lists.

**Warning signs:**
Linter warnings, security audits flagging loose file permissions, or `instances.json` having read permissions for group/others.

**Phase to address:**
Phase 15 (Multi-instance Core / CRUD)

---

### Pitfall 4: Desynchronization & Stale State (The "Source of Truth" Conflict)

**What goes wrong:**
Resources are created, updated, or deleted via the Coolify UI or another team member, but the local `.coolify/manifest.json` is not updated. If the agent relies solely on the local manifest to find UUIDs or domains, it will operate on outdated or non-existent resources, leading to silent failures or errors.

**Why it happens:**
Treating the local manifest as the absolute source of truth instead of a local cache/index of remote state.

**How to avoid:**
Design the manifest as a cache or index, not the absolute source of truth. Always verify the existence and status of resources against the live Coolify API before performing operations. Implement a `manifest:sync` action that reconciles the local manifest with the live Coolify instance.

**Warning signs:**
Resource not found errors (404) when operating on UUIDs from the manifest, or mismatched domains.

**Phase to address:**
Phase 17 (Local Manifest & Project Sync)

---

### Pitfall 5: Cloud-Specific Feature Restrictions & Missing Endpoints

**What goes wrong:**
Coolify Cloud does not support certain low-level operations that are available on self-hosted instances (e.g., server validation, private key management, or direct Docker host cleanup). If the agent attempts to run these tools on a Cloud instance, the API will return 403 Forbidden or 404 Not Found, causing the tool execution to fail.

**Why it happens:**
The MCP server assumes all 14 tools and their actions are universally supported across all instances.

**How to avoid:**
Implement feature detection or graceful degradation. When operating on a Coolify Cloud instance, the tool handlers should intercept unsupported actions (like `server:validate` or `private_key:create`) and return a structured error with a clear recovery hint explaining that the action is not supported on Coolify Cloud.

**Warning signs:**
403/404 errors when running server or private key actions on Cloud.

**Phase to address:**
Phase 16 (Coolify Cloud Integration)

---

### Pitfall 6: Relative Path Resolution Failures for Manifest

**What goes wrong:**
If the agent is executed from a subdirectory of the project, resolving `.coolify/manifest.json` relative to the current working directory (`process.cwd()`) will create a new `.coolify` directory inside that subdirectory, leading to multiple fragmented manifests.

**Why it happens:**
Using simple relative paths like `./.coolify/manifest.json` instead of resolving the project root.

**How to avoid:**
Implement a project root resolver that searches upwards from `process.cwd()` for a marker file (like `.git`, `package.json`, or `.coolify/`) to locate the canonical project root, and always read/write the manifest relative to that root.

**Warning signs:**
Multiple `.coolify` directories created in different subfolders of the project.

**Phase to address:**
Phase 17 (Local Manifest & Project Sync)

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Global active instance state | Easy to implement, no need to pass state to handlers | Concurrent requests from different IDE sessions can overwrite each other's active instance, leading to cross-instance operations | Never. Active instance must be resolved per request or passed explicitly. |
| Storing plain-text API tokens in `.coolify/manifest.json` | Easy to read and write in the project directory | Accidental Git commits will expose production API tokens to public repositories | Never. Manifest must only contain non-sensitive metadata (UUIDs, domains). Tokens belong in `~/.coolify-mcp/instances.json` or env. |
| Skipping SSL verification by default for all instances | Avoids self-signed certificate issues on self-hosted instances | Exposes production Coolify Cloud connections to man-in-the-middle (MITM) attacks | Only for local/development self-hosted instances. Must be explicitly configured per-instance (`verifySsl: false`). |
| Relying entirely on local manifest without remote validation | Faster execution (fewer API round-trips) | Agent attempts to operate on deleted or modified resources, leading to unhandled API errors | Never. Always perform a quick GET preflight or handle 404s gracefully with auto-sync. |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Coolify Cloud API | Appending `/api/v1` blindly to the base URL | Coolify Cloud base API URL might already include the version or have a different subdomain. Parse and normalize the base URL dynamically. |
| Coolify Cloud API | Assuming self-hosted `/api/health` or `/api/v1/version` endpoints exist and are accessible | Cloud might restrict access to global version/health endpoints. Use a fallback or skip global health checks for Cloud instances. |
| Coolify Cloud API | Ignoring strict rate limits (429 Too Many Requests) | Implement exponential backoff that parses and respects `Retry-After` headers returned by the Cloud API. |
| Local Filesystem | Hardcoding tilde (`~`) in file paths | Node.js `fs` does not expand `~`. Use `os.homedir()` to resolve the user's home directory portably across macOS, Linux, and Windows. |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Reading `instances.json` on every API call | High disk I/O, slow tool execution | Implement an in-memory cache with file-change detection (using `fs.watch` or checking `mtime` before reading) | > 50 instances or high concurrency |
| Full manifest synchronization on every tool execution | Slow tool response times, high network overhead | Only synchronize the manifest on explicit `manifest:sync` calls or when a 404 error indicates desynchronization | > 100 resources in a project |
| Aggressive polling of Cloud deployments | Triggering rate limits (429), blocked tool execution | Increase polling interval (e.g., 5s instead of 1-2s) and respect rate-limit headers | > 3 concurrent deployments |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Loose permissions on `~/.coolify-mcp/instances.json` | Other local users or malicious processes can read plain-text API tokens | Create the directory with `0o700` and the file with `0o600` permissions. |
| Committing `.coolify/manifest.json` with sensitive domain names or UUIDs | Exposes internal infrastructure layout and potential attack vectors | Clearly document `.gitignore` recommendations; provide an option to exclude sensitive metadata from the manifest. |
| Exposing API tokens in tool response outputs when listing instances | AI agent or IDE logs can leak production API tokens | Ensure `redactSecrets` or a dedicated projection filters out tokens from all tool response payloads. |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Silent instance switching | Agent operates on the wrong instance without user realizing it | Always include the active instance name/URL in the tool's formatted text output (`_formattedText`). |
| Cryptic errors on unsupported Cloud actions | User is confused why a standard tool action (like validate server) fails | Intercept unsupported Cloud actions and return a structured error with a clear recovery hint (e.g., "This action is not supported on Coolify Cloud"). |
| No confirmation on destructive manifest sync | Accidental overwrite of local modifications or local descriptions | Provide a `dry_run` option and require confirmation before performing destructive manifest updates. |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Multi-instance CRUD:** Appears done when instances can be added, but fails in concurrent multi-agent environments due to file write race conditions. Verify by running parallel write tests.
- [ ] **Coolify Cloud Support:** Appears done when base URL is configured, but fails on rate limits or unsupported endpoints. Verify by running a comprehensive smoke test suite against a live Coolify Cloud instance.
- [ ] **Local Manifest Sync:** Appears done when writing UUIDs on creation, but gets out of sync when resources are modified via the Coolify UI. Verify by testing the reconciliation logic with modified remote states.
- [ ] **Home Directory Resolution:** Appears done on macOS/Linux, but fails on Windows due to path separator differences or tilde expansion issues. Verify by using `path.resolve` and `os.homedir()`.

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Corrupted `instances.json` | MEDIUM | Restore from backup or prompt the user to re-authenticate and re-add their Coolify instances. |
| Leaked API Token | HIGH | Revoke the token immediately in the Coolify UI/Cloud console and generate a new one. Update `instances.json` with the new token. |
| Desynchronized Manifest | LOW | Run `manifest:sync` to fetch the latest resource states from the live Coolify API and overwrite the stale local manifest. |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Global State Leakage | Phase 15 (Multi-instance Core / CRUD) | Unit tests verifying that concurrent client requests use isolated configurations. |
| Atomic File Write Failures | Phase 15 (Multi-instance Core / CRUD) | Integration tests simulating concurrent writes to `instances.json`. |
| Loose File Permissions | Phase 15 (Multi-instance Core / CRUD) | Test verifying file permissions are `0o600` on creation. |
| Cloud Rate Limiting | Phase 16 (Coolify Cloud Integration) | Mock tests simulating 429 responses and verifying the client respects `Retry-After` headers. |
| Unsupported Cloud Actions | Phase 16 (Coolify Cloud Integration) | Unit tests verifying that unsupported actions on Cloud return structured errors with recovery hints. |
| Manifest Desynchronization | Phase 17 (Local Manifest & Project Sync) | Sync tests verifying reconciliation of local manifest with modified remote state. |
| Relative Path Resolution Failures | Phase 17 (Local Manifest & Project Sync) | Test running the agent from a subdirectory and verifying the manifest is created at the project root. |

## Sources

- [Coolify API Documentation](https://coolify.io/docs/api)
- [Node.js File System Security Best Practices](https://nodejs.org/api/fs.html)
- [Model Context Protocol Security Guidelines](https://modelcontextprotocol.io)
- [Community discussions on Coolify API rate limits and Cloud quirks]

---
*Pitfalls research for: Coolify MCP Server (v3.0 Platform Foundation)*
*Researched: Tuesday, Jul 21, 2026*
