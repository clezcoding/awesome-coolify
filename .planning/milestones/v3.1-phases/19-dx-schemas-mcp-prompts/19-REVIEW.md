---
phase: 19-dx-schemas-mcp-prompts
reviewed: 2026-07-24T02:10:00Z
depth: standard
files_reviewed: 21
files_reviewed_list:
  - src/mcp/tools/shared-read-params.ts
  - src/mcp/tools/system.ts
  - src/mcp/tools/resource.ts
  - src/mcp/tools/docs.ts
  - src/mcp/tools/meta.ts
  - src/mcp/tools/diagnose.ts
  - src/mcp/tools/deployment.ts
  - src/mcp/tools/instance.ts
  - src/mcp/tools/manifest.ts
  - src/mcp/tools/application.ts
  - src/mcp/tools/service.ts
  - src/mcp/tools/database.ts
  - src/mcp/tools/private_key.ts
  - src/mcp/tools/server.ts
  - src/mcp/tools/project.ts
  - src/mcp/tools/environment.ts
  - src/mcp/tools/emergency.ts
  - src/mcp/prompts.ts
  - src/mcp/server.ts
  - tests/mcp/prompts.test.ts
  - src/mcp/server.test.ts
findings:
  critical: 0
  warning: 4
  info: 2
  total: 6
status: issues_found
---

# Phase 19: Code Review Report

**Reviewed:** 2026-07-24T02:10:00Z  
**Depth:** standard  
**Files Reviewed:** 21  
**Status:** issues_found

## Summary

Phase-19-Implementierung (flat schemas, Tool-Beschreibungen, MCP-Prompts) ist strukturell solide. Plan **19-03** schließt die vorherigen **BLOCKER**- und zwei **WARNING**-Findings zu `actionsCatalog`-Parameternamen und fehlenden Tokens erfolgreich; die neuen Regressionstests in `server.test.ts` (A–H) sichern das ab.

Verbleibende Probleme betreffen vor allem **Schema-Grenzvalidierung für Logs** (Regression durch Shape-Spread), **UI-SPEC-Abstand in Tool-Beschreibungen**, **schwächere Recovery-Hints bei Manifest**, sowie ein **unvollständiger `serviceActionsCatalog`**. Keine offenen Critical-Findings.

### Behoben in Plan 19-03 (keine offenen Findings mehr)

| ID (alt) | Status | Kurzbeschreibung |
|---|---|---|
| CR-01 | ✅ behoben | `env_uuid` / `entries` in application/service/database-Katalogen |
| WR-01 (application) | ✅ behoben | CRUD-Lifecycle-Tokens in `applicationActionsCatalog` |
| WR-02 (database) | ✅ behoben | Konkrete env/backup-Tokens statt `envs:*` / `backup:*` |

## Warnings

### WR-01: serviceActionsCatalog listet delete_preview und restart nicht

**File:** `src/mcp/tools/service.ts:271-272`  
**Issue:** Schema-Enum enthält `delete_preview` und `restart`, der Katalog nicht. D-05 verlangt einen Token pro Action; Agents, die nur die Tool-Beschreibung lesen, übersehen diese Aktionen (analog zum behobenen application-WR-01).

**Fix:** Katalog ergänzen, z. B.:
```typescript
'… · delete_preview(uuid) · restart(uuid) · …'
```
Optional Regressionstest analog zu application WR-01 in `server.test.ts`.

### WR-02: Flat-Shape-Spread schwächt logs-Validierung (format + max_chars)

**File:** `src/mcp/tools/shared-read-params.ts:322-349`  
**Also:** `src/mcp/tools/application.ts:439-441`  
**Issue:**

1. `sharedLogParamsFlatShape.max_chars` nutzt `.min(1)` statt `.min(1000)` wie `sharedLogParamsSchema`.
2. Spread-Reihenfolge endet mit `mutationResponseParamsFlatShape`, dessen `format`-Enum `pretty|json|table` ist und `max_chars` nur `.positive()` verlangt. Damit überschreibt die Mutation-Shape die log-spezifischen Constraints.

Runtime-Nachweis (tsx): `applicationActionSchema.safeParse({ action: 'logs', uuid: 'u1', format: 'table', max_chars: 500 })` → **success: true**. Vor Migration lehnte `applicationLogsSchema` solche Werte ab; `parseApplicationAction` nutzt nur `applicationActionSchema`, nicht `applicationLogsSchema`.

**Fix:** Log-Felder nach dem Mutation-Spread nicht überschreiben lassen (dedizierte log-`format`/`max_chars` behalten oder Mutation-Shape ohne diese Keys für logs). `max_chars.min(1000)` für Logs wiederherstellen; in `extraRefine` bei `action === 'logs'` `format: 'table'` ablehnen.

### WR-03: composeToolDescription verletzt UI-SPEC-Leerzeilen-Anatomie

**File:** `src/mcp/server.ts:165-171`  
**Issue:** UI-SPEC verlangt Leerzeile zwischen Purpose-Satz und `Actions:` sowie zwischen Katalog und `Safety:`. Implementierung joint mit einfachem `\n` — Beschreibungen erscheinen dichter als im Designvertrag.

**Fix:**
```typescript
function composeToolDescription(
  purpose: string,
  catalog: string,
  footer: string,
): string {
  return `${purpose}\n\n${catalog}\n\n${footer}`;
}
```

### WR-04: Manifest-Validierung ohne action-aware recoveryHints

**File:** `src/mcp/tools/manifest.ts:88-97`  
**Issue:** `parseManifestAction` nutzt `manifestActionSchema.safeParse` und immer generische `RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR`. Symbol-Metadaten von `createFlatActionSchema` werden nicht gelesen. Andere Domain-Tools liefern über `parseWithInstanceRouting` action-spezifische Required/Optional-Hints (D-04).

**Fix:** Über `parseWithInstanceRouting(manifestActionSchema, args)` routen (oder gleichen `buildActionAwareRecoveryHints`-Pfad), `instance`-Feld für sync/diff beibehalten.

## Info

### IN-01: Doppelter dockercompose-Reject in application create refine

**File:** `src/mcp/tools/application.ts:691-696`  
**Issue:** `rejectDockercomposeBuildPack(data, ctx)` wird zweimal aufgerufen, wenn `build_pack === 'dockercompose'` (Zeile 693 und erneut in identischem `if`). Harmlos, aber redundant.

**Fix:** Einen Aufruf entfernen; nur `rejectDockercomposeBuildPack(data, ctx);` in create-refine belassen.

### IN-02: Prompt/Server-Tests hängen an privaten MCP-SDK-Feldern

**File:** `tests/mcp/prompts.test.ts:11-18`  
**Also:** `src/mcp/server.test.ts:233-237`  
**Issue:** Tests casten auf `_registeredPrompts` / `_registeredTools`. Bewusste Entscheidung (SDK ohne public list-API), aber fragil bei SDK-Umbenennungen.

**Fix:** Vorerst akzeptabel; kurzer Kommentar mit Verweis auf 19-02-SUMMARY oder zentraler Test-Helper mit einem Cast.

---

_Reviewed: 2026-07-24T02:10:00Z_  
_Reviewer: Claude (gsd-code-reviewer)_  
_Depth: standard_
