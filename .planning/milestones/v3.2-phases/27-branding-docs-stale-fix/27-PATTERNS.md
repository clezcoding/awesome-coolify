# Phase 27: Branding & Docs Stale Fix - Pattern Map

**Mapped:** 2026-07-28
**Files analyzed:** 14
**Analogs found:** 13 / 14

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/mcp/server.ts` | config | request-response | `src/mcp/server.ts` (lines 792-817) | exact |
| `src/mcp/server-icons.ts` | utility | transform | `src/mcp/tools/meta.ts` (thin export module) | role-match |
| `src/mcp/mcp-icon-data.ts` | config | file-I/O (static embed) | — (no generated constant module yet) | no analog |
| `scripts/generate-mcp-icon-data.mjs` | utility | file-I/O | `scripts/changeset-emit-new-tag.mjs` | partial-match |
| `package.json` | config | batch | `package.json` (scripts block) | exact |
| `src/mcp/server.test.ts` | test | validation | `src/mcp/server.test.ts` (lines 330-392) | exact |
| `src/mcp/server-icons.test.ts` | test | validation | `src/mcp/tools/meta.test.ts` | role-match |
| `docs/assets/cursor-icon-verify.md` | docs | static | `docs/assets/cursor-icon-verify.md` (Phase 16 D-09) | exact |
| `.planning/PROJECT.md` | docs | static | `.planning/PROJECT.md` (table L15 vs opener L5) | exact |
| `README.md` | docs | static | `README.md` (lines 136, 599-601) | exact |
| `README.de.md` | docs | static | `README.de.md` (branding mirror) | exact |
| `docs/en/cloud.md` / `docs/de/cloud.md` | docs | static | `README.md` branding section | partial-match |
| `docs/assets/README.md` | docs | static | `docs/assets/README.md` (CDN section) | exact |
| `CONTRIBUTING.md` | docs | static | — (Version Packages = release process, not stale opener) | out of DOC-01 scope |

## Pattern Assignments

### `src/mcp/server.ts` (config, request-response)

**Analog:** `src/mcp/server.ts` — `createAndConnectServer` (lines 792-817)

**Current McpServer constructor** (lines 795-809):
```typescript
  const server = new McpServer({
    name: 'awesome-coolify-mcp',
    version: '0.1.0',
    title: 'Awesome Coolify',
    description:
      'MCP server for Coolify 4.1.x — deploy, diagnose, and CRUD for keys, servers, projects, and environments via action-based tools',
    websiteUrl: 'https://github.com/clezcoding/awesome-coolify',
    icons: [
      {
        src: 'https://cdn.jsdelivr.net/gh/clezcoding/awesome-coolify@main/docs/assets/mcp-icon-192.png',
        mimeType: 'image/png',
        sizes: ['192x192'],
      },
    ],
  });
```

**Version wire-up pattern** — copy from `src/mcp/tools/meta.ts` (lines 3, 26):
```typescript
import { readPackageVersion } from '../../utils/package-version.js';
// ...
mcpVersion: readPackageVersion(),
```

**Target constructor change** (Phase 27):
```typescript
import { readPackageVersion } from '../utils/package-version.js';
import { buildMcpServerIcons } from './server-icons.js';

const server = new McpServer({
  name: 'awesome-coolify-mcp',
  version: readPackageVersion(),
  title: 'Awesome Coolify',
  description: '...', // keep package.json verbatim
  websiteUrl: 'https://github.com/clezcoding/awesome-coolify',
  icons: buildMcpServerIcons(),
});
```

**Integration rule:** Do NOT touch `registerCoolifyTools`, tool registrations, or `toolOutputSchema` — Phase 16 precedent.

---

### `src/mcp/server-icons.ts` (utility, transform)

**Analog:** `src/mcp/tools/meta.ts` — single-purpose export module with no env dependency

**Imports pattern** (meta.ts lines 1-3):
```typescript
import * as z from 'zod/v4';
import { createFlatActionSchema } from './shared-read-params.js';
import { readPackageVersion } from '../../utils/package-version.js';
```

**Core export pattern** (new file — no env, pure constants):
```typescript
import { MCP_ICON_192_BASE64 } from './mcp-icon-data.js';

const CDN = 'https://cdn.jsdelivr.net/gh/clezcoding/awesome-coolify@main/docs/assets';

export function buildMcpServerIcons() {
  return [
    {
      src: `data:image/png;base64,${MCP_ICON_192_BASE64}`,
      mimeType: 'image/png',
      sizes: ['192x192'],
    },
    {
      src: `${CDN}/favicon-32.png`,
      mimeType: 'image/png',
      sizes: ['32x32'],
    },
    {
      src: `${CDN}/mcp-icon-192.png`,
      mimeType: 'image/png',
      sizes: ['192x192'],
    },
  ];
}
```

**CDN base URL pattern** — copy from existing `server.ts` line 804:
```typescript
'https://cdn.jsdelivr.net/gh/clezcoding/awesome-coolify@main/docs/assets/mcp-icon-192.png'
```

**Ordering:** data URI first (D-02 primary); CDN multi-size after (D-01).

---

### `src/mcp/mcp-icon-data.ts` (config, file-I/O)

**Analog:** None in repo — RESEARCH Pattern 2 defines shape.

**Generated module pattern** (from RESEARCH + `scripts/generate-mcp-icon-data.mjs`):
```typescript
// Auto-generated — do not edit
export const MCP_ICON_192_BASE64 = '<base64 string>';
```

**Constraint:** `package.json` `files` allowlist is only `dist`, `.env.example`, `LICENSE` — runtime `readFileSync('docs/assets/...')` fails under `npx`. Embed at build time.

---

### `scripts/generate-mcp-icon-data.mjs` (utility, file-I/O)

**Analog:** `scripts/changeset-emit-new-tag.mjs` (lines 1-31)

**Script header + fs read pattern**:
```javascript
#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const pkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
);
```

**Core generation** (RESEARCH Pattern 2):
```javascript
const b64 = readFileSync('docs/assets/mcp-icon-192.png').toString('base64');
writeFileSync(
  'src/mcp/mcp-icon-data.ts',
  `// Auto-generated — do not edit\nexport const MCP_ICON_192_BASE64 = ${JSON.stringify(b64)};\n`,
);
```

**Wire-up:** `"build": "node scripts/generate-mcp-icon-data.mjs && tsup"` in `package.json`.

---

### `package.json` (config, batch)

**Analog:** `package.json` (lines 9-31)

**Current build script** (line 10):
```json
"build": "tsup",
```

**Files allowlist** (lines 27-31) — do not change; drives npm-safe embed:
```json
"files": [
  "dist",
  ".env.example",
  "LICENSE"
],
```

**Target:** prepend icon generator to `build`; keep `prepublishOnly`: `pnpm run build`.

---

### `src/mcp/server.test.ts` (test, validation)

**Analog:** `src/mcp/server.test.ts` — `McpServer branding metadata` block (lines 330-392)

**Source-read helper pattern** (lines 336-346):
```typescript
function readServerSource(): string {
  return readFileSync(serverSourcePath, 'utf8');
}

function mcpServerConstructorBlock(source: string): string {
  const start = source.indexOf('new McpServer({');
  expect(start).toBeGreaterThanOrEqual(0);
  const end = source.indexOf('});', start);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end + 3);
}
```

**Current BRND-03 assertions** (lines 366-384) — extend, do not delete jsDelivr check:
```typescript
it(
  'McpServer constructor block contains icons with jsDelivr PNG URL (BRND-03)',
  () => {
    const block = mcpServerConstructorBlock(readServerSource());
    expect(block).toMatch(/\bicons:/);
    expect(block).toContain(
      'https://cdn.jsdelivr.net/gh/clezcoding/awesome-coolify@main/docs/assets/mcp-icon-192.png',
    );
  },
);
```

**New assertions to add:**
- `buildMcpServerIcons()` import or `icons: buildMcpServerIcons()` in constructor block
- `version: readPackageVersion()` (not literal `'0.1.0'`)
- Optional: test `buildMcpServerIcons()` output directly in `server-icons.test.ts`

**Version parity pattern** — copy from `src/mcp/tools/meta.test.ts` (lines 19-22):
```typescript
it('mcpVersion matches readPackageVersion() from package.json', async () => {
  const result = await handleMetaAction({ action: 'version' });
  expect(result.mcpVersion).toBe(readPackageVersion());
  expect(result.mcpVersion).not.toBe('0.1.0');
});
```

---

### `src/mcp/server-icons.test.ts` (test, validation) — optional

**Analog:** `src/mcp/tools/meta.test.ts`

**Test structure** (lines 1-9):
```typescript
import { describe, expect, it } from 'vitest';
import { handleMetaAction, metaActionSchema } from './meta.js';
import { readPackageVersion } from '../../utils/package-version.js';
```

**Suggested assertions for `buildMcpServerIcons()`:**
```typescript
import { buildMcpServerIcons } from './server-icons.js';

it('returns data URI entry first with 192x192', () => {
  const icons = buildMcpServerIcons();
  expect(icons[0].src).toMatch(/^data:image\/png;base64,/);
  expect(icons[0].sizes).toEqual(['192x192']);
});

it('includes jsDelivr CDN entries', () => {
  const icons = buildMcpServerIcons();
  const urls = icons.map((i) => i.src);
  expect(urls.some((u) => u.includes('jsdelivr.net') && u.includes('mcp-icon-192.png'))).toBe(true);
});
```

---

### `docs/assets/cursor-icon-verify.md` (docs, static)

**Analog:** `docs/assets/cursor-icon-verify.md` (Phase 16 D-09 template)

**Section structure to preserve** (lines 1-65):
- Date / Outcome / Screenshot header
- "What Cursor shows" (UI observation)
- "Server emits icons correctly (initialize)" — **update sample JSON**
- "CDN asset reachable" (`curl -I` block)
- "Spec / SDK alignment"
- "Cursor client evidence" (forum links)
- Conclusion table (D-09)

**Sample JSON to refresh** (lines 19-35) — update `version` to `readPackageVersion()` output (`1.0.1`) and `icons[]` to data URI + multi-size CDN shape.

**BRND-02 additions:** separate subsections for **local `dist/`** path and **`npx awesome-coolify-mcp@1.0.1`** path; attach screenshots for both; document experiment variant tried (V1–V4 budget).

---

### `.planning/PROJECT.md` (docs, static)

**Analog:** `.planning/PROJECT.md` — opener vs table mismatch (lines 5 vs 15)

**Stale opener** (line 5):
```markdown
Package `awesome-coolify-mcp` (v1.0.0 pending Version Packages merge), public repo `clezcoding/awesome-coolify`.
```

**Correct table row** (line 15):
```markdown
| Package | `awesome-coolify-mcp` **1.0.1** |
```

**Fix pattern:** Replace opener with shipped `1.0.1` wording aligned with table — do NOT touch CHANGELOG or milestone archives (D-09).

---

### `README.md` / `README.de.md` (docs, static)

**Analog:** `README.md` branding sections (lines 136, 599-601)

**Feature bullet** (line 136):
```markdown
- **Server branding** — MCP list icon via `serverInfo.icons`, served from jsDelivr (`docs/assets/mcp-icon-192.png`).
```

**Branding H3** (lines 599-601):
```markdown
### 🎨 Branding (`serverInfo.icons`)

The MCP server list icon is served from jsDelivr — [`docs/assets/mcp-icon-192.png`](docs/assets/mcp-icon-192.png). This is a Cursor/MCP-list client display path via `serverInfo.icons`, not a Coolify API call.
```

**Target wording** (from `27-UI-SPEC.md`): mention **embedded data URI + jsDelivr CDN entries** — EN/DE lockstep.

**Parity gate:** run `tests/integration/docs-parity.test.ts` after README edits — `CANONICAL_SECTIONS` H2 list must stay matched.

---

### `docs/en/cloud.md` / `docs/de/cloud.md` (docs, static)

**Analog:** `docs/en/cloud.md` line 103 (jsDelivr-only branding note)

**Pattern:** Short branding paragraph mirroring README — update only if branding copy changes; keep "not a Coolify API call" disclaimer.

---

### `docs/assets/README.md` (docs, static)

**Analog:** `docs/assets/README.md` (lines 13, 39-43)

**Asset table row** (line 13):
```markdown
| `mcp-icon-192.png` | MCP server list icon (serverInfo.icons) |
```

**CDN block** (lines 39-43):
```text
https://cdn.jsdelivr.net/gh/clezcoding/awesome-coolify@main/docs/assets/mcp-icon-192.png
```

**Optional:** note `favicon-32.png` as secondary CDN size entry if shipped in `buildMcpServerIcons()`.

---

## Shared Patterns

### Package version (D-08)

**Source:** `src/utils/package-version.ts` (lines 17-20)
**Apply to:** `server.ts` constructor `version` field

```typescript
export function readPackageVersion(): string {
  if (cached) return cached;
  cached = JSON.parse(readFileSync(packageJsonPath(), 'utf8')).version as string;
  return cached;
}
```

**Already used in:** `meta.ts` (line 26), `system.ts` (line 186). Phase 27 closes handshake drift only.

### MCP icons wire format (BRND-01)

**Source:** `src/mcp/server.ts` (lines 802-808) + Phase 16 jsDelivr URL
**Apply to:** `server-icons.ts`

```typescript
icons: [
  {
    src: 'https://cdn.jsdelivr.net/gh/clezcoding/awesome-coolify@main/docs/assets/mcp-icon-192.png',
    mimeType: 'image/png',
    sizes: ['192x192'],
  },
],
```

**Extend with:** `data:image/png;base64,...` entry + optional `favicon-32.png` CDN entry.

### Branding test harness (source-regex)

**Source:** `src/mcp/server.test.ts` (lines 330-392)
**Apply to:** extended BRND assertions

- `readFileSync` + `mcpServerConstructorBlock()` slice between `new McpServer({` and first `});`
- Assert `title`, `websiteUrl`, `description` verbatim from `package.json`
- Assert `icons` contains jsDelivr URL + data URI prefix after Phase 27

### README EN/DE parity

**Source:** `tests/integration/docs-parity.test.ts` (lines 14-34, 55)
**Apply to:** any README branding section edit

```typescript
const CANONICAL_SECTIONS = [
  { en: '📋 Table of contents', de: '📋 Inhaltsverzeichnis' },
  // ... 19 section pairs ...
];
const STALE_COOLIFY_MCP = /(?<![\w.-])coolify-mcp(?![\w-])/g;
```

### Client limitation documentation (BRND-02 / D-05)

**Source:** `docs/assets/cursor-icon-verify.md` (lines 56-65)

```markdown
| Check | Result |
|-------|--------|
| Server advertises `serverInfo.icons` | ✓ |
| jsDelivr PNG 200 | ✓ |
| `title` / tools visible in Cursor | ✓ |
| Custom icon rendered in Cursor MCP list | ✗ client limitation |
```

**Precedent:** Phase 16 D-09 — phase **passes** with evidence even if Cursor shows "A" fallback.

### Build pipeline

**Source:** `tsup.config.ts` (lines 1-9) + `package.json` scripts

```typescript
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  clean: true,
  minify: true,
  sourcemap: true,
});
```

Icon generator runs **before** `tsup` so `mcp-icon-data.ts` is bundled into `dist/index.js`.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/mcp/mcp-icon-data.ts` | config | file-I/O | No generated constant module in repo; RESEARCH defines pattern only |

## Metadata

**Analog search scope:** `src/mcp/`, `src/utils/`, `scripts/`, `docs/assets/`, `README*.md`, `.planning/PROJECT.md`, Phase 16 milestone patterns
**Files scanned:** ~25
**Pattern extraction date:** 2026-07-28
