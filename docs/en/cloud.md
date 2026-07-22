# Coolify Cloud

Use **awesome-coolify-mcp** with [Coolify Cloud](https://app.coolify.io) — the same 14 domain tools and 55 actions as self-hosted, with team-scoped tokens and structured cloud error codes.

> **Branding:** The MCP server list icon is served from jsDelivr — see [`docs/assets/mcp-icon-192.png`](../assets/mcp-icon-192.png) and [`docs/assets/README.md`](../assets/README.md).

Back to the main install walkthrough: [README — Install](../../README.md#-install).

---

## Overview

Coolify Cloud (`https://app.coolify.io`) is Coolify's hosted SaaS. This MCP server treats Cloud instances the same as self-hosted for day-2 operations (deploy, logs, diagnose, resource CRUD, etc.), but some infrastructure endpoints differ or are unavailable on Cloud.

Use `instance` action **`cloud-info`** for local/static discovery — it reports `isCloud`, resolved URL, credential source, setup hints, known limits, and a docs link. **It does not call the Coolify API.**

```js
instance({ action: "cloud-info" })
```

---

## Setup

Generate a **team-scoped** API token in [app.coolify.io](https://app.coolify.io) under **Keys & Tokens**. Never commit real tokens — use placeholders or environment variables.

### Path 1 — `instance.add` (registry)

Register Cloud in `~/.coolify-mcp/instances.json`:

```js
instance({
  action: "add",
  name: "cloud",
  url: "https://app.coolify.io",
  token: "<team-scoped-token>",
  type: "cloud",
})
```

### Path 2 — `import-env` (process environment)

Set env vars in your MCP client config (see [README — Install](../../README.md#-install)), then import:

```json
{
  "COOLIFY_URL": "https://app.coolify.io",
  "COOLIFY_TOKEN": "<team-scoped-token>"
}
```

```js
instance({ action: "import-env" })
```

`import-env` copies `COOLIFY_URL` + `COOLIFY_TOKEN` from the process environment into the local registry — opt-in only.

### Optional — token sanity check (curl)

Verify the token before wiring MCP:

```bash
curl -H "Authorization: Bearer $COOLIFY_TOKEN" \
  https://app.coolify.io/api/v1/version
```

Expect a JSON version payload on success; `401` means regenerate the token.

---

## Smoke test

After connect, run this agent-first path to confirm Cloud works:

1. **Discovery (local, no API call):**

   ```js
   instance({ action: "cloud-info" })
   ```

   Expect `isCloud: true`, `url: "https://app.coolify.io"`, and `source` of `registry`, `env`, or `infer`.

2. **Connectivity:**

   ```js
   system({ action: "health" })
   meta({ action: "version" })
   ```

3. **Light resource read** (pick one known UUID from your Cloud dashboard):

   ```js
   resource({ action: "list", per_page: 5 })
   // or
   application({ action: "get", uuid: "<app-uuid>" })
   ```

---

## Known limits

| Limit | Detail |
|-------|--------|
| Server CRUD via API | Cloud does **not** support server create, validate, or delete through the REST API — use the Cloud dashboard for server management. |
| Self-hosted-only endpoints | Some endpoints available on self-hosted return **404** on Cloud → structured code `COOLIFY_CLOUD_UNSUPPORTED`. |
| Team-scoped tokens | Tokens are scoped to a team — verify the token's team owns the target resource. |
| Same tool surface | All 14 MCP domain tools remain available; failures surface as structured errors, not silent stubs. |

`cloud-info` `knownLimits` mirrors this list locally — no live capability probe.

---

## Error codes

Cloud-specific structured codes apply when the instance hostname is `*.coolify.io` (or registry `type: cloud`):

### `COOLIFY_CLOUD_FORBIDDEN` (HTTP 403)

Token or team permission issue on Cloud.

**Recovery hints:**

- Regenerate the team-scoped token in app.coolify.io under Keys & Tokens and ensure it has the required abilities.
- Cloud tokens are team-scoped — verify the token belongs to the team that owns the target resource.

### `COOLIFY_CLOUD_UNSUPPORTED` (HTTP 404)

Endpoint not available on Coolify Cloud.

**Recovery hints:**

- Endpoint not supported or not available on Coolify Cloud — use the self-hosted alternative or the Cloud dashboard.
- See this doc for known Cloud-unsupported endpoints.

Generic codes (`COOLIFY_401`, `COOLIFY_404`, etc.) still apply as fallbacks on non-cloud hostnames.

---

## Links

- [README — Install](../../README.md#-install)
- [German parity — docs/de/cloud.md](../de/cloud.md)
- [MCP branding assets](../assets/README.md)
