# Requirements: Coolify MCP Server

**Defined:** 2026-07-11
**Core Value:** Ein AI-Agent kann über einen MCP-Server mehrere self-hosted Coolify-Instanzen verwalten — deployen, Logs lesen, Probleme diagnostizieren — ohne drei parallele MCP-Implementierungen.

## v1 Requirements

### Context & Authentication (CTX)

- [ ] **CTX-01**: Agent kann Coolify-API-Verbindung per Health-Check verifizieren
- [ ] **CTX-02**: Agent kann Coolify-Instanz-Version abfragen
- [ ] **CTX-03**: Agent kann MCP-Server-Version (Meta) abfragen
- [ ] **CTX-04**: Agent kann mehrere Instanzen in `~/.coolify-mcp/instances.json` verwalten (add, list, get, update, delete)
- [ ] **CTX-05**: Agent kann Default-Instanz setzen und zwischen Instanzen wechseln (set-default, use/switch)
- [ ] **CTX-06**: Agent kann pro Request API-Token override nutzen
- [ ] **CTX-07**: Agent kann Instanz-Verbindung verifizieren (verify) inkl. Version

### System & Overview (SYS)

- [x] **SYS-01**: Agent kann Infrastructure-Overview abrufen (Counts: servers, projects, apps, databases, services)
- [x] **SYS-02**: Agent kann alle Resources unified listen (apps + DBs + services)
- [x] **SYS-03**: Agent kann Global Issue-Scan ausführen (unhealthy apps/DBs/services, unreachable servers)
- [x] **SYS-04**: Agent kann App-Diagnose per UUID, Name oder Domain (Status, Health, Env-Count, recent deployments)
- [x] **SYS-05**: Agent kann Server-Diagnose per UUID, Name oder IP (Resources, Domains, Validation)
- [x] **SYS-06**: Agent kann Resource per UUID, Name, Domain oder IP finden (Discovery)
- [x] **SYS-07**: Agent kann Coolify-Dokumentation durchsuchen (How-to, Config, Troubleshooting)

### Application Operations (APP)

- [x] **APP-01**: Agent kann Apps listen (summary projection, essential fields)
- [x] **APP-02**: Agent kann App-Details abrufen (get, summary oder full projection)
- [ ] **APP-03**: Agent kann App starten, stoppen, restarten
- [x] **APP-04**: Agent kann App deployen (per UUID, Name oder Tag)
- [x] **APP-05**: Agent kann Deploy mit Force Rebuild (no cache) auslösen
- [x] **APP-06**: Agent kann Deploy Wait-Mode nutzen (poll bis finished/failed/cancelled, Timeout)
- [x] **APP-07**: Agent kann App-Deployments listen (per App)
- [x] **APP-08**: Agent kann Deployment-Details abrufen (Status, Commit, Timestamps)
- [x] **APP-09**: Agent kann Deployment canceln
- [ ] **APP-10**: Agent kann App Runtime-Logs lesen (limitiert, optional follow)
- [ ] **APP-11**: Agent kann Deployment Build-Logs separat abrufen (paginiert, on-demand)

### Service & Database Operations (SVC)

- [x] **SVC-01**: Agent kann Services und Databases listen (summary projection)
- [x] **SVC-02**: Agent kann Service/Database Details abrufen
- [ ] **SVC-03**: Agent kann Service/Database starten, stoppen, restarten
- [ ] **SVC-04**: Agent kann Service/Database Logs lesen (limitiert)
- [ ] **SVC-05**: Agent kann Service deployen/restarten mit Pull Latest Images

### Deployments (DEP)

- [x] **DEP-01**: Agent kann Deployments per Resource Name auslösen
- [x] **DEP-02**: Agent kann Batch-Deploy mehrerer Resources (comma-separated UUIDs oder Tags)
- [x] **DEP-03**: Agent erhält `logs_available` Hint ohne Inline-Bloat bei Deployment-Responses

### Emergency & Bulk (EMG)

- [ ] **EMG-01**: Agent kann alle laufenden Apps stoppen (Emergency)
- [ ] **EMG-02**: Agent kann alle Apps eines Projekts redeployen
- [ ] **EMG-03**: Agent kann alle Apps eines Projekts restarten

### Output & Ergonomics (OUT)

- [x] **OUT-01**: Agent kann Response-Formate wählen (table, JSON, pretty)
- [ ] **OUT-02**: Sensitive-Werte sind default maskiert (`***`), reveal opt-in
- [x] **OUT-03**: Pagination unterstützt (page, per_page)
- [x] **OUT-04**: Summary vs. Full-Detail Projektionen verfügbar
- [x] **OUT-05**: `max_chars` Cap verhindert Context-Bloat bei großen Payloads
- [x] **OUT-06**: Follow-up Action Hints nach Get-Operationen (z.B. „Logs“, „Restart“)
- [ ] **OUT-07**: Destructive-Ops erfordern `confirm: true` Gate

### Error Handling (ERR)

- [ ] **ERR-01**: API-Fehler liefern structured error codes (401, 404, 422, 500)
- [ ] **ERR-02**: Jeder Fehler enthält Recovery-Hints für den Agent
- [ ] **ERR-03**: Transiente API-Fehler werden mit Retry + Exponential Backoff behandelt

### Tool Schema & DX (DX)

- [ ] **DX-01**: Tools sind action-basiert pro Domäne (z.B. `application({action:'deploy'})`, nicht 60+ Einzeltools)
- [ ] **DX-02**: Zod-Schemas validieren alle Tool-Inputs
- [x] **DX-03**: Automatische Payload-Größen-Warnung vor großen Responses

### Distribution (DIST)

- [ ] **DIST-01**: npm-Paket veröffentlicht (`npx coolify-mcp` oder äquivalent)
- [ ] **DIST-02**: GitHub-Repo mit vollständiger README (Setup, Multi-Instance, Tool-Referenz, Beispiele)
- [x] **DIST-03**: MCP stdio-Transport funktioniert in Cursor und Claude Desktop

## v2 Requirements

Vollständige Feature-Parität mit Coolify CLI, user-coolify MCP und coolify-backup-mcp. Detailliert aus `mcp_features.md` Sections 1–21. Nicht in v1-Roadmap — eigene Phasen nach v1-Release.

### v2 Context & Auth Erweiterungen (V2-CTX)

- **V2-CTX-01**: Debug-Modus für API-Requests
- **V2-CTX-02**: Shell-Completion generieren
- **V2-CTX-03**: CLI Self-Update Mechanismus

### v2 Teams (V2-TEAM)

- **V2-TEAM-01**: Teams listen
- **V2-TEAM-02**: Team Details abrufen
- **V2-TEAM-03**: Current Team abfragen
- **V2-TEAM-04**: Team Members listen
- **V2-TEAM-05**: Team Member add/remove/invite (fehlt in CLI, Section 21)

### v2 Projects & Environments CRUD (V2-PROJ)

- **V2-PROJ-01**: Projekte create, update, delete
- **V2-PROJ-02**: Environments create, delete
- **V2-PROJ-03**: Environment dragonfly/keydb/clickhouse DB Workaround (API-Lücken)

### v2 Servers CRUD (V2-SRV)

- **V2-SRV-01**: Server create, update, delete
- **V2-SRV-02**: Server validieren (SSH/Reachability)
- **V2-SRV-03**: Server als Build-Server markieren
- **V2-SRV-04**: Server-Ressourcen und Domains abfragen
- **V2-SRV-05**: Private Key UUID beim Server-Create binden

### v2 Private Keys (V2-KEY)

- **V2-KEY-01**: Private Keys list, get, create, update, delete
- **V2-KEY-02**: PEM-Inhalt, Name, Description verwalten

### v2 Cloud Provider (V2-CLOUD)

- **V2-CLOUD-01**: Cloud Tokens CRUD + validate (Hetzner, DigitalOcean)
- **V2-CLOUD-02**: Hetzner Locations, Server-Types, Images, SSH Keys listen
- **V2-CLOUD-03**: Hetzner-Server erstellen
- **V2-CLOUD-04**: DigitalOcean Server Create (Section 21 — fehlt komplett)

### v2 GitHub Apps (V2-GH)

- **V2-GH-01**: GitHub Apps CRUD
- **V2-GH-02**: Repositories und Branches einer GitHub App listen
- **V2-GH-03**: GitHub Enterprise custom API/HTML URL
- **V2-GH-04**: System-wide Verfügbarkeit konfigurieren

### v2 Application CRUD & Config (V2-APP)

- **V2-APP-01**: App create — Public Git (nixpacks/dockerfile/dockercompose)
- **V2-APP-02**: App create — Private Git via Deploy Key
- **V2-APP-03**: App create — Private Git via GitHub App
- **V2-APP-04**: App create — Dockerfile inline base64
- **V2-APP-05**: App create — Docker Compose inline base64
- **V2-APP-06**: App create — Docker Image (Registry)
- **V2-APP-07**: App update (alle Config-Felder: FQDN, Build Commands, Watch Paths, Labels, etc.)
- **V2-APP-08**: App delete (optional confirm, delete_volumes)
- **V2-APP-09**: Preview Deployment löschen
- **V2-APP-10**: Health Checks konfigurieren (enable, path, port, interval, etc.)
- **V2-APP-11**: HTTP Basic Auth konfigurieren
- **V2-APP-12**: Instant Deploy nach Create

### v2 Application Env Vars (V2-ENV)

- **V2-ENV-01**: Env Vars CRUD pro App
- **V2-ENV-02**: Bulk Update (einzelne App)
- **V2-ENV-03**: Bulk Update (mehrere Apps gleichzeitig)
- **V2-ENV-04**: Sync aus `.env`-Datei (diff: create/update)
- **V2-ENV-05**: Flags: is_buildtime, is_runtime, is_preview, is_literal, is_multiline

### v2 Application Storage (V2-STOR)

- **V2-STOR-01**: App Storages CRUD (Persistent Volumes / File Mounts)

### v2 One-Click Services (V2-SVC)

- **V2-SVC-01**: Service create (one-click type)
- **V2-SVC-02**: Service update, delete
- **V2-SVC-03**: Custom Docker Compose YAML (raw, auto base64)
- **V2-SVC-04**: Service Env Vars CRUD + bulk
- **V2-SVC-05**: Service Storages CRUD

### v2 Databases (V2-DB)

- **V2-DB-01**: Database create (8 types: postgresql, mysql, mariadb, mongodb, redis, clickhouse, dragonfly, keydb)
- **V2-DB-02**: Database update, delete (optional delete_volumes)
- **V2-DB-03**: Public Access + Public Port konfigurieren
- **V2-DB-04**: Database Env Vars CRUD + bulk
- **V2-DB-05**: Database Storages CRUD

### v2 Database Backups (V2-BAK)

- **V2-BAK-01**: Backup Schedules CRUD
- **V2-BAK-02**: Backup Executions listen, get, delete
- **V2-BAK-03**: Scheduled Backup (frequency, retention)
- **V2-BAK-04**: Sofort-Backup triggern

### v2 Scheduled Tasks (V2-CRON)

- **V2-CRON-01**: Scheduled Tasks CRUD (Application oder Service)
- **V2-CRON-02**: Executions listen (stdout in message)
- **V2-CRON-03**: Run Once (throwaway cron, poll, cleanup)

### v2 Section 21 — Agent & DX Differenzierung (V2-DX)

- **V2-DX-01**: Idempotency Keys für Deploy/Restart
- **V2-DX-02**: Dry-Run Modus für destructive ops
- **V2-DX-03**: Audit Log / „who changed what“ aus Coolify API
- **V2-DX-04**: OpenAPI Schema introspection
- **V2-DX-05**: Interactive „what should I run?“ Planner (NL → action)
- **V2-DX-06**: Changelog / Breaking Changes per Coolify Version
- **V2-DX-07**: Example Recipes (Next.js + Postgres + Redis Stack)

### v2 Section 21 — Observability (V2-OBS)

- **V2-OBS-01**: Metrics/Sentinel (CPU, RAM, Disk pro Server)
- **V2-OBS-02**: Traefik/Proxy Status + Version + outdated warning
- **V2-OBS-03**: Container-Liste pro App
- **V2-OBS-04**: Real-time Event Stream (deployment started, health changed)
- **V2-OBS-05**: Log-Suche / Filter (nicht nur tail)
- **V2-OBS-06**: Sentry/Log-drain Konfiguration lesen/setzen
- **V2-OBS-07**: Server Metrics History (Sentinel 7-day)

### v2 Section 21 — Networking & Security (V2-SEC)

- **V2-SEC-01**: SSL/TLS Certificate Status per Domain
- **V2-SEC-02**: Firewall-Regel Management
- **V2-SEC-03**: IP Allowlist für DB Public Access
- **V2-SEC-04**: Rotate Webhook Secrets
- **V2-SEC-05**: Secrets Manager Integration (Vault, 1Password)

### v2 Section 21 — CI/CD (V2-CICD)

- **V2-CICD-01**: Webhook URL + Secret pro App ausgeben
- **V2-CICD-02**: PR Preview automatisch listen
- **V2-CICD-03**: Rollback zu vorherigem Deployment
- **V2-CICD-04**: Blue/Green oder Canary Deploy Steuerung
- **V2-CICD-05**: Build-Cache invalidieren granular
- **V2-CICD-06**: GHCR/Docker Hub Registry Credential Management

### v2 Section 21 — Multi-Tenancy (V2-TEN)

- **V2-TEN-01**: RBAC: wer darf deployen/restarten
- **V2-TEN-02**: Per-Project API Tokens

### v2 Section 21 — Data & Storage (V2-DATA)

- **V2-DATA-01**: Volume Snapshot / Restore
- **V2-DATA-02**: S3-Backup Destination konfigurieren
- **V2-DATA-03**: Database Connection String export (internal vs public, masked)
- **V2-DATA-04**: Cross-server Database Migration Helper

### v2 Section 21 — Infrastructure as Code (V2-IAC)

- **V2-IAC-01**: Export Project/App als Coolify-kompatibles JSON/YAML
- **V2-IAC-02**: Import / Restore from Backup
- **V2-IAC-03**: Drift Detection (API state vs. git-tracked config)
- **V2-IAC-04**: Terraform/Pulumi Provider Wrapper

### v2 Section 21 — Cloud & Server (V2-INFRA)

- **V2-INFRA-01**: Docker Cleanup manuell triggern
- **V2-INFRA-02**: Swarm/Cluster Node Management
- **V2-INFRA-03**: Auto-scaling Hooks

### v2 Section 21 — Reliability (V2-REL)

- **V2-REL-01**: Deployment Queue Depth / Position
- **V2-REL-02**: Concurrent Build Limit lesen/setzen
- **V2-REL-03**: Maintenance Mode per App (traffic drain)

### v2 Section 21 — Container Runtime (V2-RT)

- **V2-RT-01**: Exec into Container (wenn Coolify API verfügbar)
- **V2-RT-02**: File Upload/Download in Container
- **V2-RT-03**: Port-Forward / Tunnel für Debug

## Out of Scope

| Feature | Reason |
|---------|--------|
| Execute Command in Container | Coolify 4.1.x API endpoint fehlt/broken (mcp_features.md §20) |
| Globale Deployments-Liste (unzuverlässig) | Manche Implementierungen liefern leer — per-app listen stattdessen |
| 60+ granulare Einzeltools | Bewusst anti-pattern; action-Schema stattdessen |
| Cloud-only Coolify Features | Nur self-hosted Instanzen |
| Mobile/CLI außer MCP | MCP-Server ist primäres Interface; separate CLI optional später |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CTX-01 | 1 — Foundation & Multi-Instance Auth | Pending |
| CTX-02 | 1 — Foundation & Multi-Instance Auth | Pending |
| CTX-03 | 1 — Foundation & Multi-Instance Auth | Pending |
| CTX-04 | 1 — Foundation & Multi-Instance Auth | Pending |
| CTX-05 | 1 — Foundation & Multi-Instance Auth | Pending |
| CTX-06 | 1 — Foundation & Multi-Instance Auth | Pending |
| CTX-07 | 1 — Foundation & Multi-Instance Auth | Pending |
| ERR-01 | 1 — Foundation & Multi-Instance Auth | Pending |
| ERR-02 | 1 — Foundation & Multi-Instance Auth | Pending |
| ERR-03 | 1 — Foundation & Multi-Instance Auth | Pending |
| DX-01 | 1 — Foundation & Multi-Instance Auth | Pending |
| DX-02 | 1 — Foundation & Multi-Instance Auth | Pending |
| DIST-03 | 1 — Foundation & Multi-Instance Auth | Complete |
| SYS-01 | 2 — Discovery & Read Projections | Complete |
| SYS-02 | 2 — Discovery & Read Projections | Complete |
| SYS-06 | 2 — Discovery & Read Projections | Complete |
| SYS-07 | 2 — Discovery & Read Projections | Complete |
| APP-01 | 2 — Discovery & Read Projections | Complete |
| APP-02 | 2 — Discovery & Read Projections | Complete |
| SVC-01 | 2 — Discovery & Read Projections | Complete |
| SVC-02 | 2 — Discovery & Read Projections | Complete |
| OUT-01 | 2 — Discovery & Read Projections | Complete |
| OUT-03 | 2 — Discovery & Read Projections | Complete |
| OUT-04 | 2 — Discovery & Read Projections | Complete |
| OUT-05 | 2 — Discovery & Read Projections | Complete |
| DX-03 | 2 — Discovery & Read Projections | Complete |
| SYS-03 | 3 — Diagnose & Issue Scan | Complete |
| SYS-04 | 3 — Diagnose & Issue Scan | Complete |
| SYS-05 | 3 — Diagnose & Issue Scan | Complete |
| OUT-06 | 3 — Diagnose & Issue Scan | Complete |
| APP-03 | 4 — App Deploy Lifecycle | Pending |
| APP-04 | 4 — App Deploy Lifecycle | Complete |
| APP-05 | 4 — App Deploy Lifecycle | Complete |
| APP-06 | 4 — App Deploy Lifecycle | Complete |
| APP-07 | 4 — App Deploy Lifecycle | Complete |
| APP-08 | 4 — App Deploy Lifecycle | Complete |
| APP-09 | 4 — App Deploy Lifecycle | Complete |
| DEP-01 | 4 — App Deploy Lifecycle | Complete |
| DEP-02 | 4 — App Deploy Lifecycle | Complete |
| DEP-03 | 4 — App Deploy Lifecycle | Complete |
| APP-10 | 5 — Logs & Service/DB Ops | Pending |
| APP-11 | 5 — Logs & Service/DB Ops | Pending |
| SVC-03 | 5 — Logs & Service/DB Ops | Pending |
| SVC-04 | 5 — Logs & Service/DB Ops | Pending |
| SVC-05 | 5 — Logs & Service/DB Ops | Pending |
| EMG-01 | 6 — Bulk, Emergency & Safety | Pending |
| EMG-02 | 6 — Bulk, Emergency & Safety | Pending |
| EMG-03 | 6 — Bulk, Emergency & Safety | Pending |
| OUT-02 | 6 — Bulk, Emergency & Safety | Pending |
| OUT-07 | 6 — Bulk, Emergency & Safety | Pending |
| DIST-01 | 7 — Distribution & Docs | Pending |
| DIST-02 | 7 — Distribution & Docs | Pending |

**Coverage:**

- v1 requirements: 52 total (CTX 7 + SYS 7 + APP 11 + SVC 5 + DEP 3 + EMG 3 + OUT 7 + ERR 3 + DX 3 + DIST 3)
- Mapped to phases: 52
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-11*
*Last updated: 2026-07-12 after roadmap traceability*
