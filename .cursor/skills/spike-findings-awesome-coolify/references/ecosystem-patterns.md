# Ecosystem Patterns

## Requirements

- Action-based tool schema (not 60+ granular tools)
- Multi-instance context switching must fit MCP SDK patterns
- Structured error codes with recovery hints

## How to Build It

### Tool layout (~8 domain tools)

| Tool | Actions | Replaces |
|------|---------|----------|
| `application` | list, get, deploy, restart, logs, diagnose | 9+ granular lifecycle tools |
| `server` | list, get, validate, resources, domains, diagnose | 6+ granular tools |
| `deployment` | list, get, cancel, list_for_app | 4+ granular tools |
| `control` | start, stop, restart (resource + uuid) | 9 lifecycle tools (app/db/service) |
| `instance` | add, list, get, update, delete, set-default, verify | env-var single instance |
| `system` | health, version, infrastructure_overview, find_issues | meta/diagnostic tools |

### Patterns to adopt

**1. Unified `control` tool** — `control({ resource: 'application', action: 'restart', uuid })` replaces 9 start/stop/restart tools.

**2. Sensitive masking with `reveal` opt-in** — env vars as `***` by default; `reveal: true` for plaintext.

**3. `include_logs` / `include_full` opt-in** — default summary projections; opt-in for full payloads. Deployment logs inline string, cap with `max_chars`.

**4. Per-call `confirm: true`** — destructive ops require explicit confirm arg. No global env-var gate.

**5. Smart diagnostics** — `diagnose_app({ uuid?, name?, domain? })`, `diagnose_server({ uuid?, name?, ip? })`.

**6. HATEOAS `_actions` hints** — every response includes suggested next steps:

```ts
return {
  ...app,
  _actions: [
    { tool: 'application', args: { action: 'logs', uuid }, hint: 'View logs' },
    { tool: 'control', args: { resource: 'application', action: 'restart', uuid }, hint: 'Restart' },
  ],
};
```

**7. Batch ops with `Promise.allSettled`** — for `stop_all_apps`:

```ts
const results = await Promise.allSettled(apps.map(a => client(`/applications/${a.uuid}/stop`)));
return {
  summary: { total, succeeded, failed },
  succeeded: [...],
  failed: [...],
};
```

### v1 differentiation (gaps in existing servers)

| Capability | Existing servers | v1 plan |
|-----------|-----------------|---------|
| Multi-instance config file | ✗ (all use env vars) | ✓ `~/.coolify-mcp/instances.json` |
| Structured error codes | ✗ (free-text only) | ✓ 6 codes + hints |
| Wait-mode deploy polling | ✗ (fire-and-forget) | ✓ poll to terminal |
| No broken-endpoint tools | ✗ (user-coolify ships 3 broken) | ✓ document as limitations |
| zod discriminatedUnion | ✗ (flat params) | ✓ type-safe per-action params |
| npm package | Unknown | ✓ `npx coolify-mcp` |

## What to Avoid

**1. Granular 75-tool schema** (user-coolify) — ~43k tokens of schema alone. stumason achieved 85% reduction (43k → 6.6k) with 38 action-based tools.

**2. Shipping broken-endpoint tools** (user-coolify) — `execute_command`, `get_database_logs`, `get_service_logs` all return errors. Don't ship tools for endpoints not in OpenAPI.

**3. Env-var-only confirmation** (user-coolify) — `COOLIFY_REQUIRE_CONFIRM=true` is global toggle. Use per-call `confirm: true` instead.

**4. Flat param schema for action tools** (user-coolify-backup-mcp) — all 15+ params visible for every action. Use `discriminatedUnion` so each action exposes only relevant params.

**5. Free-text-only errors** (all three) — no structured `error: { code, message, hint }`. Agent must parse free-text to recover.

## Constraints

- stumason/coolify-mcp v2.0.0: 38 tools, 85% token reduction vs granular baseline
- user-coolify: 75 granular tools
- user-coolify-backup-mcp: ~42 action-based tools with flat params
- Scheduled task `run_once` composite: cron may fire more than once — make command idempotent; Coolify stores command in varchar(255) — keep ≤255 chars (v2 feature)
- `search_docs` tool: v2 feature, not v1 ops scope

## Origin

Synthesized from spikes: 003
Source files available in: sources/003-existing-coolify-mcp-patterns/
