<p align="center">
  <img src="docs/assets/logo.png" alt="awesome-coolify-mcp logo" width="120" />
</p>

<h1 align="center">awesome-coolify-mcp</h1>

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

![awesome-coolify-mcp social preview](docs/assets/social-preview.png)

---

## Why awesome-coolify-mcp?

Three overlapping MCP implementations exist today (Coolify CLI MCP, `user-coolify`, `coolify-backup-mcp`) — inconsistent schemas, 60+ granular tools, duplicated logic.

**awesome-coolify-mcp** replaces them with one community-focused server:

- **Action-based tools across 10 domains** — e.g. `application({ action: 'deploy' })` instead of dozens of single-purpose tools
- **Structured errors** — `COOLIFY_401`, recovery hints, retry on transient failures
- **Ops-first v1** — deploy, logs, diagnose, infrastructure overview, emergency controls with safety gates

Built for [Coolify](https://coolify.io) **4.1.x** self-hosted instances. Not affiliated with Coolify Labs.

---

## Quick start

**Prerequisites:** Node.js 20+, a self-hosted Coolify instance, and an API token ([Keys & Tokens](https://coolify.io/docs/api-reference/authorization)).

```bash
npx -y awesome-coolify-mcp
```

The host client injects `COOLIFY_URL` and `COOLIFY_TOKEN` via its MCP config — see [Install](#install) below.

> **Safety:** Emergency actions (`stop_all`, `redeploy_project`, `restart_project`) require `confirm: true`. Sensitive keys are masked by default — use `reveal: true` only when you need plaintext.

---

## Install

Pick one of three equal paths — deeplink, configurator, or manual paste.

### One-click (deeplink)

For experts who already have credentials ready (placeholder env is fine; prefer the [configurator](#configurator-github-pages) to fill secrets first):

- **Cursor:** [Add awesome-coolify-mcp to Cursor](cursor://anysphere.cursor-deeplink/mcp/install?name=awesome-coolify-mcp&config=eyJhd2Vzb21lLWNvb2xpZnktbWNwIjp7ImNvbW1hbmQiOiJucHgiLCJhcmdzIjpbIi15IiwiYXdlc29tZS1jb29saWZ5LW1jcCJdLCJlbnYiOnsiQ09PTElGWV9VUkwiOiJodHRwczovL2Nvb2xpZnkuZXhhbXBsZS5jb20iLCJDT09MSUZZX1RPS0VOIjoiWU9VUl9DT09MSUZZX0FQSV9UT0tFTiJ9fX0=)
- **VS Code / GitHub Copilot:** [Install via vscode:mcp/install](vscode:mcp/install?name=awesome-coolify-mcp&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22awesome-coolify-mcp%22%5D%2C%22env%22%3A%7B%22COOLIFY_URL%22%3A%22https%3A%2F%2Fcoolify.example.com%22%2C%22COOLIFY_TOKEN%22%3A%22YOUR_COOLIFY_API_TOKEN%22%7D%7D)

### Configurator (GitHub Pages)

Use the **[GitHub Pages install configurator](docs/install.html)** to enter credentials and generate per-client config snippets. Everything runs **client-side in your browser** — tokens are never posted to a backend.

**How to obtain credentials:**

- **`COOLIFY_URL`** — your Coolify base URL (e.g. `https://coolify.example.com`, no trailing slash)
- **`COOLIFY_TOKEN`** — Coolify UI → **Keys & Tokens** → create an API token with the team permissions you need

### Manual

Paste JSON (or TOML/YAML from the configurator) into your client's MCP config file. Example for Cursor (`~/.cursor/mcp.json` or `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "awesome-coolify-mcp": {
      "command": "npx",
      "args": ["-y", "awesome-coolify-mcp"],
      "env": {
        "COOLIFY_URL": "https://coolify.example.com",
        "COOLIFY_TOKEN": "YOUR_COOLIFY_API_TOKEN",
        "COOLIFY_VERIFY_SSL": "true",
        "COOLIFY_MCP_LOG": "info"
      }
    }
  }
}
```

Copy-paste template: [`docs/mcp.example.json`](docs/mcp.example.json)

The **host** injects `env` into the process — awesome-coolify-mcp never reads your client config file itself.

---

## Clients

Top MCP hosts supported out of the box:

| Client | Config location | Notes |
|--------|-----------------|-------|
| **Cursor** | `~/.cursor/mcp.json` | One-click deeplink or manual JSON |
| **VS Code / GitHub Copilot** | `.vscode/mcp.json` | Native `inputs` for URL/token prompts |
| **Claude Desktop** | `claude_desktop_config.json` | Manual JSON paste or configurator output — no `.mcpb` packaging in Phase 7 |
| **Claude Code** | `~/.claude.json` or `.mcp.json` | stdio via `npx -y awesome-coolify-mcp` |
| **Windsurf** | `~/.codeium/windsurf/mcp_config.json` | Same npx + env pattern |

**Full 15+ client matrix** (OpenCode, Codex CLI, Gemini CLI, Cline, Hermes, Kimi Code, and more): see the **[install configurator](docs/install.html)**.

> **D-18:** No Claude Desktop `.mcpb` packaging in Phase 7 — Claude Desktop = manual JSON paste or Pages configurator output only.

---

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `COOLIFY_URL` | yes | — | Base URL of your Coolify instance (no trailing slash) |
| `COOLIFY_TOKEN` | yes | — | Bearer API token (team-scoped) |
| `COOLIFY_VERIFY_SSL` | no | `true` | Set to `false` only for self-signed certs in dev |
| `COOLIFY_MCP_LOG` | no | `info` | `debug` · `info` · `error` |

Tokens are read from env / optional `.env` only — never echoed in tool responses.

---

## Tools (action-based)

Each domain exposes one MCP tool with an `action` discriminator. Example: `system({ action: 'health' })`.

| Tool | Action | Purpose |
|------|--------|---------|
| `system` | `health` | Verify Coolify API reachability |
| `system` | `version` | Get the Coolify instance version |
| `system` | `verify` | Authenticate and return connectivity + instance version |
| `system` | `infrastructure_overview` | Aggregate counts of servers, projects, applications, services, and databases |
| `meta` | `version` | Return awesome-coolify-mcp server version and name |
| `resource` | `list` | List applications, services, and databases with summary projections |
| `resource` | `find` | Fuzzy search across servers and resources |
| `diagnose` | `app` | Diagnose application status, health, env, and recent deployments |
| `diagnose` | `server` | Inspect server resources, domains, and reachability |
| `diagnose` | `scan` | Fleet-wide issue scan grouped by severity |
| `application` | `get` | Detailed configuration for one application |
| `application` | `start` | Start the application container |
| `application` | `stop` | Stop the application container |
| `application` | `restart` | Restart the application container |
| `application` | `deploy` | Trigger deployment (optional wait/poll, force rebuild) |
| `application` | `logs` | Paginated runtime or build logs |
| `deployment` | `list` | List deployments for an application |
| `deployment` | `get` | Deployment status, commit, and details |
| `deployment` | `cancel` | Cancel an in-flight deployment |
| `service` | `start` | Start all service containers |
| `service` | `stop` | Stop all service containers |
| `service` | `restart` | Restart all service containers |
| `service` | `deploy` | Redeploy service (optional image pull) |
| `service` | `get` | Detailed configuration for one service |
| `database` | `start` | Start the database container |
| `database` | `stop` | Stop the database container |
| `database` | `restart` | Restart the database container |
| `database` | `get` | Detailed configuration for one database |
| `docs` | `search` | Search bundled Coolify guides |
| `emergency` | `stop_all` | Stop all running applications fleet-wide — **requires confirm:true** |
| `emergency` | `redeploy_project` | Redeploy all apps in a project — **requires confirm:true** |
| `emergency` | `restart_project` | Restart all apps in a project — **requires confirm:true** |

---

## Safety

**Emergency tool** actions are destructive and gated:

- `stop_all`, `redeploy_project`, and `restart_project` require explicit **`confirm: true`**
- Call **without** `confirm` first to preview the `would_affect` summary — no mutation happens

**Secret masking** (default on):

- Keys matching `password`, `token`, `secret`, `private`, or `env` are masked as `***` in tool output
- Pass **`reveal: true`** to opt in to plaintext values when you explicitly need them
- **Log line content is not masked** — do not persist raw logs into long-term agent memory or tickets

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

## Not in v1

Create/delete CRUD, multi-instance runtime, env-var sync, and full parity with legacy MCPs arrive in v2.

---

## Development

```bash
git clone https://github.com/clezcoding/awesome-coolify-mcp.git
cd awesome-coolify-mcp
npm install
npm run build    # tsup → dist/
npm test         # vitest
npm run dev      # watch mode
```

Logs go to **stderr** only (stdout is reserved for MCP protocol).

For the maintainer npm publish workflow (`npm run build` → `npm pack --dry-run` → `npm publish --access public`), see **[CONTRIBUTING.md](CONTRIBUTING.md)**.

---

## License

MIT — see [LICENSE](LICENSE)
