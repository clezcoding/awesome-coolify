---

## Roadmap

```mermaid
gantt
    title Coolify MCP v1 Phases
    dateFormat  YYYY-MM
    section Foundation
    Phase 1 Multi-Instance Auth     :p1, 2026-07, 1M
    section Read
    Phase 2 Discovery               :p2, after p1, 1M
    Phase 3 Diagnose                :p3, after p2, 1M
    section Ops
    Phase 4 Deploy Lifecycle        :p4, after p3, 1M
    Phase 5 Logs & Services         :p5, after p4, 1M
    section Ship
    Phase 6 Safety & Bulk           :p6, after p5, 1M
    Phase 7 npm & Docs              :p7, after p6, 1M
```

### v2 preview

After v1: **full parity** with Coolify CLI + legacy MCPs. Details in [`.planning/REQUIREMENTS.md`](.planning/REQUIREMENTS.md).

| Group | Scope |
|-------|-------|
| **V2-CTX** | Debug mode, shell completion, self-update |
| **V2-TEAM** | Teams, members, invites |
| **V2-PROJ / V2-SRV** | Projects, environments, server CRUD |
| **V2-APP / V2-ENV** | App CRUD (6 create paths), env vars |
| **V2-SVC / V2-DB / V2-BAK** | One-click services, 8 DB types, backups |
| **V2-CICD / V2-TEN** | Webhooks, RBAC, snapshots |

*Container exec blocked until Coolify 4.1.x API supports it.*

Full roadmap: [`.planning/ROADMAP.md`](.planning/ROADMAP.md)
