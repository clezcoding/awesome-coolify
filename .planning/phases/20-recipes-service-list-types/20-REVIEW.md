---
phase: 20-recipes-service-list-types
reviewed: 2026-07-24T06:29:00Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - src/mcp/tools/recipe.ts
  - src/mcp/tools/recipe.test.ts
  - src/utils/service-templates.ts
  - src/utils/service-templates.test.ts
  - src/mcp/tools/service.ts
  - src/mcp/tools/service.test.ts
  - src/mcp/server.ts
  - src/mcp/server.test.ts
  - src/utils/errors.ts
  - README.md
findings:
  critical: 0
  warning: 6
  info: 3
  total: 9
status: issues_found
---

# Phase 20: Code Review Report

**Reviewed:** 2026-07-24T06:29:00Z  
**Depth:** standard  
**Files Reviewed:** 10  
**Status:** issues_found

## Summary

Phase 20 liefert `service.list-types`, `fetchServiceTemplates`, das `recipe`-Tool (create-git-app, create-app-db, create-one-click) und Server-Registrierung. Architektur folgt bestehenden MCP-Mustern; Tests decken Happy Paths und zentrale Fehlerfälle ab.

Adversarial Review fand **keine Critical/Blocker**, aber mehrere **korrektheits- und Konsistenzprobleme**: fehlerhafte One-Click-Typ-Validierung über Prototype-Chain, irreführende `deploy`-Statuswerte, fehlende Pfad-Allowlist bei `repo_path`, und Schema/Handler-Drift bei `list-types`. Advisory — nicht merge-blockierend.

## Warnings

### WR-01: One-Click-Typ-Validierung nutzt `in` statt Own-Property-Check

**File:** `src/mcp/tools/recipe.ts:682`  
**Issue:** `parsed.type in templates` matcht auch geerbte `Object.prototype`-Keys (`toString`, `constructor`, …). Typen wie `"toString"` passieren die Validierung und landen in `createService` — statt `COOLIFY_VALIDATION_ERROR` kommt ein kryptischer API-Fehler.  
**Fix:**
```typescript
if (!Object.hasOwn(templates, parsed.type)) {
  throw new CoolifyApiError({ /* ... */ });
}
```

### WR-02: `deploy.status` immer `'queued'` trotz `instant_deploy: false`

**File:** `src/mcp/tools/recipe.ts:362,667,731`  
**Issue:** Bei `instant_deploy: false` werden Lifecycle-Trigger übersprungen (D-16), Response meldet aber weiterhin `deploy: { status: 'queued' }`. Widerspricht `service.create`, das `'not_triggered'` zurückgibt. Agenten können Deploy fälschlich als eingereiht interpretieren.  
**Fix:**
```typescript
deploy: {
  status: parsed.instant_deploy === false ? 'not_triggered' as const : 'queued' as const,
},
```
Analog bei fehlgeschlagenem `triggerDeploy` (soft-ignore): `'failed_to_queue'` wie in `service.create`.

### WR-03: `environment_name` überschreibt `environment_uuid` still

**File:** `src/mcp/tools/recipe.ts:305-312,530-537,698-705`  
**Issue:** Wenn beide gesetzt und widersprüchlich, gewinnt `environment_name` via Lookup — `environment_uuid` wird ignoriert ohne Warnung.  
**Fix:** Bei beiden gesetzt entweder UUID direkt nutzen oder Validierungsfehler werfen:
```typescript
if (parsed.environment_uuid && parsed.environment_name) {
  ctx.addIssue({
    code: 'custom',
    message: 'Pass either environment_uuid or environment_name, not both',
    params: { code: 'COOLIFY_VALIDATION_ERROR' },
  });
}
```

### WR-04: `constructFallbackUrl` fällt auf `localhost` zurück

**File:** `src/mcp/tools/recipe.ts:460-462`  
**Issue:** Fehlen `internal_hostname`/`hostname`/`host`, wird `localhost` in die Connection-String-URL geschrieben und per `bulkUpdateEnvs` an die App gebunden — in Docker/Coolify-Netzwerk typischerweise unbrauchbar, ohne expliziten Fehler.  
**Fix:** Host-Pflicht prüfen; bei fehlendem Host `COOLIFY_RECIPE_PARTIAL_FAILURE` oder Validierungsfehler statt Fallback-URL.

### WR-05: `repo_path` ohne CWD-Allowlist (im Gegensatz zu `compose_file`)

**File:** `src/mcp/tools/recipe.ts:274-294`  
**Issue:** `detectBuildPack` nutzt `statSync`/`readdirSync` auf beliebigen Pfaden. `service.ts` schützt `compose_file` mit `realpathSync(process.cwd())`-Allowlist — `repo_path` nicht. Ermöglicht Pfad-Sondierung außerhalb des Workspace.  
**Fix:** Gleiche Allowlist-Logik wie `readBoundedComposeFile` in `service.ts:829-871` vor FS-Zugriff anwenden.

### WR-06: `service.list-types` akzeptiert ungenutzte Read-Parameter

**File:** `src/mcp/tools/service.ts:352,1668-1677`  
**Issue:** Schema erlaubt `projection`, `include_full`, `page`, `per_page`, `reveal` für `list-types`; Handler nutzt nur `format`/`max_chars`. Agenten können Parameter setzen, die still ignoriert werden.  
**Fix:** Entweder Parameter aus `list-types`-Allowed-Fields entfernen oder im Handler ablehnen/warnen.

## Info

### IN-01: Toter Code `name: parsed.app_name` in create-git-app

**File:** `src/mcp/tools/recipe.ts:335`  
**Issue:** `app_name` ist für `create-git-app` nicht in `actionAllowedFields` — Feld ist immer `undefined`, `name` wird nie gesetzt.  
**Fix:** Zeile entfernen oder `app_name` in Allowed/Required-Fields aufnehmen, falls benannt gewünscht.

### IN-02: `recipeActionsCatalog` listet `instant_deploy` für create-git-app nicht

**File:** `src/mcp/tools/recipe.ts:47`  
**Issue:** Catalog nennt `instant_deploy?` nur bei create-one-click; Schema und Handler unterstützen es für create-git-app (D-16). Inkonsistent zu `20-PATTERNS.md`.  
**Fix:** Catalog-String anpassen: `create-git-app(..., instant_deploy?)`.

### IN-03: README-Beispiele ohne Pflichtfelder project/environment

**File:** `README.md:412-414`, `README.de.md:412-414`  
**Issue:** create-git-app/create-one-click-Beispiele zeigen weder `project_uuid`/`project_name` noch `environment_uuid`/`environment_name` — beides schema-pflichtig.  
**Fix:** Beispiele um project/environment ergänzen.

---

_Reviewed: 2026-07-24T06:29:00Z_  
_Reviewer: Claude (gsd-code-reviewer)_  
_Depth: standard_
