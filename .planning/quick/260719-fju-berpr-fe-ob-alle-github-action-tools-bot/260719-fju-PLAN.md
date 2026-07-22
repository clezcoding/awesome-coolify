---
quick_id: 260719-fju
description: Überprüfe ob alle Github Action Tools,Bots,Workflows usw korrekt und vollständig eingebaut sind und funktionieren.
tasks:
  - id: 1
    title: Audit-Befund dokumentieren und MCP-Publish-Lücken schließen
    files:
      - package.json
      - .github/workflows/publish-mcp.yml
      - dev-docs/github-setup-overview.md
    action: |
      Audit-Ergebnisse in SUMMARY festhalten. Zwei konkrete Lücken beheben:
      1) package.json fehlt `mcpName` (MCP Registry npm-Ownership-Check schlägt sonst fehl)
      2) publish-mcp.yml nie gelaufen — Tag v0.1.1 predated Workflow; workflow_dispatch für manuelles Backfill ergänzen
      dev-docs/github-setup-overview.md mit Audit-Status-Tabelle aktualisieren (was grün/rot/manual).
    verify: |
      grep -q mcpName package.json
      grep -q workflow_dispatch .github/workflows/publish-mcp.yml
      npm run publint && npm test
    done: |
      mcpName gesetzt, workflow_dispatch vorhanden, docs aktualisiert, lokale CI grün

  - id: 2
    title: GitHub-Setup-Verifikations-Skript ergänzen
    files:
      - scripts/verify-github-setup.sh
    action: |
      Neues Skript das via gh CLI prüft: Workflows aktiv, Branch-Protection, Labels (automerge), letzte CI-Runs, npm-Version, Pages-URL, publish-mcp Run-History. Exit 1 bei kritischen Lücken, Warnungen für manuelle Schritte (Kodiak App-Install, npm Trusted Publisher, MCP Backfill).
    verify: |
      bash scripts/verify-github-setup.sh
    done: |
      Skript läuft durch und meldet erwartete Warnungen für manuelle Items

must_haves:
  truths:
    - MCP publish workflow ist backfill-fähig und package.json hat mcpName
    - Audit-Status ist dokumentiert (SUMMARY + dev-docs)
    - verify-github-setup.sh existiert für wiederholbare Checks
  artifacts:
    - package.json
    - .github/workflows/publish-mcp.yml
    - dev-docs/github-setup-overview.md
    - scripts/verify-github-setup.sh
  key_links:
    - mcpName in package.json matches io.github.clezcoding/awesome-coolify in publish-mcp.yml name field
---

# Quick Plan: GitHub Actions/Bots/Workflows Audit

## Audit-Befunde (vor Fix)

| Baustein | Status | Evidenz |
|----------|--------|---------|
| CI (lint/test/publint/megalinter) | ✅ | gh runs success, lokal grün |
| Branch Protection | ✅ | Lint, Test & Build required |
| Labels Sync | ✅ | automerge + GSD labels vorhanden |
| Release (Changesets) | ✅ | Version Packages PRs merged |
| npm Publish (OIDC) | ✅ | v0.1.1 auf npm |
| Release Drafter | ✅ | Draft v0.1.2 |
| Pages | ✅ | clezcoding.github.io/awesome-coolify |
| Dependabot | ✅ | weekly npm + actions |
| Comfy Publish | ⏸️ | COMFY_PUBLISH_ENABLED nicht gesetzt (Stub OK) |
| MCP Publish | ❌ | Nie gelaufen; fehlendes mcpName; Tag vor Workflow |
| Kodiak | ⚠️ | .kodiak.toml OK; App-Install manuell prüfen |
| Bugbot | N/A | nicht konfiguriert (Cursor-Produkt, kein Repo-Bot) |
