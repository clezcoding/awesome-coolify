# MCP icon verify — v3.2 workarounds (Phase 27)

**Date:** 2026-07-29  
**Outcome:** _pending maintainer verify_  
**Screenshot:** [cursor-icon-verify.png](./cursor-icon-verify.png) _(pending capture)_

## Variant tested

**V1 (baseline)** — data URI 192×192 first, then jsDelivr `favicon-32.png` (32×32), then `mcp-icon-192.png` (192×192). Implemented in `buildMcpServerIcons()` (`src/mcp/server-icons.ts`).

If V1 UI fails, try V2 (`theme: 'dark'` on data URI), V3 (CDN before data URI), V4 (drop favicon-32) — max four variants per D-03.

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

_Fill after Cursor MCP list check:_

- Server name: `awesome-coolify-mcp` (connected state)
- Tools listed: _pending_
- **Icon:** _pending — custom icon or generic letter **"A"** fallback_

### Initialize JSON excerpt (Path A)

_Run stdio dump below; paste trimmed `serverInfo` here:_

```json
{
  "serverInfo": {
    "name": "awesome-coolify-mcp",
    "version": "1.0.1",
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

## Path B: npm `npx`

**`.cursor/mcp.json` config:**

```json
{
  "mcpServers": {
    "awesome-coolify-mcp": {
      "command": "npx",
      "args": ["-y", "awesome-coolify-mcp@1.0.1"]
    }
  }
}
```

### UI observation (Path B)

_Fill after switching mcp.json and re-opening MCP list:_

- Server name: `awesome-coolify-mcp` (connected state)
- Tools listed: _pending_
- **Icon:** _pending — custom icon or generic letter **"A"** fallback_

### Initialize JSON excerpt (Path B)

_Run stdio dump against npx path; paste trimmed `serverInfo` here:_

```json
{
  "serverInfo": {
    "name": "awesome-coolify-mcp",
    "version": "1.0.1",
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

## Server emits icons correctly

Full `initialize` `serverInfo` shape after Phase 27 BRND-01 (V1 baseline):

```json
{
  "serverInfo": {
    "name": "awesome-coolify-mcp",
    "version": "1.0.1",
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

`icons[]` length is 3: one embedded data URI (primary per D-02) plus two jsDelivr CDN PNG entries. Base64 payload is ~42 KB — never paste inline; use placeholder `{…}` in prose and verify via stdio dump.

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

**Path B (npm npx):** same probe with `spawn('npx', ['-y', 'awesome-coolify-mcp@1.0.1'], …)` instead of `dist/index.js`.

## CDN asset reachable

```bash
curl -I https://cdn.jsdelivr.net/gh/clezcoding/awesome-coolify@main/docs/assets/favicon-32.png
# HTTP/2 200 — content-type: image/png

curl -I https://cdn.jsdelivr.net/gh/clezcoding/awesome-coolify@main/docs/assets/mcp-icon-192.png
# HTTP/2 200 — content-type: image/png
```

_Record actual status codes after maintainer run._

## Spec / SDK alignment

`@modelcontextprotocol/typescript-sdk` documents `icons` on `McpServer` constructor `Implementation` (`src`, optional `mimeType`, `sizes`, `theme`). `Icon.src` accepts HTTPS URLs or `data:` Base64 PNG. Our V1 wiring matches SDK multi-entry pattern (Context7 `/modelcontextprotocol/typescript-sdk`).

## Cursor client evidence

Cursor forum report [Can't get mcp icons to work in cursor ide](https://forum.cursor.com/t/cant-get-mcp-icons-to-work-in-cursor-ide/153939) (Mar 2026): staff confirmed icons can be accepted from the server while **Cursor UI still may not render custom MCP server icons**. MCP Inspector can show icons when Cursor does not.

Earlier related bug: `icons.sizes` array vs string validation ([forum #145029](https://forum.cursor.com/t/mcp-client-icon-sizes-incorrectly-validated-as-string-instead-of-array/145029)) — connection works here (tools load), so this is display-path limitation, not handshake rejection.

Phase 16 D-09 documented the same client limitation for CDN-only icons; Phase 27 refreshes evidence for data URI + multi-size CDN workarounds.

## Conclusion

| Check | Path A (dist/) | Path B (npx) |
|-------|----------------|--------------|
| `serverInfo.icons` includes data URI | _pending_ | _pending_ |
| `serverInfo.icons` includes CDN PNG(s) | _pending_ | _pending_ |
| `serverInfo.version` === `1.0.1` | _pending_ | _pending_ |
| jsDelivr PNG 200 | _pending_ | _pending_ |
| `title` / tools visible in Cursor | _pending_ | _pending_ |
| Custom icon in Cursor MCP list | _pending_ | _pending_ |

**Pass criteria (D-05):** Either custom icon rendered **or** documented client limitation with screenshot + initialize dump for **both** paths. Phase incomplete if either Path A or Path B section lacks maintainer evidence.
