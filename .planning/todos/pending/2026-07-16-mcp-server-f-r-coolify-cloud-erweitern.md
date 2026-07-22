---
created: 2026-07-16T20:10:00.718Z
title: MCP Server für Coolify Cloud erweitern
area: api
resolves_phase: 16
files: []
---

## Problem

Der awesome-coolify-mcp Server unterstützt aktuell nur Coolify Self-hosted Instanzen. Coolify Cloud Nutzer können den MCP Server nicht nutzen, obwohl die API-Struktur ähnlich sein könnte. Das schränkt die Zielgruppe und den praktischen Nutzen des Projekts ein.

## Solution

- Coolify Cloud API-Endpunkte und Auth-Mechanismus recherchieren (Unterschiede zu Self-hosted)
- Konfiguration erweitern: Instanz-Typ wählen (self-hosted vs cloud) mit passenden Credentials
- MCP Tools anpassen/erweitern, wo Cloud-spezifische Unterschiede bestehen
- Dokumentation für Cloud-Setup ergänzen
- TBD: Gemeinsame Abstraktionsschicht vs. separate Cloud-Adapter
