---

## Quick Start

> [!NOTE]
> npm package not published yet. Use local dev / `npm link` until Phase 7.

### 1 · Install (soon)

```bash
npx -y @clezcoding/coolify-mcp
```

### 2 · Configure instances

Create `~/.coolify-mcp/instances.json`:

```json
{
  "default": "production",
  "instances": {
    "production": {
      "name": "Production",
      "url": "https://coolify.example.com",
      "token": "YOUR_COOLIFY_API_TOKEN",
      "verifySsl": true
    }
  }
}
```

Get your token: **Coolify UI → Keys & Tokens → Create API Token**.

### 3 · Connect your MCP client

`~/.cursor/mcp.json` (Cursor):

```json
{
  "mcpServers": {
    "coolify": {
      "command": "npx",
      "args": ["-y", "@clezcoding/coolify-mcp"]
    }
  }
}
```

For Claude Desktop on macOS, drop the same `mcpServers` block into
`~/Library/Application Support/Claude/claude_desktop_config.json`.

### 4 · Talk to your agent

Reload your client, then ask:

> *"Verify my Coolify connection and list all applications on production."*

### Local development

```json
{
  "mcpServers": {
    "coolify": {
      "command": "node",
      "args": ["/absolute/path/to/awesome-coolify/dist/index.js"],
      "env": { "NODE_ENV": "development" }
    }
  }
}
```
