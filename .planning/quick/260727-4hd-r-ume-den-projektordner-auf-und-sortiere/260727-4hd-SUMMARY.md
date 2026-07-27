---
status: complete
quick_id: 260727-4hd
date: 2026-07-27
commit: 2b940cb
---

# Quick Task 260727-4hd — Summary

## Ergebnis

Repo-Index bereinigt: **61 ephemere/dev-only Dateien** aus Git entfernt (~4.3k Zeilen weniger im Remote nach Push).

## Änderungen

### `.gitignore` — neue lokale-only Pfade

| Pfad | Grund |
|------|-------|
| `.planning/research/.cache/` | GSD Research-Cache |
| `.planning/forensics/` | Session-Forensics-Reports |
| `.planning/spikes/` | Spike-Artefakte |
| `.planning/sketches/` | Logo-Sketches |
| `.planning/notes/` | Dev-Notizen |
| `.planning/todos/` | Persönliche Todos |
| `.planning/debug/` | Resolved Debug-Logs |
| `.planning/mcp_features.md` | Feature-Paritäts-Checkliste (dev) |
| `dev-docs/` | Maintainer GitHub-Setup-Docs |

### Organisation

- `mcp_features.md` → `.planning/mcp_features.md` (lokal, gitignored)
- `CONVENTIONS.md` Pfad aktualisiert

### Weiterhin tracked (GSD `commit_docs: true`)

Kern-`.planning/`: STATE, ROADMAP, phases/, quick/, milestones/, codebase/, research/*.md

## Verifikation

- `tracked ephemeral count: 0`
- Lokale Dateien (`dev-docs/`, `.planning/mcp_features.md`) vorhanden
- `git check-ignore` bestätigt alle neuen Regeln

## Hinweis

Gesamtes `.planning/` weiterhin teilweise im Repo (GSD-Workflow). Nur ephemere Unterordner sind jetzt local-only. Vollständiges `.planning/`-Ignore wäre `commit_docs: false` — bewusst nicht geändert.
