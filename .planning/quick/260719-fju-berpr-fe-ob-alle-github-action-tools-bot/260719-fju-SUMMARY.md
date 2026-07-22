---
quick_id: 260719-fju
subsystem: infra
tags: [github-actions, mcp-registry, kodiak, audit, verify-script]

requires: []
provides:
  - mcpName in package.json für MCP Registry Ownership-Check
  - workflow_dispatch Backfill für publish-mcp.yml
  - Audit-Status in dev-docs/github-setup-overview.md
  - scripts/verify-github-setup.sh für wiederholbare Prüfung

affects: [release, mcp-publish, merge-automation]

tech-stack:
  added: [scripts/verify-github-setup.sh]
  patterns: [gh-cli-basierte Repo-Verifikation, Exit-0-mit-Warnungen]

key-files:
  created:
    - scripts/verify-github-setup.sh
  modified:
    - package.json
    - .github/workflows/publish-mcp.yml
    - dev-docs/github-setup-overview.md

key-decisions:
  - "mcpName als Top-Level-Feld in package.json (io.github.clezcoding/awesome-coolify) — muss publish-mcp.yml name-Feld matchen"
  - "workflow_dispatch mit required version-Input für manuelles Backfill statt Tag-Repush"
  - "verify-github-setup.sh: Exit 1 nur bei kritischen Repo-Lücken; Kodiak/MCP-Backfill als Warnungen"

duration: 2min
completed: 2026-07-19
status: complete
---

# Quick 260719-fju: GitHub Actions/Bots/Workflows Audit Summary

**MCP-Publish-Lücken geschlossen (mcpName + workflow_dispatch), Audit dokumentiert, verify-github-setup.sh für wiederholbare Checks**

## Performance

- **Duration:** ~2 min
- **Tasks:** 2/2
- **Files modified:** 4

## Vollständige Audit-Matrix

| Baustein | Status | Evidenz | Aktion |
|----------|--------|---------|--------|
| CI (lint/test/publint/megalinter) | ✅ grün | `ci.yml` aktiv; letzte Runs `success` | Keine |
| Branch Protection | ✅ grün | `main` erfordert `Lint, Test & Build` | Keine |
| Labels Sync | ✅ grün | `automerge` + GSD-Labels via `labels.yml` | Keine |
| Release (Changesets) | ✅ grün | Version-Packages-PRs merged | Keine |
| npm Publish (OIDC) | ✅ grün | `awesome-coolify-mcp@0.1.1` auf npm | Keine |
| Release Drafter | ✅ grün | Draft v0.1.2 | Keine |
| Pages | ✅ grün | https://clezcoding.github.io/awesome-coolify/ | Keine |
| Dependabot | ✅ grün | wöchentlich npm + actions | Keine |
| Comfy Publish | ⏸️ Stub | `COMFY_PUBLISH_ENABLED` nicht gesetzt | Absichtlich deaktiviert |
| MCP Publish | ⚠️ manuell | Workflow existiert, **0 Runs**; `mcpName` jetzt gesetzt | **Backfill ausführen** (siehe unten) |
| Kodiak | ⚠️ manuell | `.kodiak.toml` + `automerge`-Label OK | **App-Install prüfen** |
| Bugbot | N/A | Cursor-Produkt, kein Repo-Bot | Nicht relevant |

## Erledigte Änderungen

1. **package.json** — `"mcpName": "io.github.clezcoding/awesome-coolify"` ergänzt (matcht `publish-mcp.yml` `name`-Feld)
2. **publish-mcp.yml** — `workflow_dispatch` mit required `version`-Input für manuelles Backfill; Tag-Trigger `v*` unverändert
3. **dev-docs/github-setup-overview.md** — Audit-Status-Tabelle + manuelle Follow-ups dokumentiert
4. **scripts/verify-github-setup.sh** — prüft Workflows, Branch-Protection, Labels, CI, npm-Version, mcpName, Pages, publish-mcp Run-History

## Manuelle Follow-ups (noch offen)

### 1. Kodiak GitHub App installieren

- Marketplace: https://github.com/marketplace/kodiakhq
- Repo `clezcoding/awesome-coolify` auswählen
- Verifizieren: `./scripts/setup-kodiak.sh`

### 2. MCP Registry Backfill für v0.1.1

Tag `v0.1.1` existierte vor dem `publish-mcp.yml`-Workflow. Nach Merge dieses PRs:

```bash
gh workflow run publish-mcp.yml -f version=0.1.1
```

Oder: GitHub UI → Actions → „Publish MCP Server“ → Run workflow → Version `0.1.1`.

### 3. Wiederholbare Prüfung

```bash
./scripts/verify-github-setup.sh
```

Erwartet: Exit 0 mit Warnungen für Kodiak + MCP-Backfill bis beide erledigt.

## Task Commits

1. **Task 1+2 (atomar):** `75d61d3` — fix(260719-fju): close MCP publish gaps and add GitHub setup verifier

## Verifikation

- `grep -q mcpName package.json` ✅
- `grep -q workflow_dispatch .github/workflows/publish-mcp.yml` ✅
- `npm test` — 724 Tests passed ✅
- `npm run publint` — All good ✅
- `bash scripts/verify-github-setup.sh` — Exit 0, Warnungen für MCP-Backfill + Kodiak ✅

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- FOUND: package.json
- FOUND: .github/workflows/publish-mcp.yml
- FOUND: dev-docs/github-setup-overview.md
- FOUND: scripts/verify-github-setup.sh
- FOUND: 75d61d3

---
*Quick: 260719-fju*
*Completed: 2026-07-19*
