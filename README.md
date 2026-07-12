<p align="center">
  <img src="docs/assets/logo.png" alt="coolify-mcp logo" width="120" />
</p>

<h1 align="center">coolify-mcp</h1>

<p align="center">
  <strong>The open-source MCP server for self-hosted Coolify.</strong><br/>
  Deploy, read logs, diagnose — from Cursor, Claude Desktop, or any MCP client.
</p>

<p align="center">
  <a href="README.de.md">Deutsch</a> ·
  <a href="https://coolify.io">Coolify</a> ·
  <a href="https://modelcontextprotocol.io">MCP</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Coolify%20API-4.1.x-6b16ed?style=flat-square" alt="Coolify API 4.1.x" />
  <img src="https://img.shields.io/badge/MCP-action--based-181818?style=flat-square" alt="Action-based tools" />
  <img src="https://img.shields.io/badge/license-MIT-fcd34d?style=flat-square" alt="MIT License" />
</p>

![coolify-mcp social preview](docs/assets/social-preview.png)

---

## Why coolify-mcp?

Three overlapping MCP implementations exist today (Coolify CLI MCP, `user-coolify`, `coolify-backup-mcp`) — inconsistent schemas, 60+ granular tools, duplicated logic.

**coolify-mcp** replaces them with one community-focused server:

- **Action-based tools** — e.g. `application({ action: 'deploy' })` instead of dozens of single-purpose tools
- **Structured errors** — `COOLIFY_401`, recovery hints, retry on transient failures
- **Ops-first v1** — deploy, logs, diagnose, infrastructure overview
- **Multi-instance (v2)** — manage several Coolify installations from one config

Built for [Coolify](https://coolify.io) **4.1.x** self-hosted instances. Not affiliated with Coolify Labs.

---

## Quick start

### Prerequisites

- Node.js 20+
- A self-hosted Coolify instance with an API token ([Keys & Tokens](https://coolify.io/docs/api-reference/authorization))

### Install (when published)

```bash
npx coolify-mcp
```

### Local development

```bash
git clone https://github.com/YOUR_ORG/awesome-coolify.git
cd awesome-coolify
npm install
npm run build
```

### Cursor / Claude Desktop

Add to `~/.cursor/mcp.json` or Claude Desktop MCP config:

```json
{
  "mcpServers": {
    "coolify": {
      "command": "node",
      "args": ["/absolute/path/to/awesome-coolify/dist/index.js"],
      "env": {
        "COOLIFY_URL": "https://coolify.example.com",
        "COOLIFY_TOKEN": "your-api-token-here",
        "COOLIFY_MCP_LOG": "info"
      }
    }
  }
}
```

> **Phase 1:** One Coolify instance per MCP server entry. Multiple instances = multiple `mcpServers` entries. Unified `~/.coolify-mcp/instances.json` comes in **v2**.

Copy-paste template: [`docs/mcp.example.json`](docs/mcp.example.json)

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `COOLIFY_URL` | yes | Base URL of your Coolify instance (no trailing slash) |
| `COOLIFY_TOKEN` | yes | Bearer API token (team-scoped) |
| `COOLIFY_MCP_LOG` | no | `debug` · `info` · `error` (default: `info`) |
| `COOLIFY_VERIFY_SSL` | no | `true` · `false` (default: `true`) |

Tokens are read from env only — never echoed in tool responses or logs.

---

## Tools (action-based)

Each domain exposes one tool with an `action` discriminator:

```typescript
system({ action: 'health' | 'version' | 'verify' })
meta({ action: 'version' })
// v1+ domains (roadmap):
application({ action: 'list' | 'get' | 'deploy' | 'logs' | ... })
server({ action: 'list' | 'diagnose' | ... })
```

### Phase 1 (foundation)

| Tool | Actions | Purpose |
|------|---------|---------|
| `system` | `health`, `version`, `verify` | Connectivity and Coolify version |
| `meta` | `version` | MCP server version |

### v1 roadmap (ops)

Deploy, restart, logs, app/server diagnose, infrastructure overview, global issue scan — see [`.planning/ROADMAP.md`](.planning/ROADMAP.md).

### v2 (full parity)

Create/delete resources, multi-instance CRUD, bulk ops, documentation search — see [`.planning/REQUIREMENTS.md`](.planning/REQUIREMENTS.md#v2-requirements).

---

## Structured errors

API failures return a parseable envelope:

```json
{
  "code": "COOLIFY_401",
  "message": "Unauthorized — invalid or expired API token",
  "recoveryHints": [
    "Verify the token in Coolify UI → Keys & Tokens",
    "Ensure the token has the required team permissions"
  ],
  "httpStatus": 401
}
```

| Code | Meaning |
|------|---------|
| `COOLIFY_401` | Invalid or missing token |
| `COOLIFY_404` | Resource not found |
| `COOLIFY_422` | Validation error |
| `COOLIFY_500` | Coolify server error |
| `COOLIFY_NETWORK` | Connection failed |
| `COOLIFY_TIMEOUT` | Request timed out |

Transient errors (429, 5xx, network) retry up to 3× with exponential backoff (1s → 2s → 4s).

---

## Architecture

```
MCP Client (Cursor / Claude)
        │ stdio JSON-RPC
        ▼
   coolify-mcp (TypeScript)
   ├── Action routing (Zod validated)
   ├── Coolify HTTP client (ofetch + Bearer)
   └── Error envelope + secret redaction
        │ HTTPS
        ▼
   Coolify API /api/v1/*
```

Details: [`.planning/research/ARCHITECTURE.md`](.planning/research/ARCHITECTURE.md)

---

## Development

```bash
npm run build    # tsup → dist/
npm test         # vitest
npm run dev      # watch mode
```

Logs go to **stderr** only (stdout is reserved for MCP protocol).

---

## Contributing

Issues and PRs welcome. This is a community project — not an official Coolify product.

1. Read [`.planning/PROJECT.md`](.planning/PROJECT.md) for scope and decisions
2. Spike findings: [`.cursor/skills/spike-findings-awesome-coolify/`](.cursor/skills/spike-findings-awesome-coolify/)
3. Feature catalog: [`mcp_features.md`](mcp_features.md)

---

## License

MIT — see [LICENSE](LICENSE) (to be added).

---

## Related projects

- [Coolify](https://github.com/coollabsio/coolify) — self-hosted PaaS
- [Model Context Protocol](https://modelcontextprotocol.io) — AI tool integration standard
