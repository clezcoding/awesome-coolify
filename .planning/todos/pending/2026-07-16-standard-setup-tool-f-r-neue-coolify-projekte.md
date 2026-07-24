---
created: 2026-07-16T20:10:00.718Z
title: Standard-Setup Tool für neue Coolify-Projekte
area: tooling
resolves_phase: 22
files: []
---

## Problem

Beim Start eines neuen Projekts fehlt ein geführtes Setup, das Coolify-Ressourcen konsistent anlegt. Nutzer müssen manuell GitHub-Repo, Services und Deployments konfigurieren — auch bei bestehenden Projekten oder Projekten mit PRD gibt es keinen einheitlichen Einstiegspunkt.

## Solution

Neues MCP Tool (oder Skill-Workflow) am Projektstart — **nach v2.0 Create-CRUD complete**.

### GitHub CLI Preflight (einmalig beim Tool-Aufruf)

1. `gh --version` — nicht installiert → Step-by-Step Install-Guide (macOS/Linux/Windows)
2. `gh auth status` — nicht authentifiziert → `gh auth login` Guide
3. Workflow pausieren mit Hinweis: *„Sobald du das erledigt hast, gib Bescheid — dann machen wir weiter.“*
4. Erst nach User-Bestätigung fortfahren

### Wizard (interaktiv)

- Projektname
- GitHub Repo: Name, private/public, **neu** (`gh repo create`) oder bestehend
- One-Click Services auswählen
- Greenfield vs. bestehendes Coolify-Projekt
- PRD vorhanden → PRD-basiertes Setup

### Coolify-Seite (via MCP Create-Actions post-v2.0)

- Project + Environment anlegen
- App via GitHub App / public Git verbinden
- Services + DBs deployen
- Domains + Env setzen

### Offen

- Template-Katalog (Next.js, Laravel, …)
- Backlog: Phase 14 (promoted from 999.1)
