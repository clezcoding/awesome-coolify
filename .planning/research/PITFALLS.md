# Pitfalls Research

**Domain:** Coolify MCP Server (v3.1 Setup, Skills & DX)
**Researched:** Friday, Jul 24, 2026
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

### Pitfall 7: Interactive `gh` Preflight Blocks Headless Agents

**What goes wrong:**
The setup wizard uses the GitHub CLI (`gh`) to check authentication, repository access, or organization scopes. If the environment is headless (such as Cursor, Claude Code, or a CI runner), the CLI may block indefinitely waiting for interactive user input or TTY confirmation.

**Why it happens:**
Assuming the setup wizard is only executed by human operators in standard interactive terminals, leading to a lack of non-interactive fallbacks or `--non-interactive` flags.

**How to avoid:**
Detect non-interactive environments by checking `process.stdout.isTTY` or specific environment variables (like `CI` or `TERM=dumb`). Always pass `--non-interactive` flags to CLI commands, and allow users to supply credentials via environment variables (`GH_TOKEN`, `GITHUB_TOKEN`) to bypass interactive login prompts.

**Warning signs:**
The setup wizard hangs indefinitely during agent execution, or fails with "standard input is not a terminal" errors.

**Phase to address:**
Phase SETUP (Setup Wizard)

---

### Pitfall 8: Stale YAML Recipe Duplication

**What goes wrong:**
The MCP server maintains its own static copy of service templates (e.g., WordPress, PostgreSQL, Redis) as YAML files. This configuration quickly drifts from Coolify's official catalog of over 200 one-click services, leading to deployment failures or missing configuration options.

**Why it happens:**
Over-engineering a custom template catalog instead of leveraging Coolify's native API endpoints.

**How to avoid:**
Keep Coolify as the single source of truth. Use Coolify's native `service.list-types` or equivalent API endpoint to fetch the service catalog dynamically. Link to the official `coolify-examples` repository as dynamic hints only, rather than copying and maintaining static YAML files inside the MCP codebase.

**Warning signs:**
Service creation fails because the embedded YAML structure is outdated compared to the active Coolify instance's version, or users request services that exist in Coolify but are missing from the MCP.

**Phase to address:**
Phase RECIPE (Recipes & Service List)

---

### Pitfall 9: MCP Prompts vs. Tools Confusion

**What goes wrong:**
Implementing complex, multi-step workflows (such as setting up a new project, running diagnostics, or orchestrating disaster recovery) as custom MCP tools instead of MCP Prompts. This results in bloated, hard-to-maintain tool handlers and limits the LLM's reasoning capabilities.

**Why it happens:**
Misunderstanding the MCP specification. Tools are meant to be atomic operations, whereas Prompts are templates designed to guide the LLM on how to use existing tools sequentially.

**How to avoid:**
Keep tools atomic (e.g., `application.deploy`, `diagnose.app`). Use MCP Prompts (e.g., `deploy-app`, `diagnose-incident`) to provide the sequence of actions, instructions, and context templates for the LLM. This allows the LLM to leverage its reasoning and handle edge cases dynamically.

**Warning signs:**
Tool handlers that contain complex multi-step orchestration logic, conditional branching, or interactive loops.

**Phase to address:**
Phase PROMPT (MCP Prompts)

---

### Pitfall 10: Cursor `oneOf` Schema Rendering Defect

**What goes wrong:**
Cursor's UI has a known limitation where it renders `oneOf` or `anyOf` schema parameters as "No parameters" or fails to display them nicely, making the tool unusable or confusing for the user.

**Why it happens:**
Relying on standard JSON Schema union types (`oneOf`, `anyOf`, `allOf`) in the top-level tool/action schemas.

**How to avoid:**
Avoid complex `oneOf`/`anyOf` unions in the top-level tool/action schemas. Instead, use flat schemas with optional fields and handle the validation/mutually-exclusive checks inside the handler using Zod (e.g. `superRefine` or custom validation) and document the fields clearly in the description.

**Warning signs:**
Cursor UI shows "No parameters" for tools that actually expect parameters, or fails to generate correct tool-call payloads.

**Phase to address:**
Phase DX-DESC (Richer Tool Descriptions)

---

### Pitfall 11: OpenAPI Coverage Drift

**What goes wrong:**
The OpenAPI map/spec file is treated as a static document and drifts from the actual Coolify 4.1.x API behavior, leading to silent failures or incorrect assumptions about payload shapes.

**Why it happens:**
Manual maintenance of OpenAPI mapping without automated validation or testing against the live API.

**How to avoid:**
Automate or semi-automate OpenAPI coverage mapping. Create a test/script that compares the MCP's client methods/schemas with the OpenAPI spec, and flag gaps.

**Warning signs:**
API changes in Coolify 4.1.x cause runtime errors in the MCP server, but the OpenAPI map still claims 100% coverage.

**Phase to address:**
Phase OAPI (OpenAPI Coverage Map)

---

### Pitfall 12: Deploy Watch Polling Storms & Timeouts

**What goes wrong:**
`deployment.watch` or wait-mode polling makes too many frequent API requests (polling storm), hitting rate limits or hanging indefinitely if the build is slow.

**Why it happens:**
Short, fixed polling intervals (e.g., 1s) without backoff, jitter, or hard timeouts.

**How to avoid:**
Implement exponential backoff, jitter, or a reasonable polling interval (e.g., 3s-5s minimum). Enforce a hard timeout (e.g., 300s) and return a partial/queued status with a follow-up hint instead of hanging.

**Warning signs:**
429 Too Many Requests errors during deployment, or IDE hangs indefinitely during a slow build.

**Phase to address:**
Phase WATCH (Deploy Watch)

---

### Pitfall 13: Accidental Release of Secrets or Test Harness

**What goes wrong:**
Publishing credentials, local test configurations, or the heavy UAT harness to npm, increasing package size and risking security leaks.

**Why it happens:**
Missing or loose `files` allowlist in `package.json`, or lack of pre-publish validation.

**How to avoid:**
Use a strict `files` allowlist in `package.json` (already done in v3.0, only `dist`, `.env.example`, `LICENSE` are allowed). Use `.npmignore` or prepublish checks (`publint`, `npm pack --dry-run` in CI) to verify tarball contents.

**Warning signs:**
Sensitive files (like `.env` or `instances.json`) or test files (like `scripts/live-uat.mjs`) present in the published npm package.

**Phase to address:**
Phase PUB (npm Publish)

---

### Pitfall 14: Skills Teaching Incorrect Tool Call Patterns

**What goes wrong:**
IDE skills (.cursorrules, .claudeprompts, etc.) teach the LLM to call tools with incorrect parameters or outdated patterns (like calling a `logs` tool instead of `application.logs`, or using fuzzy search on mutations).

**Why it happens:**
Manual maintenance of skills files without automated sync or validation against the actual Zod schemas.

**How to avoid:**
Ensure skills are auto-generated or strictly kept in sync with the actual Zod schemas. Include linting/validation for the skills files themselves in the test suite.

**Warning signs:**
LLM repeatedly attempts to call non-existent tools or passes invalid arguments, despite having the skills file loaded.

**Phase to address:**
Phase SKILL (IDE Skills)

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Global active instance state | Easy to implement, no need to pass state to handlers | Concurrent requests from different IDE sessions can overwrite each other's active instance, leading to cross-instance operations | Never. Active instance must be resolved per request or passed explicitly. |
| Storing plain-text API tokens in `.coolify/manifest.json` | Easy to read and write in the project directory | Accidental Git commits will expose production API tokens to public repositories | Never. Manifest must only contain non-sensitive metadata (UUIDs, domains). Tokens belong in `~/.coolify-mcp/instances.json` or env. |
| Skipping SSL verification by default for all instances | Avoids self-signed certificate issues on self-hosted instances | Exposes production Coolify Cloud connections to man-in-the-middle (MITM) attacks | Only for local/development self-hosted instances. Must be explicitly configured per-instance (`verifySsl: false`). |
| Relying entirely on local manifest without remote validation | Faster execution (fewer API round-trips) | Agent attempts to operate on deleted or modified resources, leading to unhandled API errors | Never. Always perform a quick GET preflight or handle 404s gracefully with auto-sync. |
| Embedding static YAML service templates in MCP | Faster implementation, no need to query Coolify API | Rapid drift from Coolify's 200+ catalog, maintenance nightmare | Never. Use `service.list-types` or link to `coolify-examples` as dynamic hints. |
| Custom multi-step orchestration inside tool handlers | Easy to call a single tool for a complex workflow | Bloated handlers, inflexible workflows, bypasses LLM reasoning | Never. Use MCP Prompts for workflow orchestration. |
| Using `oneOf`/`anyOf` in schemas for mutual exclusivity | Expresses exact schema constraints in JSON Schema | Cursor UI renders as "No parameters", breaking the user experience | Never. Use flat optional schemas with Zod `superRefine` validation inside the handler. |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Coolify Cloud API | Appending `/api/v1` blindly to the base URL | Coolify Cloud base API URL might already include the version or have a different subdomain. Parse and normalize the base URL dynamically. |
| Coolify Cloud API | Assuming self-hosted `/api/health` or `/api/v1/version` endpoints exist and are accessible | Cloud might restrict access to global version/health endpoints. Use a fallback or skip global health checks for Cloud instances. |
| Coolify Cloud API | Ignoring strict rate limits (429 Too Many Requests) | Implement exponential backoff that parses and respects `Retry-After` headers returned by the Cloud API. |
| Local Filesystem | Hardcoding tilde (`~`) in file paths | Node.js `fs` does not expand `~`. Use `os.homedir()` to resolve the user's home directory portably across macOS, Linux, and Windows. |
| GitHub CLI (`gh`) | Blocking on interactive prompts or TTY checks in headless agent environments | Use `--non-interactive` flags, check `process.stdout.isTTY`, and fall back to environment variables (`GH_TOKEN`). |
| Coolify Service Catalog (`service.list-types`) | Duplicating the catalog as static YAML templates in the MCP repository | Query the active Coolify instance's catalog dynamically to ensure compatibility. |
| npm Registry | Publishing the heavy live UAT harness (`scripts/live-uat.mjs`) or local secrets | Use a strict `files` allowlist in `package.json` and verify with `npm pack --dry-run` in CI. |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Reading `instances.json` on every API call | High disk I/O, slow tool execution | Implement an in-memory cache with file-change detection (using `fs.watch` or checking `mtime` before reading) | > 50 instances or high concurrency |
| Full manifest synchronization on every tool execution | Slow tool response times, high network overhead | Only synchronize the manifest on explicit `manifest:sync` calls or when a 404 error indicates desynchronization | > 100 resources in a project |
| Aggressive polling of Cloud deployments | Triggering rate limits (429), blocked tool execution | Increase polling interval (e.g., 5s instead of 1-2s) and respect rate-limit headers | > 3 concurrent deployments |
| Aggressive polling in `deployment.watch` or wait-mode | Hitting 429 rate limits, slow IDE response, blocked execution | Implement exponential backoff, jitter, and a minimum 3s-5s polling interval | > 3 concurrent deployments or high API usage |
| Loading large OpenAPI spec files on every tool invocation | High memory usage, slow startup times | Parse and map OpenAPI specs at build/compile time or cache the mapped surface | Large specs (>1MB) loaded dynamically |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Loose permissions on `~/.coolify-mcp/instances.json` | Other local users or malicious processes can read plain-text API tokens | Create the directory with `0o700` and the file with `0o600` permissions. |
| Committing `.coolify/manifest.json` with sensitive domain names or UUIDs | Exposes internal infrastructure layout and potential attack vectors | Clearly document `.gitignore` recommendations; provide an option to exclude sensitive metadata from the manifest. |
| Exposing API tokens in tool response outputs when listing instances | AI agent or IDE logs can leak production API tokens | Ensure `redactSecrets` or a dedicated projection filters out tokens from all tool response payloads. |
| Accidental publication of local secrets or UAT harness to npm | Exposure of production API tokens, private keys, or internal infrastructure details | Enforce strict `files` allowlist in `package.json` and run `publint` / `npm pack --dry-run` in CI. |
| Exposing GitHub tokens or private keys in Setup Wizard logs | Token leakage in IDE logs or agent transcripts | Ensure Setup Wizard sanitizes all outputs and masks sensitive tokens. |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Silent instance switching | Agent operates on the wrong instance without user realizing it | Always include the active instance name/URL in the tool's formatted text output (`_formattedText`). |
| Cryptic errors on unsupported Cloud actions | User is confused why a standard tool action (like validate server) fails | Intercept unsupported Cloud actions and return a structured error with a clear recovery hint (e.g., "This action is not supported on Coolify Cloud"). |
| No confirmation on destructive manifest sync | Accidental overwrite of local modifications or local descriptions | Provide a `dry_run` option and require confirmation before performing destructive manifest updates. |
| "No parameters" UI in Cursor due to schema union types | Users cannot see what parameters to pass, making the tool unusable | Use flat schemas with optional fields and document them clearly in the description. |
| Setup wizard hanging indefinitely on interactive prompts | AI agent gets stuck, wasting tokens and time | Enforce non-interactive execution with strict timeouts. |
| Skills teaching outdated or incorrect tool call patterns | LLM repeatedly fails to call tools correctly, frustrating the user | Auto-generate skills from Zod schemas or validate them in the test suite. |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Multi-instance CRUD:** Appears done when instances can be added, but fails in concurrent multi-agent environments due to file write race conditions. Verify by running parallel write tests.
- [ ] **Coolify Cloud Support:** Appears done when base URL is configured, but fails on rate limits or unsupported endpoints. Verify by running a comprehensive smoke test suite against a live Coolify Cloud instance.
- [ ] **Local Manifest Sync:** Appears done when writing UUIDs on creation, but gets out of sync when resources are modified via the Coolify UI. Verify by testing the reconciliation logic with modified remote states.
- [ ] **Home Directory Resolution:** Appears done on macOS/Linux, but fails on Windows due to path separator differences or tilde expansion issues. Verify by using `path.resolve` and `os.homedir()`.
- [ ] **Setup Wizard:** Appears done when running locally in a TTY terminal, but fails when executed by a headless AI agent. Verify by running in a non-interactive shell with `TERM=dumb`.
- [ ] **Deploy Watch:** Appears done when a build finishes in 10 seconds, but hangs or times out on slow builds (>5 minutes). Verify by testing with a simulated slow build and asserting graceful timeout handling.
- [ ] **npm Publish:** Appears done when `npm publish` succeeds, but includes the UAT harness or local `.env` files. Verify by running `npm pack --dry-run` and inspecting the generated tarball contents.
- [ ] **IDE Skills:** Appears done when the `.cursorrules` file is created, but contains outdated tool names or parameters. Verify by parsing the skills file and asserting compatibility with actual Zod schemas.

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Corrupted `instances.json` | MEDIUM | Restore from backup or prompt the user to re-authenticate and re-add their Coolify instances. |
| Leaked API Token | HIGH | Revoke the token immediately in the Coolify UI/Cloud console and generate a new one. Update `instances.json` with the new token. |
| Desynchronized Manifest | LOW | Run `manifest:sync` to fetch the latest resource states from the live Coolify API and overwrite the stale local manifest. |
| Polling Storm / Rate Limiting (429) | LOW | Intercept 429 errors, parse `Retry-After` header, and implement automatic backoff. |
| Accidental npm Publish of Secrets | HIGH | Revoke leaked tokens immediately, deprecate the published version on npm, and publish a clean version. |
| Cursor UI "No parameters" Error | LOW | Flatten the schema, remove `oneOf`/`anyOf` unions, and use Zod `superRefine` for validation. |

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
| Interactive `gh` Preflight Blocks Headless Agents | Phase SETUP (Setup Wizard) | Run setup in a non-interactive environment and verify it bypasses interactive prompts. |
| Stale YAML Recipe Duplication | Phase RECIPE (Recipes & Service List) | Verify that the service list is fetched dynamically from the Coolify API and no static YAMLs are embedded. |
| MCP Prompts vs. Tools Confusion | Phase PROMPT (MCP Prompts) | Code review asserting that tool handlers remain atomic and multi-step workflows are defined as Prompts. |
| Cursor `oneOf` Schema Rendering Defect | Phase DX-DESC (Richer Tool Descriptions) | Inspect the generated MCP schema and verify that no top-level `oneOf`/`anyOf` unions are used. |
| OpenAPI Coverage Drift | Phase OAPI (OpenAPI Coverage Map) | Run the coverage mapping script and assert that any drift is flagged as a test failure. |
| Deploy Watch Polling Storms | Phase WATCH (Deploy Watch) | Test with simulated slow builds and verify exponential backoff and timeout handling. |
| Accidental npm Publish of Secrets | Phase PUB (npm Publish) | Run `npm pack --dry-run` in CI and assert that only allowed files are included. |
| Skills Teaching Incorrect Patterns | Phase SKILL (IDE Skills) | Run a validation script that parses skills files and compares tool usage with Zod schemas. |

## Sources

- [Coolify API Documentation](https://coolify.io/docs/api)
- [Node.js File System Security Best Practices](https://nodejs.org/api/fs.html)
- [Model Context Protocol Security Guidelines](https://modelcontextprotocol.io)
- [GitHub CLI non-interactive flag reference](https://cli.github.com/manual/gh)
- [Cursor Custom Rules & Prompts documentation](https://docs.cursor.com)
- [Community discussions on Coolify API rate limits and Cloud quirks]

---
*Pitfalls research for: Coolify MCP Server (v3.1 Setup, Skills & DX)*
*Researched: Friday, Jul 24, 2026*
