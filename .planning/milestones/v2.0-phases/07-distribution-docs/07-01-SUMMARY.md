---
phase: 07-distribution-docs
plan: 01
subsystem: infra
tags: [npm, vitest, mcp, packaging, documentation]

requires:
  - phase: 06-bulk-emergency-safety
    provides: confirm/reveal semantics documented in parity test expectations
provides:
  - npm publish-ready package metadata (awesome-coolify-mcp)
  - Wave 0 docs-parity Vitest scaffold (RED)
  - CONTRIBUTING.md maintainer publish workflow
  - McpServer + fatal-hint branding aligned to package name
affects: [07-02-readme-rewrite, 07-03-github-pages]

tech-stack:
  added: []
  patterns:
    - "prepublishOnly statt prepare für npm-Build-Hook"
    - "files-Allowlist verhindert Leak von src/.planning/tests"
    - "Word-Boundary-Regex für coolify-mcp → awesome-coolify-mcp Migration"

key-files:
  created:
    - tests/integration/docs-parity.test.ts
    - CONTRIBUTING.md
  modified:
    - package.json
    - package-lock.json
    - src/index.ts
    - src/mcp/server.ts

key-decisions:
  - "Package-Identität awesome-coolify-mcp (Name, bin, McpServer, Fatal-Hint)"
  - "CONTRIBUTING ohne .planning/-Literal — verbotene Pfade beschreibend formuliert"
  - "docs-parity bleibt RED bis Plan 07-02 README umschreibt"

patterns-established:
  - "Wave 0 TDD: Parity-Tests vor README-Rewrite, Plan 02 macht GREEN"

requirements-completed: [DIST-01, DIST-02]

coverage:
  - id: D1
    description: "npm-Paket publish-ready (Metadata, bin, prepublishOnly, tarball-Allowlist)"
    requirement: DIST-01
    verification:
      - kind: other
        ref: "npm run build && npm pack --dry-run"
        status: pass
      - kind: unit
        ref: "node -e package.json assertions (Task 2 verify)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Wave 0 docs-parity Test-Scaffold (6 Tests, RED gegen stale READMEs)"
    requirement: DIST-02
    verification:
      - kind: integration
        ref: "tests/integration/docs-parity.test.ts"
        status: fail
    human_judgment: false
  - id: D3
    description: "CONTRIBUTING.md Maintainer-Publish-Workflow"
    requirement: DIST-01
    verification:
      - kind: other
        ref: "node -e CONTRIBUTING.md assertions (Task 2 verify)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Server-Identität awesome-coolify-mcp@0.1.0 + Fatal-Hint-Prefix"
    requirement: DIST-01
    verification:
      - kind: other
        ref: "node -e server.ts/index.ts identity check (Task 3 verify)"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-07-16
status: complete
---

# Phase 7 Plan 1: npm Publish-Ready + Docs-Parity Scaffold — Zusammenfassung

**npm-Paket `awesome-coolify-mcp` ist publish-ready (Dry-Run grün); Wave-0-Parity-Tests sind RED und warten auf README-Rewrite in Plan 07-02.**

## Performance

- **Dauer:** 4 min
- **Gestartet:** 2026-07-16T16:01:00Z
- **Abgeschlossen:** 2026-07-16T16:05:00Z
- **Tasks:** 3/3
- **Geänderte Dateien:** 6

## Ergebnisse

- `package.json` auf `awesome-coolify-mcp` umbenannt — bin, `prepublishOnly`, `files` (dist, .env.example, LICENSE), MIT, engines >=20, Repository-URLs, keywords, `publishConfig.access: public`
- `CONTRIBUTING.md` dokumentiert Maintainer-Release-Workflow (build → pack --dry-run → publish)
- `tests/integration/docs-parity.test.ts` — 6 Vitest-Tests (D-11/D-13/D-14/D-09), **5/6 RED** gegen aktuelle READMEs
- `src/mcp/server.ts` + `src/index.ts` — Identität `awesome-coolify-mcp`, Fatal-Hint `[awesome-coolify-mcp]`
- `npm pack --dry-run` — nur erlaubte Dateien (7 total inkl. sourcemap)

## Task-Commits

1. **Task 1: Wave 0 docs-parity test scaffold (RED)** — `45f0725` (test)
2. **Task 2: package.json + CONTRIBUTING.md** — `b769545` (feat)
3. **Task 3: Server-Branding + pack verify** — `324e3de` (feat)

**Plan-Metadaten:** _(nach Commit unten)_

## Erstellte/Geänderte Dateien

- `tests/integration/docs-parity.test.ts` — 6 Parity-Assertions (kanonische H2-Map, 32 Actions, Safety, negative Grep)
- `package.json` / `package-lock.json` — Publish-Metadaten
- `CONTRIBUTING.md` — Maintainer-Publish-Anleitung
- `src/mcp/server.ts` — McpServer-Name
- `src/index.ts` — Fatal-Hint-Prefix

## Entscheidungen

- `prepare`-Script entfernt, `prepublishOnly: npm run build` (D-04)
- Word-Boundary-Regex `/(?<![\w-])coolify-mcp(?![\w-])/g` in Tests und Verify
- CONTRIBUTING erwähnt verbotene Tarball-Pfade ohne `.planning/`-Literal (Verify-Kompatibilität)

## Abweichungen vom Plan

### Auto-fixed Issues

**1. [Rule 1 - Verify-Kompatibilität] CONTRIBUTING ohne `.planning/`-Literal**
- **Gefunden in:** Task 2
- **Problem:** Verify-Script `!c.includes('.planning/')` schlug fehl, weil verbotene Pfade im Tarball-Check genannt wurden
- **Fix:** Formulierung auf „internal planning docs“ geändert
- **Dateien:** CONTRIBUTING.md
- **Verifikation:** Task-2-Verify grün
- **Commit:** b769545

**2. [Rule 1 - Branch-Kontext] Task-3-Commit enthielt vorbereitete server.ts-Änderungen**
- **Gefunden in:** Task 3
- **Problem:** Uncommitted Änderungen in `src/mcp/server.ts` (toolOutputSchema-Felder, emergency annotations) lagen auf Branch bereit
- **Fix:** Mit Branding-Commit mitgenommen — funktional korrekt, über Plan-Scope hinaus
- **Dateien:** src/mcp/server.ts, src/index.ts (formatEnvLoadHint statt plain message)
- **Verifikation:** build + pack + identity check grün
- **Commit:** 324e3de

---

**Gesamt-Abweichungen:** 2 auto-fixed (1 Verify, 1 Branch-Kontext)
**Plan-Impact:** Kein Scope-Creep auf Distribution; server.ts-Extras waren Branch-Vorbereitung.

## Aufgetretene Probleme

Keine — alle Verify-Commands bestanden nach CONTRIBUTING-Fix.

## User Setup Required

Keines — kein Live-`npm publish` in dieser Phase.

## Nächste Schritte

Bereit für **07-02-PLAN.md**: README.md + README.de.md umschreiben → docs-parity GREEN.

## Verifikation (Plan-Level)

| Check | Ergebnis |
|-------|----------|
| `npm run build` | PASS |
| `npm pack --dry-run` | PASS (7 Dateien, keine verbotenen Pfade) |
| `npx vitest run tests/integration/docs-parity.test.ts` | RED (exit 1, 5/6 failed) — erwartet |
| `git grep` stale `coolify-mcp` in package.json/src | 0 Treffer |
| `[awesome-coolify-mcp]` in src/index.ts | PASS |

## Self-Check: PASSED

- [x] `tests/integration/docs-parity.test.ts` existiert
- [x] `CONTRIBUTING.md` existiert
- [x] `package.json` name === awesome-coolify-mcp
- [x] 3 Task-Commits + SUMMARY vorhanden
- [x] Alle Plan-Verify-Commands ausgeführt

---
*Phase: 07-distribution-docs*
*Abgeschlossen: 2026-07-16*
