# MCP icon verify — v3.2 workarounds (Phase 27, re-verified v3.3)

**Date:** 2026-07-31
**Outcome:** Client limitation (server correct) per D-05

## Variant tested

**V1 (baseline)** — data URI 192×192 first, then jsDelivr `favicon-32.png` (32×32), then `mcp-icon-192.png` (192×192). Implemented in `buildMcpServerIcons()` (`src/mcp/server-icons.ts`).

V2–V4 not required: server emits correct `icons[]`; Cursor UI shows letter **"A"** fallback on both paths (client limitation per D-05).

## Path A: local `dist/`

**`.cursor/mcp.json` config:**

```json
{
  "mcpServers": {
    "awesome-coolify-mcp": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "<repo-root>"
    }
  }
}
```

**Prerequisite:** `npm run build`

### UI observation (Path A)

- Server name: `awesome-coolify-mcp` (connected — green)
- Tools listed: visible (action-based tools load)
- **Icon:** generic letter **"A"** only — no custom icon rendered (client limitation)

### Initialize JSON excerpt (Path A)

Verified via stdio dump (`node dist/index.js`):

```json
{
  "serverInfo": {
    "name": "awesome-coolify-mcp",
    "version": "1.1.4",
    "title": "Awesome Coolify",
    "description": "MCP server for Coolify 4.1.x — deploy, diagnose, and CRUD for keys, servers, projects, and environments via action-based tools",
    "websiteUrl": "https://github.com/clezcoding/awesome-coolify",
    "icons": [
      {
        "src": "data:image/png;base64,{…}",
        "mimeType": "image/png",
        "sizes": ["192x192"]
      },
      {
        "src": "https://cdn.jsdelivr.net/gh/clezcoding/awesome-coolify@main/docs/assets/favicon-32.png",
        "mimeType": "image/png",
        "sizes": ["32x32"]
      },
      {
        "src": "https://cdn.jsdelivr.net/gh/clezcoding/awesome-coolify@main/docs/assets/mcp-icon-192.png",
        "mimeType": "image/png",
        "sizes": ["192x192"]
      }
    ]
  }
}
```

`icons[]` length: **3** (data URI first + 2 CDN entries). Version: **1.1.4**.

## Path B: npm `npx`

**`.cursor/mcp.json` config:**

Plain `npx` from the `awesome-coolify` repo root collides with the local package name — use `sh -c` with `cwd` outside the repo:

```json
{
  "mcpServers": {
    "awesome-coolify-mcp": {
      "command": "sh",
      "args": ["-c", "cd /tmp && exec npx -y awesome-coolify-mcp@1.1.4"]
    }
  }
}
```

### UI observation (Path B)

- Server name: `awesome-coolify-mcp` (connected — green after `sh -c` workaround)
- Tools listed: visible
- **Icon:** generic letter **"A"** only — same client limitation as Path A

### Initialize result (Path B)

The published probe returned the same `serverInfo` shape shown for Path A: version
**1.1.4**, three icon entries, embedded PNG first, then both jsDelivr URLs.

## Server emits icons correctly

The single Path A excerpt above is the canonical initialize sample. `icons[]` length is
three: one embedded data URI plus two jsDelivr PNG entries. Never paste the Base64 payload
inline; use `{…}` and verify through the stdio probe.

### Stdio initialize dump procedure

**Path A (local dist):**

```bash
npm run build
node -e "
const { spawn } = require('node:child_process');
const cp = spawn('node', ['dist/index.js'], { stdio: ['pipe','pipe','inherit'] });
let buf = '';
cp.stdout.on('data', d => {
  buf += d;
  if (buf.includes('serverInfo')) { console.log(buf); cp.kill(); }
});
cp.stdin.write(JSON.stringify({
  jsonrpc: '2.0', id: 1, method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'verify', version: '1.0.0' }
  }
}) + '\n');
"
```

**Path B (npm npx):** same probe with `spawn('npx', ['-y', 'awesome-coolify-mcp@1.1.4'], { cwd: '/tmp', … })` — run from outside the `awesome-coolify` repo to avoid package-name collision.

## CDN asset reachable

```bash
curl -I https://cdn.jsdelivr.net/gh/clezcoding/awesome-coolify@main/docs/assets/favicon-32.png
# HTTP/2 200 — content-type: image/png

curl -I https://cdn.jsdelivr.net/gh/clezcoding/awesome-coolify@main/docs/assets/mcp-icon-192.png
# HTTP/2 200 — content-type: image/png
```

Both jsDelivr URLs return **HTTP/2 200** `image/png` (verified 2026-07-29; re-checked 2026-07-31).

## Spec / SDK alignment

`@modelcontextprotocol/typescript-sdk` documents `icons` on `McpServer` constructor `Implementation` (`src`, optional `mimeType`, `sizes`, `theme`). `Icon.src` accepts HTTPS URLs or `data:` Base64 PNG. Our V1 wiring matches SDK multi-entry pattern (Context7 `/modelcontextprotocol/typescript-sdk`).

## Cursor client evidence

Cursor forum report [Can't get mcp icons to work in cursor ide](https://forum.cursor.com/t/cant-get-mcp-icons-to-work-in-cursor-ide/153939) (Mar 2026): staff confirmed icons can be accepted from the server while **Cursor UI still may not render custom MCP server icons**. MCP Inspector can show icons when Cursor does not.

Earlier related bug: `icons.sizes` array vs string validation ([forum #145029](https://forum.cursor.com/t/mcp-client-icon-sizes-incorrectly-validated-as-string-instead-of-array/145029)) — connection works here (tools load), so this is display-path limitation, not handshake rejection.

Phase 16 D-09 documented the same client limitation for CDN-only icons; Phase 27 refreshes evidence for data URI + multi-size CDN workarounds. Re-verified at package **1.1.4** (v3.3 milestone) — same client limitation.

## Conclusion

| Check | Path A (dist/) | Path B (npx) |
|-------|----------------|--------------|
| `serverInfo.icons` includes data URI | ✓ | ✓ |
| `serverInfo.icons` includes CDN PNG(s) | ✓ | ✓ |
| `serverInfo.version` === `1.1.4` | ✓ | ✓ |
| jsDelivr PNG 200 | ✓ | ✓ |
| `title` / tools visible in Cursor | ✓ | ✓ |
| Custom icon in Cursor MCP list | ✗ (client limitation) | ✗ (client limitation) |

**Pass criteria (D-05):** Documented client limitation with initialize dump for **both** paths — server correct, Cursor UI omits custom icon. V1 baseline sufficient; V2–V4 not attempted.
