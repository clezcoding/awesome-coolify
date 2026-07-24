---
created: 2026-07-16T20:10:00.718Z
title: Custom Skills pro IDE für Coolify
area: docs
resolves_phase: 22
files: []
---

## Problem

Coolify-Workflows in AI-IDEs (Cursor, Claude Code, Codex, etc.) sind nicht standardisiert. Jede IDE braucht eigene Skill-Definitionen, damit Agents Coolify korrekt bedienen können — aktuell fehlt ein IDE-übergreifendes Skill-Paket.

## Solution

- Skills für gängige IDEs erstellen (Cursor, Claude Code, Codex, Windsurf, etc.)
- Pro IDE: Setup-Anleitung, MCP-Konfiguration, typische Workflows
- Gemeinsame Skill-Basis mit IDE-spezifischen Adaptern
- In awesome-coolify Repo unter `.agents/skills/` oder `.cursor/skills/` pflegen
- TBD: Automatisches Install-Script pro IDE
