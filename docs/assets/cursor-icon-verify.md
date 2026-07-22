# D-09 Icon verify — documented Cursor client limitation

**Date:** 2026-07-22  
**Outcome:** Client limitation (not a server defect)  
**Screenshot:** [cursor-icon-verify.png](./cursor-icon-verify.png)

## What Cursor shows

After remove/re-add of project `.cursor/mcp.json` pointing at local `dist/index.js`:

- Server name: `awesome-coolify-mcp` (green connected)
- Tools listed correctly (system, meta, resource, …, docs)
- **Icon:** generic letter **"A"** fallback — Hex Robot Helper PNG does **not** render

## Server emits icons correctly (initialize)

JSON-RPC `initialize` against local `dist/index.js` returns:

```json
{
  "serverInfo": {
    "name": "awesome-coolify-mcp",
    "version": "0.1.0",
    "title": "Awesome Coolify",
    "description": "MCP server for Coolify 4.1.x — deploy, diagnose, and CRUD for keys, servers, projects, and environments via action-based tools",
    "websiteUrl": "https://github.com/clezcoding/awesome-coolify",
    "icons": [
      {
        "src": "https://cdn.jsdelivr.net/gh/clezcoding/awesome-coolify@main/docs/assets/mcp-icon-192.png",
        "mimeType": "image/png",
        "sizes": ["192x192"]
      }
    ]
  }
}
```

## CDN asset reachable

```bash
curl -I https://cdn.jsdelivr.net/gh/clezcoding/awesome-coolify@main/docs/assets/mcp-icon-192.png
# HTTP/2 200
# content-type: image/png
```

## Spec / SDK alignment

`@modelcontextprotocol/typescript-sdk` documents `icons` on `McpServer` constructor `Implementation` (`src`, optional `mimeType`, `sizes`, `theme`). Our wiring matches the SDK example (Context7 `/modelcontextprotocol/typescript-sdk`).

## Cursor client evidence

Cursor forum report [Can't get mcp icons to work in cursor ide](https://forum.cursor.com/t/cant-get-mcp-icons-to-work-in-cursor-ide/153939) (Mar 2026): staff confirmed icons can be accepted from the server while **Cursor UI still may not render custom MCP server icons**. MCP Inspector can show icons when Cursor does not.

Earlier related bug: `icons.sizes` array vs string validation ([forum #145029](https://forum.cursor.com/t/mcp-client-icon-sizes-incorrectly-validated-as-string-instead-of-array/145029)) — connection works here (tools load), so this is display-path limitation, not handshake rejection.

## Conclusion (D-09)

| Check | Result |
|-------|--------|
| Server advertises `serverInfo.icons` | ✓ |
| jsDelivr PNG 200 | ✓ |
| `title` / tools visible in Cursor | ✓ |
| Custom icon rendered in Cursor MCP list | ✗ client limitation |

Branding metadata ships per BRND-01/02/03. Cursor list icon rendering is a host limitation until Cursor UI support lands.
