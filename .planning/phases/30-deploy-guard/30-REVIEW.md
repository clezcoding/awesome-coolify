---
phase: 30-deploy-guard
reviewed: 2026-07-31T01:20:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - src/utils/deploy-preflight.ts
  - src/utils/deploy-preflight.test.ts
  - src/mcp/tools/deployment.ts
  - src/mcp/tools/deployment.test.ts
  - src/utils/errors.ts
  - src/api/client.ts
  - src/api/client.test.ts
  - src/mcp/capabilities.ts
  - src/mcp/tools/system.test.ts
  - src/mcp/tools/intelligence.ts
  - docs/coverage-map.yaml
  - docs/COVERAGE.md
  - README.md
  - README.de.md
findings:
  critical: 1
  warning: 6
  info: 2
  total: 9
status: issues_found
---

# Phase 30: Code Review Report

**Reviewed:** 2026-07-31T01:20:00Z  
**Depth:** standard  
**Files Reviewed:** 14  
**Status:** issues_found

## Summary

Phase 30 liefert `deployment.preflight` (read-only Risiko-Report) und `deployment.rollback` (confirm-gated Pin+Deploy) über `deploy-preflight.ts`, erweitert `triggerDeploy` um `docker_tag`, und dokumentiert Capabilities. Kernlogik ist testabgedeckt und Confirm-Gate korrekt. Adversarial Review findet aber: `rollback` mit `wait:true` meldet fehlgeschlagene Deployments als Erfolg (`ok:true`), Rollback-Zielwahl kann aktuelles `finished` redeployen statt vorherige Version, und Docs listen `GET /deploy` statt `POST /deploy`.

## Critical Issues

### CR-01: `rollback` + `wait:true` gibt `ok:true` bei fehlgeschlagenem Deploy zurück

**File:** `src/utils/deploy-preflight.ts:642-687`  
**Issue:** `executeDeploymentRollback` pollt mit `pollDeploymentUntilTerminal` bis Terminal-Status, wirft aber bei `status: 'failed'` oder `status: 'timeout'` keine `CoolifyApiError`. `handleDeploymentRollback` wrappt das Ergebnis immer in `buildReadResponse` → MCP-Antwort `ok: true`. `deployment.watch` wirft dagegen `COOLIFY_DEPLOYMENT_FAILED` / `COOLIFY_WATCH_TIMEOUT`. Agenten können fehlgeschlagenen Rollback als Erfolg interpretieren.  
**Fix:**

```typescript
if (options.wait === true && terminal) {
  const status = String(terminal.status ?? '');
  if (status === 'failed') {
    throw new CoolifyApiError({
      code: 'COOLIFY_DEPLOYMENT_FAILED',
      message: `Rollback deployment failed with status: ${status}.`,
      recoveryHints: RECOVERY_HINTS.COOLIFY_DEPLOYMENT_FAILED,
      data: { deployment_uuid: deploymentUuid, rolled_back_to },
    });
  }
  if (status === 'timeout') {
    throw new CoolifyApiError({
      code: 'COOLIFY_WATCH_TIMEOUT',
      message: 'Rollback watch timed out before deployment reached a terminal state.',
      recoveryHints: RECOVERY_HINTS.COOLIFY_WATCH_TIMEOUT,
      data: { deployment_uuid: deploymentUuid, rolled_back_to },
    });
  }
}
```

## Warnings

### WR-01: Rollback wählt neuestes `finished`, nicht vorherige erfolgreiche Version

**File:** `src/utils/deploy-preflight.ts:84-91`  
**Issue:** `findLastSuccessfulDeployment` sortiert newest-first und nimmt das erste `finished`. Wenn die neueste Deployment `finished` ist (aktueller Prod-Stand), rollt `rollback` auf denselben Commit/Tag zurück — kein echter Downgrade. README sagt „last finished“, aber Nutzer erwarten typisch „letzte erfolgreiche vor dem Fehler“.  
**Fix:** Wenn newest `finished` ist, zweites `finished` in der History wählen; wenn nur eines existiert, `COOLIFY_ROLLBACK_UNAVAILABLE` mit Hinweis „already on last successful“.

### WR-02: Docker-Rollback ohne `docker_registry_image_tag` deployt unpinned

**File:** `src/utils/deploy-preflight.ts:613-637`  
**Issue:** Bei `build_pack === 'dockerimage'` ohne Tag wird weder `updateApplication` noch `dockerTag` an `triggerDeploy` übergeben. Deploy nutzt dann aktuelle App-Konfiguration — nicht das Rollback-Ziel.  
**Fix:** Vor Mutation prüfen: `if (buildPack === 'dockerimage' && !dockerTag) throw COOLIFY_ROLLBACK_UNAVAILABLE` mit Hinweis auf fehlendes Tag im Ziel-Deployment.

### WR-03: Git-Rollback ohne `git_commit_sha` deployt unpinned

**File:** `src/utils/deploy-preflight.ts:613-628`  
**Issue:** Für Nicht-`dockerimage`-Apps wird `updateApplication` nur ausgeführt wenn `commit` truthy. Fehlt `git_commit_sha` am Ziel-Deployment, läuft `triggerDeploy` mit unverändertem App-Stand — still falsches Rollback-Verhalten.  
**Fix:** Nach Zielauswahl validieren: mindestens `commit` oder `dockerTag` (je nach `build_pack`) muss vorhanden sein, sonst `COOLIFY_ROLLBACK_UNAVAILABLE`.

### WR-04: Coverage-Map listet `GET /deploy` statt `POST /deploy`

**File:** `docs/coverage-map.yaml:138`, `docs/COVERAGE.md:74`  
**Issue:** `deployment.rollback` nutzt `triggerDeploy` → `POST /deploy`. Generierte Docs zeigen `GET /deploy` — falsche OpenAPI-Zuordnung, verwirrt Coverage-Audits.  
**Fix:** In `coverage-map.yaml` Zeile 138 `GET /deploy` → `POST /deploy` ersetzen; `npm run openapi:coverage` neu generieren.

### WR-05: `blocking`-Hints zeigen immer „in-progress“, auch bei reinem Risiko-Block

**File:** `src/utils/deploy-preflight.ts:489-506`  
**Issue:** Wenn `blocking` nur wegen `risk_level === 'critical'` (ohne laufendes Deploy), wird trotzdem `deployment.get` mit Label „Inspect in-progress deployment“ empfohlen — irreführend; bei fehlendem `latest.deployment_uuid` leerer UUID-String.  
**Fix:** Zweiten Hint nur bei `latestInProgress === true` pushen; Label an Kontext anpassen (`failed` vs `in_progress`).

### WR-06: Partielle Factor-Fehler senken `risk_score` nicht

**File:** `src/utils/deploy-preflight.ts:402-416`, `476-478`  
**Issue:** `settleFactor` fängt API-Fehler ab, setzt `partial: true`, aber `severity: 'ok'` und leere `findings`. `computeDeployRiskScore` ignoriert Partials → Report kann `risk_level: low` + Deploy-Empfehlung liefern, obwohl z.B. Env-Check fehlgeschlagen (Test D-17 deckt nur `partial`-Flag ab).  
**Fix:** Bei `partial: true` mindestens Info-Finding injizieren oder `blocking: true` wenn kritische Faktoren partial sind.

## Info

### IN-01: Ungenutzter `key`-Parameter in `settleFactor`

**File:** `src/utils/deploy-preflight.ts:402-405`  
**Issue:** `key: FactorKey` wird nie verwendet — toter Parameter, erschwert Lesbarkeit.  
**Fix:** Parameter entfernen oder in `error`-Meldung/`partial_factors` nutzen.

### IN-02: Duplizierte `deploymentTimestamp` in `intelligence.ts`

**File:** `src/mcp/tools/intelligence.ts:132` vs `src/utils/deploy-preflight.ts:59`  
**Issue:** Identische Sortier-Logik existiert zweimal nach Refactor auf `sortDeploymentsNewestFirst`. Abweichung bei späteren Änderungen möglich.  
**Fix:** `deploymentTimestamp` aus `deploy-preflight.ts` exportieren und in `intelligence.ts` wiederverwenden.

---

_Reviewed: 2026-07-31T01:20:00Z_  
_Reviewer: Claude (gsd-code-reviewer)_  
_Depth: standard_
