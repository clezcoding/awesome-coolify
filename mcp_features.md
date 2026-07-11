# Coolify MCP — Feature-Katalog

Union aller Features aus Coolify CLI, user-coolify MCP und coolify-backup-mcp (Live-Audit Jul 2026). Keine Tool-Zuordnung — Basis für eigenen MCP-Server.

Coolify API-Version referenziert: **4.1.x**

---

## 1. Authentifizierung & Verbindung

- API-Health-Check / Connectivity-Verify
- Coolify-Instanz-Version abfragen
- MCP-Server-Version (Meta)
- MCP-Auth-Flow für Server-Initialisierung
- API-Token pro Request override
- Multi-Instance **Context-Management**: mehrere Coolify-URLs/Tokens (add, list, get, update, delete, set-default, use/switch, verify, version)
- Debug-Modus
- Shell-Completion generieren
- CLI Self-Update

---

## 2. Output & Ergonomie

- Response-Formate: table, JSON, pretty
- Sensitive-Werte opt-in anzeigen (`show-sensitive` / `reveal`)
- Sensitive-Werte default maskieren (`***`)
- Pagination (page, per_page)
- Summary vs. Full-Detail Projektionen (essential fields only)
- Follow-Mode für Live-Logs (tail -f)
- Log-Zeilen limitieren (`lines`, `-n`)
- Deployment-Logs paginiert / on-demand (nicht immer inline)
- `max_chars` Cap für große Payloads
- Follow-up Action Hints nach Get-Operationen (z. B. „Logs“, „Restart“)
- Destructive-Ops Confirmation Gate (`confirm: true`)
- Credentials in Full-Payloads maskieren (webhook secrets, DB passwords, compose bodies, env values)

---

## 3. System & Übersicht

- Infrastructure-Overview (Counts: servers, projects, apps, databases, services)
- Alle Resources listen (unified: apps + DBs + services)
- Resources auf Server listen
- Server-Domains listen (inkl. IPv4/IPv6)
- Global Issue-Scan (unhealthy apps/DBs/services, unreachable servers, exited services)
- App-Diagnose per UUID, Name oder Domain (Status, Health, Env-Count, recent deployments)
- Server-Diagnose per UUID, Name oder IP (Resources, Domains, Validation)
- System-Health
- Coolify API enable/disable
- Dokumentationssuche (How-to, Config, Troubleshooting)

---

## 4. Teams

- Teams listen
- Team Details (get by ID)
- Current Team
- Team Members listen (per Team oder current)

---

## 5. Projekte & Environments

- Projekte: list, get, create, update, delete
- Environments: list, get, create, delete
- Environment enthält dragonfly/keydb/clickhouse DBs (API-Lücken-Workaround)
- Projekt-weit alle Apps redeployen
- Projekt-weit alle Apps restarten

---

## 6. Server

- Server: list, get, create (add), update, delete (remove)
- Server validieren (SSH/Reachability)
- Server als Build-Server markieren
- Server-Validierung sofort nach Create triggern
- Server-Ressourcen abfragen
- Server-Domains abfragen
- Private Key UUID beim Server-Create binden

---

## 7. Private Keys (SSH)

- Private Keys: list, get, create (add), update, delete (remove)
- PEM-Inhalt, Name, Description

---

## 8. Cloud Provider Integration

### Cloud Tokens
- list, get, create, update, delete, validate
- Provider: Hetzner, DigitalOcean

### Hetzner-spezifisch
- Locations listen
- Server-Types listen
- Images listen
- SSH Keys listen
- Hetzner-Server erstellen

---

## 9. GitHub Apps

- GitHub Apps: list, get, create, update, delete
- Repositories einer GitHub App listen
- Branches eines Repositories listen
- GitHub Enterprise: custom API/HTML URL
- Custom Git User/Port
- System-wide Verfügbarkeit

---

## 10. Applications — Lifecycle

### Lesen
- Apps listen (summary oder full)
- App Details (get)
- App Runtime-Logs (limitiert / follow)
- App Deployments listen (per App oder global)
- Deployment Details (get)
- Deployment Build-Logs (separat, paginiert)
- Deployment canceln

### Erstellen (Build-Pack Varianten)
- Public Git Repo (nixpacks / dockerfile / dockercompose)
- Private Git Repo via Deploy Key
- Private Git Repo via GitHub App
- Dockerfile (inline base64)
- Docker Compose (inline base64)
- Docker Image (Registry name + tag)
- Generic Application Create

### Konfiguration (Create & Update)
- Name, Description, FQDN, Domains
- Project + Environment (name oder UUID)
- Server + Destination UUID
- Git Repository, Branch, Build Pack
- Ports Exposes
- Base Directory, Publish Directory
- Install / Build / Start Commands
- Dockerfile Location, Dockerfile Target Build
- Watch Paths (auto-deploy path filters)
- Docker Registry Image Name + Tag
- Custom Docker Run Options
- Custom Labels (Traefik/Caddy)
- Custom Network Aliases (app-to-app DNS)
- Instant Deploy nach Create
- HTTP Basic Auth (enable, user, password)

### Health Checks
- Enable/Disable
- Path, Port, Host, Method, Scheme
- Expected Return Code, Response Text Match
- Interval, Timeout, Retries, Start Period

### Steuerung
- Start, Stop, Restart
- Deploy (per UUID, Name, Tag, Batch)
- Deploy mit Force Rebuild (no cache)
- Deploy mehrerer Resources per comma-separated UUIDs oder Tags
- Deploy Wait-Mode: auf Terminal-Status pollen (finished/failed/cancelled) mit Timeout
- Preview Deployment löschen (per pull_request_id)

### Löschen
- App delete (optional confirm)
- Preview delete
- Volumes mit löschen (`delete_volumes`)

---

## 11. Application Environment Variables

- Env Vars: list, get, create, update, delete
- Bulk Update (einzelne App)
- Bulk Update (mehrere Apps gleichzeitig — gleicher Key/Value)
- Sync aus `.env`-Datei (diff: create new, update existing)
- Flags: `is_buildtime`, `is_runtime`, `is_preview`, `is_literal`, `is_multiline`
- Env-Werte reveal opt-in

---

## 12. Application Storage (Volumes)

- Storages: list, create, update, delete
- Persistent Volumes / File Mounts

---

## 13. One-Click Services

### Lesen
- Services: list, get
- Service Logs
- Service Env Vars: list, get, create, update, delete, bulk

### Lifecycle
- Service create (one-click type)
- Service update, delete
- Start, Stop, Restart
- Restart mit Pull Latest Images

### Konfiguration
- Custom Docker Compose YAML (raw, auto base64)
- Name, Description, Project, Environment, Server
- Service Env Vars (preview, literal, multiline)

### Storage
- Service Storages: list, create, update, delete

---

## 14. Databases

### Typen
postgresql, mysql, mariadb, mongodb, redis, clickhouse, dragonfly, keydb

### Lesen
- Databases: list, get
- Database Logs

### Lifecycle
- Create (mit instant_deploy, is_public, public_port, custom image)
- Update
- Delete (optional delete_volumes)
- Start, Stop, Restart

### Konfiguration
- Name, Description, Server, Project, Environment, Destination
- Postgres User/Password (bei Create)
- Public Access + Public Port

### Env Vars
- Database Env: list, create, update, delete, bulk

### Storage
- Database Storages: list, create, update, delete

---

## 15. Database Backups

- Backup Schedules: list, get, create, update, delete
- Backup Executions: list, get, delete execution
- Scheduled Backup aktivieren (frequency, retention count)
- Sofort-Backup triggern (manual run)

---

## 16. Deployments (cross-cutting)

- Global Deployments listen
- Per-App Deployments listen
- Deployment get (Status, Commit, Timestamps, Server)
- Deployment Logs (bounded tail bei Failure in Wait-Mode)
- Deployment cancel
- Deploy by Resource Name
- Deploy Batch (multiple names)
- `logs_available` Hint ohne Inline-Bloat
- `include_logs` opt-in für list_for_app

---

## 17. Scheduled Tasks (Cron)

- Scheduled Tasks: list, create, update, delete
- Executions listen (stdout in message field)
- Run Once: throwaway cron, poll execution, cleanup (idempotent commands empfohlen)
- Command max 255 chars (Coolify DB limit)
- Scope: Application oder Service

---

## 18. Emergency / Bulk Ops

- Stop All Running Apps (Emergency)
- Redeploy entire Project
- Restart all Apps in Project

---

## 19. Resource Discovery

- Lookup by UUID
- Lookup by Name (fuzzy)
- Lookup by Domain/FQDN
- Lookup by IP (Server)

---

## 20. Nicht verfügbar / Broken (trotzdem in bestehenden Tools referenziert)

- Execute Command in Application Container (API endpoint fehlt / broken)
- Globale Deployments-Liste liefert in manchen Implementierungen leer

---

## 21. Wünschenswerte Features (fehlen komplett oder nur teilweise)

### Agent & DX
- Einheitliches Tool-Schema (action-basiert statt 60+ Einzeltools)
- Automatische Payload-Größen-Warnung vor Tool-Call
- Structured Error Codes (401 vs 404 vs 422 vs 500) mit Recovery-Hints
- Idempotency Keys für Deploy/Restart
- Dry-Run Modus für destructive ops
- Audit Log / „who changed what“ aus Coolify API

### Observability
- Metrics/Sentinel-Daten abfragen (CPU, RAM, Disk pro Server)
- Traefik/Proxy Status + Version + outdated warning
- Container-Liste pro App (nicht nur Coolify-Status)
- Real-time Event Stream (deployment started, health changed)
- Log-Suche / Filter (nicht nur tail)
- Sentry/Log-drain Konfiguration lesen/setzen

### Networking & Security
- SSL/TLS Certificate Status per Domain
- Firewall-Regel Management
- IP Allowlist für DB Public Access
- Rotate Webhook Secrets
- Secrets Manager Integration (Vault, 1Password) statt inline env

### CI/CD
- Webhook URL + Secret pro App ausgeben
- PR Preview automatisch listen (nicht nur delete)
- Rollback zu vorherigem Deployment
- Blue/Green oder Canary Deploy Steuerung
- Build-Cache invalidieren granular
- GHCR/Docker Hub Registry Credential Management

### Multi-Tenancy & Access
- Team Member add/remove/invite (nur list existiert in CLI)
- RBAC: wer darf deployen/restarten
- Per-Project API Tokens

### Daten & Storage
- Volume Snapshot / Restore
- S3-Backup Destination konfigurieren
- Database Connection String export (internal vs public, masked)
- Cross-server Database Migration Helper

### Infrastructure as Code
- Export Project/App als Coolify-kompatibles JSON/YAML
- Import / Restore from Backup
- Drift Detection (API state vs. git-tracked config)
- Terraform/Pulumi Provider Wrapper

### Cloud & Server
- DigitalOcean Server Create (nur Token-Management existiert)
- Server Metrics History (Sentinel 7-day)
- Auto-scaling Hooks
- Docker Cleanup manuell triggern
- Swarm/Cluster Node Management

### Documentation & Discovery
- OpenAPI Schema introspection
- Interactive „what should I run?“ Planner (natural language → action)
- Changelog / Breaking Changes per Coolify Version
- Example Recipes (Next.js + Postgres + Redis Stack)

### Reliability
- Retry mit Exponential Backoff für transient API errors
- Deployment Queue Depth / Position
- Concurrent Build Limit lesen/setzen
- Maintenance Mode per App (traffic drain)

### Container Runtime
- Exec into Container (wenn API kommt)
- File Upload/Download in Container
- Port-Forward / Tunnel für Debug

---

## 22. Feature-Matrix nach Domäne (Kurzreferenz)

| Domäne | Read | Create | Update | Delete | Control | Special |
|---|---|---|---|---|---|---|
| Context/Auth | ✓ | ✓ | ✓ | ✓ | verify | multi-instance |
| System/Overview | ✓ | — | — | — | health | diagnose, scan |
| Teams | ✓ | — | — | — | — | members |
| Projects | ✓ | ✓ | ✓ | ✓ | redeploy/restart all | — |
| Environments | ✓ | ✓ | — | ✓ | — | — |
| Servers | ✓ | ✓ | ✓ | ✓ | validate | domains, resources |
| Private Keys | ✓ | ✓ | ✓ | ✓ | — | — |
| Cloud Tokens | ✓ | ✓ | ✓ | ✓ | validate | Hetzner/DO |
| Hetzner | ✓ | ✓ | — | — | — | server create |
| GitHub Apps | ✓ | ✓ | ✓ | ✓ | — | repos, branches |
| Applications | ✓ | ✓ (6 variants) | ✓ | ✓ | start/stop/restart/deploy | previews, health, aliases |
| App Env | ✓ | ✓ | ✓ | ✓ | sync/bulk | reveal, flags |
| App Storage | ✓ | ✓ | ✓ | ✓ | — | — |
| Services | ✓ | ✓ | ✓ | ✓ | start/stop/restart | compose custom |
| Service Env | ✓ | ✓ | ✓ | ✓ | bulk | — |
| Service Storage | ✓ | ✓ | ✓ | ✓ | — | — |
| Databases | ✓ | ✓ | ✓ | ✓ | start/stop/restart | 8 types |
| DB Env | ✓ | ✓ | ✓ | ✓ | bulk | — |
| DB Storage | ✓ | ✓ | ✓ | ✓ | — | — |
| DB Backups | ✓ | ✓ | ✓ | ✓ | trigger | executions |
| Deployments | ✓ | deploy | — | cancel | wait-poll | logs on-demand |
| Scheduled Tasks | ✓ | ✓ | ✓ | ✓ | run_once | cron 255 char limit |
| Emergency | — | — | — | — | stop all apps | — |
| Docs | search | — | — | — | — | — |

---

*Generiert aus Live-Tests gegen hostunlimited (Coolify 4.1.2). Für eigenes MCP-Design: Section 21 = Differenzierung.*
