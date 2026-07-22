# Debug: project_name "default" mismatch (UAT gaps 19 & 20)

**Date:** 2026-07-16  
**Instance:** https://puzzlesstool.online (Coolify 4.1.2)  
**Test app:** `mcp-uat-nginx` (`jt4mw1b0ld3542i9w9nfmqkr`)  
**Real project:** `MCP UAT Test` (`h785essygwr360newm83inz6`, environment id `22`)

## Symptom

- `resource.list` / `application.get` return `project_name: "default"` for UAT apps
- `emergency.restart_project` / `emergency.redeploy_project` with `project_name: "default"` → `COOLIFY_404`
- Same emergency actions with `project_name: "MCP UAT Test"` → preview OK (`would_affect: 2`)

## Root cause

Coolify **4.1.x** omits nested `project` on `/resources` and `/applications/{uuid}` — apps only carry `environment_id`. Projection helpers read `raw.project.name` and fall back to the literal `"default"`. Emergency `resolveProjectUuid` queries `/projects` by name substring; no project matches `"default"`.

## Live API evidence

### GET /api/v1/resources (app slice)

```json
{
  "uuid": "jt4mw1b0ld3542i9w9nfmqkr",
  "name": "mcp-uat-nginx",
  "environment_id": 22
}
```

- No `project` key on any application resource
- No top-level `server` key (server nested under `destination.server`)

### GET /api/v1/applications/jt4mw1b0ld3542i9w9nfmqkr

Same shape: `environment_id: 22`, no `project`.

### GET /api/v1/projects/h785essygwr360newm83inz6

```json
{
  "uuid": "h785essygwr360newm83inz6",
  "name": "MCP UAT Test",
  "environments": [{ "id": 22, "name": "production" }]
}
```

### GET /api/v1/projects (filter name contains "default")

Empty — explains `COOLIFY_404`.

## Code path

| Layer | File | Behavior |
|-------|------|----------|
| Read projection | `src/utils/projections.ts` | `project_name: raw.project?.name ?? 'default'` in `projectResourceSummary`, `projectApplicationSummary`, `projectServiceSummary`, `projectDatabaseSummary` |
| resource.list | `src/mcp/tools/resource.ts` | Calls `projectResourceSummary` on `/resources` rows |
| application.get | `src/mcp/tools/application.ts` | Calls `projectApplicationSummary` on `/applications/{uuid}` |
| Emergency resolve | `src/mcp/tools/emergency.ts` | `resolveProjectUuid` → `fetchProjects` + name substring match |
| Emergency app match | `src/mcp/tools/emergency.ts` | `mapProjectApps` already handles 4.1.x via `environment_id` + `fetchProject` — **read path not aligned** |

## Asymmetry

`emergency.ts` documents and handles Coolify 4.1.x (`environment_id` when `project` nest missing). Read projections do not — they assume legacy nested `project.name`.

`projectAppDiagnose` uses `'N/A'` fallback (not `'default'`), still wrong for emergency chaining.

## Secondary note

`server_name` falls back to `'localhost'` via `raw.server?.name`. On live instance, real server is also `localhost` but via `destination.server.name` — coincidental match, same class of bug for non-localhost servers.

`project_uuid` in summaries is `''` when `project` nest missing.

## Fix direction (not implemented)

1. Build `environment_id → { project_uuid, project_name }` index from `/projects` + `/projects/{uuid}` (reuse emergency's `resolveProjectEnvironmentIds` pattern in reverse)
2. Enrich raw records before projection, or pass lookup into projection helpers
3. Replace misleading `'default'` fallback with resolved name or honest `'unknown'`/`'N/A'`
4. Populate `project_uuid` from environment mapping
5. Optionally resolve `server_name` from `destination.server.name` when `raw.server` absent
6. Add fixtures/tests mirroring Coolify 4.1.x payloads (no nested `project`)
7. Cache project/environment index for list performance

## UAT impact

| Test | Expected | Actual |
|------|----------|--------|
| 19 restart_project preview | Works with `project_name` from read tools | Fails with `"default"` from projections |
| 20 redeploy_project preview | Same | Same |

Emergency tool itself is correct when given real project name or `project_uuid`.

---

## Resolution

**Status:** resolved  
**Verified:** 2026-07-20  
**Originally marked resolved in STATE:** 2026-07-16 (07-04)  
**Verification:** projections + related suites green (bundled run: 192 tests)

### Fix confirmation

| Layer | Expected | Actual |
|-------|----------|--------|
| Projection lookup | `environment_id` → project name/uuid | ✓ `resolveProjectFields` + lookup map |
| Fallback | Honest `N/A`, not literal `default` | ✓ |
| Unit coverage | Coolify 4.1.x payload without nested `project` | ✓ projections.test.ts |

### Files changed (already shipped)

- `src/utils/projections.ts` — `resolveProjectFields`
- `src/utils/projections.test.ts` — env-id lookup + N/A fallback tests

**Root cause:** Coolify 4.1.x omits nested `project` on `/resources`; projections fell back to `"default"`, breaking emergency project resolve.

**Fix:** Build `environment_id → project` index; resolve before projection; fallback `N/A`.
