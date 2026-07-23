# Phase 17: Local Manifest & Sync - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-22
**Phase:** 17-Local Manifest & Sync
**Areas discussed:** Tool-Oberfläche, Schema & Instance-Bindung, Schreib-Trigger, Sync- & 404-Verhalten

---

## Tool-Oberfläche

### Q1: Wo lebt die Manifest-API?

| Option | Description | Selected |
|--------|-------------|----------|
| Neues Domain-Tool `manifest` | Eigene Actions; Spiegel zu `instance` | ✓ |
| Actions ans `meta`-Tool | Weniger Tools; vermischt Meta mit Workspace-State | |
| Actions verteilt auf `project`/`application` | Kein zentrales Tool; schwer zu entdecken | |

**User's choice:** Neues Domain-Tool `manifest`

### Q2: Welche Actions in v1?

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal | get \| upsert \| sync \| clear(+confirm) | |
| Breit | + set, remove, diff | ✓ |
| Ultra-minimal | nur get + sync | |

**User's choice:** Breit (get, upsert, set, remove, sync, diff, clear)

### Q3: `instance`-Routing-Param?

| Option | Description | Selected |
|--------|-------------|----------|
| Nur bei sync/diff | Lokale Actions ohne instance | ✓ |
| Auf allen Actions | Einheitlich | |
| Nie | Immer Env/Default | |

**User's choice:** Nur sync/diff

### Q4: Soft-Start ohne Creds?

| Option | Description | Selected |
|--------|-------------|----------|
| Ja | Lokale Actions ohne Creds; sync/diff → COOLIFY_NO_INSTANCE | ✓ |
| Nein | Immer Creds nötig | |
| Claude entscheidet | | |

**User's choice:** Ja

---

## Schema & Instance-Bindung

### Q1: Struktur?

| Option | Description | Selected |
|--------|-------------|----------|
| Nested | project → environments → resources + servers[] | ✓ |
| Flach | resources[] + lose top-level UUIDs | |
| Hybrid | top-level IDs + flache resources[] | |

**User's choice:** Nested

### Q2: Instance-Bindung?

| Option | Description | Selected |
|--------|-------------|----------|
| Optionaler `instance`-Slug | leer = Env/Default | ✓ |
| Pflichtfeld | ohne Slug kein Write | |
| Kein Binding | nur UUIDs | |

**User's choice:** Optionaler Slug

### Q3: Resource-Felder Minimum?

| Option | Description | Selected |
|--------|-------------|----------|
| Kern | uuid, type, name, domains[] | ✓ |
| Kern + Extra | + status, fqdn, git, updatedAt | |
| Nur uuid+type | Domains immer live | |

**User's choice:** Kern (input `1v` treated as `1`)

### Q4: Example-File?

| Option | Description | Selected |
|--------|-------------|----------|
| Ja | committed example template | ✓ |
| Nein | nur Zod + Docs | |
| Claude entscheidet | | |

**User's choice:** Ja

---

## Schreib-Trigger

### Q1: Wann schreiben?

| Option | Description | Selected |
|--------|-------------|----------|
| Explizit + leichtes Auto-Upsert | Primary explicit; light hooks | ✓ (then broadened in Q2) |
| Nur explizit | keine Hooks | |
| Volle Auto-Hooks | immer mitschreiben | |

**User's choice:** Explizit primär + Auto-Upsert

### Q2: Welche Tools Hooks?

| Option | Description | Selected |
|--------|-------------|----------|
| Nur Create/Delete app/svc/db | | |
| + project/env/server Create/Delete | | |
| Alle Mutations inkl. Update/Domain | | ✓ |

**User's choice:** Alle Mutations inkl. Update/Domain (broader than recommendation)

### Q3: Gitignore wann?

| Option | Description | Selected |
|--------|-------------|----------|
| Erster erfolgreicher Write | | ✓ |
| Eager bei get | | |
| Nur explizite Writes | Auto-Hooks ohne gitignore | |

**User's choice:** Erster Write

### Q4: Hook-Failure?

| Option | Description | Selected |
|--------|-------------|----------|
| Best-effort + `_meta.manifestWarning` | | ✓ |
| Hart fail ganze Response | | |
| Silent log only | | |

**User's choice:** Best-effort

---

## Sync- & 404-Verhalten

### Q1: Sync-Semantik?

| Option | Description | Selected |
|--------|-------------|----------|
| Merge by UUID | remote wins; orphans retained | ✓ |
| Full-Replace | komplett neu aus API | |
| Remote-only refresh | nur bestehende lokale UUIDs | |

**User's choice:** Merge by UUID

### Q2: Orphans entfernen?

| Option | Description | Selected |
|--------|-------------|----------|
| Nur mit confirm:true | Default listet Orphans | ✓ |
| Auto-prune | | |
| Nie auto — nur remove/clear | | |

**User's choice:** confirm:true

### Q3: dry_run?

| Option | Description | Selected |
|--------|-------------|----------|
| Ja + separates diff | | ✓ |
| Nein — nur diff | | |
| dry_run ersetzt diff | | |

**User's choice:** dry_run + diff

### Q4: 404 Stale-Hint?

| Option | Description | Selected |
|--------|-------------|----------|
| Soft-Hint only — kein Auto-Sync | | ✓ |
| Soft-Hint + optional autoSyncOn404 | | |
| Auto-Sync + Retry | | |

**User's choice:** Soft-Hint only

---

## Claude's Discretion

- Exact Zod field names / version stamp
- Example file path
- Prune flag naming
- Manifest-UUID detection for 404 hints
- Project-root resolver details
- Atomic write details

## Deferred Ideas

- Custom Skills pro IDE (v3.1)
- Standard-Setup Tool (v3.1)
- Integrate official Coolify OpenAPI specs
```
