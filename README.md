<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/clezcoding/awesome-coolify@main/docs/assets/hero-banner.png" alt="awesome-coolify-mcp — a friendly mascot next to a glowing dashboard showing a server fleet, a terminal, a deploy arrow, and a safety shield" width="100%" />
</p>

<h1 align="center">awesome-coolify-mcp</h1>

<p align="center">
  <strong>Operate Coolify from your coding agent.</strong><br />
  Verify connectivity, discover infrastructure, create workloads, deploy, follow logs, diagnose incidents, and run gated emergency ops — across one or many self-hosted or Cloud instances —<br />
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
  <img src="https://img.shields.io/badge/Node.js-%3E%3D24-3c873a?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js >= 24" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Coolify%20API-4.1.x-6b16ed?style=flat-square" alt="Coolify API 4.1.x" />
  <img src="https://img.shields.io/badge/MCP-18%20tools-181818?style=flat-square" alt="18 tools" />
  <a href="https://github.com/clezcoding/awesome-coolify/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/clezcoding/awesome-coolify/ci.yml?branch=main&style=flat-square&label=CI&color=6b16ed" alt="CI status" /></a>
  <a href="https://github.com/clezcoding/awesome-coolify/releases/latest"><img src="https://img.shields.io/github/v/release/clezcoding/awesome-coolify?style=flat-square&color=6b16ed" alt="Latest GitHub release" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-fcd34d?style=flat-square" alt="MIT License" /></a>
</p>

<p align="center">
  <a href="#-overview">Overview</a> ·
  <a href="#-why-awesome-coolify-mcp">Why</a> ·
  <a href="#-features">Features</a> ·
  <a href="#-how-it-works">Architecture</a> ·
  <a href="#-quick-start">Quick start</a> ·
  <a href="#-install">Install</a> ·
  <a href="#%EF%B8%8F-coolify-cloud">Cloud</a> ·
  <a href="#-tools-reference">Tools</a> ·
  <a href="#-mcp-prompts">Prompts</a> ·
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
- [Coolify Cloud](#%EF%B8%8F-coolify-cloud)
- [Supported clients](#-supported-clients)
- [Environment variables](#-environment-variables)
- [MCP Prompts](#-mcp-prompts)
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

**awesome-coolify-mcp** **1.1.0** replaces that patchwork with a single, community-maintained MCP server that speaks Coolify's REST API **4.1.x** through a clean, **action-based** tool surface. Source, docs, and npm distribution live in one public repo — [`clezcoding/awesome-coolify`](https://github.com/clezcoding/awesome-coolify) — while the installable package stays **`awesome-coolify-mcp`**. Instead of memorizing dozens of near-identical tool names, your agent calls one of **18 tools** with an `action` field:

```js
application({ action: "deploy", uuid: "<app-uuid>", wait: false })
deployment({ action: "watch", deployment_uuid: "<deployment_uuid>", timeout: 300 })
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
| Dozens of granular, single-purpose tools per resource | **18 tools** with consistent `action` discriminators |
| Ad-hoc error strings that agents have to guess at | Structured codes (`COOLIFY_401`, `COOLIFY_404`, …) + machine-readable recovery hints |
| Secrets can leak straight into agent context | Default secret masking + confirmation gates on destructive actions |
| Read a wall of raw JSON to find what changed | Bounded, paginated projections tuned for LLM context windows |

Today, the shipped surface covers day-2 operations and infrastructure creation: verify connectivity, discover fleets, deploy and watch builds, inspect bounded logs, diagnose incidents, run gated emergency ops, and manage applications, services, databases, SSH keys, servers, projects, environments, backups, and environment variables.

---

## ✨ Features

<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/clezcoding/awesome-coolify@main/docs/assets/features.png" alt="Feature highlights: action-based tools, safety gates, diagnose, deploy and logs" width="100%" />
</p>

- **18 action-based tools** — call `application({ action: "deploy", uuid })` instead of hunting through dozens of granular tool names. The registered surface is `system`, `meta`, `resource`, `diagnose`, `application`, `emergency`, `deployment`, `service`, `database`, `private_key`, `instance`, `manifest`, `server`, `project`, `environment`, `docs`, `recipe`, and `setup`.
- **Multi-instance registry & routing** — register every Coolify instance you own in `~/.coolify-mcp/instances.json` via the `instance` tool; per-call credential resolution with no cross-instance leakage.
- **Coolify Cloud aware** — `instance({ action: "cloud-info" })` for local discovery, team-scoped tokens, and structured cloud error codes (`COOLIFY_CLOUD_FORBIDDEN`, `COOLIFY_CLOUD_UNSUPPORTED`).
- **Local manifest cache** — `.coolify/manifest.json` sync via `manifest({ action: "sync" })`, best-effort auto-hooks on app/service/DB mutations, and `_meta.manifestWarning` when the cache is stale.
- **Server branding** — MCP list icon via `serverInfo.icons` (embedded data URI + jsDelivr CDN entries from `docs/assets/`).
- **Ops workflows that mirror real incidents** — a single `system.infrastructure_overview` call for the big picture, fuzzy `resource.find` when you only remember a name or domain, `diagnose.app` / `diagnose.server` for a specific suspect, and `diagnose.scan` when you just know *something* is wrong fleet-wide.
- **Deploy lifecycle agents can drive** — start/stop/restart, force rebuild, `deployment.watch` with bounded backoff, `deployment.logs` for builds, bounded `application.logs`, and runtime follow with idle/overall timeouts.
- **Full workload CRUD** — create, inspect, update, delete, and operate applications, services, and databases; discover live one-click IDs with `service.list-types`.
- **Recipes and guided setup** — create git apps, app-plus-database stacks, and one-click services; run `setup.preflight`, `setup.wire`, or `setup.resume`; install four matching IDE workflow skills.
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
awesome-coolify-mcp  (18 tools + action discriminator)
        │  optional ~/.coolify-mcp/instances.json resolution
        │  HTTPS + Bearer token
        ▼
Coolify REST API 4.1.x  (servers · projects · applications · services · databases)
```

The server itself is intentionally boring: it holds no long-lived state and never touches your IDE's config files. Your **MCP host** (Cursor, Claude, VS Code, …) injects `COOLIFY_URL` and `COOLIFY_TOKEN` through its MCP config's `env` block — or you register named instances in `~/.coolify-mcp/instances.json` via the `instance` tool. The process reads credentials from its environment (or the registry) and forwards authenticated requests to your Coolify instance over HTTPS.

---

## 🚀 Quick start

**Prerequisites**

- Node.js **24+** (Active LTS; CI uses Node 24)
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

> [!NOTE]
> **Multi-instance users:** register each Coolify instance first with `instance({ action: "add", name, url, token })`, then call `system({ action: "verify" })`. Single-instance setups can skip the registry and use `COOLIFY_URL` / `COOLIFY_TOKEN` in MCP env.

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

> [!TIP]
> Using [Coolify Cloud](https://app.coolify.io)? Generate a **team-scoped** token and follow the registry setup in [docs/en/cloud.md](docs/en/cloud.md).

### IDE skills (Cursor, Claude Code, Codex)

Install Coolify workflow skills for Cursor, Claude Code, and Codex:

```bash
npx skills add clezcoding/awesome-coolify -a cursor -a claude-code -a codex
```

After MCP install, run `setup({ action: "preflight" })` or see the **[Setup guide](docs/en/setup.md)** for gh preflight, project linkage, and greenfield provisioning.

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
> Claude Desktop currently uses manual JSON or configurator output.

---

## 🔐 Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `COOLIFY_URL` | yes* | — | Coolify base URL, no trailing slash — e.g. `https://coolify.example.com` |
| `COOLIFY_TOKEN` | yes* | — | Bearer API token, scoped to your team |
| `COOLIFY_VERIFY_SSL` | no | `true` | Set to `false` only for self-signed certs on local/dev instances |
| `COOLIFY_MCP_LOG` | no | `info` | Log verbosity: `debug` · `info` · `error` |

Credentials are read from the process environment (your IDE's MCP `env` block) or an optional local `.env` file when running the CLI directly. They are **never** echoed back inside tool responses.

> [!NOTE]
> With the multi-instance registry (`~/.coolify-mcp/instances.json`), `COOLIFY_URL` and `COOLIFY_TOKEN` become optional — the `instance` tool resolves credentials per call. Env vars remain the simplest path for single-instance setups.

---

## ☁️ Coolify Cloud

**awesome-coolify-mcp** works with [Coolify Cloud](https://app.coolify.io) using the same **18 tools** — team-scoped tokens, structured cloud error codes (`COOLIFY_CLOUD_FORBIDDEN`, `COOLIFY_CLOUD_UNSUPPORTED`), and local `instance` action `cloud-info` for discovery.

Run `instance({ action: "cloud-info" })` before your first Cloud session — it returns `isCloud`, resolved `url`, credential `source` (`registry` | `env` | `infer`), `knownLimits`, and a docs link. **No live API call.**

Full setup, smoke test, and known limits → **[docs/en/cloud.md](docs/en/cloud.md)**

---

## 💬 MCP Prompts

Four parameterized workflow prompts return numbered step guidance (English bodies) that orchestrate existing tools. All arguments are optional — open any prompt without prefill.

| Prompt | Args (all optional) | Purpose |
|--------|---------------------|---------|
| `deploy` | `instance?`, `uuid?`, `force?` | Deploy an application and monitor until terminal status |
| `diagnose` | `instance?`, `uuid?` | Investigate app, server, or fleet-wide issues |
| `new-project` | `instance?`, `name?`, `server_uuid?` | Create project, environment, and optional server linkage |
| `incident` | `instance?`, `uuid?`, `project_uuid?` | Triage with diagnose, logs, restart, or emergency redeploy |

Prompt handlers never read `.coolify/manifest.json` from disk — they steer the agent to resolve UUIDs from manifest or ask the user.

---

## 🧰 Tools reference

Every domain is exposed as **one MCP tool** with an `action` discriminator, so your agent's tool list stays short while the capability surface stays wide.

```js
system({ action: "health" })
application({ action: "deploy", uuid: "<app-uuid>", wait: false })
deployment({ action: "watch", deployment_uuid: "<deployment_uuid>", timeout: 300 })
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
| `logs` | Resolve an application, return triage context, and optionally include bounded runtime or deployment logs |

### 🚀 `application` — app operations

| Action | Purpose |
|--------|---------|
| `get` | Detailed application configuration |
| `start` / `stop` / `restart` | Container lifecycle control |
| `deploy` | Trigger a deploy with optional `force` rebuild; use `wait: false` + `deployment.watch` (recommended) or legacy `wait: true` poll |
| `logs` | Bounded runtime logs, or bounded follow mode with idle and overall timeouts |
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
| `watch` | Poll until terminal with bounded timeout, backoff, and jitter |
| `cancel` | Cancel an in-flight deployment cleanly |
| `logs` | Bounded deployment build logs by deployment UUID, or newest deployment for an application |

### ⏱️ Watch — bounded deploy monitoring

After `application.deploy` with `wait: false`, call `deployment.watch` — do not loop `deployment.get` manually.

| Behavior | Detail |
|----------|--------|
| Default timeout | **300 seconds** |
| Poll interval | Starts at **3s**, caps at **30s** with equal-jitter backoff |
| Timeout recovery | Re-call `deployment.watch` with the same `deployment_uuid` (raise `timeout` for slow builds) |
| Failed / cancelled | Tool returns a clear error — **do not treat as success** |
| Legacy | `application.deploy wait:true` still works but is back-compat only; prefer watch |

```js
application({ action: "deploy", uuid: "<app-uuid>", wait: false })
deployment({ action: "watch", deployment_uuid: "<deployment_uuid>", timeout: 300 })
```

The shipped IDE skill packs use this same bounded watch flow and document timeout recovery.

### 🧩 `service` / `database` — sidecar lifecycle

| Tool | Actions |
|------|---------|
| `service` | `get`, `start`, `stop`, `restart`, `deploy`, `create` (one-click type XOR compose), `update`, `delete`, `delete_preview`, `envs:list`, `envs:get`, `envs:create`, `envs:update`, `envs:delete`, `envs:bulk-update` |
| `database` | `get`, `start`, `stop`, `restart`, `create` (8 engines), `update`, `delete`, `delete_preview`, `envs:list`, `envs:get`, `envs:create`, `envs:update`, `envs:delete`, `envs:bulk-update`, `backup:create`, `backup:list`, `backup:update`, `backup:delete`, `backup:now`, `backup:history` |

### 🍳 `recipe` — multi-resource orchestration

One MCP call to stand up common workload patterns — application + database wiring, git apps, or validated one-click services.

| Action | Purpose |
|--------|---------|
| `create-git-app` | Create a git-backed application with local `build_pack` detection (`Dockerfile` / `Dockerfile.*` glob) |
| `create-app-db` | Create a database + application and wire `DATABASE_URL` (or custom `env_key`) between them |
| `create-one-click` | Create a one-click service after validating `type` against the live service-templates catalog |

**Safety:** Recipe creates are intentional — **no confirm gate**. No dry-run / preview. Partial failure does **not** auto-rollback; created UUIDs are returned in `error.data`. Connection strings are masked unless `reveal: true`.

```js
recipe({ action: "create-git-app", server_uuid, git_repository, git_branch, repo_path: "/path/to/repo" })
recipe({ action: "create-app-db", server_uuid, app_name, db_name, db_engine: "postgresql" })
recipe({ action: "create-one-click", server_uuid, type: "gitea" })
```

Also use `service.list-types` to discover valid one-click type IDs before `create-one-click`.

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

### 🗂️ `instance` — multi-instance registry

Manage named Coolify instances in `~/.coolify-mcp/instances.json`. Per-call credential resolution — no cross-instance leakage.

| Action | Purpose |
|--------|---------|
| `list` | List registered instances (tokens masked) |
| `get` | Fetch one instance by name |
| `add` | Register a new instance (`name`, `url`, `token`, optional `type: "cloud"`) |
| `update` | Rotate URL or token for an existing instance |
| `delete` | Remove an instance — **requires `confirm: true`** |
| `set-default` | Set the default instance for ops without an explicit `instance` param |
| `import-env` | Opt-in: copy `COOLIFY_URL` + `COOLIFY_TOKEN` from process env into the registry |
| `cloud-info` | Local Cloud discovery — `isCloud`, `url`, `source`, `knownLimits`, docs link (no API call) |

```js
instance({ action: "add", name: "prod", url: "https://coolify.example.com", token: "<token>" })
instance({ action: "list" })
instance({ action: "cloud-info" })
```

### 📜 `manifest` — local cache

Read/write/sync `.coolify/manifest.json` — a workspace cache, **not** source of truth. Remote wins on UUID conflict.

| Action | Purpose |
|--------|---------|
| `get` | Read the local manifest file |
| `upsert` | Merge projects/servers/resources into the cache |
| `set` | Replace a manifest section |
| `remove` | Remove a cached resource entry |
| `clear` | Wipe the manifest — **requires `confirm: true`** |
| `sync` | Reconcile cache against live Coolify API (optional `dry_run`, `prune` with `confirm`) |
| `diff` | Non-destructive diff report — always safe to run |

```js
manifest({ action: "sync", dry_run: true })
manifest({ action: "diff" })
```

> [!NOTE]
> Best-effort auto-hooks update the manifest after app/service/DB mutations. Stale UUID 404s elsewhere surface `_meta.manifestWarning` — run `manifest({ action: "sync" })` to reconcile.

### 🧭 `setup` — guided project wiring

| Action | Purpose |
|--------|---------|
| `preflight` | Check GitHub CLI and workspace prerequisites without changing the project |
| `wire` | Link an existing workload or provision a greenfield project, with optional domains, env sync, recipe, manifest, and deploy watch steps |
| `resume` | Continue a paused setup after authentication or another recoverable prerequisite |

`wire` never auto-pushes. The setup flow pauses cleanly when `gh` authentication is missing and resumes from completed steps.

### 🎨 Branding (`serverInfo.icons`)

The MCP server advertises icons in `initialize` via an embedded PNG data URI (primary) and jsDelivr CDN URLs for `mcp-icon-192.png` and `favicon-32.png`. Cursor may still show a letter fallback — see [maintainer verify record](docs/assets/cursor-icon-verify.md). Not a Coolify API call.

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

> [!WARNING]
> Registry files (`~/.coolify-mcp/instances.json`) are written with `0o700` directory and `0o600` file permissions. Tokens are never echoed in tool output unless you explicitly pass `reveal: true`.

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
| `COOLIFY_CLOUD_FORBIDDEN` | Cloud token or team permission issue (HTTP 403) |
| `COOLIFY_CLOUD_UNSUPPORTED` | Endpoint not available on Coolify Cloud (HTTP 404) |

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
application({ action: "deploy", uuid: "<uuid>", wait: false })
deployment({ action: "watch", deployment_uuid: "<deployment_uuid>", timeout: 300 })
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

**"Multi-instance: list registered instances and verify each."**

```js
instance({ action: "list" })
system({ action: "verify" })
```

---

## ✅ Status today

Package **1.1.0** ships **18 tools** and four MCP prompts for Coolify API **4.1.x**:

| Capability | Status |
|------------|--------|
| Verify connectivity + infrastructure overview | ✅ Shipped |
| Discovery: `resource.list` / `resource.find` | ✅ Shipped |
| Diagnose: app, server, fleet-wide scan + follow-up hints | ✅ Shipped |
| Deploy lifecycle: start/stop/restart, deploy with wait-mode + force rebuild | ✅ Shipped |
| Deployment tracking: list / get / cancel | ✅ Shipped |
| Deployment watch and bounded build logs | ✅ Shipped |
| Application runtime logs, bounded follow, and `diagnose.logs` | ✅ Shipped |
| Application, service, and database CRUD | ✅ Shipped |
| Dynamic one-click type discovery and recipes | ✅ Shipped |
| Setup wizard and four IDE workflow skills | ✅ Shipped |
| Emergency ops: stop-all, project redeploy/restart, behind confirm gate | ✅ Shipped |
| SSH key CRUD (`private_key`) with PEM masking | ✅ Shipped |
| Server CRUD + validation (`server`) | ✅ Shipped |
| Project & environment CRUD (`project`, `environment`) | ✅ Shipped |
| Secret masking with explicit `reveal` opt-in | ✅ Shipped |
| Structured errors, recovery hints, automatic retries | ✅ Shipped |
| npm distribution + install configurator for 15+ clients | ✅ Shipped |
| Multi-instance registry (`instance`, `instances.json`) | ✅ Shipped |
| Coolify Cloud path (`cloud-info`, team-scoped tokens) | ✅ Shipped |
| Local manifest sync (`.coolify/manifest.json`, auto-hooks) | ✅ Shipped |
| Live UAT harness (`npm run uat:live`) | ✅ Shipped |
| Capability discovery via `system.version` | ✅ Shipped |
| Deployment build logs via `deployment.logs` | ✅ Shipped |

> **Capability discovery & build logs:** `system({ action: "version" })` returns `coolifyVersion` (replacing the legacy `version` field), `mcpVersion`, and a `capabilities` map of Coolify 4.1.2 feature flags. For **app triage + bounded runtime tail** in one call, use `diagnose({ action: "logs", mode: "full", uuid: "..." })` — check `capabilities.diagnose_logs`. For deployment **build** logs, prefer `deployment({ action: "logs", deployment_uuid: "..." })` (or `application_uuid` to resolve the newest deployment). The `application.logs` path with `deployment_uuid` still works for back-compat. For **runtime** log follow, use `application({ action: "logs", uuid: "...", follow: true })` — bounded MCP polling until idle or timeout; check `capabilities.application_logs_follow` via `system.version`.

> [!WARNING]
> Coolify 4.1.x does not expose stable service or database log endpoints. This server therefore does not claim or register service/database log actions. Use application runtime logs and deployment build logs until compatible upstream APIs are available.

---

## 🔮 Coming soon

Future work stays bounded by verifiable upstream and repository constraints:

- Add service/database logs when compatible Coolify APIs are stable and available.
- Close tracked REST mappings in [`docs/COVERAGE.md`](docs/COVERAGE.md) where they add useful agent workflows.
- Revisit cross-instance fan-out only with explicit rate-limit and credential-isolation guarantees.

No release date or compatibility promise is attached to these boundaries. Use [GitHub Issues](https://github.com/clezcoding/awesome-coolify/issues) for concrete requests.

---

## 🛠️ Local development

```bash
git clone https://github.com/clezcoding/awesome-coolify.git
cd awesome-coolify
pnpm install
pnpm run build    # tsup → dist/
pnpm test         # vitest
pnpm run dev      # watch mode
```

Logs go to **stderr** only — stdout is reserved exclusively for the MCP protocol.

The maintainer publish flow (`build` → `pack --dry-run` → `publish`) is documented in [CONTRIBUTING.md](CONTRIBUTING.md).

> [!NOTE]
> Maintainers can run live UAT against a real Coolify instance with `npm run uat:live`. See [CONTRIBUTING.md — Live UAT Harness](CONTRIBUTING.md#live-uat-harness) for prerequisites and report output — do not duplicate the runbook here.

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
| Changelog | [CHANGELOG.md](CHANGELOG.md) |
| Security policy | [SECURITY.md](SECURITY.md) |
| License | [MIT](LICENSE) |
