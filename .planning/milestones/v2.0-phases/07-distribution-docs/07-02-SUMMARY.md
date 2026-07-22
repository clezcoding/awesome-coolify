---
phase: 07-distribution-docs
plan: 02
subsystem: docs
tags: [readme, i18n, mcp, vitest, distribution]

requires:
  - phase: 07-distribution-docs
    provides: npm publish-ready package identity awesome-coolify-mcp, Wave 0 docs-parity scaffold
provides:
  - Full EN/DE README rewrite with 11-section structural parity
  - Complete 10-tool / 32-action reference table in both locales
  - Three install paths (deeplink, Pages configurator, manual)
  - Safety section (confirm + reveal) in EN and DE
  - docs/mcp.example.json updated to npx awesome-coolify-mcp
affects: [07-03-github-pages]

tech-stack:
  added: []
  patterns:
    - "Kanonische EN↔DE H2-Map für docs-parity.test.ts"
    - "Community-README ohne .planning/-Links und ohne instances.json-Marketing"

key-files:
  created: []
  modified:
    - README.md
    - README.de.md
    - docs/mcp.example.json

key-decisions:
  - "README 11 H2-Sections exakt laut Plan (Why → License / Warum → Lizenz)"
  - "Alle 32 Action-Literale verbatim in beiden READMEs für grep-basierte Parity-Tests"
  - "D-18 Claude Desktop .mcpb-Hinweis in Clients-Section, nicht als Install-Pfad"

patterns-established:
  - "Deeplink-Platzhalter in README erlaubt; Secrets bevorzugt über docs/install.html"

requirements-completed: [DIST-02]

coverage:
  - id: D1
    description: "README.md EN — 11 Sections, 32 Actions, 3 Install-Pfade, Safety"
    requirement: DIST-02
    verification:
      - kind: integration
        ref: "tests/integration/docs-parity.test.ts#D-11 structural H2 parity"
        status: pass
      - kind: other
        ref: "node -e README.md verify (Task 1)"
        status: pass
    human_judgment: false
  - id: D2
    description: "README.de.md DE — volle strukturelle Parität zu EN"
    requirement: DIST-02
    verification:
      - kind: integration
        ref: "tests/integration/docs-parity.test.ts#D-09 full action inventory"
        status: pass
      - kind: other
        ref: "node -e README.de.md verify (Task 2)"
        status: pass
    human_judgment: false
  - id: D3
    description: "docs/mcp.example.json — npx -y awesome-coolify-mcp"
    requirement: DIST-02
    verification:
      - kind: other
        ref: "node -e mcp.example.json verify (Task 3)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Wave 0 docs-parity — 6/6 Tests GREEN"
    requirement: DIST-02
    verification:
      - kind: integration
        ref: "tests/integration/docs-parity.test.ts"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-07-16
status: complete
---

# Phase 7 Plan 2: README-Rewrite + Docs-Parity GREEN — Zusammenfassung

**README.md und README.de.md dokumentieren alle 10 Tools und 32 Actions, drei Install-Pfade und Safety — Wave-0-docs-parity ist 6/6 GREEN.**

## Performance

- **Dauer:** 12 min
- **Gestartet:** 2026-07-16T16:06:00Z
- **Abgeschlossen:** 2026-07-16T16:18:00Z
- **Tasks:** 3/3
- **Geänderte Dateien:** 3

## Ergebnisse

- `README.md` komplett neu — 11 H2-Sections, 32-Action-Tabelle, Deeplink + Konfigurator + Manual, `## Safety` mit confirm/reveal
- `README.de.md` — strukturelle Parität via kanonischer EN↔DE-Map (11 Sections, identische Action-Literale)
- `docs/mcp.example.json` — `npx -y awesome-coolify-mcp`, Server-Key `awesome-coolify-mcp`
- Keine `.planning/`-Links, kein `YOUR_ORG`, kein `instances.json`, kein stale `coolify-mcp`-Name
- `npx vitest run tests/integration/docs-parity.test.ts` — **6/6 GREEN**

## Task-Commits

1. **Task 1: README.md (EN)** — `544361e` (feat)
2. **Task 2: README.de.md (DE)** — `dc3141b` (feat)
3. **Task 3: mcp.example.json + Parity GREEN** — `632b84f` (feat)

**Plan-Metadaten:** _(nach Commit unten)_

## Erstellte/Geänderte Dateien

- `README.md` — Community-Doku EN (Why, Quick start, Install, Clients, Env, Tools, Safety, Errors, Not in v1, Development, License)
- `README.de.md` — Deutsche Parität (Warum, Schnellstart, Installation, …)
- `docs/mcp.example.json` — Cursor-Beispiel mit npx

## Entscheidungen

- H2-Reihenfolge exakt laut Plan — Parity-Test prüft Position-by-Position
- Action-Literale unverändert (Englisch) in DE-README — technische Identifikatoren bleiben EN
- CONTRIBUTING.md-Verweis statt inline Publish-Schritte (D-01)

## Abweichungen vom Plan

None - plan executed exactly as written.

## Aufgetretene Probleme

Keine — alle Verify-Commands und docs-parity-Tests bestanden beim ersten Durchlauf.

## User Setup Required

Keines — kein Live-npm-publish oder GitHub-Pages-Deploy in diesem Plan.

## Nächste Schritte

Bereit für **07-03-PLAN.md**: GitHub-Pages-Konfigurator (`docs/install.html`).

## Verifikation (Plan-Level)

| Check | Ergebnis |
|-------|----------|
| `npx vitest run tests/integration/docs-parity.test.ts` | PASS (6/6) |
| Task 1 node verify README.md | PASS |
| Task 2 node verify README.de.md | PASS |
| Task 3 mcp.example.json verify | PASS |
| `npm run build && npm test` | PASS (467 tests) |

## Self-Check: PASSED

- [x] README.md — 11 H2, 32 Actions, Safety, 3 Install-Pfade
- [x] README.de.md — kanonische Parität
- [x] docs/mcp.example.json — npx awesome-coolify-mcp
- [x] docs-parity 6/6 GREEN
- [x] 3 Task-Commits vorhanden

---
*Phase: 07-distribution-docs*
*Abgeschlossen: 2026-07-16*
