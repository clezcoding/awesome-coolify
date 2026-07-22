# Architecture Research

**Domain:** Multi-Instance MCP Server & Local Git-to-Cloud Manifest Sync
**Researched:** July 21, 2026
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                       MCP Server Layer                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │ System  │  │ Resource│  │ App/Svc │  │Instance │  (New)  │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │
│       │            │            │            │              │
├───────┴────────────┴────────────┴────────────┴──────────────┤
│                     Configuration & Core                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │                 InstanceManager (New)               │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │                 ManifestManager (New)               │    │
│  └─────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│                       Data & Client Layer                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │  ofetch  │  │instances │  │ manifest │                   │
│  │  Client  │  │  .json   │  │  .json   │                   │
│  └──────────┘  └──────────┘  └──────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `InstanceManager` | Manages global multi-instance configurations in `~/.coolify-mcp/instances.json`. Resolves active instance credentials dynamically. | File-backed JSON store with Zod validation, credential masking, and dynamic client configuration. |
| `ManifestManager` | Manages workspace-level project metadata in `.coolify/manifest.json`. Automatically links local git repos with remote Coolify resources. | Local workspace file-backed JSON store with auto-updating hooks on resource mutations and `.gitignore` safety guards. |
| `InstanceTool` | Exposes MCP tools for instance CRUD and dynamic switching (`instance.list`, `instance.add`, `instance.switch`, etc.). | Action-based domain tool registered in `src/mcp/server.ts` following existing v2.0 patterns. |
| `CoolifyClient` | URL-agnostic, stateless API client executing requests against self-hosted or cloud endpoints. | `ofetch.create` factory with retry/error mapping layers (existing, fully reusable). |

## Recommended Project Structure

```
src/
├── api/
│   └── client.ts           # Existing stateless HTTP clients (reusable)
├── config/
│   └── env.ts              # Modified to support dynamic fallback to InstanceManager
├── mcp/
│   ├── server.ts           # Registers new InstanceTool and injects active config
│   └── tools/
│       ├── instance.ts     # New: instance CRUD & switch actions
│       ├── application.ts  # Modified: manifest auto-update hooks
│       ├── service.ts      # Modified: manifest auto-update hooks
│       └── database.ts     # Modified: manifest auto-update hooks
└── utils/
    ├── instance.ts         # New: InstanceManager core logic
    └── manifest.ts         # New: ManifestManager core logic
```

### Structure Rationale

- **`utils/instance.ts` & `utils/manifest.ts`:** Keeps file I/O and state management out of the tool handlers, ensuring clean separation of concerns and high testability.
- **`mcp/tools/instance.ts`:** Follows the existing action-based domain tool pattern, keeping the overall tool lease small and avoiding tool pollution.
- **Stateless `api/client.ts`:** The existing client functions are already URL-agnostic and accept credentials as arguments. Keeping them stateless allows the same client to target multiple instances concurrently without side-effects.

## Architectural Patterns

### Pattern 1: Dynamic Config Resolution

**What:** Instead of loading environment variables once at server startup, the configuration is resolved dynamically per-request. If `COOLIFY_URL` and `COOLIFY_TOKEN` are present in the environment, they act as an override (backward-compatible single-instance mode). Otherwise, the active instance is loaded from `~/.coolify-mcp/instances.json`.

**When to use:** Crucial for multi-instance MCP servers where the agent or host can switch targets without restarting the server process.

**Trade-offs:** Adds minor file read overhead per tool execution (mitigated by caching or lightweight file-stats checks).

**Example:**
```typescript
// src/utils/instance.ts
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface InstanceConfig {
  id: string;
  name: string;
  url: string;
  token: string;
  verifySsl: boolean;
  type: 'self-hosted' | 'cloud';
}

export class InstanceManager {
  private static filePath = join(homedir(), '.coolify-mcp', 'instances.json');

  static getActiveConfig(): InstanceConfig | null {
    if (!existsSync(this.filePath)) return null;
    const data = JSON.parse(readFileSync(this.filePath, 'utf8'));
    return data.instances.find((i: any) => i.id === data.active) || null;
  }
}
```

### Pattern 2: Mutation-Triggered Manifest Sync

**What:** Workspace-level resource mappings (`.coolify/manifest.json`) are automatically updated whenever a resource is created, updated, or deleted by the agent.

**When to use:** Essential for maintaining a local-to-remote mapping of app/service/db UUIDs without requiring the agent to perform slow, expensive global scans on every session startup.

**Trade-offs:** Requires the MCP server to have write access to the local workspace (standard for stdio MCPs) and must strictly avoid committing secrets to git.

**Example:**
```typescript
// src/utils/manifest.ts
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export class ManifestManager {
  private static filePath = join(process.cwd(), '.coolify', 'manifest.json');

  static addResource(resource: { type: string; uuid: string; name: string; fqdn?: string }) {
    const manifest = this.load() || { resources: [] };
    manifest.resources = manifest.resources.filter((r: any) => r.uuid !== resource.uuid);
    manifest.resources.push(resource);
    this.save(manifest);
    this.ensureGitignore();
  }

  private static ensureGitignore() {
    const gitignorePath = join(process.cwd(), '.gitignore');
    if (existsSync(gitignorePath)) {
      const content = readFileSync(gitignorePath, 'utf8');
      if (!content.includes('.coolify')) {
        writeFileSync(gitignorePath, content + '\n.coolify/\n');
      }
    }
  }
}
```

## Data Flow

### Request Flow

```
[Agent Action (e.g., application.deploy)]
    ↓
[McpServer Tool Handler]
    ↓
[Resolve Active Instance (Env Override ➔ InstanceManager)]
    ↓
[Instantiate Stateless CoolifyClient]
    ↓
[Execute API Request] ➔ [Update Local Manifest (if mutation)]
    ↓
[Format Response] ➔ [Agent / IDE UI]
```

### Key Data Flows

1. **Instance Switching:**
   - Agent calls `instance.switch({ id: "staging" })`.
   - `InstanceManager` updates the `active` pointer in `~/.coolify-mcp/instances.json`.
   - Subsequent tool calls dynamically load the "staging" URL and token.
2. **Resource Creation & Tracking:**
   - Agent calls `application.create({ name: "my-app" })`.
   - MCP server calls Coolify API, receives new application UUID.
   - `ManifestManager` appends `{ type: "application", uuid: "...", name: "my-app" }` to `.coolify/manifest.json`.
   - `ManifestManager` ensures `.coolify/` is added to `.gitignore`.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1-5 Instances | Monolithic `instances.json` is perfectly sufficient. Read/write operations are instantaneous. |
| 10-50 Resources per Project | Flat `.coolify/manifest.json` file works flawlessly. No indexing or database needed. |
| 100+ Instances / Multi-tenant | If used in a team context, instances can be managed via environment variable overrides or shared configuration profiles. |

## Anti-Patterns

### Anti-Pattern 1: Hardcoding Active Client State
**What people do:** Creating a single global client instance at server startup and mutating its base URL/token when switching instances.
**Why it's wrong:** Causes race conditions and concurrency bugs if multiple requests are processed in parallel, or if the server is used in a multi-tenant environment.
**Do this instead:** Keep the client layer (`src/api/client.ts`) completely stateless. Instantiate or pass the dynamic configuration to the client on every request.

### Anti-Pattern 2: Committing Manifest to Git
**What people do:** Saving `.coolify/manifest.json` directly to the repository without gitignoring it.
**Why it's wrong:** Exposes environment-specific UUIDs, private domain structures, and potentially sensitive metadata to public or shared repositories.
**Do this instead:** Force-append `.coolify/` to `.gitignore` programmatically whenever the manifest is created or updated.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Coolify Cloud | Stateless REST API via `https://app.coolify.io/api/v1` | Uses identical endpoints as self-hosted. Authentication is team-scoped. |
| Local Workspace | File-system reads/writes to `.coolify/manifest.json` | Must handle missing directories gracefully and enforce `.gitignore` safety. |

## Suggested Build Order

1. **Phase 1: Multi-Instance Foundation (`instances.json`)**
   - **Goal:** Enable storing and switching between multiple Coolify instances.
   - **Tasks:**
     - Build `InstanceManager` in `src/utils/instance.ts`.
     - Update `src/config/env.ts` to fallback to `InstanceManager.getActiveConfig()`.
     - Implement `src/mcp/tools/instance.ts` with CRUD and switch actions.
     - Register `instance` tool in `src/mcp/server.ts`.
   - **Dependencies:** None.

2. **Phase 2: Coolify Cloud Support**
   - **Goal:** Ensure seamless integration with Coolify Cloud.
   - **Tasks:**
     - Add `type: "cloud" | "self-hosted"` schema validation to instance configurations.
     - Document Cloud setup steps and team-token scoping.
     - Add mock/smoke tests verifying `createCoolifyClient` behavior against `https://app.coolify.io`.
   - **Dependencies:** Phase 1.

3. **Phase 3: Local Manifest System (`.coolify/manifest.json`)**
   - **Goal:** Persist project-level resource mappings locally.
   - **Tasks:**
     - Build `ManifestManager` in `src/utils/manifest.ts` with `.gitignore` auto-injection.
     - Add auto-update hooks to resource creation/deletion actions across `application.ts`, `service.ts`, and `database.ts`.
     - Implement `manifest:sync` action to reconcile local manifest with remote resources.
   - **Dependencies:** Phase 1 & Phase 2.

---
*Architecture research for: awesome-coolify v3.0 Platform Foundation*
*Researched: July 21, 2026*
