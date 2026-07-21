<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/clezcoding/awesome-coolify@main/docs/assets/hero-banner.png" alt="awesome-coolify-mcp — a friendly mascot next to a glowing dashboard showing a server fleet, a terminal, a deploy arrow, and a safety shield" width="100%" />
</p>

<h1 align="center">awesome-coolify-mcp</h1>

<p align="center">
  <strong>One MCP server. Every self-hosted Coolify instance you own.</strong><br />
  Verify connectivity, discover your fleet, deploy, tail logs, diagnose incidents, and run gated emergency ops —<br />
  straight from Cursor, Claude, VS Code, Windsurf, or any MCP-speaking agent.
</p>

<p align="center">
  <a href="README.de.md">🇩🇪 Deutsch</a>
  ·
  <a href="https://coolify.io">Coolify</a>
  ·
  <a href="https://modelcontextprotocol.io">Model Context Protocol</a>
  ·
  <a href="https://clezcoding.github.io/awesome-coolify/install.html">Install configurator ↗</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/awesome-coolify-mcp"><img src="https://img.shields.io/npm/v/awesome-coolify-mcp.svg?style=flat-square&color=6b16ed" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/awesome-coolify-mcp"><img src="https://img.shields.io/npm/dm/awesome-coolify-mcp.svg?style=flat-square&color=6b16ed" alt="npm downloads" /></a>
  <img src="https://img.shields.io/badge/Node.js-%3E%3D22.14-3c873a?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js >= 22.14" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Coolify%20API-4.1.x-6b16ed?style=flat-square" alt="Coolify API 4.1.x" />
  <img src="https://img.shields.io/badge/MCP-14%20tools%20·%2055%20actions-181818?style=flat-square" alt="14 domain tools, 55 actions" />
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-fcd34d?style=flat-square" alt="MIT License" /></a>
  <a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-6b16ed?style=flat-square" alt="PRs welcome" /></a>
</p>

<p align="center">
  <a href="#-overview">Overview</a> ·
  <a href="#-why-awesome-coolify-mcp">Why</a> ·
  <a href="#-features">Features</a> ·
  <a href="#-how-it-works">Architecture</a> ·
  <a href="#-quick-start">Quick start</a> ·
  <a href="#-install">Install</a> ·
  <a href="#-tools-reference">Tools</a> ·
  <a href="#-safety-model">Safety</a> ·
  <a href="#-coming-soon">Roadmap</a>
</p>

<p align="center">
  <a href="https://cursor.com/en/install-mcp?name=awesome-coolify-mcp&config=eyJhd2Vzb21lLWNvb2xpZnktbWNwIjp7ImNvbW1hbmQiOiJucHgiLCJhcmdzIjpbIi15IiwiYXdlc29tZS1jb29saWZ5LW1jcCJdLCJlbnYiOnsiQ09PTElGWV9VUkwiOiJodHRwczovL2Nvb2xpZnkuZXhhbXBsZS5jb20iLCJDT09MSUZZX1RPS0VOIjoiWU9VUl9DT09MSUZZX0FQSV9UT0tFTiJ9fX0=">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://cursor.com/deeplink/mcp-install-dark.svg" />
      <source media="(prefers-color-scheme: light)" srcset="https://cursor.com/deeplink/mcp-install-light.svg" />
      <img src="https://cursor.com/deeplink/mcp-install-dark.svg" alt="Add awesome-coolify-mcp to Cursor" height="40" />
    </picture>
  </a>
  &nbsp;&nbsp;
  <a href="vscode:mcp/install?name=awesome-coolify-mcp&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22awesome-coolify-mcp%22%5D%2C%22env%22%3A%7B%22COOLIFY_URL%22%3A%22https%3A%2F%2Fcoolify.example.com%22%2C%22COOLIFY_TOKEN%22%3A%22YOUR_COOLIFY_API_TOKEN%22%7D%7D">
    <img src="https://img.shields.io/badge/VS_Code-Install_MCP_Server-0098FF?style=for-the-badge&logo=visualstudiocode&logoColor=white" alt="Install awesome-coolify-mcp in VS Code" height="40" />
  </a>
</p>

<p align="center"><sub>One click installs with placeholder credentials — see <a href="#-install">Install</a> for the full walkthrough, or use the <a href="https://clezcoding.github.io/awesome-coolify/install.html">browser configurator</a> to fill in real values safely.</sub></p>

---

## 📋 Table of contents

- [Overview](#-overview)
- [Why awesome-coolify-mcp](#-why-awesome-coolify-mcp)
- [Features](#-features)
- [How it works](#-how-it-works)
- [Quick start](#-quick-start)
- [Install](#-install)
  - [1. One-click deeplink](#1-one-click-deeplink)
  - [2. Install configurator](#2-install-configurator-github-pages)
  - [3. Manual MCP config](#3-manual-mcp-config)
- [Supported clients](#-supported-clients)
- [Environment variables](#-environment-variables)
- [Tools reference](#-tools-reference)
- [Safety model](#-safety-model)
- [Structured errors & retries](#-structured-errors--retries)
- [Example agent workflows](#-example-agent-workflows)
- [Status today](#-status-today)
- [Coming soon](#-coming-soon)
- [Local development](#-local-development)
- [Links](#-links)

---

## 🔭 Overview

Self-hosted [Coolify](https://coolify.io) is one of the best open-source alternatives to Heroku/Vercel-style PaaS platforms — but wiring it up to an AI coding agent has historically meant piecing together several small, overlapping community MCP integrations, each with its own schema, its own error format, and its own idea of what "safe" looks like.

**awesome-coolify-mcp** replaces that patchwork with a single, community-maintained MCP server that speaks Coolify's REST API **4.1.x** through a clean, **action-based** tool surface. Source, docs, and npm distribution live in one public repo — [`clezcoding/awesome-coolify`](https://github.com/clezcoding/awesome-coolify) — while the installable package stays **`awesome-coolify-mcp`**. Instead of memorizing dozens of near-identical tool names, your agent calls domain tools with an `action` field:

```js
application({ action: "deploy", uuid: "<app-uuid>", wait: true })
diagnose({ action: "scan" })
emergency({ action: "stop_all", confirm: true })
```

Under the hood, every call goes through the same request pipeline: Zod-validated input, retrying HTTP client, secret-aware output masking, and structured error envelopes with recovery hints — so your agent fails gracefully instead of guessing.

> [!NOTE]
> This is a community project built for people who run their own Coolify instances. **It is not affiliated with or endorsed by Coolify Labs.**

---

## 🆚 Why awesome-coolify-mcp

| Typical setup without it | With awesome-coolify-mcp |
|---------------------------|--------------------------|
| Several overlapping community MCP tools, each with its own schema | **One server, one consistent schema** |
| Dozens of granular, single-purpose tools per resource | **14 domain tools** × `action` discriminators (55 actions total) |
| Ad-hoc error strings that agents have to guess at | Structured codes (`COOLIFY_401`, `COOLIFY_404`, …) + machine-readable recovery hints |
| Secrets can leak straight into agent context | Default secret masking + confirmation gates on destructive actions |
| Read a wall of raw JSON to find what changed | Bounded, paginated projections tuned for LLM context windows |

Today, the focus covers **day-2 operations** plus growing **infrastructure CRUD**: verify connectivity, discover your fleet, deploy, pull logs, diagnose incidents, run gated emergency ops — and manage SSH keys, servers, projects, and environments. Full CRUD for applications, services, and databases is next — see [Coming soon](#-coming-soon).

---

## ✨ Features

<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/clezcoding/awesome-coolify@main/docs/assets/features.png" alt="Feature highlights: action-based tools, safety gates, diagnose, deploy and logs" width="100%" />
</p>

- **Action-based tools across 14 domains** — call `application({ action: "deploy", uuid })` instead of hunting through dozens of tool names. Domains span ops (`system`, `resource`, `diagnose`, `application`, `deployment`, `service`, `database`, `emergency`), infrastructure CRUD (`private_key`, `server`, `project`, `environment`), plus `docs` and `meta`.
- **Ops workflows that mirror real incidents** — a single `system.infrastructure_overview` call for the big picture, fuzzy `resource.find` when you only remember a name or domain, `diagnose.app` / `diagnose.server` for a specific suspect, and `diagnose.scan` when you just know *something* is wrong fleet-wide.
- **Deploy lifecycle that agents can actually drive** — start/stop/restart, deploy with optional wait-and-poll or force rebuild, list/get/cancel deployments, and bounded runtime or build logs that won't blow your context window.
- **Service & database lifecycle** — start/stop/restart/get, plus service redeploy with an optional fresh image pull.
- **Safety by default, not by convention** — emergency mutations require an explicit `confirm: true`; sensitive keys (`password`, `token`, `secret`, `private`, `env`) render as `***` unless you opt in with `reveal: true`.
- **Agent-friendly failure modes** — every error is a parseable envelope with a `code`, a human `message`, and `recoveryHints`; transient network/429/5xx failures retry automatically with exponential backoff.
- **Broad client coverage out of the box** — Cursor, VS Code / GitHub Copilot, Claude Desktop, Claude Code, Windsurf, and 15+ more via the [install configurator](https://clezcoding.github.io/awesome-coolify/install.html).

---

## 🏗️ How it works

<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/clezcoding/awesome-coolify@main/docs/assets/architecture.png" alt="Architecture: MCP clients talk to awesome-coolify-mcp's domain tools, which talk to the Coolify REST API 4.1.x" width="100%" />
</p>

```text
MCP client (Cursor / Claude / VS Code / …)
        │  stdio MCP
        ▼
awesome-coolify-mcp  (14 domain tools + action discriminator)
        │  HTTPS + Bearer token
        ▼
Coolify REST API 4.1.x  (servers · projects · applications · services · databases)
```

The server itself is intentionally boring: it holds no long-lived state and never touches your IDE's config files. Your **MCP host** (Cursor, Claude, VS Code, …) injects `COOLIFY_URL` and `COOLIFY_TOKEN` through its MCP config's `env` block; the process reads them from its environment (or an optional local `.env` when you run it directly from the CLI) and forwards authenticated requests to your Coolify instance over HTTPS.

---

## 🚀 Quick start

**Prerequisites**

- Node.js **22.14+** (CI runs on Node 24)
- A self-hosted Coolify instance on **4.1.x**
- An API token from Coolify → **Keys & Tokens** ([authorization docs](https://coolify.io/docs/api-reference/authorization))

Run it directly with `npx` — no global install needed:

```bash
npx -y awesome-coolify-mcp
```

Wire the two required environment variables into your MCP host (see [Install](#-install) for every client). Once connected, a minimal smoke test looks like this:

```js
meta({ action: "version" })                       // server identity — no Coolify call
system({ action: "verify" })                      // authenticate + connectivity check
system({ action: "infrastructure_overview" })     // servers, projects, apps, services, DBs at a glance
```

> [!IMPORTANT]
> Emergency actions (`stop_all`, `redeploy_project`, `restart_project`) require `confirm: true`. Call them **without** `confirm` first — you'll get a `would_affect` preview and no mutation runs. Only pass `reveal: true` when you genuinely need plaintext secrets back.

---

## 📦 Install

There are three equally supported paths — pick whichever fits your workflow.

### 1. One-click deeplink

Best when you already have your Coolify URL and token handy. Placeholder credentials work fine too — you'll be prompted to fill them in, or you can swap them afterwards.

<p align="center">
  <a href="https://cursor.com/en/install-mcp?name=awesome-coolify-mcp&config=eyJhd2Vzb21lLWNvb2xpZnktbWNwIjp7ImNvbW1hbmQiOiJucHgiLCJhcmdzIjpbIi15IiwiYXdlc29tZS1jb29saWZ5LW1jcCJdLCJlbnYiOnsiQ09PTElGWV9VUkwiOiJodHRwczovL2Nvb2xpZnkuZXhhbXBsZS5jb20iLCJDT09MSUZZX1RPS0VOIjoiWU9VUl9DT09MSUZZX0FQSV9UT0tFTiJ9fX0=">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://cursor.com/deeplink/mcp-install-dark.svg" />
      <source media="(prefers-color-scheme: light)" srcset="https://cursor.com/deeplink/mcp-install-light.svg" />
      <img src="https://cursor.com/deeplink/mcp-install-dark.svg" alt="Add awesome-coolify-mcp to Cursor" height="40" />
    </picture>
  </a>
  &nbsp;&nbsp;
  <a href="vscode:mcp/install?name=awesome-coolify-mcp&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22awesome-coolify-mcp%22%5D%2C%22env%22%3A%7B%22COOLIFY_URL%22%3A%22https%3A%2F%2Fcoolify.example.com%22%2C%22COOLIFY_TOKEN%22%3A%22YOUR_COOLIFY_API_TOKEN%22%7D%7D">
    <img src="https://img.shields.io/badge/VS_Code-Install_MCP_Server-0098FF?style=for-the-badge&logo=visualstudiocode&logoColor=white" alt="Install awesome-coolify-mcp in VS Code" height="40" />
  </a>
</p>

<details>
<summary><strong>How these links work</strong> (click to expand)</summary>
<br />

Both editors implement a protocol handler that reads a JSON server configuration straight out of the URL:

| Client | Scheme | Encoding |
|--------|--------|----------|
| **Cursor** | `cursor://anysphere.cursor-deeplink/mcp/install?name=…&config=…` (mirrored at `https://cursor.com/en/install-mcp?…` for a friendlier landing page) | `config` is base64-encoded JSON |
| **VS Code / Copilot** | `vscode:mcp/install?name=…&config=…` | `config` is URL-encoded JSON |

Clicking the button opens your editor, shows the server it's about to add, and lets you review or edit the command/env before accepting — nothing is installed silently.
</details>

### 2. Install configurator (GitHub Pages)

Use the **[browser configurator](https://clezcoding.github.io/awesome-coolify/install.html)** to type in your real `COOLIFY_URL` / `COOLIFY_TOKEN` and generate a ready-to-paste snippet for your exact client — JSON, TOML, or YAML depending on what that client expects.

Everything runs **client-side in your browser**. Your token is never sent to a backend, logged, or stored anywhere but the config file you paste it into.

### 3. Manual MCP config

Paste this into your host's MCP configuration file. Cursor example (`~/.cursor/mcp.json` for global, or `.cursor/mcp.json` in a project):

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

A ready-made copy-paste template also lives at [`docs/mcp.example.json`](docs/mcp.example.json).

---

## 🖥️ Supported clients

| Client | Config location | Notes |
|--------|-----------------|-------|
| **Cursor** | `~/.cursor/mcp.json` | One-click deeplink or manual JSON |
| **VS Code / GitHub Copilot** | `.vscode/mcp.json` | Native `inputs` prompts for URL/token — no plaintext in the file |
| **Claude Desktop** | `claude_desktop_config.json` | Manual JSON or configurator output today |
| **Claude Code** | `~/.claude.json` or `.mcp.json` | stdio via `npx -y awesome-coolify-mcp` |
| **Windsurf** | `~/.codeium/windsurf/mcp_config.json` | Same `npx` + `env` pattern as Cursor |

The **[install configurator](https://clezcoding.github.io/awesome-coolify/install.html)** covers a much wider matrix — OpenCode, Codex CLI, Gemini CLI, Cline, Kilo Code, Goose, LM Studio, Hermes Agent, Kimi Code, Google Antigravity, OpenClaw, and more — with the correct config shape for each.

> [!NOTE]
> Claude Desktop currently ships as manual JSON / configurator output only — a dedicated `.mcpb` bundle is on the roadmap (see [Coming soon](#-coming-soon)).

---

## 🔐 Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `COOLIFY_URL` | yes | — | Coolify base URL, no trailing slash — e.g. `https://coolify.example.com` |
| `COOLIFY_TOKEN` | yes | — | Bearer API token, scoped to your team |
| `COOLIFY_VERIFY_SSL` | no | `true` | Set to `false` only for self-signed certs on local/dev instances |
| `COOLIFY_MCP_LOG` | no | `info` | Log verbosity: `debug` · `info` · `error` |

Credentials are read from the process environment (your IDE's MCP `env` block) or an optional local `.env` file when running the CLI directly. They are **never** echoed back inside tool responses.

---

## 🧰 Tools reference

Every domain is exposed as **one MCP tool** with an `action` discriminator, so your agent's tool list stays short while the capability surface stays wide.

```js
system({ action: "health" })
application({ action: "deploy", uuid: "<app-uuid>", wait: true })
emergency({ action: "stop_all", confirm: true })
```

### 🖥️ `system` — connectivity & overview

Your first call in any session: is Coolify reachable, and what does the fleet look like right now?

| Action | Purpose |
|--------|---------|
| `health` | Verify Coolify API reachability |
| `version` | Coolify instance version string |
| `verify` | Authenticate; returns connectivity + version in one call |
| `infrastructure_overview` | Aggregate counts across servers, projects, applications, services, databases |

### 🏷️ `meta` — server identity

| Action | Purpose |
|--------|---------|
| `version` | awesome-coolify-mcp's own package name + semver — no Coolify call at all |

### 🔎 `resource` — discovery

For when you know roughly what you're looking for but not its exact UUID.

| Action | Purpose |
|--------|---------|
| `list` | Applications, services, and databases as summary projections, with pagination `_meta` |
| `find` | Fuzzy search by name, domain, or IP across servers and resources — ranked, capped at 10 |

### 🩺 `diagnose` — investigation

The tool you reach for when something *feels* wrong but you don't yet know what.

| Action | Purpose |
|--------|---------|
| `app` | App status, health, env var count, and recent deployments |
| `server` | Server resources, domains, and reachability |
| `scan` | Fleet-wide issues grouped by severity — the "what's on fire" button |

### 🚀 `application` — app operations

| Action | Purpose |
|--------|---------|
| `get` | Detailed application configuration |
| `start` / `stop` / `restart` | Container lifecycle control |
| `deploy` | Trigger a deploy, with optional `wait`/poll and `force` rebuild |
| `logs` | Paginated runtime or build logs, bounded so they never blow your context |
| `envs:list` / `envs:get` | List or fetch env vars (values masked as `***` unless `reveal: true`) |
| `envs:create` / `envs:update` | Create or update individual env vars (supports `is_preview`, `is_literal`, `is_multiline`, `is_shown_once`) |
| `envs:delete` | Delete one env var — **requires `confirm: true`** |
| `envs:bulk-update` | Patch many env vars at once — **requires `confirm: true`** |
| `envs:sync` | Diff/apply a local `.env` file or inline content — **application only**; see [Resource env vars](#-resource-environment-variables-envs) |

### 📈 `deployment` — deploy tracking

| Action | Purpose |
|--------|---------|
| `list` | Deployments for a given application |
| `get` | Status, commit, and timing details for one deployment |
| `cancel` | Cancel an in-flight deployment cleanly |

### 🧩 `service` / `database` — sidecar lifecycle

| Tool | Actions |
|------|---------|
| `service` | `get`, `start`, `stop`, `restart`, `deploy`, `create` (one-click type XOR compose), `update`, `delete`, `delete_preview`, `envs:list`, `envs:get`, `envs:create`, `envs:update`, `envs:delete`, `envs:bulk-update` |
| `database` | `get`, `start`, `stop`, `restart`, `create` (8 engines), `update`, `delete`, `delete_preview`, `envs:list`, `envs:get`, `envs:create`, `envs:update`, `envs:delete`, `envs:bulk-update`, `backup:create`, `backup:list`, `backup:update`, `backup:delete`, `backup:now`, `backup:history` |

### 🌱 Resource environment variables (`envs:*`)

Manage Coolify runtime configuration on applications, services, and databases through `envs:*` actions on the existing domain tools — no separate env MCP tool.

| Tool | `envs:*` actions | Notes |
|------|------------------|-------|
| `application` | `envs:list`, `envs:get`, `envs:create`, `envs:update`, `envs:delete`, `envs:bulk-update`, `envs:sync` | Only tool with local `.env` sync |
| `service` | `envs:list`, `envs:get`, `envs:create`, `envs:update`, `envs:delete`, `envs:bulk-update` | No sync — use `application` for `.env` diff/apply |
| `database` | `envs:list`, `envs:get`, `envs:create`, `envs:update`, `envs:delete`, `envs:bulk-update` | **`is_preview` is not supported** on database env vars (Coolify OpenAPI gap) |

**Confirm gates:** `envs:delete` and `envs:bulk-update` always require `confirm: true` on all three tools. On `application` only, `envs:sync` requires `confirm: true` when applying (`dry_run: false`, the default) or when `prune: true`.

**Reveal policy:** Env values render as `***` by default. Pass `reveal: true` only after the human explicitly asks for plaintext — the agent must not auto-set `reveal: true`.

**`envs:sync` semantics (application only):** Supply exactly one of `env_file` (local path) or `env_content` (inline `.env` text). `dry_run: true` returns a diff (`added`, `updated`, `unchanged`, `removed`, optional `conflicts`) with no API writes; default `dry_run: false` applies changes. Remote keys missing locally are never deleted unless `prune: true` (also requires `confirm: true`). When local and remote values differ, set `conflict_policy` to `overwrite`, `keep_remote`, or `abort` after asking the human — apply with conflicts and no policy returns `COOLIFY_CONFIRM_REQUIRED`.

```js
application({ action: "envs:list", uuid: "<app-uuid>" })
application({ action: "envs:sync", uuid: "<app-uuid>", env_file: "./.env", dry_run: true })
application({ action: "envs:sync", uuid: "<app-uuid>", env_content: "API_KEY=EXAMPLE_VALUE\n", confirm: true, conflict_policy: "overwrite" })
```

### 💾 Database backups (`backup:*`)

Configure, list, update, delete, and trigger backup schedules — and inspect execution history — on the existing `database` tool. No separate backup MCP tool.

| Action | Purpose |
|--------|---------|
| `backup:create` | Create a backup schedule (frequency required; optional S3, retention, `backup_now: true`) |
| `backup:list` | List backup schedules for a database |
| `backup:update` | Update schedule fields (frequency, retention, S3 flags) |
| `backup:delete` | Remove a schedule — **requires `confirm: true`** |
| `backup:now` | Trigger an immediate backup run |
| `backup:history` | List executions for a schedule (status, timestamps, size) |

**Parent identity:** All backup actions require the parent database via `uuid` or `name`. Schedule-scoped actions (`backup:update`, `backup:delete`, `backup:now`, `backup:history`) also require `scheduled_backup_uuid`.

**Confirm gates:** `backup:delete` requires `confirm: true` — otherwise `COOLIFY_CONFIRM_REQUIRED`. `delete_s3` defaults **`false`** (config-only delete). When `delete_s3: true`, deletion still requires `confirm: true` — purging S3 artifacts is treated as destructive.

**Frequency (Pitfall 1):** `backup:create` accepts OpenAPI named presets (`every_minute`, `hourly`, `daily`, `weekly`, `monthly`, `yearly`) **or** a cron expression. `backup:update` accepts **presets only** — passing cron on update returns `COOLIFY_VALIDATION_ERROR`.

**`backup:now` semantics:** Maps to Coolify `PATCH` with `{ backup_now: true }` on the schedule — no separate trigger endpoint. Requires `scheduled_backup_uuid`.

**Reveal policy:** S3-related credentials in backup config responses are masked as `***` by default. Pass `reveal: true` only after the human explicitly asks for plaintext — the agent must not auto-set `reveal: true`.

**Out of scope (v2.x+):** Backup execution delete, restore/import from backup, and S3 storage destination CRUD are not available in this release.

```js
database({ action: "backup:list", uuid: "<db-uuid>" })
database({ action: "backup:create", uuid: "<db-uuid>", frequency: "daily", save_s3: false })
database({ action: "backup:now", uuid: "<db-uuid>", scheduled_backup_uuid: "<schedule-uuid>" })
database({ action: "backup:delete", uuid: "<db-uuid>", scheduled_backup_uuid: "<schedule-uuid>", confirm: true })
```

### 🔑 `private_key` — SSH key CRUD

Manage Coolify private keys with PEM content masked by default.

| Action | Purpose |
|--------|---------|
| `list` / `get` | List or fetch a key (PEM masked unless `reveal: true`) |
| `create` / `update` | Add or rotate SSH keys |
| `delete` / `delete_preview` | Remove a key, or preview dependents before delete |

### 🖧 `server` — server CRUD & validation

| Action | Purpose |
|--------|---------|
| `get` | Server details, domains, and reachability |
| `create` / `update` | Register or reconfigure a server |
| `validate` | Trigger Coolify's server validation check |
| `delete` / `delete_preview` | Remove a server, or preview dependents first |

### 📁 `project` — project CRUD

| Action | Purpose |
|--------|---------|
| `list` / `get` | Discover or inspect projects |
| `create` / `update` | Stand up or rename projects |
| `delete` / `delete_preview` | Delete a project, or preview blast radius first |

### 🌍 `environment` — environment CRUD

| Action | Purpose |
|--------|---------|
| `list` / `get` | List or inspect environments inside a project |
| `create` | Add a new environment to a project |
| `delete` / `delete_preview` | Remove an environment, or preview dependents first |

### 📚 `docs` — offline guides

| Action | Purpose |
|--------|---------|
| `search` | Search a bundled, curated Coolify troubleshooting index — not a live web fetch, so it works offline and can't be used as an external fetch vector |

### 🚨 `emergency` — high-impact ops (gated)

Reach for these only when you mean it — every action below is behind a confirmation gate.

| Action | Purpose |
|--------|---------|
| `stop_all` | Stop every running application, fleet-wide — **requires `confirm: true`** |
| `redeploy_project` | Redeploy every app in a project — **requires `confirm: true`** |
| `restart_project` | Restart every app in a project — **requires `confirm: true`** |

---

## 🛡️ Safety model

### Confirmation gate

Destructive **emergency** actions follow a strict two-step pattern:

1. Call with `confirm` omitted or `false` → you get back a `would_affect` preview and error code `COOLIFY_CONFIRM_REQUIRED` — **nothing is mutated**.
2. Call again with `confirm: true` → the action actually executes.

Regular app/service/database mutations (start, stop, deploy, …) are **not** behind this gate — they simply follow Coolify's own API semantics, since they're scoped to one resource rather than your whole fleet.

**Environment variables:** `envs:delete` and `envs:bulk-update` require `confirm: true` on application, service, and database. `envs:sync` apply (`dry_run: false`) and `envs:sync` with `prune: true` require `confirm: true` on application only. `dry_run: true` sync previews never mutate.

### Secret masking

- Keys matching `password`, `token`, `secret`, `private`, or `env` render as `***` by default in tool output.
- Pass `reveal: true` only when you explicitly need plaintext — for example, to copy an env var into another system. **Ask the human first** before setting `reveal: true` on any `envs:*` call.
- **Log line bodies are not masked.** Treat raw logs like you would any other sensitive output: don't paste them into long-lived agent memory or public tickets.

---

## ⚠️ Structured errors & retries

Every API failure comes back as a parseable envelope your agent can reason about, instead of a raw stack trace:

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
| `COOLIFY_CONFIRM_REQUIRED` | Emergency preview — pass `confirm: true` to proceed |
| `COOLIFY_AMBIGUOUS_MATCH` | Name matched multiple resources — pick a UUID from the ranked list |

Transient failures (HTTP 429, 5xx, or network errors) retry automatically up to **3 times** with exponential backoff (`1s → 2s → 4s`) before giving up and returning the error to your agent.

---

## 💬 Example agent workflows

**"Is my Coolify reachable, and what do I have?"**

```js
system({ action: "verify" })
system({ action: "infrastructure_overview" })
resource({ action: "list" })
```

**"Find the nginx app, deploy it, then show me the logs."**

```js
resource({ action: "find", query: "nginx" })
application({ action: "deploy", uuid: "<uuid>", wait: true })
application({ action: "logs", uuid: "<uuid>" })
```

**"Something feels wrong across the fleet."**

```js
diagnose({ action: "scan" })
diagnose({ action: "app", uuid: "<suspect>" })
diagnose({ action: "server", uuid: "<server>" })
```

**"Emergency: stop everything, but let me see the blast radius first."**

```js
emergency({ action: "stop_all" })                 // preview — would_affect, no mutation
emergency({ action: "stop_all", confirm: true })  // execute
```

---

## ✅ Status today

The server is stable and actively used for day-2 operations against real Coolify 4.1.x instances:

| Capability | Status |
|------------|--------|
| Verify connectivity + infrastructure overview | ✅ Shipped |
| Discovery: `resource.list` / `resource.find` | ✅ Shipped |
| Diagnose: app, server, fleet-wide scan + follow-up hints | ✅ Shipped |
| Deploy lifecycle: start/stop/restart, deploy with wait-mode + force rebuild | ✅ Shipped |
| Deployment tracking: list / get / cancel | ✅ Shipped |
| App logs: runtime + build, bounded and paginated | ✅ Shipped |
| Service & database lifecycle | ✅ Shipped |
| Emergency ops: stop-all, project redeploy/restart, behind confirm gate | ✅ Shipped |
| SSH key CRUD (`private_key`) with PEM masking | ✅ Shipped |
| Server CRUD + validation (`server`) | ✅ Shipped |
| Project & environment CRUD (`project`, `environment`) | ✅ Shipped |
| Secret masking with explicit `reveal` opt-in | ✅ Shipped |
| Structured errors, recovery hints, automatic retries | ✅ Shipped |
| npm distribution + install configurator for 15+ clients | ✅ Shipped |

Service/database log tailing is temporarily on hold — Coolify 4.1.x's REST API doesn't expose a `/services/{uuid}/logs` or `/databases/{uuid}/logs` endpoint yet (the fix has merged upstream but isn't backported to 4.1.x). It'll ship the moment the endpoint is reachable, with no half-working stub in the meantime.

---

## 🔮 Coming soon

<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/clezcoding/awesome-coolify@main/docs/assets/coming-soon.png" alt="The mascot sketching a roadmap of upcoming features: databases, scheduled tasks, private keys, teams, and cloud provisioning" width="100%" />
</p>

The next milestone focuses on **creation for workloads**, not just infrastructure scaffolding — turning awesome-coolify-mcp into a tool that can stand up new applications, services, and databases from scratch, not only manage what already exists. Planned areas, roughly in order of priority:

- **Full CRUD** for applications, services, and databases — create, update, and delete, not just start/stop/deploy
- **Environment variable management** — read, write, bulk-sync from a local `.env`
- **One-click services** — full service catalog with compose YAML, storage, and env configuration
- **Database backups** — schedules, executions, and on-demand triggers
- **Scheduled tasks** — cron job CRUD, execution history, run-once triggers
- **Teams & multi-tenancy** — list/get teams and members, per-project scoped tokens
- **Cloud provider tokens** — Hetzner/DigitalOcean provisioning credentials (SSH keys already shipped)
- **GitHub App integration** — repo/branch discovery, enterprise URLs
- **Claude Desktop `.mcpb` packaging** — true one-click install, no manual JSON
- **Deeper observability** — container-level metrics, Traefik insight, live event streams, log search

Have a use case that isn't listed? Open an issue — the roadmap is shaped by what the community actually runs into.

---

## 🛠️ Local development

```bash
git clone https://github.com/clezcoding/awesome-coolify.git
cd awesome-coolify
npm install
npm run build    # tsup → dist/
npm test         # vitest
npm run dev      # watch mode
```

Logs go to **stderr** only — stdout is reserved exclusively for the MCP protocol.

The maintainer publish flow (`build` → `pack --dry-run` → `publish`) is documented in [CONTRIBUTING.md](CONTRIBUTING.md).

---

## 🔗 Links

| Resource | URL |
|----------|-----|
| Install configurator | [clezcoding.github.io/awesome-coolify/install.html](https://clezcoding.github.io/awesome-coolify/install.html) |
| Install landing page | [clezcoding.github.io/awesome-coolify/](https://clezcoding.github.io/awesome-coolify/) |
| Example MCP JSON | [docs/mcp.example.json](docs/mcp.example.json) |
| Brand assets | [docs/assets/](docs/assets/) |
| Coolify | [coolify.io](https://coolify.io) |
| MCP specification | [modelcontextprotocol.io](https://modelcontextprotocol.io) |
| Issues & feature requests | [GitHub Issues](https://github.com/clezcoding/awesome-coolify/issues) |
| Contributing | [CONTRIBUTING.md](CONTRIBUTING.md) |
| License | [MIT](LICENSE) |
