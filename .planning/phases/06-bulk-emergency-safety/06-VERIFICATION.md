---
phase: 06-bulk-emergency-safety
verified: 2026-07-16T04:40:00Z
status: human_needed
score: 38/38 must-haves verified (automatisiert)
behavior_unverified: 0
---

# Phase 6: Bulk, Emergency & Safety — Verifikationsbericht

**Phasenziel:** Als AI-Agent-Operator Bulk-Projekt-Ops und Emergency-Stop mit Credential-Masking und Confirm-Gates nutzen, damit hochwirksame Aktionen bewusst erfolgen und Secrets nicht unbeabsichtigt leaken.

**Verifiziert:** 2026-07-16T04:40:00Z  
**Status:** `human_needed` — alle automatisierten Checks grün; Live-UAT und MCP-stdio-E2E ausstehend (MANUAL-ONLY laut 06-VALIDATION.md)

## Zielerreichung

### Must-Haves Checkliste

#### Plan 06-01 — Emergency Tool (EMG-01, EMG-02, EMG-03, OUT-07)

| # | Must-Have | Status | Evidenz |
|---|-----------|--------|---------|
| 1 | Dediziertes `emergency`-Tool getrennt von `system`/`application` (D-01) | ✓ VERIFIED | `src/mcp/server.ts` registriert `emergency` mit `destructiveHint: true` (Z. 246–254) |
| 2 | Aktionen `stop_all` / `redeploy_project` / `restart_project` (D-02) | ✓ VERIFIED | `emergencyToolSchema` discriminatedUnion in `src/mcp/tools/emergency.ts` (Z. 141–145) |
| 3 | Projekt-Scope: `project_uuid` oder `project_name`; Multi-Match → `COOLIFY_AMBIGUOUS_MATCH` (D-03) | ✓ VERIFIED | `resolveProjectUuid` (Z. 168–217); Tests in `emergency.test.ts` + Integration |
| 4 | `stop_all` instanzweit, nur laufende Apps (D-04) | ✓ VERIFIED | Filter `type==='application' && status.startsWith('running')` in `handleEmergencyAction` |
| 5 | `confirm: true` nur auf EMG-Aktionen (D-05) | ✓ VERIFIED | P4/P5-Mutationen unverändert ohne Gate; EMG via `validateConfirmGate` |
| 6 | Boolean `confirm`, Default `false`; fehlend/false → Reject (D-06) | ✓ VERIFIED | Zod-Schemas mit `confirm: z.boolean().default(false)` |
| 7 | Reject wirft `COOLIFY_CONFIRM_REQUIRED` + Preview, keine Mutation (D-07) | ✓ VERIFIED | `validateConfirmGate` (Z. 149–166); `src/utils/errors.ts` Code + RECOVERY_HINTS |
| 8 | Preview `{ would_affect, sample_uuids ≤ 5, action }` in `envelope.data` (D-08) | ✓ VERIFIED | `data`-Feld in CoolifyApiError; Integration-Tests assertieren Shape |
| 9 | Nur Applications — Services/DBs ausgeschlossen (D-13) | ✓ VERIFIED | `type === 'application'`-Filter; Unit + Integration (27 Tests) |
| 10 | Best-Effort sequentiell, ein Fehler stoppt nicht andere (D-14) | ✓ VERIFIED | Per-App try/catch in `handleEmergencyAction`; Integration-Test 404 auf erstem App |
| 11 | `redeploy_project` optional `wait` (Default false) (D-15) | ✓ VERIFIED | Schema + `pollDeploymentUntilTerminal` bei `wait:true` |
| 12 | `redeploy_project` optional `force` (Default false) (D-16) | ✓ VERIFIED | `triggerDeploy(..., parsed.force, ...)` |
| 13 | `restart_project` reiner Container-Restart, kein force/wait (D-16) | ✓ VERIFIED | `.strict()` lehnt force/wait ab; nur `triggerAppRestart` |

**Plan 06-01 Score:** 13/13

#### Plan 06-02 — Reveal Opt-In (OUT-02)

| # | Must-Have | Status | Evidenz |
|---|-----------|--------|---------|
| 14 | Secrets in Full-Projections default `***` (D-09) | ✓ VERIFIED | `sanitizeFullProjection(raw, false)` maskiert via `maskSecrets` |
| 15 | `reveal: true` bypassed Masking (D-10) | ✓ VERIFIED | `if (reveal) return clone` in `src/utils/projections.ts` (Z. 179–182) |
| 16 | `reveal` nur Full-Projection; Summary ohne Secrets (D-11) | ✓ VERIFIED | Summary-Pfade rufen `sanitizeFullProjection` nicht auf; Tests bestätigen |
| 17 | `reveal` MCP-seitig only, unabhängig von `api.sensitive` (D-12) | ✓ VERIFIED | Kein Coolify-API-Flag; client-side sanitize bypass |
| 18 | Fehlerpfade weiterhin `redactSecrets` (D-11) | ✓ VERIFIED | `application.test.ts` — Fehler bei `reveal:true` weiter maskiert |
| 19 | Log-Zeilen unmaskiert (v1 deferred) | ✓ VERIFIED | Kein reveal auf `sharedLogParamsSchema`; Tool-Descriptions warnen |
| 20 | `reveal: boolean` default `false` auf `sharedReadParamsSchema` (D-10) | ✓ VERIFIED | `src/mcp/tools/shared-read-params.ts` (Z. 75, 94, 127) |
| 21 | `sanitizeFullProjection(raw, reveal)` Signatur (D-09) | ✓ VERIFIED | `src/utils/projections.ts` (Z. 179) |
| 22 | `projectDeploymentFull` / `projectAppDiagnose` threaden `reveal` | ✓ VERIFIED | Z. 265, 274, 284, 335 in `projections.ts` |
| 23 | Handler übergeben `parsed.reveal` (application/service/database/deployment/diagnose) | ✓ VERIFIED | `application.ts:843`, `service.ts:365`, `database.ts:306`, `deployment.ts:144`, `diagnose.ts:337` |
| 24 | Server-Descriptions dokumentieren Masking + reveal | ✓ VERIFIED | `grep reveal src/mcp/server.ts` — 5 Tool-Descriptions |

**Plan 06-02 Score:** 11/11

#### Plan 06-03 — Integration Sign-Off

| # | Must-Have | Status | Evidenz |
|---|-----------|--------|---------|
| 25 | Integration: `stop_all` confirm:false → Preview | ✓ VERIFIED | `tests/integration/emergency-safety-flow.test.ts` EMG-01 Block |
| 26 | Integration: `stop_all` confirm:true → sequentiell, apps-only | ✓ VERIFIED | 27 Integration-Tests grün |
| 27 | Integration: `redeploy_project` confirm/force/wait/project resolve | ✓ VERIFIED | EMG-02 Block in Integration-Suite |
| 28 | Integration: `restart_project` confirm + strict rejects force/wait | ✓ VERIFIED | EMG-03 Block + Schema-Tests |
| 29 | Integration: reveal masked/plaintext + summary independence | ✓ VERIFIED | OUT-02 Block — application/service/database/diagnose/deployment |
| 30 | Integration: error-path independence bei reveal:true | ✓ VERIFIED | 401-Fehler weiter redacted |
| 31 | Integration: confirm omitted → COOLIFY_CONFIRM_REQUIRED (alle 3 EMG) | ✓ VERIFIED | OUT-07 Backstop-Block |
| 32 | `06-VALIDATION.md` 6 Per-Task-Rows grün | ✓ VERIFIED | 06-01-T1..06-03-T2 alle ✅ |
| 33 | Full Suite ≥ 459 Tests grün | ✓ VERIFIED | `npm test` — 459 passed (29 files) |
| 34 | Build grün (tsup) | ✓ VERIFIED | `npm run build` — exit 0 |
| 35 | `emergency.ts` ≥ 90% Line Coverage | ✓ VERIFIED | 94.18% (coverage-summary.json) |
| 36 | MCP stdio E2E MANUAL-ONLY dokumentiert | ✓ VERIFIED | 06-VALIDATION.md Manual-Only Tabelle Zeile 1 |
| 37 | Live UAT Emergency non-prod dokumentiert | ✓ VERIFIED | 06-VALIDATION.md Manual-Only Tabelle Zeile 2 |
| 38 | Live UAT reveal dokumentiert | ✓ VERIFIED | 06-VALIDATION.md Manual-Only Tabelle Zeile 3 |

**Plan 06-03 Score:** 14/14 (automatisiert 11/11; 3 Manual-Only dokumentiert, nicht ausgeführt)

**Gesamt-Score:** 38/38 automatisierte Must-Haves verified

### Erforderliche Artefakte

| Artefakt | Erwartung | Status | Details |
|----------|-----------|--------|---------|
| `src/mcp/tools/emergency.ts` | Emergency-Handler + Schemas | ✓ EXISTS + SUBSTANTIVE | 465 Zeilen, exports schema/handler/helpers |
| `src/mcp/tools/emergency.test.ts` | Unit-Tests EMG | ✓ EXISTS + SUBSTANTIVE | 26 Tests grün |
| `src/utils/errors.ts` | COOLIFY_CONFIRM_REQUIRED | ✓ EXISTS + SUBSTANTIVE | Union + RECOVERY_HINTS + envelope.data |
| `src/utils/projections.ts` | reveal bypass | ✓ EXISTS + SUBSTANTIVE | sanitizeFullProjection(raw, reveal) |
| `src/mcp/tools/shared-read-params.ts` | reveal field | ✓ EXISTS + SUBSTANTIVE | ParsedReadParams.reveal |
| `tests/integration/emergency-safety-flow.test.ts` | Handler-Integration | ✓ EXISTS + SUBSTANTIVE | 27 Tests grün |
| `src/mcp/server.ts` | emergency registration | ✓ EXISTS + SUBSTANTIVE | destructiveHint + confirm guidance |

**Artefakte:** 7/7 verified

### Key-Link-Verifikation

| Von | Nach | Via | Status | Details |
|-----|------|-----|--------|---------|
| `sharedReadParamsSchema.reveal` | Handler get branches | `parseReadParams` → `parsed.reveal` | ✓ WIRED | 5 Handler-Call-Sites |
| `validateConfirmGate` | CoolifyApiError | throw mit preview data | ✓ WIRED | emergency.ts Z. 156–165 |
| `handleEmergencyAction` | Coolify API | fetchResources + triggerAppStop/Deploy/Restart | ✓ WIRED | Per-App sequential loop |
| `server.ts emergency` | `handleEmergencyAction` | registerTool handler | ✓ WIRED | Z. 255–256 |
| `sanitizeFullProjection(raw, reveal)` | Full projection output | Handler get branches | ✓ WIRED | application/service/database/deployment/diagnose |

**Wiring:** 5/5 verified

## Requirements Traceability

| Requirement | Beschreibung | Status | Evidenz |
|-------------|--------------|--------|---------|
| **EMG-01** | Agent kann alle laufenden Apps stoppen (Emergency) | ✓ SATISFIED | `emergency.stop_all` + confirm gate; Unit (26) + Integration (27) Tests |
| **EMG-02** | Agent kann alle Apps eines Projekts redeployen | ✓ SATISFIED | `emergency.redeploy_project` + force/wait; project resolve |
| **EMG-03** | Agent kann alle Apps eines Projekts restarten | ✓ SATISFIED | `emergency.restart_project` pure restart |
| **OUT-02** | Sensitive-Werte default maskiert, reveal opt-in | ✓ SATISFIED | `sanitizeFullProjection` + `reveal` auf shared reads |
| **OUT-07** | Destructive-Ops erfordern `confirm: true` Gate | ✓ SATISFIED | `COOLIFY_CONFIRM_REQUIRED` + Preview für alle 3 EMG-Aktionen |

**Coverage:** 5/5 Requirements satisfied (programmatisch)

## Automatisierte Prüfungen

| Check | Befehl | Ergebnis |
|-------|--------|----------|
| Full Suite | `npm test` | ✅ 459/459 passed |
| Build | `npm run build` | ✅ exit 0 |
| Integration | `npx vitest run tests/integration/emergency-safety-flow.test.ts` | ✅ 27/27 passed |
| Emergency Unit | `npx vitest run src/mcp/tools/emergency.test.ts` | ✅ 26/26 passed |
| Coverage emergency.ts | `npx vitest run --coverage` + node threshold | ✅ 94.18% lines (≥ 90%) |
| src/mcp/tools coverage | coverage report | ✅ 96.68% lines |

## Anti-Patterns

| Datei | Muster | Schwere | Impact |
|-------|--------|---------|--------|
| — | Keine Blocker gefunden | — | — |

**Anti-Patterns:** 0 Blocker

## Manuelle Verifikation erforderlich

Die folgenden Punkte sind laut 06-VALIDATION.md und P1–P5-Präzedenz **MANUAL-ONLY** — nicht programmatisch verifizierbar:

### 1. MCP stdio E2E (Emergency + Reveal)

**Test:** `npm run build` → Cursor/Claude Desktop gegen echte Coolify 4.1.x konfigurieren → `emergency.stop_all`/`redeploy_project`/`restart_project` + confirm gate + `application.get` mit `reveal` aufrufen.

**Erwartet:** Strukturierte Response, formatierter Text, Confirm-Preview bei `confirm:false`, Masking/Plaintext bei reveal.

**Warum manuell:** In-Process SDK-Validation strippt unknown keys ohne Fehler (03-07 Finding); stdio-Transport braucht echten MCP-Client.

### 2. Live UAT Emergency (nur Non-Prod)

**Test:** `COOLIFY_URL` + `COOLIFY_TOKEN` setzen → `emergency.stop_all confirm:false` (Preview prüfen) → `confirm:true` auf Non-Prod-Testprojekt → redeploy/restart verifizieren.

**Erwartet:** Apps gestoppt/redeployed/restarted; Preview zeigt korrekte `would_affect`/`sample_uuids`.

**Warum manuell:** Destruktive Bulk-Ops; Operator muss sicheres Ziel wählen — **NIEMALS Production**.

### 3. Live UAT Reveal (echte App mit Secrets)

**Test:** `application.get projection:full` default → `***` → `reveal:true` → Plaintext; analog service/database/diagnose; Fehlerpfad bei 401 weiter redacted; Log-Zeilen weiter unmaskiert.

**Erwartet:** Secrets nur bei explizitem `reveal:true` sichtbar; Fehler weiter maskiert.

**Warum manuell:** Braucht echte Coolify-Instanz mit secret-bearing Full-Payload.

## Lücken-Zusammenfassung

**Keine programmatischen Lücken.** Alle Must-Haves, Artefakte, Wiring und Requirements sind durch Unit-/Integration-Tests und Build-Gate abgedeckt.

**Ausstehend:** 3 manuelle UAT-Punkte (siehe oben). Phase ist für **automatisierte Verifikation abgeschlossen**; Gesamtstatus `human_needed` bis Live-UAT durch Operator.

## Verifikations-Metadaten

| Feld | Wert |
|------|------|
| Verifikationsansatz | Goal-backward aus ROADMAP Phase 6 + Plan-Must-Haves |
| Must-Haves-Quelle | 06-01/02/03-PLAN.md frontmatter |
| Automatisierte Checks | 6/6 passed |
| Manuelle Checks ausstehend | 3 |
| Test-Count | 459 (378 P5-Baseline + 81 P6) |
| emergency.ts Coverage | 94.18% lines |

---
*Verifiziert: 2026-07-16T04:40:00Z*  
*Verifier: GSD Verifier Agent (Subagent)*
