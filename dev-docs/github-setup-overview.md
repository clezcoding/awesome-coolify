# GitHub Setup — Übersicht

Stand: 2026-07-19. Übersicht aller Bausteine des GitHub-Setups für `clezcoding/awesome-coolify` (öffentliches Einzel-Repo).

## Repo-Modell

- **Ein Repo:** `clezcoding/awesome-coolify` (public) — Dev + Distribution in einem Checkout
- **npm-Paket:** `awesome-coolify-mcp` (Name bleibt unabhängig vom Repo-Namen)
- **MCP-Registry-Identifier:** `awesome-coolify-mcp` — derselbe Name wie npm-Paket und `identifier` in `publish-mcp.yml`
- **Legacy:** `clezcoding/awesome-coolify-mcp` archiviert (kein Dual-Repo-Sync mehr)
- **Pages:** https://clezcoding.github.io/awesome-coolify/

## Issues & PRs

- `.github/ISSUE_TEMPLATE/bug_report.yml` — strukturiertes Bug-Report-Formular
- `.github/ISSUE_TEMPLATE/feature_request.yml` — strukturiertes Feature-Request-Formular
- `.github/ISSUE_TEMPLATE/config.yml` — verlinkt auf Discussions, deaktiviert Blank Issues
- `.github/PULL_REQUEST_TEMPLATE.md` — Zusammenfassung, verlinktes Issue, Checkliste

## Labels

- `.github/labels.yml` — Typ-, Priorität-, Status-, GSD-Phasen- (discuss/plan/execute/verify/ship) und Größen-Labels
- `.github/workflows/labels.yml` — synct die Labels automatisch (EndBug/label-sync@v2.3.3) bei Änderung der Datei

## CI/CD

- `.github/workflows/ci.yml` — Lint/Test/Build auf Node 24, bei jedem Push/PR gegen `main`
- `.github/workflows/pages.yml` — deployt `docs/` nach GitHub Pages bei Push auf `main` (Pfad `docs/**`)
- `.github/workflows/release.yml` — Changesets-Workflow, erzeugt automatisch einen "Version Packages"-PR + GitHub Release
- `.github/workflows/publish.yml` — npm-Veröffentlichung per Trusted Publishing (OIDC), kein `NPM_TOKEN`/2FA-Blocker mehr
- `.github/workflows/release-drafter.yml` — Release Drafter, pflegt einen Draft-Release bei jedem Push/PR auf `main` (parallel zu Changesets `release.yml`)
- `.github/workflows/publish-comfy.yml` — Comfy-Org/publish-node-action Stub; läuft nur, wenn Repo-Variable `COMFY_PUBLISH_ENABLED=true`; benötigt `REGISTRY_ACCESS_TOKEN` Secret + `pyproject.toml` (siehe Workflow-Kommentar)
- `.github/workflows/publish-mcp.yml` — OtherVibes/mcp-publish-action@v1; veröffentlicht den MCP-Server bei `v*`-Tags ins MCP-Registry (npm-Typ, Identifier `awesome-coolify-mcp`); OIDC `id-token: write`
- Publint + MegaLinter Schritte in `ci.yml` ergänzt (siehe `## Lint & Quality` unten)

## Lint & Quality

- `.megalinter.yml` — schmaler MegaLinter (nur TypeScript, JavaScript, YAML, Markdown, actionlint); läuft als CI-Schritt in `ci.yml`
- `publint` npm-Script + CI-Schritt — prüft Package-Layout (exports/files/bin) vor jedem Publish

## Dependency-Pflege

- `.github/dependabot.yml` — wöchentliche Updates für npm-Pakete und GitHub-Actions-Versionen

## Commit-Qualität

- `commitlint.config.js` + `.husky/commit-msg` — erzwingt Conventional Commits lokal vor jedem Commit
- `.changeset/` (`config.json`, `README.md`) — Versionierung/Changelog-Verwaltung

## Repo-Schutz

- `scripts/setup-branch-protection.sh` — schützt `main` (kein Force-Push/Delete, CI-Check Pflicht vor Merge)

## Merge-Automatisierung

- `.kodiak.toml` — Kodiak-Config (Squash-Merge, `automerge`-Label); Kodiak ist eine GitHub-App, die der Repo-Owner manuell installiert (https://kodiakhq.com -> Add to GitHub -> Repo `clezcoding/awesome-coolify` auswählen). Diese Datei steuert nur das Verhalten nach der Installation.
- `.github/release-drafter.yml` — Release-Drafter-Config (Templates, Conventional-Commit-Kategorien)

## .gitignore (öffentliche Oberfläche)

Ignoriert u.a.: `.planning/`, `.cursor/`, `.claude/`, `.agents/`, `graphify-out/`, `.coolify-mcp/`, Secrets, Build-Artefakte, IDE-Dateien.
