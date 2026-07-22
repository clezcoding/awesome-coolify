---
created: 2026-07-16T20:10:00.718Z
title: Lokale Projekt-Manifest-Datei für Coolify-Metadaten
area: tooling
resolves_phase: 17
files: []
---

## Problem

Wichtige Coolify-Metadaten (App-UUIDs, Domains, Service-IDs, Env-Referenzen) gehen zwischen Sessions verloren. Agent muss bei jedem Gespräch neu nachfragen oder API abfragen — langsam und fehleranfällig.

## Solution

Lokale Manifest-Datei (`.md` oder `.json`), die der Agent auf Wunsch pflegt:

- Speichert: App-UUIDs, Domains, Service-IDs, Team/Project-IDs, wichtige Env-Keys
- Agent aktualisiert aktiv bei Änderungen (Deploy, neue Domain, etc.)
- Automatisch in `.gitignore` eintragen (sensible/lokale Daten)
- Optional: Schema/Template bereitstellen (`.coolify-manifest.example.json`)
- TBD: Format (.json vs .md), Pfad (`.coolify/manifest.json`?), Sync-Strategie mit MCP
