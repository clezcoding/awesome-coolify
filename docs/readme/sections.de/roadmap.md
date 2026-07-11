---

## Roadmap

```mermaid
gantt
    title Coolify MCP v1 Phasen
    dateFormat  YYYY-MM
    section Foundation
    Phase 1 Multi-Instance-Auth        :p1, 2026-07, 1M
    section Read
    Phase 2 Discovery                  :p2, after p1, 1M
    Phase 3 Diagnose                   :p3, after p2, 1M
    section Ops
    Phase 4 Deploy-Lifecycle           :p4, after p3, 1M
    Phase 5 Logs & Services            :p5, after p4, 1M
    section Ship
    Phase 6 Safety & Bulk              :p6, after p5, 1M
    Phase 7 npm & Docs                 :p7, after p6, 1M
```

### v2-Vorschau

Nach v1: **volle Parität** mit dem breiteren Coolify-Ökosystem. Details in [`.planning/REQUIREMENTS.md`](.planning/REQUIREMENTS.md).

| Gruppe | Umfang |
|--------|--------|
| **V2-CTX** | Debug-Mode, Shell-Completion, Self-Update |
| **V2-TEAM** | Teams, Members, Invites |
| **V2-PROJ / V2-SRV** | Projects, Environments, Server-CRUD |
| **V2-APP / V2-ENV** | App-CRUD (6 Create-Pfade), Env-Vars |
| **V2-SVC / V2-DB / V2-BAK** | One-Click-Services, 8 DB-Typen, Backups |
| **V2-CICD / V2-TEN** | Webhooks, RBAC, Snapshots |

> [!NOTE]
> Container-Exec ist blockiert, bis Coolify 4.1.x API es unterstützt.

Vollständige Roadmap: [`.planning/ROADMAP.md`](.planning/ROADMAP.md)
