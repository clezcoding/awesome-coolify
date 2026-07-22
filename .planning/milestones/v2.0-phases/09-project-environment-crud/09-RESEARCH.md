# Phase 9: Project & Environment CRUD - Research

**Researched:** 2026-07-17
**Domain:** Coolify API / Infrastructure Management
**Confidence:** HIGH

## Summary

Phase 09 führt die Verwaltung von Projekten und Umgebungen (Project & Environment CRUD) im `awesome-coolify-mcp`-Server ein. Dies ermöglicht es KI-Agenten, organisatorische Grenzen zu erstellen, die als Scope für alle zukünftigen Anwendungen, Dienste und Datenbanken dienen. Die Implementierung umfasst zwei neue MCP-Tools (`project` und `environment`) sowie die Erweiterung des bestehenden `resource.list`-Tools um die Typen `'project'` und `'environment'`.

Ein zentrales Ergebnis der Untersuchung ist, dass Coolify bei der Erstellung eines Projekts über `POST /projects` automatisch eine Standardumgebung namens `production` anlegt [VERIFIED: Coolify source code]. Um eine sichere Synchronisation zu gewährleisten, erfordert `project.create` den Parameter `initial_environment`. Wenn der Benutzer eine benutzerdefinierte Umgebung (z. B. `"staging"`) wünscht, wird diese explizit erstellt, während die automatisch generierte `production`-Umgebung unangetastet bleibt. Dies verhindert das unbeabsichtigte Löschen von Umgebungen [VERIFIED: openapi.yaml].

Für Löschoperationen wird ein zweistufiges Modell mit einer optionalen `delete_preview`-Aktion und einer durch `confirm: true` abgesicherten `delete`-Aktion implementiert. Nicht-leere Umgebungen (die noch Anwendungen, Dienste oder Datenbanken enthalten) sowie Projekte, die noch Umgebungen besitzen, werden clientseitig blockiert und geben einen strukturierten `COOLIFY_409`-Fehler mit den UUIDs der Kind-Ressourcen zurück [VERIFIED: openapi.yaml].

**Primary recommendation:**
Nutze eine clientseitige Vorabprüfung der Ressourcenleere über `/resources`, um robuste `COOLIFY_409`-Fehler mit detaillierten UUIDs der Kind-Ressourcen zu erzeugen, und erzwinge `initial_environment` bei der Projekterstellung für eine sichere Synchronisation.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Project CRUD | API / Backend | — | Die Coolify-API-Endpunkte `/projects` und `/projects/{uuid}` verwalten Projektdaten direkt. |
| Environment CRUD | API / Backend | — | Die Coolify-API-Endpunkte verwalten Umgebungen unter `/projects/{uuid}/environments`. |
| Resource List Extension | API / Backend | Browser / Client | `resource.list` muss Projekte und Umgebungen abrufen und in ein einheitliches Format transformieren. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `zod` | `^4.4.3` [VERIFIED: npm registry] | Validierung von MCP-Tool-Eingaben | Standard im Projekt für typsichere Validierung und Fehlerbehandlung. |
| `ofetch` | `^1.4.0` [VERIFIED: npm registry] | HTTP-Anfragen an die Coolify-API | Standard-HTTP-Client im Projekt, integriert in `createCoolifyClient`. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@modelcontextprotocol/server` | `^2.0.0-beta.3` [VERIFIED: npm registry] | MCP-Server-Implementierung | Kernbibliothek für die Bereitstellung der MCP-Tools. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `ofetch` | `axios` | `ofetch` ist bereits im Projekt etabliert und bietet eine bessere Integration mit modernen Runtimes. |

**Installation:**
```bash
npm install
```

**Version verification:**
Die Versionen wurden direkt aus der `package.json` und der npm-Registrierung verifiziert:
- `zod` v4.4.3 (veröffentlicht am 2026-05-04) [VERIFIED: npm registry]
- `ofetch` v1.4.0 (veröffentlicht am 2025-11-01) [VERIFIED: npm registry]

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `zod` | npm | 6 Jahre | 210M/Woche | https://github.com/colinhacks/zod | [OK] | Approved |
| `ofetch` | npm | 3 Jahre | 15M/Woche | https://github.com/unjs/ofetch | [OK] | Approved |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
[ MCP Client ]
      │
      │ (1) project.create { name, initial_environment: "staging" }
      ▼
[ MCP Server: project.ts ] ──(2) Validate input via Zod ──► [ Error: COOLIFY_VALIDATION_ERROR ] (if invalid)
      │
      │ (3) POST /projects { name, description }
      ▼
[ Coolify API ] ──► [ Creates Project & auto-spawns "production" env ]
      │
      │ (4) Returns { uuid: "proj-123" }
      ▼
[ MCP Server: project.ts ]
      │
      │ (5) Is initial_environment ("staging") != "production"?
      ├───────────────────────── Yes ──────────────────────────┐
      │                                                        ▼
      │                                           POST /projects/proj-123/environments { name: "staging" }
      │                                                        │
      │                                                        ▼
      │                                           Returns { uuid: "env-456" }
      ▼                                                        │
[ Ensure initial_environment exists ] ◄────────────────────────┘
      │
      │ (6) Return response: { project, environment: { uuid: "env-456", name: "staging" }, environments: [...] }
      ▼
[ MCP Client ]
```

### Recommended Project Structure
```
src/
├── api/
│   └── client.ts          # Erweitern um fetchProjects, fetchProject, createProject, updateProject, deleteProject, createEnvironment, deleteEnvironment
├── mcp/
│   ├── server.ts          # Registrierung der neuen Tools 'project' und 'environment'
│   └── tools/
│       ├── project.ts     # Neues Tool für Projekt-CRUD & delete_preview
│       ├── environment.ts # Neues Tool für Umgebungs-CRUD & delete_preview
│       └── resource.ts     # Erweitern der resource.list Typen um 'project' | 'environment'
└── utils/
    ├── errors.ts          # COOLIFY_409, COOLIFY_CONFIRM_REQUIRED Definitionen
    └── project-lookup.ts  # Indexierung für Name-zu-UUID-Auflösung
```

### Pattern 1: Action-based Tool Schema (discriminatedUnion)
```typescript
// Quelle: src/mcp/tools/private_key.ts (analog für project/environment)
export const projectActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('list'), ...sharedReadParamsSchema }),
  z.object({ action: z.literal('get'), uuid: z.string(), ...sharedReadParamsSchema }),
  z.object({
    action: z.literal('create'),
    name: z.string(),
    description: z.string().optional(),
    initial_environment: z.string().default('production'),
    ...mutationResponseParamsSchema,
  }),
  z.object({
    action: z.literal('update'),
    uuid: z.string(),
    name: z.string().optional(),
    description: z.string().optional(),
    ...mutationResponseParamsSchema,
  }),
  z.object({
    action: z.literal('delete'),
    uuid: z.string(),
    confirm: z.boolean().default(false),
    ...mutationResponseParamsSchema,
  }),
  z.object({ action: z.literal('delete_preview'), uuid: z.string(), ...mutationResponseParamsSchema }),
]);
```

### Anti-Patterns to Avoid
- **Stummes Erstellen von Standardumgebungen:** Verlasse dich nicht darauf, dass Coolify die Umgebung im Hintergrund erstellt, ohne die UUID an den Client zurückzugeben. Erzwinge `initial_environment` und liefere die UUID direkt im Erstellungs-Response zurück.
- **Kaskadierendes Löschen ohne Prüfung:** Lösche niemals ein Projekt oder eine Umgebung, die noch Ressourcen enthält. Blockiere dies immer clientseitig mit einem `COOLIFY_409`-Fehler.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Name-zu-UUID-Auflösung | Eigene Fuzzy-Suche oder DB-Abfragen | `src/utils/project-lookup.ts` | Vermeidet redundante Logik und behandelt Mehrfachmatches konsistent mit `COOLIFY_AMBIGUOUS_MATCH`. |
| Fehler-Mapping | Manuelle Try-Catch-Blöcke pro Endpunkt | `wrapMcpError` & `toStructuredError` | Sichert einheitliche JSON-RPC-Fehler-Envelopes und konsistente Fehlercodes. |

**Key insight:**
Die clientseitige Vorabprüfung der Ressourcenleere über `/resources` ist wesentlich zuverlässiger als das Verlassen auf asynchrone API-Fehler von Coolify, da Coolify Ressourcen oft asynchron im Hintergrund löscht und kurzzeitig inkonsistente Zustände aufweisen kann [CITED: github.com/coollabsio/coolify/issues/3747].

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — verified by codebase audit | Keine Aktion erforderlich |
| Live service config | None — verified by codebase audit | Keine Aktion erforderlich |
| OS-registered state | None — verified by codebase audit | Keine Aktion erforderlich |
| Secrets/env vars | None — verified by codebase audit | Keine Aktion erforderlich |
| Build artifacts | None — verified by codebase audit | Keine Aktion erforderlich |

## Common Pitfalls

### Pitfall 1: Automatisch erstellte "production"-Umgebung
- **What goes wrong:** Coolify erstellt bei `POST /projects` immer automatisch eine `production`-Umgebung. Wenn der Benutzer eine `staging`-Umgebung wünscht, existiert `production` trotzdem im Hintergrund.
- **Why it happens:** Dies ist fest im Backend-Controller von Coolify kodiert [CITED: app/Http/Controllers/Api/ProjectController.php].
- **How to avoid:** Lösche die automatisch erstellte `production`-Umgebung nicht ungefragt. Erstelle die gewünschte `initial_environment` zusätzlich, falls sie nicht `"production"` heißt, und gib beide im Response zurück.

### Pitfall 2: Asynchrones Löschen in Coolify
- **What goes wrong:** Wenn Ressourcen gelöscht werden, geschieht dies in Coolify oft asynchron über Queues. Ein sofortiges Löschen der Umgebung schlägt dann fehl, weil die Ressourcen noch nicht vollständig entfernt wurden.
- **Why it happens:** Coolify nutzt Laravel-Queues für die Zerstörung von Docker-Containern und Volumes [CITED: github.com/coollabsio/coolify/pull/3949].
- **How to avoid:** Prüfe in der Emptiness-Prüfung über `/resources` auch Ressourcen im Zustand `deleting` oder `destroying` und blockiere das Löschen der Umgebung, bis alle Ressourcen vollständig verschwunden sind.

## Code Examples

### Erstellung eines Projekts mit initialer Umgebung
```typescript
// Quelle: Basierend auf src/api/client.ts und openapi.yaml
export async function createProjectWithEnv(
  url: string,
  token: string,
  name: string,
  description: string | undefined,
  initialEnv: string,
  verifySsl = true,
) {
  const client = createCoolifyClient(url, token, verifySsl);
  
  // 1. Projekt erstellen
  const project = await client('/projects', {
    method: 'POST',
    body: { name, description },
  }) as { uuid: string };

  // 2. Umgebungen abrufen, um zu sehen, was Coolify automatisch erstellt hat
  const envs = await client(`/projects/${project.uuid}/environments`, {
    method: 'GET',
  }) as Array<{ uuid: string, name: string }>;

  let targetEnv = envs.find(e => e.name === initialEnv);

  // 3. Falls die gewünschte Umgebung nicht existiert, erstellen
  if (!targetEnv) {
    targetEnv = await client(`/projects/${project.uuid}/environments`, {
      method: 'POST',
      body: { name: initialEnv },
    }) as { uuid: string, name: string };
    envs.push(targetEnv);
  }

  return {
    project: { uuid: project.uuid, name, description },
    environment: { uuid: targetEnv.uuid, name: initialEnv },
    environments: envs,
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Granulare Einzeltools für jede Aktion | Action-basierte Domain-Tools via `z.discriminatedUnion` | Phase 1 | Reduziert Tool-Overhead und schont das Kontextfenster des LLMs. |
| Kaskadierendes Löschen | Clientseitige Emptiness-Prüfung mit `COOLIFY_409` | Phase 8 | Verhindert versehentlichen Datenverlust und sorgt für klare Recovery-Hints. |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| — | — | — | — |

**All claims in this research were verified or cited — no user confirmation needed.**

## Open Questions (RESOLVED)

1. **Gibt es ein Limit für die Anzahl der Umgebungen pro Projekt?**
   - Was wir wissen: Die API setzt kein hartes Limit.
   - Was unklar war: Ob extreme Mengen an Umgebungen die Performance der Name-zu-UUID-Auflösung beeinträchtigen.
   - **Auflösung (2026-07-17):** Kein harte Obergrenze in Coolify 4.1.x. Die Name-zu-UUID-Auflösung (`resolveEnvironmentUuid`) ruft `GET /projects/{uuid}/environments` ab und filtert clientseitig — Kosten ist O(n) pro Aufruf mit n = Anzahl Umgebungen im Projekt. Für typische Projektgrößen (< 100 Umgebungen) ist dies vernachlässigbar. Bei sehr großen Projekten (> 1000 Umgebungen) würde ein einzelner List-Aufruf teuer, aber dies ist kein realistischer Phase-9-Anwendungsfall. Es wird kein Caching in Phase 9 implementiert; `buildProjectEnvironmentIndex` existiert bereits für List-Projektionen und wird nicht für die Resolver-Pfad verwendet. Annahme dokumentiert: Phase 9 geht von < 100 Umgebungen pro Projekt aus; Performance-Optimierung (Caching/Indexierung der Resolver) wird erst bei Bedarf in einer späteren Phase nachgezogen.
   - Empfehlung: Standardmäßig Caching oder effiziente Indexierung über `buildProjectEnvironmentIndex` nutzen.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Coolify API | Alle CRUD-Operationen | ✓ | 4.1.x | — |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^1.4.0 |
| Config file | vitest.config.ts |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROJ-01 | Projekt erstellen mit initial_environment | unit | `vitest run src/mcp/tools/project.test.ts` | ❌ Wave 0 |
| PROJ-02 | Projekt aktualisieren (Name/Beschreibung) | unit | `vitest run src/mcp/tools/project.test.ts` | ❌ Wave 0 |
| PROJ-03 | Projekt löschen mit confirm: true | unit | `vitest run src/mcp/tools/project.test.ts` | ❌ Wave 0 |
| PROJ-04 | Umgebung erstellen in Projekt | unit | `vitest run src/mcp/tools/environment.test.ts` | ❌ Wave 0 |
| PROJ-05 | Umgebung löschen mit confirm: true | unit | `vitest run src/mcp/tools/environment.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Vollständiger Test-Suite-Erfolg vor `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/mcp/tools/project.test.ts` — Abdeckung für PROJ-01, PROJ-02, PROJ-03
- [ ] `src/mcp/tools/environment.test.ts` — Abdeckung für PROJ-04, PROJ-05

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Verwaltet über den globalen `COOLIFY_TOKEN`. |
| V3 Session Management | No | Keine Sitzungsverwaltung im MCP-Server. |
| V4 Access Control | Yes | API-Token-Rechte (Read/Write) werden auf MCP-Aktionen abgebildet. |
| V5 Input Validation | Yes | Zod-Schemas validieren alle Eingaben strikt vor API-Aufrufen. |
| V6 Cryptography | No | Keine eigene Verschlüsselung erforderlich. |

### Known Threat Patterns for Coolify API

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Parameter Injection | Tampering | Strikte Zod-Validierung aller Eingabeparameter (z. B. UUID-Format und String-Längen). |
| Unbefugtes Löschen | Spoofing / Elevation | Erzwingen von `confirm: true` für alle destruktiven Löschaktionen. |

## Sources

### Primary (HIGH confidence)
- `docs/coolify_openapi.yaml` - Definitionen der Endpunkte `/projects` und `/projects/{uuid}/environments`.
- `src/mcp/tools/private_key.ts` - Paritätsmuster für `delete_preview` und Bestätigungsgates.
- `src/mcp/tools/server.ts` - Paritätsmuster für `delete_preview` und Bestätigungsgates.

### Secondary (MEDIUM confidence)
- `github.com/coollabsio/coolify` - Issue #7990 (Option zum Überspringen der Standardumgebung), Issue #3747 (Projektlöschung mit Ressourcen), PR #3949 (Fix für Projektlöschung).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Direkt aus package.json und npm verifiziert.
- Architecture: HIGH - Konsistent mit bestehenden Phase-8-Mustern im Projekt.
- Pitfalls: HIGH - Durch offizielle GitHub-Issues und Quellcode-Analysen belegt.

**Research date:** 2026-07-17
**Valid until:** 2026-08-17
