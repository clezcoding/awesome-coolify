---
phase: 07-distribution-docs
verified: 2026-07-16T19:12:00Z
status: gaps_found
score: 25/27 must-haves verified (committed state)
behavior_unverified: 0
behavior_unverified_items: []
re_verification:
  previous_status: passed
  previous_score: 27/27
  previous_verified: 2026-07-16T18:20:00Z
  gaps_closed:
    - "UAT 19/20 (project_name lookup) — closed by 07-04"
    - "UAT 29 (service stop/start docker_cleanup) — closed by 07-05"
  gaps_remaining:
    - "Committed docs-parity test fails 2/6 against committed README (regression from commit 3559efb)"
  regressions:
    - "Truth 8 (H2 structure 11 canonical) — committed README has 14 H2, working tree 17 H2"
    - "Truth 18 (docs-parity GREEN) — committed state 2/6 fail; working tree 6/6 pass (uncommitted)"
gaps:
  - truth: "README.md und README.de.md haben identische H2-Struktur (11 kanonische Sections, position-by-position EN↔DE-Map)"
    status: failed
    reason: "Commit 3559efb (docs: redesign README, 18:46) — nach prior VERIFICATION (18:20) — änderte README-Struktur von 11 H2 auf 14 H2 mit umbenannten Sektionen ('Safety'→'Safety model', 'Why' entfernt, etc.). Committe Test-Datei erwartet noch 11 H2 mit '## Safety' Heading → 2/6 docs-parity Tests fail in committed state. Working tree hat uncommitted Fixes (README 17 H2 mit Emojis + Test-Datei aktualisiert auf 17 kanonische Sections) → 6/6 pass, aber uncommitted."
    artifacts:
      - path: "README.md"
        issue: "17 H2 (working tree) / 14 H2 (committed) statt 11 kanonisch; '## 🛡️ Safety model' statt '## Safety'"
      - path: "README.de.md"
        issue: "17 H2 (working tree) / 14 H2 (committed) statt 11 kanonisch; '## 🛡️ Sicherheitsmodell' statt '## Sicherheit'"
      - path: "tests/integration/docs-parity.test.ts"
        issue: "Committed Version erwartet 11 H2 mit '## Safety' Heading — bricht gegen redesigned README; Working-Tree-Version aktualisiert auf 17 H2 mit Emoji-Headings (uncommitted)"
    missing:
      - "Commit working-tree alignment: README.md + README.de.md + tests/integration/docs-parity.test.ts + docs/assets/README.md + docs/assets/coming-soon.png + docs/assets/hero-banner.png mit docs(07) commit message"
      - "Danach: npm test → 492/492 GREEN; docs-parity 6/6 GREEN"
  - truth: "vitest run tests/integration/docs-parity.test.ts ist GREEN (committed state)"
    status: failed
    reason: "Committed state (HEAD 7870e11): 2/6 docs-parity Tests fail (Safety section heading mismatch + H2 count mismatch). Working tree: 6/6 GREEN (uncommitted). Full npm test working tree: 492/492 GREEN."
    artifacts:
      - path: "tests/integration/docs-parity.test.ts"
        issue: "Committed test canonical map (11 Sections, '## Safety') mismatch mit committed README (14 H2, '## Safety model')"
    missing:
      - "Commit working-tree test file alignment (siehe gap oben)"
---

# Phase 7: Distribution & Docs Re-Verification Report

**Phase Goal:** As a community user, I want npm install and complete GitHub README, so that I can adopt the MCP without reading source code.
**Verified:** 2026-07-16T19:12:00Z
**Status:** gaps_found
**Re-verification:** Yes — after 07-04/07-05 gap closure; docs-parity regression entdeckt

## Goal Achievement

### Observable Truths

#### Plan 07-01 (npm publish-ready packaging)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `npm pack --dry-run` succeeds, tarball nur dist/.env.example/LICENSE/README.md/README.de.md | ✓ VERIFIED | Exit 0; 7 files, keine verbotenen Pfade |
| 2 | package.json name=`awesome-coolify-mcp`, bin→`./dist/index.js` | ✓ VERIFIED | package.json:1-8 |
| 3 | prepublishOnly=`npm run build`, kein prepare | ✓ VERIFIED | package.json:15 |
| 4 | server.ts McpServer name+version | ✓ VERIFIED | `new McpServer({ name: 'awesome-coolify-mcp', version: '0.1.0' })` |
| 5 | src/index.ts Fatal-Hint-Prefix | ✓ VERIFIED | `[awesome-coolify-mcp]` present |
| 6 | docs-parity.test.ts Wave-0-Scaffold existiert | ✓ VERIFIED | File present, 17 canonical sections in working tree |
| 7 | CONTRIBUTING.md Maintainer-Workflow ohne .planning/.mcpb | ✓ VERIFIED | 0× `.planning/`, 0× `.mcpb` |

#### Plan 07-02 (README rewrite + docs-parity GREEN)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 8 | README.md + README.de.md identische H2-Struktur (11 kanonisch) | ✗ FAILED | Committed: 14 H2; Working tree: 17 H2 mit Emoji-Headings; Test-Datei in Working Tree auf 17 aktualisiert (uncommitted) |
| 9 | Beide READMEs: 10 Tools / 32 Action-Literals | ✓ VERIFIED | Alle 32 Actions in EN+DE Working-Tree-README greppbar |
| 10 | Drei Install-Pfade (Deeplink/Pages/Manual) | ✓ VERIFIED | EN+DE: `### 1. One-click deeplink`, `### 2. Install configurator`, `### 3. Manual MCP config` |
| 11 | docs/install.html, cursor://, vscode:mcp/install in EN; docs/install.html in DE | ✓ VERIFIED | Alle Marker present |
| 12 | Safety/Sicherheit Section mit confirm+reveal | ✓ VERIFIED | `## 🛡️ Safety model` / `## 🛡️ Sicherheitsmodell` + confirm + reveal in Working Tree |
| 13 | Kein README linkt auf .planning/ | ✓ VERIFIED | 0× `.planning/` in EN+DE |
| 14 | Kein README bewirbt instances.json | ✓ VERIFIED | 0× `instances.json` in EN+DE |
| 15 | Keine YOUR_ORG/LICENSE-to-be-added/alter coolify-mcp-Name | ✓ VERIFIED | 0× YOUR_ORG, 0× stale coolify-mcp (word-boundary) |
| 16 | Beide READMEs referenzieren CONTRIBUTING.md | ✓ VERIFIED | EN+DE enthalten CONTRIBUTING.md |
| 17 | docs/mcp.example.json nutzt awesome-coolify-mcp via npx -y | ✓ VERIFIED | `command: 'npx'`, `args: ['-y','awesome-coolify-mcp']` |
| 18 | docs-parity.test.ts GREEN (committed state) | ✗ FAILED | Committed 2/6 fail; Working tree 6/6 pass (uncommitted) |

#### Plan 07-03 (GitHub Pages configurator)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 19 | docs/install.html statisches client-side Formular | ✓ VERIFIED | HTML present, Inline-CSS/JS |
| 20 | ≥15 MCP-Clients mit Per-Client-Adaptern | ✓ VERIFIED | 16/16 Client-Namen |
| 21 | D-22 Adapter-Marker (Cursor/VSCode/OpenCode/Codex/Hermes/Goose/OpenClaw) | ✓ VERIFIED | Alle 7 Marker |
| 22 | Kein Backend-POST/fetch | ✓ VERIFIED | 0× fetch/XMLHttpRequest/form action |
| 23 | Keine externen Scripts | ✓ VERIFIED | 0× `<script src=` |
| 24 | Cursor-Deeplink + VS Code vscode:mcp/install client-side | ✓ VERIFIED | `cursor://anysphere`, `vscode:mcp/install` |
| 25 | docs/index.html Landing mit 3 Pfaden | ✓ VERIFIED | One-click/Configurator/Manual + install.html Link |
| 26 | Keine Community-Doc linkt auf .planning/ | ✓ VERIFIED | 0× `.planning/` in install.html/index.html |
| 27 | install-configurator.test.ts GREEN | ✓ VERIFIED | 11/11 Tests GREEN |

**Score:** 25/27 truths verified (committed state); 2 FAILED (Truths 8 + 18)
**Working tree (uncommitted):** 27/27 would pass if README+test alignment committed

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| package.json | ✓ VERIFIED | name, bin, prepublishOnly, files, license, engines, repository, publishConfig |
| src/mcp/server.ts | ✓ VERIFIED | awesome-coolify-mcp@0.1.0 |
| src/index.ts | ✓ VERIFIED | [awesome-coolify-mcp] Fatal hint |
| tests/integration/docs-parity.test.ts | ⚠️ UNCOMMITTED CHANGES | Working tree updated to 17 canonical sections; committed still 11 |
| CONTRIBUTING.md | ✓ VERIFIED | Maintainer publish workflow, no .planning/.mcpb |
| README.md | ⚠️ REDESIGNED UNCOMMITTED | 17 H2 emoji structure; committed 14 H2; both ≠ original 11 canonical |
| README.de.md | ⚠️ REDESIGNED UNCOMMITTED | 17 H2 emoji structure; committed 14 H2; both ≠ original 11 canonical |
| docs/mcp.example.json | ✓ VERIFIED | npx -y awesome-coolify-mcp |
| docs/install.html | ✓ VERIFIED | 16-Client configurator, D-22 adapter, deeplinks |
| docs/index.html | ✓ VERIFIED | Landing page, 3 install paths |
| tests/integration/install-configurator.test.ts | ✓ VERIFIED | 11/11 GREEN |

### Key Link Verification

| From | To | Via | Status |
|------|----|----|--------|
| package.json bin | dist/index.js | bin.awesome-coolify-mcp → ./dist/index.js | ✓ WIRED |
| package.json prepublishOnly | npm run build | scripts hook | ✓ WIRED |
| CONTRIBUTING.md | publishConfig.access public | npm publish --access public | ✓ WIRED |
| README.md | docs/install.html | configurator link | ✓ WIRED |
| README.md | docs/mcp.example.json | manual example link | ✓ WIRED |
| README.md | CONTRIBUTING.md | publish workflow reference | ✓ WIRED |
| README Action-Tabelle | src/mcp/tools/*.ts | 32 z.literal actions | ✓ WIRED |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| npm pack dry-run | `npm pack --dry-run` | exit 0, 7 files | ✓ PASS |
| Build | `npm run build` | tsup success, dist/index.js 65.92 KB | ✓ PASS |
| Full test suite (working tree) | `npm test` | 492/492 passed | ✓ PASS |
| docs-parity (committed state via stash) | `git stash && npm test -- docs-parity.test.ts` | 2 failed / 4 passed | ✗ FAIL |
| docs-parity (working tree) | `npx vitest run tests/integration/docs-parity.test.ts` | 6/6 passed | ✓ PASS |
| install-configurator | `npx vitest run tests/integration/install-configurator.test.ts` | 11/11 passed | ✓ PASS |

## Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
|-------------|------------|--------|----------|
| DIST-01: npm-Paket veröffentlicht | 07-01 | ✓ SATISFIED (publish-ready) | npm pack green, metadata korrekt; Live-Publish = post-phase Maintainer-Aufgabe |
| DIST-02: GitHub-Repo mit vollständiger README | 07-02, 07-03 | ⚠️ SATISFIED in working tree; REGRESSED in committed | README content deckt Setup/Tool-Referenz/3 Install-Pfade/Safety/Beispiele ab; aber committed docs-parity Test 2/6 fail (Struktur-Drift durch commit 3559efb) |

**Coverage:** 1/2 fully satisfied (DIST-01); DIST-2 substantiv erfüllt aber committed-state automated proof broken

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| README.md (committed 3559efb) | - | Struktur-Drift: 11→14 H2 ohne Test-Update | ⚠️ Warning | docs-parity 2/6 fail in committed state |
| tests/integration/docs-parity.test.ts (committed) | - | Kanonische Map veraltet (11 Sections, '## Safety') | ⚠️ Warning | Test bricht gegen redesigned README |

Keine Stubs, keine TODOs in Community-Docs, keine verbotenen Pfade im Tarball, keine externen Script-Loads.

## Human Verification Required

Keine neuen human-verification Items. Bestehende post-phase manuelle Schritte (nicht blockierend):
- Tatsächliches `npm publish --access public` durch Maintainer
- GitHub-Pages-Deploy (Repo Settings → Pages → /docs)
- Live-Deeplink-Test in Cursor und VS Code

## Gaps Summary

**1 committed gap (2 truths affected):** Commit `3559efb` "docs: redesign README with Higgsfield assets and harden ops tooling" (2026-07-16 18:46) — eingefügt NACH prior VERIFICATION (18:20) — redesignete README-Struktur von 11 kanonischen H2-Sections auf 14 H2 mit umbenannten Sektionen (`Safety`→`Safety model`, `Why awesome-coolify-mcp?` entfernt, etc.) OHNE die `tests/integration/docs-parity.test.ts` anzupassen. Ergebnis: committed docs-parity Test 2/6 fail (Safety-Heading-Mismatch + H2-Count-Mismatch).

**Working-tree fixes (uncommitted):** README.md + README.de.md weiter zu 17 H2 mit Emoji-Headings modifiziert; docs-parity.test.ts auf 17 kanonische Sections aktualisiert; docs/assets/README.md + 2 PNG assets (coming-soon.png, hero-banner.png) hinzugefügt. Working-tree `npm test`: 492/492 GREEN, docs-parity 6/6 GREEN.

**Gap closure:** Commit der working-tree Alignment (README.md, README.de.md, tests/integration/docs-parity.test.ts, docs/assets/README.md, docs/assets/coming-soon.png, docs/assets/hero-banner.png) mit `docs(07):` message. Danach: re-run `npm test` → erwartet 492/492 GREEN; re-verify → erwartet status: passed, 27/27.

**Hinweis:** 07-04-SUMMARY und 07-05-SUMMARY notierten die 2 docs-parity failures als "pre-existing" und "out of scope" — tatsächlich wurden sie durch commit 3559efb (im Phase-07-Branch, zwischen 07-02 und 07-04) eingeführt. Kein externer Schuldiger; der unscoped "docs:"-Commit übersah den Wave-0-Parity-Test.

## Verification Metadata

**Verification approach:** Goal-backward re-verification (committed + working tree)
**Must-haves source:** Prior 07-VERIFICATION.md (27 truths from 07-01/02/03 PLAN frontmatter)
**Automated checks:** 25 passed, 2 failed (committed state); 27 passed (working tree)
**Human checks required:** 0
**Total verification time:** ~10 min

---
*Verified: 2026-07-16T19:12:00Z*
*Verifier: Claude (gsd-verifier subagent)*
