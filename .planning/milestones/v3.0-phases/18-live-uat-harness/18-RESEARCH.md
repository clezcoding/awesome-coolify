# Phase 18: Live UAT Harness - Research

**Researched:** 2026-07-23
**Domain:** QA, Integration Testing, Command Line Interface (CLI), MCP Stdio & In-process Testing
**Confidence:** HIGH [VERIFIED: local setup & codebase inspection]

## Summary

Phase 18 zielt darauf ab, dem Maintainer ein robustes und sicheres Werkzeug zur Verfügung zu stellen, mit dem vor jedem Release (v3.0+) bewiesen werden kann, dass alle MCP-Tools gegen eine echte, Live-Coolify-Instanz fehlerfrei funktionieren. Dies geschieht über ein zentrales CLI-Harness, das über `npm run uat:live` aufgerufen wird. 

Das CLI-Harness führt ein hybrides Modell aus:
1. **Stdio-Integration (Rauchtest):** Ein separater Child-Process (`dist/index.js`) wird gestartet, um die MCP-Kommunikation über Standard-Streams (JSON-RPC 2.0 über stdin/stdout) zu testen. Dies deckt kritische Einstiegspunkte wie `tools/list`, v3-Pfade (`instance`, `system` mit `cloud-info` sowie `manifest.get`/`diff`) und repräsentative Lese-Aktionen ab.
2. **In-Process-Integration (Massenmatrix):** Um langsame Prozess-Spawns zu verhindern, werden die übrigen Tool-Handler direkt im UAT-Skript instanziiert und in-process aufgerufen.

Das Harness arbeitet streng lokal, fordert ein dediziertes UAT-Projekt über `UAT_PROJECT_UUID`, speichert niemals Secrets remote (z. B. auf GitHub) und filtert sensible Tokens in jeder Ausgabe. Standardmäßig läuft es im schreibgeschützten Modus (Read-Only) und sperrt Mutationen hinter `--write` bzw. Destruktivität hinter `--confirm-destructive`.

**Hauptempfehlung:** 
Implementierung eines einheitlichen CLI-Skripts `scripts/live-uat.mjs`, das mithilfe von `npx tsx` direkt die TypeScript-Quelldateien importieren kann. Dies umgeht Kompilierungshürden und erlaubt den direkten Aufruf der in-process Handler sowie des `McpStdioClient`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| **Credential Resolution** | CLI / Test Harness | `InstanceManager` | Lädt Anmeldedaten dynamisch aus `.cursor/mcp.json`, Prozess-Umgebung oder `~/.coolify-mcp/instances.json` ohne Token-Lecks. |
| **Test Execution (Stdio)** | CLI / Test Harness | Stdio Child Process | Startet den echten MCP-Server als Child-Process und sendet JSON-RPC 2.0 Aufrufe, um reale Client-Bedingungen nachzustellen. |
| **Test Execution (In-Process)** | CLI / Test Harness | Tool-Handler (`src/mcp/tools/*`) | Importiert und ruft die TS-Handler direkt in-process auf, um die restliche Aktionsmatrix schnell zu validieren. |
| **Precondition Verification** | CLI / Test Harness | Live Coolify API | Prüft vor dem Testdurchlauf über `project.get(UAT_PROJECT_UUID)`, ob das UAT-Projekt existiert; bricht andernfalls ab. |
| **Mutation & Destructive Protection** | CLI / Test Harness | — | Verhindert die Ausführung von schreibenden/löschenden Aktionen, wenn `--write` bzw. `--confirm-destructive` nicht übergeben wurden. |
| **Report Generation** | CLI / Test Harness | — | Erzeugt einen strukturierten JSON-Bericht im stdout (bzw. Datei) sowie einen lesbaren Markdown-Bericht. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `tsx` | ^4.23.1 [VERIFIED: npm registry] | Führt TypeScript-Dateien und ESM-Importe direkt in Node.js aus. | Vermeidet manuelle Compile-Schritte für Testskripte und erlaubt nahtloses Importieren von Quellcode. |
| `zod` | ^4.4.3 [VERIFIED: npm registry] | Validiert das CLI-Argument-Schema und die deklarative Testmatrix. | Standard-Validierungsbibliothek des Projekts. |
| `node:child_process` | Built-in | Spawnt den MCP-Server als Stdio-Child-Prozess. | Standard-Node-API für Prozess-Management. |
| `node:fs` & `node:path` | Built-in | Dateizugriff für `.cursor/mcp.json`, Matrix-Laden und Berichtschreiben. | Standard-Node-Dateisystem-APIs. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `McpStdioClient` | Custom [CITED: scripts/live-uat-milestone-optional.mjs] | Einfacher NDJSON/JSON-RPC 2.0 Client für Stdio-Interaktion. | Wird im Stdio-Zweig verwendet, um mit dem gestarteten Server zu kommunizieren. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `npx tsx` | Vortab-Kompilierung in `dist/` | `tsup` bündelt alles in eine einzelne `dist/index.js` Datei. Einzelne Modul-Handler sind daraus nicht sauber in-process importierbar. `tsx` löst dies elegant. |
| `@modelcontextprotocol/sdk` (Client) | Eigener `McpStdioClient` | Der offizielle SDK-Client bringt erhebliche Overhead-Abhängigkeiten und erfordert asynchrone Verbindungs-Setups. Ein leichtgewichtiger NDJSON-Client ist hochgradig kontrollierbar und reicht völlig aus. |

**Installation:**
Da alle Tools bereits vorhanden oder Standard-Bibliotheken sind, ist keine zusätzliche Installation erforderlich. `tsx` ist bereits global bzw. als NPX-Tool verfügbar.

**Version verification:**
```bash
npm view tsx version
# Verified: v4.23.1 (Published: 2026-07-13)
```

## Package Legitimacy Audit

Da in dieser Phase keine neuen externen npm-Pakete installiert werden, entfällt ein Audit für neue Abhängigkeiten. Die bestehende Verwendung von `tsx` wurde überprüft:

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `tsx` | npm | ~4 yrs | 81M/wk | github.com/privatenumber/tsx | [SUS] [WARNING: flagged as suspicious due to extremely recent release on 2026-07-13] | Approved (Etabliertes Standard-Werkzeug; die Warnung betrifft nur die Aktualität des Releases) |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none (außer dem bekannten `tsx`-Sicherheitsflag für sehr frische Versionen)

## Architecture Patterns

### System Architecture Diagram

Das Diagramm zeigt den Datenfluss durch das UAT-Harness:

```
[Maintainer CLI] 
       │
       ▼ (npm run uat:live)
┌────────────────────────────────────────────────────────────────────────┐
│ scripts/live-uat.mjs                                                   │
│                                                                        │
│ 1. Resolve Credentials (via InstanceManager)                           │
│ 2. Check UAT_PROJECT_UUID Existence via handleProjectAction            │
│ 3. Load Matrix (scripts/live-uat.matrix.json)                          │
│                                                                        │
│    ├─── Mode: "stdio" ──────────────────────────────────────────┐      │
│    │    Spawn Child (node dist/index.js)                        │      │
│    │    Send JSON-RPC 2.0 (tools/call) via stdin/stdout         │      │
│    │    Wait for Response and Redact Tokens                     │      │
│    │                                                            │      │
│    └─── Mode: "in-process" ────────────────────────────────┐    │      │
│         Import Handler from src/mcp/tools/*.ts             │    │      │
│         Invoke handler(args, resolvedEnv)                  │    │      │
│         Capture Result and Redact Tokens                   │    │      │
└────────────────────────────────────────────────────────────────────────┘
                               │                            │
                               ▼                            ▼
                      [Live Coolify API]           [Reports (JSON/MD)]
```

### Recommended Project Structure
```
scripts/
├── live-uat-milestone-optional.mjs # (Vorhandenes Referenzskript; wird behalten/integriert)
├── live-uat.mjs                    # Haupt-CLI-Harness (Einstiegspunkt)
└── live-uat.matrix.json            # Deklarative, committed Testmatrix
```

### Pattern 1: Hybrid Stdio / In-Process Runner
Das Harness entscheidet anhand der Deklaration in `live-uat.matrix.json`, wie ein Testfall ausgeführt wird:

- **Stdio-Tests:** Nutzt die Spawning-Logik, um die Stdio-Mittel des MCP-Servers direkt zu validieren. Unabdingbar für `tools/list` und grundlegende Operationen.
- **In-Process-Tests:** Schnelle Ausführung ohne Prozess-Spawn-Overhead für die restliche Matrix.

Beispiel für ein Matrix-Schema (`live-uat.matrix.json`):
```json
[
  {
    "id": "list-tools",
    "tool": "tools/list",
    "args": {},
    "type": "read",
    "mode": "stdio",
    "suite": "smoke"
  },
  {
    "id": "system-health",
    "tool": "system",
    "args": { "action": "health" },
    "type": "read",
    "mode": "stdio",
    "suite": "smoke"
  },
  {
    "id": "instance-cloud-info",
    "tool": "instance",
    "args": { "action": "cloud-info" },
    "type": "read",
    "mode": "stdio",
    "suite": "smoke",
    "tag": "suite:v3"
  },
  {
    "id": "manifest-get",
    "tool": "manifest",
    "args": { "action": "get" },
    "type": "read",
    "mode": "stdio",
    "suite": "smoke",
    "tag": "suite:v3"
  },
  {
    "id": "project-get-uat",
    "tool": "project",
    "args": { "action": "get", "uuid": "$UAT_PROJECT_UUID" },
    "type": "read",
    "mode": "in-process",
    "suite": "smoke"
  }
]
```

### Anti-Patterns to Avoid
- **Hardcodierte Testfälle im Skript:** Erschwert die Pflege und Dokumentation. Alle Testfälle müssen deklarativ in der JSON-Matrix definiert werden.
- **Automatische Löschungen ohne Bestätigung:** Das Skript darf niemals ohne explizite `--confirm-destructive` Flagge Ressourcen löschen.
- **Veröffentlichung des Test-Harness im npm-Paket:** Das Skript ist ein internes Maintainer-Werkzeug. Es muss über `files` in `package.json` vom Release-Tarball ausgeschlossen bleiben (bereits durch den Ausschluss des `scripts/`-Ordners erfüllt).
- **Hardcodierte Token-Ausgabe:** Fehlerberichte dürfen niemals geladene Tokens enthalten. Jede Berichtsfunktion muss Tokens maskieren (`***`).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Credential Resolution | Eigene Logik zum Einlesen von `.cursor/mcp.json` und Env | `InstanceManager.resolveCredentials` | Verhindert Code-Duplizierung und sorgt für exakt identische Verhaltensweisen wie im Produktiv-Server. |
| TS-Kompilierung für Tests | Eigene Build-Skripte oder temporäre tsc-Ausgaben | `npx tsx` | `tsx` führt TypeScript direkt aus, löst ESM-Pfadangaben auf und beschleunigt den Entwicklungszyklus massiv. |
| JSON-RPC 2.0 Serialization | Komplexe TCP- oder Stdio-Stream-Parser | Line-based buffer draining (NDJSON) | MCP kommuniziert über Stdio rein zeilenbasiert mit JSON-Objekten (Newline-Delimited JSON). Ein zeilenweiser Split ist einfach, robust und fehlerresistent. |

**Schlüsselerkenntnis:** Das Rad nicht neu erfinden. Die Wiederverwendung von `InstanceManager` und `tsx` sichert Stabilität und spart Hunderte Zeilen redundanten Code.

## Common Pitfalls

### Pitfall 1: Token-Leckage in stdout/stderr oder Berichten
- **Was schiefgeht:** Bei Fehlern oder detaillierten API-Protokollen werden die geladenen Tokens im Terminal ausgegeben und landen versehentlich im CI- oder lokalen Log-Verlauf.
- **Warum es passiert:** Standard-Error-Logs geben oft das vollständige `env`-Objekt oder den HTTP-Request-Header aus.
- **Vermeidung:** Explizite Bereinigung des `routingEnv` vor der Protokollierung. Konstruktion eines Redaktions-Filters, der jede Zeichenfolge, die dem Token entspricht, durch `***` ersetzt.

### Pitfall 2: Unbeabsichtigte Zerstörung von Produktiv-Ressourcen
- **Was schiefgeht:** Ein falscher UAT-Durchlauf löscht oder stoppt kritische Live-Services.
- **Warum es passiert:** Das Skript unterscheidet nicht sauber zwischen schreibgeschützten und schreibenden/destruktiven Aktionen oder löst fälschlicherweise Aktionen außerhalb des UAT-Projekts aus.
- **Vermeidung:** Strenger Identitäts-Gate über `UAT_PROJECT_UUID`. Jedes Tool, das Mutationen durchführt, wird gegen diese Projekt-ID validiert. Zwei-Stufen-Absicherung: `--write` für normale Änderungen (Start/Stop), `--confirm-destructive` für Deletes und Pruning. Ohne Flaggen wird nur ein Dry-Run (`planned`) dokumentiert.

### Pitfall 3: Blockieren durch hängende Stdio-Prozesse
- **Was schiefgeht:** Ein Stdio-Test blockiert unendlich, weil der Server abstürzt, nicht reagiert oder auf stdin wartet.
- **Warum es passiert:** Unendliche Timeouts auf JSON-RPC Anfragen.
- **Vermeidung:** Implementierung eines strikten Timeouts (z. B. 30 Sekunden pro Request) im `McpStdioClient`. Beenden des Child-Prozesses via `SIGTERM` / `SIGKILL` im `finally`-Block.

## Code Examples

### 1. Automatisches Respawn-Pattern mit TSX (in `scripts/live-uat.mjs`)
Dieses Pattern erlaubt es, das Skript mit `node scripts/live-uat.mjs` zu starten, führt es aber intern transparent mit `tsx` aus, um den TypeScript-Support zu aktivieren:

```javascript
#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { env, argv, exit } from 'node:process';

if (!env.TSX_ACTIVE) {
  // Respawn via tsx, Vererbung aller Argumente und stdio
  const result = spawnSync('npx', ['tsx', ...argv.slice(1)], {
    stdio: 'inherit',
    env: { ...env, TSX_ACTIVE: 'true' }
  });
  exit(result.status ?? 0);
}

// Ab hier ist TSX aktiv und TypeScript-Importe sind möglich:
import { InstanceManager } from '../src/utils/instance-registry.ts';
import { handleSystemAction } from '../src/mcp/tools/system.ts';

console.log('TypeScript-Unterstützung aktiv!');
```

### 2. In-Process Handler-Aufruf
Beispiel für den direkten Aufruf eines Modul-Handlers zur Vermeidung von Prozess-Spawn-Overhead:

```typescript
import { handleSystemAction } from '../src/mcp/tools/system.ts';
import { loadEnv } from '../src/config/env.ts';

async function runInProcessTest() {
  const resolvedEnv = loadEnv(); // Credentials auflösen
  const args = { action: 'health' };
  
  const startTime = Date.now();
  try {
    const result = await handleSystemAction(args, resolvedEnv);
    const duration = Date.now() - startTime;
    return {
      pass: result.ok !== false,
      duration,
      error: result.ok === false ? result.structuredContent?.error : undefined,
    };
  } catch (err: any) {
    return {
      pass: false,
      duration: Date.now() - startTime,
      error: { code: 'UAT_CRASH', message: err.message }
    };
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manuelle Vitest-Mocks für Live-Szenarien | Dediziertes CLI-Harness mit Stdio + In-Process Mix | Phase 18 (Heute) | Erlaubt echte End-to-End Validierung gegen eine reale Instanz vor jedem Release ohne manuelle CLI-Eingaben. |
| Reine Hardcodierung der Testfälle | Deklarative JSON-Testmatrix (`live-uat.matrix.json`) | Phase 18 (Heute) | Ermöglicht einfache Erweiterbarkeit der Testsuite und saubere Unterscheidung zwischen Read, Write und Destructive. |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `tsx` ist auf der Zielumgebung global oder über `npx` installierbar. | Standard Stack | Gering. `tsx` ist eine Standard-Entwicklungsabhängigkeit und über npx ohne Vorinstallation lauffähig. |
| A2 | Das UAT-Projekt auf Coolify enthält mindestens eine Anwendung, einen Service und eine Datenbank. | Architecture Patterns | Mittel. Wenn diese fehlen, schlagen die get-Aktionen fehl. Das Skript muss dies abfangen und überspringen (D-15). |

## Open Questions (RESOLVED)

1. **Wie gehen wir mit unvollständigen Live-Preconditions um (z. B. keine zweite Instanz für Multi-Instance Tests)?** — **RESOLVED via D-15 / v3_gaps (Plan 18-03 Task 2).**
   - *Resolution:* Das Skript fängt fehlende Live-Preconditions pro v3-Row ab, markiert die betroffene Row als `skip` mit reason, listet sie im `v3_gaps`-Array des Reports und lässt die Read-Suite weiter laufen. Der Suite-Exit-Code bleibt 0, solange alle anderen Rows passen. Konkret implementiert in `detectV3Gaps(matrix, routingEnv)`:
     - multi-instance Row mit explizitem `instance`-Arg → reason `no-secondary-instance`, wenn InstanceManager für den Platzhalternamen keinen nicht-null Credential auflöst.
     - cloud Row (`instance.cloud-info`) → reason `no-cloud-creds`, wenn `routingEnv.COOLIFY_URL` kein Cloud-Host ist und `instance.cloud-info` keinen Cloud-Profile zurückgibt.
     - manifest Rows (get/diff/sync dry_run) → reason `no-manifest`, wenn am Projekt-Root keine Manifest-Datei existiert.
   - *Begründet D-15:* v3_gaps lassen die Suite bewusst nicht fehlschlagen; Maintainer sieht die Lücken im Report und kann gezielt nachrüsten.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Ausführung des Skripts | ✓ | v26.5.0 | — |
| pnpm | Paket-Management | ✓ | 11.15.1 | — |
| Docker | Lokale Server-Tests | ✓ | 29.3.1 | — |
| gh CLI | GitHub PR/Release Integration | ✓ | 2.91.0 | — |

**Missing dependencies with no fallback:** Keine.

**Missing dependencies with fallback:** Keine.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.10 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/utils/instance-registry.test.ts` |
| Full suite command | `pnpm run test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| **UAT-01** | Maintainer kann ein CLI-Harness ausführen, das alle MCP-Tools testet | Integration | `node scripts/live-uat.mjs` | ❌ Wave 0 (Wird in Phase 18 erstellt) |
| **UAT-02** | Auflösung der Anmeldedaten ohne Token-Ausgabe in Logs | Integration / Unit | `node scripts/live-uat.mjs` (Prüfung der Ausgaberedaktion) | ❌ Wave 0 |
| **UAT-03** | Ausgabe eines strukturierten JSON-Berichts pro Tool | Integration | `node scripts/live-uat.mjs --out report.json` | ❌ Wave 0 |
| **UAT-04** | Abdeckung von v3.0 Features (Multi-Instance, Cloud, Manifest) | Integration | `node scripts/live-uat.mjs --full` | ❌ Wave 0 |
| **UAT-05** | Schutz vor zerstörerischen Aktionen ohne explizite Flags | Integration | `node scripts/live-uat.mjs` (Prüft, ob schreibende Aktionen übersprungen werden) | ❌ Wave 0 |
| **UAT-06** | CONTRIBUTING.md dokumentiert Ausführung und Interpretation | Documentation | Inspektion von `CONTRIBUTING.md` | ✅ (Wird ergänzt) |

### Sampling Rate
- **Pro Task Commit:** `pnpm run lint`
- **Pro Wave Merge / PR:** `pnpm run test` + `pnpm run build`
- **Phase Gate:** Erfolgreicher lokaler Durchlauf von `node scripts/live-uat.mjs` gegen UAT-Instanz vor der Verifizierung.

### Wave 0 Gaps
- [ ] `scripts/live-uat.mjs` — Neues CLI-Test-Harness erstellen.
- [ ] `scripts/live-uat.matrix.json` — Deklarative Testmatrix definieren.
- [ ] Ergänzung der UAT-Dokumentation in `CONTRIBUTING.md`.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| **V5 Input Validation** | yes | Zod-Schemavalidierung der CLI-Argumente (`--out`, `--write`, `--confirm-destructive`) und der `live-uat.matrix.json`. |
| **V12 Session Management** | yes | Strenge Redaktion von Secrets (`COOLIFY_TOKEN`) vor jeder Ausgabe in Logs, stdout/stderr oder Berichten. |

### Known Threat Patterns for Node.js CLI

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| **Information Disclosure (Token-Leak)** | Information Disclosure | Jede Ausgabelogik (JSON/Markdown) bereinigt gefundene Tokens und ersetzt diese durch `***`. |
| **Unauthorized Action (Zerstörung)** | Elevation of Privilege / Tampering | Standardmäßiger Read-Only Modus. Mutationen sind nur bei explizitem `--write` erlaubt. Löschungen und kritische Prunes erfordern zusätzlich `--confirm-destructive`. |
| **Command Injection (Argument-Hijacking)** | Tampering | Argumente für den MCP-Server werden als striktes Array an `spawn` übergeben. Es wird kein ungeschützter Shell-Interpreter (`shell: true`) verwendet. |

## Sources

### Primary (HIGH confidence)
- `scripts/live-uat-milestone-optional.mjs` — Stdio-Verbindungslogik und Anmeldedatenauflösung.
- `src/utils/instance-registry.ts` — `resolveCredentials` Methode für Multi-Instance.
- `src/mcp/server.ts` — Registrierte Modul-Aktionen und Tool-Eigenschaften.

### Secondary (MEDIUM confidence)
- WebSearch — Node.js stdio NDJSON Streaming-Verhalten und `tsx`-Kompatibilität.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — tsx und integrierte Node-Module sind vollständig verifiziert.
- Architecture: HIGH — Hybrides Modell löst Performance- und Stdio-Vollständigkeitsprobleme optimal.
- Pitfalls: HIGH — Sicherheitsaspekte (Token-Leakage, zerstörerische Aktionen) sind durch das zweistufige Sicherheitskonzept abgedeckt.

**Research date:** 2026-07-23
**Valid until:** 2026-08-23
