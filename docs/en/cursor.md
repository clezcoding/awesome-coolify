# Use awesome-coolify-mcp in Cursor

Connect Cursor to the published package or a local build. Configuration stays on your
machine because `.cursor/mcp.json` can contain Coolify credentials.

## Prerequisites

- Cursor with MCP support
- Node.js 24 or newer
- A Coolify 4.1.x URL and API token

Use a least-privilege token. Never commit it or paste it into issues, pull requests, or
logs.

## Published package

Create `.cursor/mcp.json` in your project:

```json
{
  "mcpServers": {
    "awesome-coolify-mcp": {
      "command": "npx",
      "args": ["-y", "awesome-coolify-mcp@1.1.0"],
      "env": {
        "COOLIFY_URL": "https://coolify.example.com",
        "COOLIFY_TOKEN": "<coolify-api-token>"
      }
    }
  }
}
```

Keep the file local. If it already contains other servers, add only the
`awesome-coolify-mcp` entry under `mcpServers`.

## Local development

Build the repository first:

```bash
corepack enable
corepack prepare pnpm@11.15.1 --activate
pnpm install
pnpm build
```

Then replace the published command with your local output:

```json
{
  "mcpServers": {
    "awesome-coolify-mcp": {
      "command": "node",
      "args": ["/path/to/awesome-coolify/dist/index.js"],
      "env": {
        "COOLIFY_URL": "https://coolify.example.com",
        "COOLIFY_TOKEN": "<coolify-api-token>"
      }
    }
  }
}
```

Rebuild after source changes.

## Reload and verify

Reload the MCP server from Cursor settings, then confirm it exposes **18 tools** and
**four prompts**. Start with `system.health`, then call `system.version` to inspect the
Coolify version and capability flags.

Cursor may show a letter fallback instead of the supplied MCP icon. This is a known
client display limitation; it does not affect tools or prompts.

## Recommended workflows

1. Use the `new-project` prompt or `setup` tool for preflight, wiring, recipe selection,
   environment sync, and optional deploy/watch.
2. Use `recipe` when infrastructure must be created from an approved recipe.
3. Use `deployment.watch` for bounded deployment monitoring.
4. Use `application.logs` for application runtime or deployment logs.
5. Use the `diagnose` prompt or `diagnose.logs` for application-focused triage.

Coolify 4.1.x has no service/database log endpoints. Do not substitute guessed calls;
check `system.version.capabilities` instead.

## Troubleshooting

- **Server missing:** validate JSON, use an absolute local `dist/index.js` path, and
  reload Cursor.
- **Process exits:** run `node --version` and confirm Node.js 24 or newer.
- **Authentication fails:** verify URL, token scope, and TLS settings without printing
  the token.
- **Old behavior remains:** rebuild local code and restart the MCP server.
- **Deployment appears stuck:** inspect `deployment.watch`, then application or
  deployment logs within reported capabilities.

## Related guides

- [Setup workflow](setup.md)
- [Coolify Cloud](cloud.md)
- [Security policy](../../SECURITY.md)
- [Contributing](../../CONTRIBUTING.md)
