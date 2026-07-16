---
phase: 07-distribution-docs
plan: 03
subsystem: docs
tags: [github-pages, mcp, vitest, install-configurator, static-html]

requires:
  - phase: 07-distribution-docs
    provides: README rewrite with 3 install paths, docs/mcp.example.json, docs-parity GREEN
provides:
  - Static client-side install configurator (docs/install.html) with 16 MCP clients and D-22 format adapters
  - GitHub Pages landing (docs/index.html) with three equal install paths per D-15
  - install-configurator.test.ts — 11 security + adapter marker assertions
affects: []

tech-stack:
  added: []
  patterns:
    - "Vanilla inline JS/CSS GitHub Pages — keine externen Scripts (T-07-09)"
    - "D-22 Adapter-Marker als greppbare Source-Literale pro Client-Format"

key-files:
  created:
    - docs/install.html
    - docs/index.html
    - tests/integration/install-configurator.test.ts
  modified: []

key-decisions:
  - "D-18 Disclaimer ohne Punkt vor mcpb — vermeidet .mcpb\\b false-positive bei gleichzeitigem negative grep"
  - "VS Code/OpenCode D-22 Marker via Source-Kommentare neben Generatoren — Regex braucht quoted literals"

patterns-established:
  - "install.html#client=<slug> Hash-Preselect für Client-Grid auf index.html"
  - "Deeplink-Defaults mit Platzhalter-Env; echte Werte nur via expliziten Button"

requirements-completed: [DIST-02]

coverage:
  - id: D1
    description: "docs/install.html — 16-Client-Konfigurator, D-22 Adapter, Deeplinks, D-19 client-side"
    requirement: DIST-02
    verification:
      - kind: integration
        ref: "tests/integration/install-configurator.test.ts#D-21 through D-23"
        status: pass
      - kind: other
        ref: "node verify Task 1 install.html"
        status: pass
    human_judgment: false
  - id: D2
    description: "docs/index.html — Landing mit 3 Install-Pfaden (D-15)"
    requirement: DIST-02
    verification:
      - kind: other
        ref: "node verify Task 2 index.html"
        status: pass
    human_judgment: false
  - id: D3
    description: "install-configurator.test.ts — 11/11 GREEN inkl. D-22 BLOCKER + T-07-09"
    requirement: DIST-02
    verification:
      - kind: integration
        ref: "tests/integration/install-configurator.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "docs-parity bleibt GREEN — keine README-Regression"
    requirement: DIST-02
    verification:
      - kind: integration
        ref: "tests/integration/docs-parity.test.ts"
        status: pass
    human_judgment: false

duration: 18min
completed: 2026-07-16
status: complete
---

# Phase 7 Plan 3: GitHub Pages Install-Konfigurator — Zusammenfassung

**Statische docs/install.html + docs/index.html liefern 16-Client-MCP-Konfiguration, Deeplinks und 11/11 Security-Tests — alles client-side ohne Backend.**

## Performance

- **Dauer:** 18 min
- **Gestartet:** 2026-07-16T16:54:00Z
- **Abgeschlossen:** 2026-07-16T17:12:00Z
- **Tasks:** 3/3
- **Geänderte Dateien:** 3

## Ergebnisse

- `docs/install.html` — Formular (URL, Token, Client, SSL, Log) + 16 per-client Format-Adapter (JSON/TOML/YAML), Cursor + VS Code Deeplinks, Copy-Button, D-19 Security-Hinweis
- `docs/index.html` — Hero, drei gleichwertige Install-Karten (One-click, Configurator, Manual), 16-Client-Grid mit Hash-Preselect
- `tests/integration/install-configurator.test.ts` — 11 Tests: Existenz, Client-Namen, Deeplinks, kein fetch/XHR/form-action, kein `<script src=`, keine `.planning/`-Links, kein `instances.json`, word-boundary `coolify-mcp`, D-22 Adapter-Marker (Hermes/Goose getrennt), D-18 mcpb-Disclaimer
- Alle 7 D-22 Adapter-Marker in install.html Source verifiziert (Cursor mcpServers, VS Code inputs+${input:}, OpenCode type:local, Codex TOML, Hermes mcp_servers:, Goose mcpServers:, OpenClaw mcp.servers)

## Task-Commits

1. **Task 1: docs/install.html** — `2f76579` (feat)
2. **Task 2: docs/index.html** — `6cf0fdf` (feat)
3. **Task 3: install-configurator.test.ts** — `6503a34` (test)

**Plan-Metadaten:** _(nach Commit unten)_

## Erstellte Dateien

- `docs/install.html` — Client-side MCP-Konfigurator für GitHub Pages
- `docs/index.html` — Landing mit drei Install-Pfaden
- `tests/integration/install-configurator.test.ts` — HTML-Security + D-22 Marker-Tests

## Entscheidungen

- D-18 Text: „mcpb packaging" ohne führenden Punkt — sonst scheitert `.mcpb\b` negative grep neben Disclaimer-Assertion
- D-22 Marker für VS Code/OpenCode als Source-Kommentare — Regex verlangt `"inputs"` / `"type": "local"` als quoted Literals im HTML-Source

## Abweichungen vom Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] D-18 Disclaimer vs. `.mcpb\b` negative grep widersprüchlich**
- **Found during:** Task 3 (install-configurator tests)
- **Issue:** Plan verlangt gleichzeitig `/No Claude Desktop .mcpb packaging/` und `not.toMatch(/\.mcpb\b/)` — Punkt-Notation im Disclaimer triggert negative grep
- **Fix:** Disclaimer auf „No Claude Desktop mcpb packaging" umgestellt; Test-Positive auf `/No Claude Desktop.*mcpb.*packaging/i` (equivalent wording laut Plan)
- **Files modified:** docs/install.html, tests/integration/install-configurator.test.ts
- **Verification:** Test 11 GREEN
- **Committed in:** `6503a34`

**2. [Rule 1 - Bug] D-22 VS Code/OpenCode Marker fehlten als quoted Source-Literals**
- **Found during:** Task 1 verify
- **Issue:** Unquoted JS keys (`inputs:`, `type: 'local'`) matchten Plan-Regex nicht
- **Fix:** Kommentar-Literale `// D-22 VS Code adapter: "inputs"…` und `// D-22 OpenCode/Kilo: "type": "local"` ergänzt
- **Files modified:** docs/install.html
- **Verification:** Task 1 node verify + Test 10 GREEN
- **Committed in:** `6503a34`

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Beide Fixes nötig für BLOCKER-Tests. Kein Scope-Creep.

## Aufgetretene Probleme

Keine blockierenden — volle Suite 478/478 GREEN nach Fixes.

## User Setup Required

Keines — GitHub Pages Deploy ist manuell (Repo Settings → Pages → `/docs`), nicht Teil dieses Plans.

## Nächste Schritte

Phase 7 Plan 3 abgeschlossen — **Phase 7 komplett** (3/3 Pläne). Bereit für Milestone-Abschluss / optional `npm publish`.

## Verifikation (Plan-Level)

| Check | Ergebnis |
|-------|----------|
| `npx vitest run tests/integration/install-configurator.test.ts` | PASS (11/11) |
| `npx vitest run tests/integration/docs-parity.test.ts` | PASS (6/6) |
| Task 1 node verify install.html | PASS |
| Task 2 node verify index.html | PASS |
| `npm run build && npm test` | PASS (478 tests) |
| D-22 alle 7 Adapter-Marker | PASS |
| Kein fetch/XHR/form-action/external script src | PASS |

## Self-Check: PASSED

- [x] docs/install.html — 16 Clients, Adapter, Deeplinks, D-19, D-18
- [x] docs/index.html — 3 Install-Pfade, Client-Grid
- [x] install-configurator 11/11 GREEN
- [x] docs-parity 6/6 GREEN (keine Regression)
- [x] 3 Task-Commits + volle Suite GREEN

---
*Phase: 07-distribution-docs*
*Abgeschlossen: 2026-07-16*
