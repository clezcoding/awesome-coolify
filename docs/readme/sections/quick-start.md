---

## Quick Start

> **Note:** npm package not published yet. Local dev / `npm link` until Phase 7.

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

### 3 · Connect Cursor

`~/.cursor/mcp.json`:

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

Reload Cursor → ask your agent:

> *"Verify my Coolify connection and list all applications on production."*

### Claude Desktop

`~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) — same `mcpServers` block.

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
