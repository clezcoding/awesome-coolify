# Phase 15: Multi-Instance Registry & Routing - Research

**Researched:** 2026-07-21
**Domain:** Multi-Instance MCP Server & Secure Local Registry
**Confidence:** HIGH

## Summary

This research establishes the technical foundation, security controls, and architectural patterns required to implement Phase 15: `Multi-Instance Registry & Routing`. The core goal of this phase is to allow the AI agent to manage multiple named Coolify instances securely in a local registry (`~/.coolify-mcp/instances.json`) and dynamically route any of the 14 domain tool calls to a chosen instance without cross-instance credential leakage.

To achieve this, the server startup path will be softened to support a "soft-start" mode when no environment variables or registry entries exist. This allows the server to start successfully and expose the new `instance` tool and the existing `meta.version` tool, while other domain tools return a structured `COOLIFY_NO_INSTANCE` error with recovery hints. When executing a domain tool call, credentials will be dynamically resolved per-request using a strict precedence model: explicit `instance` parameter → Environment variables → Registry default.

**Primary recommendation:** Implement a stateless, request-scoped credential resolution mechanism that instantiates a new `ofetch` client per request, backed by an `InstanceManager` that enforces strict `0o700`/`0o600` permissions, atomic temp-file-and-rename writes, and an in-memory lock to prevent concurrent write corruption.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** New domain tool `instance` (not `meta` / `system`) for registry CRUD.
- **D-02:** v1 actions: `list`, `get`, `add`, `update`, `delete`, `set-default`. Optional live `verify` on `add` (ping Coolify). No session `switch` action.
- **D-03:** Registry tool never takes an `instance` routing param — ops always target the local file.
- **D-04:** `delete` requires `confirm: true`. Default and last remaining instance cannot be deleted without `force`.
- **D-05:** Opt-in migration action `instance.import-env` — never auto-write Env into the registry.
- **D-06:** Primary key = stable slug/name (e.g. `prod`, `cloud`). Used as CTX-06 `instance` param value.
- **D-07:** `add` fields: `name`, `url`, `token`, `type` (`self-hosted` | `cloud`), `verifySsl` (default `true`).
- **D-08:** Name regex: `^[a-z][a-z0-9_-]{1,31}$`.
- **D-09:** Duplicate URLs allowed (same host, different tokens/teams).
- **D-10:** Resolve credentials: explicit `instance` param → Env (`COOLIFY_URL` + `COOLIFY_TOKEN` both set) → registry `default`.
- **D-11:** When both `instance` param and Env are set, param wins silently (Env ignored for that call).
- **D-12:** Unknown `instance` name → structured error + recovery hint to `instance.list` — no silent fallback.
- **D-13:** Partial Env (only URL or only TOKEN) → hard error (both or neither). Never mix Env URL with registry token.
- **D-14:** Persist field `default` in `instances.json` (not session `active`).
- **D-15:** First `add` into empty registry auto-sets `default`.
- **D-16:** `set-default` on unknown name → hard error + hint `instance.list`.
- **D-17:** `instance.list` returns registry entries; when Env override is active, include `_meta.envOverride: true` (no synthetic `__env__` row).
- **D-18:** Soft-start without Env and without registry/default: server starts; `instance.*` + `meta.version` work; other tools return `COOLIFY_NO_INSTANCE` with recovery hints (`instance.add` / set Env / `set-default`).
- **D-19:** `verifySsl` is per-instance; `COOLIFY_MCP_LOG` stays process-global from Env.
- **D-20:** Missing credentials at tool call → `COOLIFY_NO_INSTANCE` (not legacy Zod env-parse failure).
- **Path:** `~/.coolify-mcp/instances.json`; dir `0o700`, file `0o600`; tokens redacted unless `reveal: true` (CTX-08).
- **Atomic writes:** temp file + rename (CTX-09).
- **Cross-instance fan-out** is out of scope.

### Claude's Discretion
- Exact error code string for unknown instance (suggest `COOLIFY_INSTANCE_NOT_FOUND` or reuse `COOLIFY_404` with domain hint) — keep structured envelope + recovery hints.
- Client factory caching vs always-new `createCoolifyClient` per request — must remain request-scoped credentials (no global mutable active client); caching keyed by resolved instance is OK if safe.
- Exact verify endpoint/path for optional `add` verify — prefer existing health/version call pattern in codebase.

### Deferred Ideas (OUT OF SCOPE)
- Custom Skills pro IDE — v3.1
- Lokale Projekt-Manifest-Datei — Phase 17
- MCP Server für Coolify Cloud erweitern — Phase 16
- Standard-Setup Tool — v3.1
- Integrate official Coolify OpenAPI specs — docs/foundation, not registry
- Coolify Cloud connection quirks & recovery hints — Phase 16
- `.coolify/manifest.json` — Phase 17
- Live UAT covering multi-instance routing — Phase 18
- Session-level `switch` / sticky `active` — explicitly rejected for v1 of this phase
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **CTX-04** | Agent can add, list, update, and delete named instances in `~/.coolify-mcp/instances.json` | `InstanceManager` in `src/utils/instance-registry.ts` handles JSON CRUD. `instance` tool in `src/mcp/tools/instance.ts` exposes CRUD actions. |
| **CTX-05** | Agent can set the default instance; `COOLIFY_URL`/`COOLIFY_TOKEN` env vars override registry when present | Dynamic credential resolution logic in `src/utils/instance-registry.ts` resolves credentials per-request based on precedence. |
| **CTX-06** | Agent can route any tool call to a named instance via optional `instance` parameter | All 14 domain tools are updated to accept an optional `instance` parameter in their schemas, which is passed to the dynamic credential resolver. |
| **CTX-08** | Registry directory uses `0o700` and file uses `0o600`; tokens are redacted in list/get responses unless `reveal: true` | `fs.mkdirSync` with `0o700` and `fs.writeFileSync` with `0o600` combined with `fs.chmodSync` to override umask. Token redaction implemented in `instance` tool formatting. |
| **CTX-09** | Registry writes are atomic (write temp file + rename) to prevent corruption under concurrent access | Atomic write pattern implemented in `InstanceManager` using a temp file in the same directory and `fs.renameSync`, serialized by an in-memory lock. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Instance CRUD | API / Backend (Local File) | — | Registry operations strictly target the local `instances.json` file. |
| Credential Resolution | API / Backend (Stateless Resolver) | — | Resolves credentials per-request based on precedence before calling Coolify. |
| Dynamic Routing | API / Backend (Client Factory) | — | Instantiates a request-scoped `ofetch` client with resolved credentials. |
| Permission Enforcement | OS / Filesystem | — | Enforces `0o700` directory and `0o600` file permissions on creation and updates. |
| Concurrency Control | API / Backend (In-Memory Lock) | — | Serializes writes to `instances.json` to prevent file corruption. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `zod` | `^4.4.3` | Input schema validation & registry schema parsing | [VERIFIED: npm registry] Already installed, standard for type-safe schemas. |
| `ofetch` | `^1.5.1` | Stateless HTTP client factory | [VERIFIED: npm registry] Already installed, lightweight and handles retries/errors. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:fs` | Built-in | File I/O operations, permissions, atomic rename | Standard Node.js library for filesystem operations. |
| `node:path` | Built-in | Cross-platform path resolution | Standard Node.js library for path manipulation. |
| `node:os` | Built-in | Home directory resolution (`os.homedir()`) | Standard Node.js library for platform-specific details. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled atomic write | `write-file-atomic` | Adding an external dependency is unnecessary since a simple `fs.writeFileSync` to a temp file + `fs.renameSync` is highly robust and standard on POSIX. |
| Hand-rolled async lock | `async-lock` | Adding an external dependency is unnecessary since a 5-line in-memory Promise-based queue is extremely lightweight and sufficient for a single-process stdio server. |

**Installation:**
No new external packages are required for this phase. All operations are handled using existing dependencies (`zod`, `ofetch`) and Node.js built-in modules.

**Version verification:**
```bash
npm view zod version
# 4.4.3 (verified)
npm view ofetch version
# 1.5.1 (verified)
```

## Package Legitimacy Audit

No new external packages are installed in this phase.

## Architecture Patterns

### System Architecture Diagram

```
[Agent / Client Request] (e.g., application.deploy with instance: "prod")
           │
           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           MCP Server Layer                              │
│                                                                         │
│  1. Parse request args using Zod (including optional `instance` param)  │
│  2. Call `resolveInstanceConfig(args.instance, process.env)`            │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       Credential Resolver                               │
│                                                                         │
│  If `instance` param set:                                               │
│    Lookup name in `~/.coolify-mcp/instances.json`                       │
│  Else if `COOLIFY_URL` & `COOLIFY_TOKEN` set in Env:                    │
│    Use Env credentials (override mode)                                  │
│  Else:                                                                  │
│    Use `default` instance from `instances.json`                         │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Client Factory                                  │
│                                                                         │
│  Instantiate stateless `ofetch` client with resolved URL and token      │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
                     [Coolify API (Target Instance)]
```

### Recommended Project Structure
```
src/
├── api/
│   └── client.ts             # Stateless HTTP client functions (existing, reusable)
├── config/
│   └── env.ts                # Softened to make COOLIFY_URL/TOKEN optional at startup
├── mcp/
│   ├── server.ts             # Registers new 'instance' tool, passes resolver to handlers
│   └── tools/
│       ├── instance.ts       # New: 'instance' tool actions (list, get, add, update, delete, set-default, import-env)
│       └── ...               # Existing 14 tools updated to accept optional 'instance' param
└── utils/
    ├── instance-registry.ts  # New: InstanceManager core (JSON CRUD, atomic writes, permissions)
    └── errors.ts             # Extended with COOLIFY_NO_INSTANCE and COOLIFY_INSTANCE_NOT_FOUND
```

### Pattern 1: Dynamic Credential Resolution

**What:** Resolving credentials per-request based on precedence rather than loading them once at startup.

**When to use:** Essential for multi-instance routing where different tool calls can target different Coolify servers.

**Example:**
```typescript
// src/utils/instance-registry.ts
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';

export const instanceSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_-]{1,31}$/),
  url: z.string().url(),
  token: z.string().min(1),
  type: z.enum(['self-hosted', 'cloud']),
  verifySsl: z.boolean().default(true),
});

export type Instance = z.infer<typeof instanceSchema>;

export interface Registry {
  default?: string;
  instances: Instance[];
}

export class InstanceManager {
  private static dirPath = join(homedir(), '.coolify-mcp');
  private static filePath = join(this.dirPath, 'instances.json');

  static loadRegistry(): Registry {
    if (!existsSync(this.filePath)) {
      return { instances: [] };
    }
    try {
      const content = readFileSync(this.filePath, 'utf8');
      return JSON.parse(content);
    } catch {
      return { instances: [] };
    }
  }

  static resolveCredentials(
    instanceParam?: string,
    env: NodeJS.ProcessEnv = process.env,
  ): { url: string; token: string; verifySsl: boolean } {
    // 1. Explicit instance param wins
    if (instanceParam) {
      const registry = this.loadRegistry();
      const match = registry.instances.find((i) => i.name === instanceParam);
      if (!match) {
        throw new Error(`COOLIFY_INSTANCE_NOT_FOUND: Instance "${instanceParam}" not found in registry.`);
      }
      return { url: match.url, token: match.token, verifySsl: match.verifySsl };
    }

    // 2. Env override (both must be set)
    if (env.COOLIFY_URL && env.COOLIFY_TOKEN) {
      const verifySsl = env.COOLIFY_VERIFY_SSL !== 'false';
      return { url: env.COOLIFY_URL, token: env.COOLIFY_TOKEN, verifySsl };
    }

    // Partial Env check (hard error)
    if (env.COOLIFY_URL || env.COOLIFY_TOKEN) {
      throw new Error('COOLIFY_PARTIAL_ENV: Both COOLIFY_URL and COOLIFY_TOKEN must be set in environment.');
    }

    // 3. Registry default
    const registry = this.loadRegistry();
    if (registry.default) {
      const match = registry.instances.find((i) => i.name === registry.default);
      if (match) {
        return { url: match.url, token: match.token, verifySsl: match.verifySsl };
      }
    }

    // No instance resolved (soft-start recovery)
    throw new Error('COOLIFY_NO_INSTANCE: No active Coolify instance configured.');
  }
}
```

### Pattern 2: Atomic File Writes & Perm Enforcement

**What:** Writing to a temp file and renaming it to prevent file corruption, combined with explicit permission setting to protect secrets.

**When to use:** Whenever storing sensitive configuration files locally.

**Example:**
```typescript
// src/utils/instance-registry.ts (continued)
import { writeFileSync, renameSync, mkdirSync, chmodSync, unlinkSync } from 'node:fs';

export class InstanceManager {
  // ... loadRegistry ...

  private static writeLock = Promise.resolve();

  static async saveRegistry(registry: Registry): Promise<void> {
    // Serialize writes in-process
    this.writeLock = this.writeLock.then(() => this.executeSave(registry)).catch(() => {});
    await this.writeLock;
  }

  private static executeSave(registry: Registry): void {
    if (!existsSync(this.dirPath)) {
      mkdirSync(this.dirPath, { recursive: true, mode: 0o700 });
      chmodSync(this.dirPath, 0o700); // Override umask
    }

    const tmpPath = `${this.filePath}.tmp.${process.pid}.${Date.now()}`;
    try {
      const content = JSON.stringify(registry, null, 2) + '\n';
      writeFileSync(tmpPath, content, { encoding: 'utf8', mode: 0o600 });
      chmodSync(tmpPath, 0o600); // Override umask
      renameSync(tmpPath, this.filePath);
    } catch (error) {
      try {
        unlinkSync(tmpPath);
      } catch {}
      throw error;
    }
  }
}
```

### Anti-Patterns to Avoid
- **Global Mutable Client State:** Storing the active client in a global singleton and mutating its URL/token. This causes severe race conditions and credential leaks under concurrent requests. Keep clients stateless and instantiate them per request.
- **Tilde Expansion in Node.js:** Node's `fs` does not expand `~` automatically. Always use `os.homedir()` to resolve the home directory portably.
- **Relying on Default File Permissions:** Writing secrets to files with default permissions (e.g., `0o644`), which makes them readable by other local users. Always enforce `0o600` for files and `0o700` for directories, and call `fs.chmodSync` to bypass umask restrictions.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Input Validation | Custom regex/parsers for arguments | `zod` | Zod provides robust, declarative schema validation with detailed error messages. |
| HTTP Client | Custom `fetch` wrappers with manual retry/error mapping | `ofetch` (existing) | Already integrated, handles retries, timeouts, and maps errors cleanly. |

**Key insight:** Leveraging the existing stateless `createCoolifyClient` factory and extending it with dynamic parameter injection is far safer and cleaner than hand-rolling new client instances or global state managers.

## Common Pitfalls

### Pitfall 1: Global State Leakage (Static Client Pollution)
- **What goes wrong:** Concurrent requests from different IDE sessions or parallel agent tasks overwrite the active instance, causing operations to execute on the wrong server.
- **Why it happens:** Storing client credentials or active client instances in global variables.
- **How to avoid:** Keep the client layer entirely stateless. Resolve credentials per-request and instantiate the client inside the tool handler scope.

### Pitfall 2: File Corruption under Concurrent Writes
- **What goes wrong:** Multiple tool calls writing to `instances.json` concurrently result in truncated or corrupted JSON.
- **Why it happens:** Parallel asynchronous file writes overlapping.
- **How to avoid:** Use atomic writes (temp file + rename) and serialize all write operations using an in-memory async lock/queue.

### Pitfall 3: Insecure File Permissions
- **What goes wrong:** API tokens are stored in a file readable by other local users.
- **Why it happens:** Relying on default filesystem permissions which are subject to loose process umasks (e.g., `0o022` resulting in `0o644` files).
- **How to avoid:** Explicitly set directory permissions to `0o700` and file permissions to `0o600` on creation, and call `fs.chmodSync` to guarantee enforcement.

## Code Examples

### Dynamic Routing in Tool Handlers
```typescript
// src/mcp/tools/application.ts
import { createCoolifyClient } from '../../api/client.js';
import { InstanceManager } from '../../utils/instance-registry.js';
import { wrapMcpError } from '../../utils/errors.js';

export async function handleApplicationAction(args: any, env: any) {
  try {
    // Resolve credentials dynamically per-request
    const credentials = InstanceManager.resolveCredentials(args.instance, process.env);
    const client = createCoolifyClient(credentials.url, credentials.token, credentials.verifySsl);
    
    // Execute action using the resolved client
    // ...
  } catch (error) {
    return wrapMcpError(error);
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded Env variables loaded at startup | Dynamic request-scoped credential resolution | Phase 15 (2026-07-21) | Enables multi-instance routing, soft-start recovery, and prevents cross-instance leakage. |
| Insecure file permissions (`0o644`) | Strict owner-only permissions (`0o600`/`0o700`) | Phase 15 (2026-07-21) | Protects production API tokens from local unauthorized access. |
| Standard `fs.writeFileSync` | Atomic writes (temp file + rename) with async lock | Phase 15 (2026-07-21) | Prevents configuration file corruption under concurrent writes. |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `fs.renameSync` is atomic on macOS/Linux | Pattern 2 | If not atomic, concurrent writes could still cause corruption. (Mitigated by in-process async lock). |

## Open Questions (RESOLVED)

1. **How should we handle Windows-specific file permission limitations?** — RESOLVED
   - *What we know:* `fs.chmodSync` has limited effect on Windows and the mode parameter is largely ignored.
   - *Resolution:* Wrap `chmodSync` (and `mkdirSync`/`writeFileSync` mode enforcement) in `try { ... } catch { /* no-op on Windows */ }` so the InstanceManager does not crash on Windows. On Windows, file permissions rely on default NTFS ACLs (owner-only access via the user profile directory). Document in the InstanceManager source (and README) that `0o700`/`0o600` enforcement is POSIX-only and best-effort on Windows.
   - *Implementation note:* The `chmodSync` calls in `executeSave` (Plan 15-01 Task 1) must be wrapped in try-catch; tests that assert `fs.statSync(...).mode & 0o777` must be POSIX-gated (skip on `process.platform === 'win32'`).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | ✓ | 22.14.0 | — |
| npm | Package Manager | ✓ | 10.8.2 | — |
| Vitest | Test Runner | ✓ | 4.1.10 | — |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest v4.1.10 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/utils/instance-registry.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| **CTX-04** | CRUD operations on `instances.json` | Unit | `npx vitest run src/utils/instance-registry.test.ts` | ❌ Wave 0 |
| **CTX-05** | Precedence: param → Env → default | Unit | `npx vitest run src/utils/instance-registry.test.ts` | ❌ Wave 0 |
| **CTX-06** | Routing tool calls to correct instance | Integration | `npx vitest run src/mcp/integration.test.ts` | ❌ Wave 0 |
| **CTX-08** | Permissions `0o700`/`0o600` & redact tokens | Unit | `npx vitest run src/utils/instance-registry.test.ts` | ❌ Wave 0 |
| **CTX-09** | Atomic writes & concurrent write lock | Unit | `npx vitest run src/utils/instance-registry.test.ts` | ❌ Wave 0 |

### Wave 0 Gaps
- [ ] `src/utils/instance-registry.test.ts` — covers CTX-04, CTX-05, CTX-08, CTX-09
- [ ] `src/mcp/tools/instance.test.ts` — covers `instance` tool CRUD actions
- [ ] Update `src/config/env.test.ts` — covers softened startup validation

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | Resolving and verifying API tokens per-request; routing to correct instance. |
| V4 Access Control | Yes | Preventing cross-instance leakage by keeping client state request-scoped. |
| V5 Input Validation | Yes | Validating instance names (`^[a-z][a-z0-9_-]{1,31}$`), URLs, and tokens using Zod. |
| V6 Cryptography | Yes | Storing tokens with `0o600` file permissions; redacting tokens in tool outputs unless `reveal: true`. |

### Known Threat Patterns for Node.js / MCP

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Token Leakage in Logs/Output | Information Disclosure | Redact tokens in `instance.list` and `instance.get` unless `reveal: true` is passed. |
| Cross-Instance Data Leakage | Information Disclosure / Tampering | Keep client state stateless and request-scoped; never use global client singletons. |
| Insecure Local Storage | Information Disclosure | Enforce `0o700` directory and `0o600` file permissions; call `fs.chmodSync` to override umask. |
| Configuration File Corruption | Denial of Service | Implement atomic writes (temp file + rename) serialized by an in-process async lock. |

## Sources

### Primary (HIGH confidence)
- `src/config/env.ts` - Checked existing environment variable loading.
- `src/api/client.ts` - Verified stateless client factory `createCoolifyClient`.
- `src/mcp/server.ts` - Inspected tool registration and handler patterns.
- `15-CONTEXT.md` - Verified locked decisions and discretion areas.
- Node.js Official Documentation - Verified `fs.chmodSync` and `fs.renameSync` behaviors.

### Secondary (MEDIUM confidence)
- WebSearch - Verified atomic file writing patterns and in-memory lock patterns in Node.js.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new external dependencies; using robust Node.js built-ins.
- Architecture: HIGH - Fully aligned with existing codebase patterns and GSD references.
- Pitfalls: HIGH - Detailed mitigation strategies mapped directly to implementation tasks.

**Research date:** 2026-07-21
**Valid until:** 2026-08-20 (30 days)
