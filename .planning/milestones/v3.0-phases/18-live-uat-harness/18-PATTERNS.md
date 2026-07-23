# Phase 18: Live UAT Harness - Pattern Map

**Mapped:** 2026-07-23
**Files analyzed:** 4
**Analogs found:** 4 / 4

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `scripts/live-uat.mjs` | utility / test / CLI harness | request-response, streaming, file-I/O | `scripts/live-uat-milestone-optional.mjs` | exact |
| `scripts/live-uat.matrix.json` | config | file-I/O | `.cursor/mcp.json` | exact |
| `package.json` | config | none | `package.json` (self) | exact |
| `CONTRIBUTING.md` | config / documentation | none | `CONTRIBUTING.md` (self) | exact |

---

## Pattern Assignments

### `scripts/live-uat.mjs` (utility / test / CLI harness)

**Analog:** `scripts/live-uat-milestone-optional.mjs`

**Imports and TSX Respawn pattern** (lines 1-13 of analog + TSX respawn from RESEARCH.md):

```javascript
#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env, argv, exit } from 'node:process';

// Respawn via tsx if not already active, to support direct TypeScript imports
if (!env.TSX_ACTIVE) {
  const result = spawnSync('npx', ['tsx', ...argv.slice(1)], {
    stdio: 'inherit',
    env: { ...env, TSX_ACTIVE: 'true' }
  });
  exit(result.status ?? 0);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distEntry = resolve(root, 'dist/index.js');
```

**Credential Resolution pattern** (lines 20-49 of `scripts/live-uat-milestone-optional.mjs`):

```javascript
const PREFERRED_NAMES = ['awesome-coolify-mcp', 'coolify-mcp', 'coolify'];

function pickServer(path) {
  if (!existsSync(path)) return null;
  let cfg;
  try {
    cfg = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
  const servers = cfg.mcpServers ?? {};
  for (const name of PREFERRED_NAMES) {
    const env = servers[name]?.env;
    if (env?.COOLIFY_URL && env?.COOLIFY_TOKEN) return { name, env, path };
  }
  for (const [name, server] of Object.entries(servers)) {
    const env = server?.env;
    if (env?.COOLIFY_URL && env?.COOLIFY_TOKEN) return { name, env, path };
  }
  return null;
}

function resolveMcpEnv() {
  for (const path of [
    resolve(root, '.cursor/mcp.json'),
    resolve(homedir(), '.cursor/mcp.json'),
  ]) {
    const hit = pickServer(path);
    if (hit) return hit;
  }
  return null;
}
```

**McpStdioClient pattern** (lines 51-107 of `scripts/live-uat-milestone-optional.mjs`):

```javascript
class McpStdioClient {
  constructor(child) {
    this.child = child;
    this.nextId = 1;
    this.pending = new Map();
    this.buffer = '';
    child.stdout.on('data', (chunk) => {
      this.buffer += chunk.toString();
      this.drain();
    });
  }

  drain() {
    let i = this.buffer.indexOf('\n');
    while (i !== -1) {
      const line = this.buffer.slice(0, i).trim();
      this.buffer = this.buffer.slice(i + 1);
      if (line) {
        try {
          const msg = JSON.parse(line);
          if (msg.id !== undefined && this.pending.has(msg.id)) {
            const h = this.pending.get(msg.id);
            this.pending.delete(msg.id);
            h.resolve(msg);
          }
        } catch {
          /* ignore */
        }
      }
      i = this.buffer.indexOf('\n');
    }
  }

  request(method, params) {
    const id = this.nextId++;
    const payload = JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n';
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timeout ${method}`));
      }, 30000); // Strict 30s timeout to prevent hanging
      this.pending.set(id, {
        resolve: (v) => {
          clearTimeout(t);
          resolve(v);
        },
      });
      this.child.stdin.write(payload);
    });
  }

  notify(method, params) {
    this.child.stdin.write(
      JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n',
    );
  }
}
```

**In-Process Handler Execution pattern** (from RESEARCH.md):

```typescript
import { handleSystemAction } from '../src/mcp/tools/system.ts';
import { InstanceManager } from '../src/utils/instance-registry.ts';

async function runInProcessTest(toolName, args, resolvedEnv) {
  const startTime = Date.now();
  try {
    // Dynamically resolve handler based on toolName
    let handler;
    if (toolName === 'system') handler = handleSystemAction;
    // ... map other handlers ...

    const result = await handler(args, resolvedEnv);
    const duration = Date.now() - startTime;
    return {
      pass: result.ok !== false,
      duration,
      error: result.ok === false ? result.structuredContent?.error : undefined,
    };
  } catch (err) {
    return {
      pass: false,
      duration: Date.now() - startTime,
      error: { code: 'UAT_CRASH', message: err.message }
    };
  }
}
```

**Error Handling & Cleanup pattern** (lines 234-243 of `scripts/live-uat-milestone-optional.mjs`):

```javascript
  } finally {
    child.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 500));
  }
```

---

### `scripts/live-uat.matrix.json` (config)

**Analog:** `.cursor/mcp.json`

**Declarative Test Matrix pattern** (from RESEARCH.md):

```json
[
  {
    "id": "list-tools",
    "tool": "tools/list",
    "args": {},
    "type": "read",
    "mode": "stdio",
    "suite": "smoke"
  },
  {
    "id": "system-health",
    "tool": "system",
    "args": { "action": "health" },
    "type": "read",
    "mode": "stdio",
    "suite": "smoke"
  },
  {
    "id": "instance-cloud-info",
    "tool": "instance",
    "args": { "action": "cloud-info" },
    "type": "read",
    "mode": "stdio",
    "suite": "smoke",
    "tag": "suite:v3"
  },
  {
    "id": "manifest-get",
    "tool": "manifest",
    "args": { "action": "get" },
    "type": "read",
    "mode": "stdio",
    "suite": "smoke",
    "tag": "suite:v3"
  },
  {
    "id": "project-get-uat",
    "tool": "project",
    "args": { "action": "get", "uuid": "$UAT_PROJECT_UUID" },
    "type": "read",
    "mode": "in-process",
    "suite": "smoke"
  }
]
```

---

### `package.json` (config)

**Analog:** `package.json` (self)

**Scripts pattern** (lines 9-23 of `package.json`):

```json
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "start": "node scripts/run-mcp.mjs",
    "uat:live": "node scripts/live-uat.mjs"
  }
```

---

### `CONTRIBUTING.md` (config / documentation)

**Analog:** `CONTRIBUTING.md` (self)

**Local Setup & Runbook pattern** (lines 5-13 of `CONTRIBUTING.md`):

```markdown
## Local Setup

```bash
pnpm install
pnpm run lint
pnpm test
```

## Live UAT Harness

Maintainer-local integration testing against a live Coolify instance.

```bash
npm run uat:live
```
```

---

## Shared Patterns

### Credential Resolution (Anmeldedatenauflösung)
**Source:** `scripts/live-uat-milestone-optional.mjs` & `src/utils/instance-registry.ts`
**Apply to:** `scripts/live-uat.mjs`
Loads credentials from `.cursor/mcp.json` or process environment variables safely. For in-process calls, we use `InstanceManager.resolveCredentials(instance, process.env)` to resolve credentials, ensuring identical resolution behavior to the live server.

### Token Redaction (Token-Schwärzung)
**Source:** `src/utils/instance-registry.ts` & `scripts/live-uat-milestone-optional.mjs`
**Apply to:** `scripts/live-uat.mjs`
Ensures that sensitive tokens (`COOLIFY_TOKEN`) are never printed in stdout/stderr, JSON reports, or Markdown reports. Any string matching the token must be replaced with `***`.

### Two-Tier Flag Gates (Zweistufige Sicherheits-Flags)
**Source:** `src/utils/instance-registry.ts`
**Apply to:** `scripts/live-uat.mjs`
By default, the harness runs in read-only mode.
- `--write` flag is required for mutations (create/update/restart/deploy).
- `--confirm-destructive` is additionally required for destructive actions (deletes, emergency stops, manifest prunes).
Without these flags, actions are simulated as a dry-run with status `planned`.

---

## No Analog Found

All files have close analogs in the codebase.

---

## Metadata

**Analog search scope:** `scripts/`, `src/utils/`, `package.json`, `CONTRIBUTING.md`
**Files scanned:** 15
**Pattern extraction date:** 2026-07-23
