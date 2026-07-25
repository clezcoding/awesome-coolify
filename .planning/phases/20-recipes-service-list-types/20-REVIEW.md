---
phase: 20-recipes-service-list-types
reviewed: 2026-07-25T05:18:00Z
depth: standard
files_reviewed: 9
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
findings:
  critical: 1
  warning: 7
  info: 5
  total: 13
status: issues_found
---

# Phase 20: Code Review Report

**Reviewed:** 2026-07-25T05:18:00Z  
**Depth:** standard  
**Files Reviewed:** 9  
**Status:** issues_found

## Summary

Re-review nach Plan 20-04 (D-20 MANIFEST_HINT Gap Closure) plus Phase-20 Recipe/Service-Dateien aus den SUMMARYs.

**20-04 Gap Closure:** `appendManifestHint`, Zod-Pfad in `throwValidationError` (nur `create-git-app`), missing-`build_pack`-Throw und `rethrowGitAppApiErrorWithManifestHint` sind korrekt verdrahtet; create-one-click / create-app-db MANIFEST_HINT-Pfade unverändert; D-20-Test spiegelt create-one-click. Gap selbst ist inhaltlich geschlossen.

**Adversarial Find:** Ein **Critical** — `triggerDeploy` wird mit vertauschten Argumenten aufgerufen (`COOLIFY_VERIFY_SSL` landet in `force`). Dazu bleiben die sechs Warnings aus dem vorigen Review offen; neu: create-git-app Deploy-Hard-Fail ohne UUID in `error.data`.

## Critical Issues

### CR-01: `triggerDeploy` Argumentreihenfolge vertauscht (force vs verifySsl)

**File:** `src/mcp/tools/recipe.ts:379-384`, `src/mcp/tools/recipe.ts:677-682`  
**Issue:** Signatur ist `triggerDeploy(url, token, uuid, force = false, verifySsl = true)`. Recipe übergibt `env.COOLIFY_VERIFY_SSL` als 4. Argument → wird als `force` interpretiert. `application.ts` / `emergency.ts` rufen korrekt `false, env.COOLIFY_VERIFY_SSL` auf. Folgen: (1) Default `VERIFY_SSL=true` → jeder Recipe-Deploy läuft mit `force=true`; (2) `VERIFY_SSL=false` → `force=false`, aber `verifySsl` bleibt Default `true` — SSL-Verify lässt sich für Recipe-Deploys nicht abschalten. Tests zementieren den Bug (`recipe.test.ts:314-319` erwartet die falsche Call-Signatur).  
**Fix:**
```typescript
await triggerDeploy(
  env.COOLIFY_URL,
  env.COOLIFY_TOKEN,
  application_uuid, // bzw. appUuid
  false,
  env.COOLIFY_VERIFY_SSL,
);
```
Test-Assertion analog auf fünf Argumente umstellen (`false`, dann `VERIFY_SSL`). Beide Call-Sites in `handleCreateGitApp` und `handleCreateAppDb` fixen.

## Warnings

### WR-01: One-Click-Typ-Validierung nutzt `in` statt Own-Property-Check

**File:** `src/mcp/tools/recipe.ts:714`  
**Issue:** `parsed.type in templates` matcht geerbte `Object.prototype`-Keys (`toString`, `constructor`, …). Typen wie `"toString"` passieren die Validierung und landen in `createService`.  
**Fix:**
```typescript
if (!Object.hasOwn(templates, parsed.type)) {
  throw new CoolifyApiError({ /* unchanged envelope */ });
}
```

### WR-02: `deploy.status` immer `'queued'` trotz `instant_deploy: false`

**File:** `src/mcp/tools/recipe.ts:394`, `src/mcp/tools/recipe.ts:699`, `src/mcp/tools/recipe.ts:763`  
**Issue:** Bei `instant_deploy: false` werden Lifecycle-Trigger übersprungen (D-16), Response meldet trotzdem `deploy: { status: 'queued' }`. Widerspricht `service.create` (`'not_triggered'` / `'failed_to_queue'`).  
**Fix:**
```typescript
deploy: {
  status: parsed.instant_deploy === false ? 'not_triggered' as const : 'queued' as const,
},
```

### WR-03: `environment_name` überschreibt `environment_uuid` still

**File:** `src/mcp/tools/recipe.ts:328-336`, `src/mcp/tools/recipe.ts:562-570`, `src/mcp/tools/recipe.ts:730-738`  
**Issue:** Wenn beide gesetzt und widersprüchlich, gewinnt `environment_name` via Lookup — `environment_uuid` wird ohne Warnung ignoriert.  
**Fix:** Bei beiden gesetzt Validierungsfehler werfen (weder still überschreiben noch raten).

### WR-04: `constructFallbackUrl` fällt auf `localhost` zurück

**File:** `src/mcp/tools/recipe.ts:492-494`  
**Issue:** Fehlen Host-Felder, wird `localhost` in die Connection-String-URL geschrieben und per `bulkUpdateEnvs` gebunden — in Coolify-Netzwerken typisch unbrauchbar, ohne expliziten Fehler.  
**Fix:** Host-Pflicht prüfen; bei fehlendem Host `COOLIFY_RECIPE_PARTIAL_FAILURE` / Validierungsfehler statt Fallback-URL.

### WR-05: `repo_path` ohne CWD-Allowlist (im Gegensatz zu `compose_file`)

**File:** `src/mcp/tools/recipe.ts:297-317`  
**Issue:** `detectBuildPack` nutzt `statSync`/`readdirSync` auf beliebigen Pfaden. `service.ts` schützt `compose_file` mit `realpathSync(process.cwd())`-Allowlist — `repo_path` nicht. Ermöglicht Verzeichnis-Sondierung außerhalb des Workspace.  
**Fix:** Gleiche Allowlist-Logik wie `readBoundedComposeFile` in `service.ts` vor FS-Zugriff anwenden.

### WR-06: `service.list-types` akzeptiert ungenutzte Read-Parameter

**File:** `src/mcp/tools/service.ts:352`, `src/mcp/tools/service.ts:1668-1677`  
**Issue:** Schema erlaubt `projection`, `include_full`, `page`, `per_page`, `reveal` für `list-types`; Handler nutzt nur `format`/`max_chars`. Agenten setzen Parameter, die still ignoriert werden.  
**Fix:** Parameter aus `list-types`-Allowed-Fields entfernen oder im Handler ablehnen.

### WR-07: create-git-app `triggerDeploy`-Fehler nach erfolgreichem Create ohne UUID in Envelope

**File:** `src/mcp/tools/recipe.ts:377-387`  
**Issue:** Nach erfolgreichem `createPublicApplication` wirft ein fehlgeschlagenes `triggerDeploy` (via `rethrowGitAppApiErrorWithManifestHint`) einen Hard-Error ohne `application_uuid` in `error.data`. App existiert bereits; Agent verliert die UUID. create-app-db soft-ignoriert Deploy-Fehler (D-16); `service.create` liefert `failed_to_queue` inkl. UUID. 20-04 hat diesen Pfad mit MANIFEST_HINT umwickelt, die Recoverability-Lücke bleibt.  
**Fix:** Soft-ignore wie create-app-db **oder** `COOLIFY_RECIPE_PARTIAL_FAILURE` mit `data: { application_uuid }` und Recovery-Hints; Response-Status ggf. `'failed_to_queue'`.

## Info

### IN-01: Toter Code `name: parsed.app_name` in create-git-app

**File:** `src/mcp/tools/recipe.ts:358`  
**Issue:** `app_name` ist für `create-git-app` nicht in `actionAllowedFields` — Feld bleibt `undefined`.  
**Fix:** Zeile entfernen oder `app_name` in Allowed-Fields aufnehmen.

### IN-02: `recipeActionsCatalog` listet `instant_deploy` für create-git-app nicht

**File:** `src/mcp/tools/recipe.ts:63-64`  
**Issue:** Catalog nennt `instant_deploy?` nur bei create-one-click; Schema/Handler unterstützen es für create-git-app (D-16).  
**Fix:** Catalog: `create-git-app(..., instant_deploy?)`.

### IN-03: README-Beispiele ohne Pflichtfelder project/environment

**File:** `README.md:412-414`  
**Issue:** create-git-app / create-app-db / create-one-click-Beispiele zeigen weder `project_uuid`/`project_name` noch `environment_*` — beides schema-pflichtig.  
**Fix:** Beispiele um project/environment ergänzen.

### IN-04: Kein Regressionstest für API-CoolifyApiError + MANIFEST_HINT

**File:** `src/mcp/tools/recipe.test.ts:260-274`  
**Issue:** D-20-Test trifft nur den Zod/omit-`repo_path`-Pfad. `rethrowGitAppApiErrorWithManifestHint` (createPublicApplication / triggerDeploy) ist ungetestet — Plan erlaubte Zod-Probe, API-Pfad bleibt ungesichert.  
**Fix:** Zusätzliches `it`: `createPublicApplication` mock-reject mit `CoolifyApiError`, assert `recoveryHints` match `/instance|manifest/i`.

### IN-05: Instance-Version unvalidiert in CDN/GitHub-URL

**File:** `src/utils/service-templates.ts:33-47`  
**Issue:** `fetchVersion`-String wird nur mit optionalem `v`-Prefix versehen und in URL-Pfad interpoliert — keine Sanitize gegen `/`, `?`, `#`. Hosts sind hardcodiert (SSRF-Mitigation OK), Pfad kann bei bizarren Version-Strings abweichen.  
**Fix:** Version auf `^v?[\w.-]+$` whitelisten; sonst `v4.x`.

---

_Reviewed: 2026-07-25T05:18:00Z_  
_Reviewer: Claude (gsd-code-reviewer)_  
_Depth: standard_
