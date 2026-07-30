# Requirements: Coolify MCP Server — v3.3 Agent Intelligence

**Defined:** 2026-07-30
**Core Value:** Ein AI-Agent kann über einen einzigen, gut dokumentierten MCP-Server Coolify-Instanzen operieren — deployen, Logs lesen, Probleme diagnostizieren, und Infrastruktur von Grund auf anlegen — ohne Workarounds oder drei parallele MCP-Implementierungen.

## v3.3 Requirements

Composite intelligence on Coolify 4.1.x — no new REST endpoints required.

### Instance Scorecard

- [x] **INTEL-01**: Agent can fetch a per-instance health scorecard with factor breakdown (deployments, backups, exited resources, diagnose.scan summary)
- [x] **INTEL-02**: Scorecard exposes severity-tagged findings with structured recovery hints

### Dependency Map

- [x] **GRAPH-01**: Agent can build a dependency graph from live resources (application ↔ database ↔ service links)
- [x] **GRAPH-02**: Agent can query impact analysis before delete or restart ("what breaks if resource X goes down")

### Resource Janitor

- [x] **JANI-01**: Agent can list orphaned, stopped, or long-exited resources with safe cleanup suggestions
- [x] **JANI-02**: Janitor cleanup mutations require explicit confirm gate per SAF pattern

### Drift & Heal

- [ ] **DRIFT-01**: Agent can run manifest audit comparing local `.coolify/manifest.json` vs live Coolify state with remediation steps
- [ ] **DRIFT-02**: Agent can compare environment variables across environments and receive promotion suggestions (`env.promote`)
- [ ] **DRIFT-03**: Audit and drift results include concrete fix hints, not raw diff only

### Deploy Guard

- [ ] **GUARD-01**: Agent can run deploy preflight before mutation (instance health, env completeness, recent deployment failures, DNS readiness)
- [ ] **GUARD-02**: Preflight returns a deploy risk score with named factor breakdown
- [ ] **GUARD-03**: Agent can roll back an application to its last successful deployment

### Log Brain

- [ ] **BRAIN-01**: Agent can analyze existing application runtime logs for known patterns (OOM, 5xx spike, crash loop, connection refused)
- [ ] **BRAIN-02**: Analysis returns severity, matched patterns, and suggested next actions (links to diagnose/playbook flows)

### Ops Playbooks

- [ ] **PLAY-01**: Parameterized MCP prompts exist for incident response, rollback, and maintenance-window flows
- [ ] **PLAY-02**: Playbooks compose existing atomic tools — no duplicate API client implementations

### Smart Recipes

- [ ] **SREC-01**: Agent can request a stack recommendation (e.g. "Next.js + Postgres") and receive a one-click service + env + deploy plan
- [ ] **SREC-02**: Recommendations use live `service.list-types` catalog data, not hardcoded YAML templates

## Future Requirements (v3.4+)

Deferred until Coolify 4.2.0+ stable.

### Service/DB Logs

- **SVC-04**: `service.logs` bounded tail on Coolify 4.2.0+
- **SVC-05**: `database.logs` bounded tail on Coolify 4.2.0+
- **SVC-06**: `diagnose.logs` extension for service/DB resources

### Platform Expansion

- **OAPI-03**: Close high-value OpenAPI gap rows (storages, scheduled tasks, GitHub Apps)
- **CTX-10**: Cross-instance fan-out queries with rate-limit guards

## Out of Scope

| Feature | Reason |
|---------|--------|
| Service/DB runtime log tail | Coolify 4.2.0+ still pre-release — v3.4 |
| ML/statistical anomaly detection | Rule-based Log Brain sufficient for v3.3; ML adds dependency + tuning cost |
| Auto-execute destructive cleanup without confirm | SAF-01 confirm gates mandatory |
| Cross-instance fan-out orchestration | Rate limits + security — deferred CTX-10 |
| New OpenAPI gap closure (storages, cron, Hetzner) | Separate milestone; v3.3 focuses on composite intelligence |
| execute_command in container | Absent from Coolify 4.1.x OpenAPI |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INTEL-01 | Phase 28 | Complete |
| INTEL-02 | Phase 28 | Complete |
| GRAPH-01 | Phase 28 | Complete |
| GRAPH-02 | Phase 28 | Complete |
| JANI-01 | Phase 28 | Complete |
| JANI-02 | Phase 28 | Complete |
| DRIFT-01 | Phase 29 | Pending |
| DRIFT-02 | Phase 29 | Pending |
| DRIFT-03 | Phase 29 | Pending |
| GUARD-01 | Phase 30 | Pending |
| GUARD-02 | Phase 30 | Pending |
| GUARD-03 | Phase 30 | Pending |
| BRAIN-01 | Phase 31 | Pending |
| BRAIN-02 | Phase 31 | Pending |
| PLAY-01 | Phase 31 | Pending |
| PLAY-02 | Phase 31 | Pending |
| SREC-01 | Phase 31 | Pending |
| SREC-02 | Phase 31 | Pending |

**Coverage:**

- v3.3 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-30*
*Last updated: 2026-07-30 — v3.3 roadmap created (Phases 28–31)*
