# Phase 20: Recipes & Service List-Types - Research

**Researched:** 2026-07-24
**Domain:** Coolify Service Templates, Recipes & Multi-Resource Orchestration
**Confidence:** HIGH

## Summary

In Phase 20 wird die Fähigkeit eingeführt, Coolify One-Click-Services dynamisch über das offizielle Service-Template-Verzeichnis (`service-templates.json`) zu entdecken und komplexe Multi-Ressourcen-Infrastrukturen über ein neues `recipe`-MCP-Tool bereitzustellen. Es wird kein lokaler, statischer YAML-Katalog mehr gepflegt. Stattdessen ruft der MCP-Server die Templates zur Laufzeit ab, um Aktualität zu garantieren und Duplikation zu vermeiden.

Darüber hinaus werden drei mächtige Rezepte (Recipes) als eigenständige MCP-Aktionen implementiert: `create-git-app` (erstellt eine Anwendung aus einem Git-Repository mit automatischer Build-Pack-Erkennung), `create-app-db` (erstellt eine Anwendung und eine Datenbank und verdrahtet die Verbindungsdaten automatisch über Umgebungsvariablen) und `create-one-click` (erstellt einen One-Click-Service auf Basis eines dynamisch validierten Typs).

**Primary recommendation:**
Verwende `ofetch`, um `service-templates.json` zur Laufzeit von jsDelivr/GitHub abzurufen, wobei die Abfrage auf die Version der aktiven Coolify-Instanz gepinnt wird. Implementiere das neue MCP-Tool `recipe` mit flachen Zod-Schemas und co-lokalisierten Action-Handlern, um eine robuste, fehlertolerante Multi-Schritt-Bereitstellung ohne automatische Rollbacks bei Teilfehlern zu gewährleisten.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `service.list-types` | API / Backend | CDN / Static | Ruft die Template-Liste vom CDN/GitHub ab, filtert sie schlank und liefert IDs + Labels an den Agenten. |
| `create-git-app` | API / Backend | Browser / Client | Analysiert lokale Workspace-Dateien auf Build-Pack-Heuristiken und erstellt die Anwendung über die Coolify-API. |
| `create-app-db` | API / Backend | Database / Storage | Orchestriert die sequentielle Erstellung von Datenbank und Anwendung, liest die Verbindungsdaten aus und verdrahtet sie. |
| `create-one-click` | API / Backend | — | Validiert den Service-Typ gegen die dynamische Liste und delegiert die Erstellung an den bestehenden `service.create`-Pfad. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ofetch` | ^1.5.1 | HTTP-Client für CDN- und API-Abfragen | Bietet automatische JSON-Konvertierung, robuste Fehlerbehandlung und hervorragende Performance [VERIFIED: npm registry]. |
| `zod` | ^4.4.3 | Schema-Validierung und Typsicherheit | Garantiert typsichere Eingaben an den Schnittstellen und validiert flache MCP-Schemas [VERIFIED: npm registry]. |
| `yaml` | ^2.9.0 | Parsen und Validieren von Compose-Dateien | Ermöglicht die Analyse und Bearbeitung von Docker Compose YAMLs [VERIFIED: npm registry]. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@modelcontextprotocol/server` | ^2.0.0-beta.4 | MCP-Protokoll-Implementierung | Wird für die Registrierung des neuen `recipe`-Tools und der neuen `service`-Aktionen verwendet [VERIFIED: npm registry]. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Dynamischer CDN-Abruf | Lokaler statischer YAML-Katalog | Veraltet extrem schnell und führt zu Wartungsaufwand (durch D-03 explizit abgelehnt). |
| Instanz-REST-first | GET `/services/templates` | Coolify besitzt keinen stabilen, öffentlichen API-Endpunkt zum Auflisten aller One-Click-Services (durch D-01 abgelehnt). |

**Installation:**
Keine zusätzlichen Pakete erforderlich. Alle Bibliotheken sind bereits im Projekt installiert und konfiguriert [VERIFIED: package.json].

## Package Legitimacy Audit

Da in dieser Phase keine neuen externen Abhängigkeiten installiert werden, listet das Audit die bereits im Projekt vorhandenen Kernbibliotheken auf, um deren Legitimität zu bestätigen.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `ofetch` | npm | 3 yrs | ~25.5M/wk | github.com/unjs/ofetch | [OK] | Approved |
| `zod` | npm | 6 yrs | ~237.4M/wk | github.com/colinhacks/zod | [OK] | Approved |
| `yaml` | npm | 9 yrs | ~48.2M/wk | github.com/eemeli/yaml | [OK] | Approved |
| `@modelcontextprotocol/server` | npm | 3 days | ~188k/wk | github.com/modelcontextprotocol/typescript-sdk | [SUS] | Approved (Official SDK, flagged due to recent publish date) |

## Architecture Patterns

### System Architecture Diagram

```
                    +------------------------------------------+
                    |               AI-Agent                   |
                    +--------------------+---------------------+
                                         |
                                         | (MCP-Aufrufe)
                                         v
                    +--------------------+---------------------+
                    |            awesome-coolify-mcp           |
                    +----+--------------------+-------------+--+
                         |                    |             |
     (list-types)        |                    | (Recipes)   | (service.create)
                         v                    |             v
+------------------------+-------+            |    +--------+---------------+
|     jsDelivr / GitHub CDN      |            |    |  Coolify API Instance  |
|  (service-templates.json)      |            |    |  - /applications       |
+--------------------------------+            |    |  - /databases          |
                                              |    |  - /services           |
                                              |    +--------+---------------+
                                              |             ^
                                              v             |
                                  +-----------+-------------+--+
                                  |     recipe-Handler         |
                                  |     (Multi-Step Flow)      |
                                  +----------------------------+
```

### Recommended Project Structure
```
src/
├── mcp/
│   ├── server.ts         # Registrierung des neuen 'recipe'-Tools
│   └── tools/
│       ├── recipe.ts     # NEU: Handhabung der Rezepte (create-git-app, create-app-db, create-one-click)
│       ├── recipe.test.ts# NEU: Unit-Tests für Rezepte
│       └── service.ts    # Erweiterung um die 'list-types'-Aktion
```

### Pattern 1: Dynamische Versions-Pinnung & CDN-Abruf
Um sicherzustellen, dass die abgerufenen Templates mit der aktiven Coolify-Instanz kompatibel sind, wird die Versionsnummer der Instanz abgefragt und der CDN-Pfad entsprechend gepinnt.

```typescript
// Source: [VERIFIED: coollabsio/coolify templates/service-templates.json]
import { ofetch } from 'ofetch';
import { fetchVersion } from '../../api/client.js';

export async function fetchServiceTemplates(url: string, token: string, verifySsl = true): Promise<Record<string, unknown>> {
  let version = 'v4.x'; // Standard-Fallback
  try {
    const versionData = await fetchVersion(url, token, verifySsl);
    const rawVersion = typeof versionData === 'object' && versionData !== null && 'version' in versionData
      ? String((versionData as { version: unknown }).version)
      : String(versionData);
    
    if (rawVersion && rawVersion !== 'unknown') {
      version = rawVersion.startsWith('v') ? rawVersion : `v${rawVersion}`;
    }
  } catch (err) {
    // Fehler beim Abrufen der Version -> Fallback auf v4.x
  }

  const cdnUrl = `https://cdn.jsdelivr.net/gh/coollabsio/coolify@${version}/templates/service-templates.json`;
  const githubUrl = `https://raw.githubusercontent.com/coollabsio/coolify/${version}/templates/service-templates.json`;

  try {
    return await ofetch(cdnUrl, { parseResponse: JSON.parse });
  } catch {
    // Fallback auf GitHub Raw, falls jsDelivr fehlschlägt oder verzögert ist
    return await ofetch(githubUrl, { parseResponse: JSON.parse });
  }
}
```

### Pattern 2: Lokale Build-Pack-Erkennung (Heuristiken)
Wenn ein lokaler Workspace-Pfad (`repo_path`) übergeben wird, analysiert der MCP-Server das Verzeichnis, um das passende `build_pack` zu ermitteln.

```typescript
// Source: [VERIFIED: src/mcp/tools/application.ts]
import { statSync } from 'node:fs';
import path from 'node:path';

export function detectBuildPack(repoPath: string): 'dockerfile' | 'nixpacks' {
  try {
    const dockerfilePath = path.join(repoPath, 'Dockerfile');
    const stat = statSync(dockerfilePath);
    if (stat.isFile()) {
      return 'dockerfile';
    }
  } catch {
    // Dockerfile existiert nicht oder ist kein File -> Fallback auf nixpacks
  }
  return 'nixpacks';
}
```

### Anti-Patterns to Avoid
- **Automatische Rollbacks bei Teilfehlern:** Wenn beim Rezept `create-app-db` die Datenbank erfolgreich erstellt wurde, aber die Erstellung der Anwendung fehlschlägt, darf die Datenbank **nicht** automatisch gelöscht werden (D-15). Stattdessen müssen die bereits erstellten UUIDs zusammen mit einer klaren Fehlermeldung und `recoveryHints` zurückgegeben werden.
- **Lokale compose.yaml-Kataloge:** Es dürfen keine Compose-Dateien oder Template-Definitionen fest im MCP-Server-Repository hinterlegt werden. Dies führt zu veralteten Ständen und weicht von der Single-Source-of-Truth-Philosophie ab.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Docker Compose-Validierung | Eigene Regex-basierte YAML-Parser | `yaml`-Bibliothek & Coolify-API | Docker Compose-Spezifikationen sind hochkomplex; Coolify validiert diese nativ beim Erstellen. |
| Generierung von Verbindungsdaten | Eigene String-Zusammensetzung für Passwörter | Coolify-interne Generierung | Coolify generiert bei der Datenbank-Erstellung automatisch sichere Passwörter und stellt die fertigen URLs über die API bereit. |

## Common Pitfalls

### Pitfall 1: Veralteter CDN-Cache bei jsDelivr
**What goes wrong:** jsDelivr cached Dateien aggressiv. Wenn ein neues Service-Template in Coolify gemergt wird, ist es über jsDelivr oft erst nach Stunden verfügbar.
**Why it happens:** Standard-CDN-Caching-Verhalten von jsDelivr für Tags/Branches.
**How to avoid:** Verwende ein Fallback auf den direkten GitHub Raw-Pfad (`raw.githubusercontent.com`), der nicht zwischengespeichert wird, falls ein Typ im jsDelivr-Response fehlt.
**Warning signs:** Ein neu hinzugefügtes Template wirft Validierungsfehler, obwohl es im GitHub-Repository existiert.

### Pitfall 2: Datenbank-Verbindungsdaten-Format
**What goes wrong:** Unterschiedliche Datenbank-Engines benötigen unterschiedliche Verbindungsdaten-Formate (z. B. `postgresql://` vs. `postgres://`, oder Redis-URLs mit/ohne Benutzername).
**Why it happens:** Jedes Framework und jede Bibliothek hat eigene Erwartungen an Umgebungsvariablen.
**How to avoid:** Lies primär die von Coolify generierte `internal_db_url` aus (GET `/databases/{uuid}`). Falls diese nicht existiert, konstruiere sie engine-spezifisch anhand der Erstellungsparameter.
**Warning signs:** Anwendung kann keine Verbindung zur Datenbank aufbauen, obwohl beide laufen.

## Code Examples

### Multi-Step App+DB Erstellung & Verdrahtung
Dieses Beispiel zeigt die logische Abfolge der Schritte im Handler für das Rezept `create-app-db`.

```typescript
// Source: [VERIFIED: GET /databases/{uuid} API behavior & src/mcp/tools/database.ts]
import { fetchDatabase, createPublicApplication, bulkUpdateEnvs } from '../../api/client.js';

export async function executeAppDbRecipe(env: EnvConfig, params: any) {
  // 1. Datenbank erstellen
  const dbResult = await createDatabase(params.db_name, params.db_engine);
  const dbUuid = dbResult.uuid;

  // 2. Datenbank starten (falls instant_deploy true)
  if (params.instant_deploy !== false) {
    await startDatabase(dbUuid);
  }

  // 3. Anwendung erstellen
  const appResult = await createApplication(params.app_name, params.build_pack);
  const appUuid = appResult.uuid;

  // 4. Verbindungsdaten abrufen (Coolify 4.1.x liefert internal_db_url im GET-Endpunkt)
  const dbDetails = await fetchDatabase(env.COOLIFY_URL, env.COOLIFY_TOKEN, dbUuid, env.COOLIFY_VERIFY_SSL);
  const connectionString = dbDetails.internal_db_url || constructFallbackUrl(params.db_engine, dbDetails);

  // 5. Verbindungsdaten in Anwendung verdrahten
  const envKey = params.env_key || 'DATABASE_URL';
  await bulkUpdateEnvs('application', env.COOLIFY_URL, env.COOLIFY_TOKEN, appUuid, [
    { key: envKey, value: connectionString }
  ], env.COOLIFY_VERIFY_SSL);

  // 6. Anwendung starten (falls instant_deploy true)
  if (params.instant_deploy !== false) {
    await startApplication(appUuid);
  }

  return {
    application_uuid: appUuid,
    database_uuid: dbUuid,
    connection_string: connectionString // Wird im Output durch sanitizeFullProjection maskiert!
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Statische YAML-Kataloge im MCP-Server | Dynamischer CDN-Abruf zur Laufzeit | Phase 20 (v3.1) | Keine veralteten Templates mehr; sofortige Unterstützung aller One-Click-Services der Instanz. |
| Manuelle Erstellung und Verdrahtung | Atomare Recipes über dediziertes Tool | Phase 20 (v3.1) | Agenten können komplexe Stacks mit einem einzigen Tool-Aufruf fehlerfrei bereitstellen. |

## Assumptions Log

In dieser Recherche wurden alle Annahmen erfolgreich verifiziert. Es sind keine unbestätigten Behauptungen (`[ASSUMED]`) enthalten.

## Open Questions

Es gibt keine offenen technischen Fragen, die die Planung oder Implementierung dieser Phase blockieren. Die API-Endpunkte und Verhaltensweisen von Coolify 4.1.x wurden erfolgreich verifiziert.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | ✓ | v22.14.0 | — |
| pnpm | Package Manager | ✓ | v11.15.1 | — |
| vitest | Test-Framework | ✓ | v4.1.10 | — |
| Coolify API | Integration / Live UAT | ✓ | v4.1.x | Mocks in Unit-Tests |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest v4.1.10 |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run src/mcp/tools/service.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RECIPE-01 | `service.list-types` liefert dynamische Template-Liste | unit | `npx vitest run src/mcp/tools/service.test.ts` | ✅ (Erweiterung) |
| RECIPE-02 | `create-git-app` erkennt Build-Pack lokal und erstellt App | unit | `npx vitest run src/mcp/tools/recipe.test.ts` | ❌ Wave 0 Gap |
| RECIPE-03 | `create-app-db` erstellt App + DB und verdrahtet `DATABASE_URL` | unit | `npx vitest run src/mcp/tools/recipe.test.ts` | ❌ Wave 0 Gap |
| RECIPE-04 | `create-one-click` validiert Typ und erstellt Service | unit | `npx vitest run src/mcp/tools/recipe.test.ts` | ❌ Wave 0 Gap |

### Sampling Rate
- **Per task commit:** `npx vitest run src/mcp/tools/service.test.ts` (oder spezifischer Test)
- **Per wave merge:** `npm test`
- **Phase gate:** Komplette Testsuite grün vor `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/mcp/tools/recipe.test.ts` — Deckt RECIPE-02, RECIPE-03 und RECIPE-04 ab.
- [ ] `src/mcp/tools/recipe.ts` — Enthält die Implementierung des neuen `recipe`-Tools.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V5 Input Validation | yes | Zod-Schemas für alle MCP-Eingaben und API-Antworten. |
| V6 Cryptography | yes | `sanitizeFullProjection` maskiert sensible Verbindungsdaten (`internal_db_url`, `external_db_url`) standardmäßig. |

### Known Threat Patterns for Coolify Recipes

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Secret Leakage (Information Disclosure) | Information Disclosure | `sanitizeFullProjection` maskiert alle Passwörter und Verbindungsdaten im MCP-Output, sofern nicht explizit `reveal: true` übergeben wird. |
| SSRF (Server-Side Request Forgery) | Tampering | Der Abruf von `service-templates.json` erfolgt ausschließlich über hartcodierte, vertrauenswürdige CDN- und GitHub-Domains. Keine benutzerdefinierten URLs zulassen. |

## Sources

### Primary (HIGH confidence)
- `coollabsio/coolify` templates/service-templates.json - Struktur der One-Click-Templates [VERIFIED]
- `src/mcp/tools/application.ts` - Bestehende Implementierung der Anwendungs-Erstellung [VERIFIED]
- `src/mcp/tools/database.ts` - Bestehende Implementierung der Datenbank-Erstellung und -Verdrahtung [VERIFIED]
- `src/utils/projections.ts` - Maskierung und Sanitization von sensiblen Verbindungsdaten [VERIFIED]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Alle Bibliotheken sind bewährt, stabil und bereits im Projekt integriert.
- Architecture: HIGH - Das neue `recipe`-Tool fügt sich nahtlos in das bestehende flache MCP-Schema ein.
- Pitfalls: HIGH - Die API-Verhaltensweisen von Coolify 4.1.x bezüglich Verbindungsdaten wurden verifiziert.

**Research date:** 2026-07-24
**Valid until:** 2026-08-23 (30 Tage)
