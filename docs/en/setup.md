# Setup Guide

Use the MCP **`setup` tool** to onboard a workspace — GitHub preflight, Coolify linkage, and optional greenfield provisioning. This is **not** a CLI wizard; agents call `setup({ action: ... })` via the MCP server.

Install IDE workflow skills first (optional but recommended):

```bash
npx skills add clezcoding/awesome-coolify -a cursor -a claude-code -a codex
```

See also: [Install configurator](../install.html#skills) · [README — Install](../../README.md#-install)

---

## Overview

The `setup` tool orchestrates:

- **GitHub CLI preflight** — detect missing or unauthenticated `gh`
- **Wire** — greenfield (create + recipe) or link-existing (manifest only)
- **Resume** — stateless re-entry after human `gh auth login`

Primary catalog (`setupActionsCatalog`):

```text
Actions: preflight() · wire(mode, ...) · resume(mode?, ...)
```

---

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| `COOLIFY_URL` + `COOLIFY_TOKEN` | MCP server env — see [Install](../../README.md#-install) |
| GitHub CLI (`gh`) | Required for greenfield repo create; optional for link-existing |
| Local git repo | Greenfield expects a workspace with git init |

> **Install the MCP server first** — skills require MCP + Coolify credentials before workflows run. Use [install.html](../install.html) or a one-click deeplink.

---

## Modes

| Mode | Use when |
|------|----------|
| `greenfield` | New Coolify project/environment + recipe (`create-git-app`, `create-app-db`, `create-one-click`) |
| `link-existing` | Attach workspace to existing Coolify project/server/application UUIDs |

---

## Setup steps

<!-- Render with .setup-steps when wrapped in HTML shell -->

<ol class="setup-steps">
  <li class="setup-step--active"><strong>1. Preflight</strong> — <code>setup({ action: "preflight" })</code></li>
  <li><strong>2. Wire</strong> — <code>setup({ action: "wire", mode: "greenfield" | "link-existing", ... })</code></li>
  <li><strong>3. GitHub repo</strong> (greenfield) — create via gh; manual push unless <code>push: true</code></li>
  <li><strong>4. Linkage</strong> — project / environment / server UUIDs</li>
  <li><strong>5. Recipe</strong> (greenfield) — provision application from recipe</li>
  <li><strong>6. Manifest</strong> — write <code>.coolify/manifest.json</code></li>
  <li><strong>7. Domains</strong> (optional) — when <code>include_domains: true</code></li>
  <li><strong>8. Env sync</strong> (optional) — when <code>set_env: true</code></li>
  <li><strong>9. Deploy + watch</strong> (optional) — when <code>deploy_and_watch: true</code></li>
</ol>

### Example — preflight

```js
setup({ action: "preflight" })
```

### Example — greenfield wire

```js
setup({
  action: "wire",
  mode: "greenfield",
  server_uuid: "<server-uuid>",
  project_name: "my-project",
  initial_environment: "production",
  recipe_type: "create-git-app",
  git_repository: "https://github.com/org/repo",
  git_branch: "main",
})
```

### Example — link-existing

```js
setup({
  action: "wire",
  mode: "link-existing",
  project_uuid: "<project-uuid>",
  environment_uuid: "<environment-uuid>",
  server_uuid: "<server-uuid>",
  application_uuid: "<application-uuid>",
})
```

---

## Soft-pause (`COOLIFY_SETUP_PAUSED`)

When GitHub CLI is missing or unauthenticated, the tool returns **`COOLIFY_SETUP_PAUSED`** immediately — no polling inside the tool.

<!-- .notice--pause when rendered in HTML shell -->

**Human action required:**

1. Install gh: [cli.github.com](https://cli.github.com/) (or `brew install gh`)
2. Run `gh auth login` (or set `GH_TOKEN` / `GITHUB_TOKEN` for headless)
3. Re-call with the same wire params:

```js
setup({ action: "resume", mode: "greenfield", server_uuid: "<uuid>", recipe_type: "create-git-app" })
```

---

## Optional flags (off by default)

<!-- .notice--warning when rendered in HTML shell -->

Pass explicitly only when needed:

| Flag | Default | Effect |
|------|---------|--------|
| `include_domains` | `false` | Attach domains after wire (greenfield, or link-existing with `application_uuid`) |
| `set_env` | `false` | Sync environment variables after wire (greenfield, or link-existing with `application_uuid`). When `true`, pass **exactly one** of `env_file` (local path to a `.env` file) or `env_content` (inline `.env` text) — no workspace auto-detect. Application resources only (not one-click services). |
| `deploy_and_watch` | `false` | Deploy + bounded `deployment.watch` (timeout 300; greenfield, or link-existing with `application_uuid`) |
| `push` | `false` | Greenfield only — pass `push: true` to run `gh repo create --push` |

When `deploy_and_watch: true`:

```js
deployment({ action: "watch", deployment_uuid: "<uuid>", timeout: 300 })
```

On **`COOLIFY_WATCH_TIMEOUT`**, re-call watch with the same `deployment_uuid`.

### `set_env` — environment sync

When `set_env: true`, provide **exactly one** env source (XOR):

| Param | Type | Notes |
|-------|------|-------|
| `env_file` | string | Local filesystem path to a `.env` file |
| `env_content` | string | Inline `.env` file content (e.g. `FOO=bar\nBAZ=qux`) |

There is **no** auto-detect of a workspace `.env` — you must pass `env_file` or `env_content` explicitly.

Works on **greenfield** (after recipe creates an application) and **link-existing** (requires `application_uuid`). Does **not** apply to one-click service resources.

Apply runs with **`confirm` implicit** (opt-in via `set_env: true`) and default **`conflict_policy: abort`**. On remote/local value conflicts, setup stops and surfaces the conflict payload — retry with an explicit policy via `application({ action: "envs:sync", ... })` if the human chooses overwrite or keep-remote.

```js
setup({
  action: "wire",
  mode: "link-existing",
  project_uuid: "<project-uuid>",
  environment_uuid: "<environment-uuid>",
  server_uuid: "<server-uuid>",
  application_uuid: "<application-uuid>",
  set_env: true,
  env_content: "FOO=bar\nBAZ=qux",
})
```

---

## Related skills

| Skill | Purpose |
|-------|---------|
| `coolify-setup` | This guide — preflight, wire, resume |
| `coolify-deploy` | Deploy + `deployment.watch` monitoring |
| `coolify-diagnose` | App/server/scan diagnosis |
| `coolify-incident` | Incident triage + emergency confirm gates |

Install all:

```bash
npx skills add clezcoding/awesome-coolify -a cursor -a claude-code -a codex
```
