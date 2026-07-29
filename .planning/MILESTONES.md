# Milestones

## v3.2 Observability & DX (Shipped: 2026-07-29)

**Closeout:** `verified_closeout` — artifact audit clear; all 4 phases verified; 11/11 requirements complete.
**Phases completed:** 4 phases (24–27), 18 plans, 43 tasks
**Timeline:** 2026-07-27 → 2026-07-29 (~3 days)
**Code delta (src/docs/scripts):** ~42 files, +3.3k / −0.4k LOC

**Key accomplishments:**

- 14 it.fails RED targets lock CAP-01/CAP-02/OBS-01 acceptance before implementation; production handlers untouched
- system.version exposes coolifyVersion + package-backed mcpVersion + static 4.1.2 capability flags; meta.version shares package identity without capabilities
- deployment.logs on deployment tool with shared processDeploymentBuildLogs, XOR uuid resolution, and COOLIFY_NO_DEPLOYMENTS structured errors
- Coverage CI green with deployment.logs; bilingual README + deploy prompt steer agents to capabilities and build logs
- 11 it.fails RED targets lock OBS-02 follow contract and OBS-03 one-shot regression before log-follow-poll implementation
- application.logs follow:true ships deduped aggregate polling with idle stop, COOLIFY_LOG_FOLLOW_TIMEOUT dual-signal, and partial logs on API failure
- Flat applicationActionSchema follow wiring with zodDefaultFields strip, XOR guards, and golden one-shot runtime/build regression tests
- Fifth `application_logs_follow` capability on system.version with README/coverage OBS-02 discovery docs
- WR-01 empty-snapshot idle and WR-03 one-bound interval guards locked in regression tests; VERIFICATION report 10/10 passed
- Split application MCP boundary vs handler Zod schemas so follow+deployment_uuid reaches throwValidationError and returns structured COOLIFY_422
- Ten it.fails scaffolds lock diagnose.logs, buildRuntimeLogPayload, incident prompt, and diagnose_logs capability contracts before Plan 26-01 implementation
- Composite `diagnose.logs` handler with shared `buildRuntimeLogPayload`, soft-partial triage failures, and full DIAG-01 test coverage
- Incident prompt + diagnose_logs capability + README/coverage aligned with shipped diagnose.logs composite
- Post-wizard App log troubleshooting in coolify-setup with capability discovery, diagnose.logs steps, sibling skill links, and OBS-03 regression lock
- Ten it.fails scaffolds lock BRND-01 icon contract (buildMcpServerIcons, data URI first, readPackageVersion) and DOC-01 PROJECT opener gate before Plan 27-01 implementation
- Build-time mcp-icon-192 base64 embed, buildMcpServerIcons dual data URI + jsDelivr CDN, readPackageVersion in McpServer constructor — BRND-01 tracer slice GREEN
- Dual-path Cursor MCP verify documented — server emits data URI + CDN icons at 1.0.1; client shows letter A fallback only (D-05)
- PROJECT.md opener + README EN/DE + cloud.md reflect npm 1.0.1 shipped; dual-icon branding copy per UI-SPEC; doc-version-parity gate GREEN

---

## v3.1 Setup, Skills & DX (Shipped: 2026-07-27)

**Closeout:** `verified_closeout` — milestone audit passed; all 6 phases verified; 21/21 requirements complete.
**Phases completed:** 6 phases (19–23 + 23.1), 27 plans, 62 tasks
**Timeline:** 2026-07-24 → 2026-07-27 (~4 days)
**Code delta (src/docs/scripts):** ~62 files, +23.3k / −15.9k LOC

**Key accomplishments:**

- Flat MCP schemas (`createFlatActionSchema`) + action catalogs restore Cursor parameter panels across 17 domain tools
- Four parameterized MCP prompts (deploy, diagnose, new-project, incident) orchestrate existing atomic tools
- Dynamic `service.list-types` + `recipe` tool (git-app, app+db, one-click) from Coolify catalog — no forked YAML
- `deployment.watch` with Equal Jitter backoff, bounded timeout, dual-signal error envelopes
- Setup wizard (`setup` tool) with headless `gh` preflight, pause/resume, greenfield/link-existing wire modes
- Four IDE skill packs (Cursor, Claude Code, Codex) + coolify-setup manifest test
- OpenAPI coverage map (`docs/COVERAGE.md`, 115 actions, v4.1.2 pin) + npm pack allowlist gate
- Milestone Changeset for `awesome-coolify-mcp@1.0.0` via OIDC trusted publishing
- Phase 23.1: `set_env` → `envs:sync` delegation + Nyquist 100% REQ-row coverage (phases 19–23)

**Audit report:** [milestones/v3.1-MILESTONE-AUDIT.md](milestones/v3.1-MILESTONE-AUDIT.md)

---

## v3.0 Platform Foundation (Shipped: 2026-07-23)

**Closeout:** `override_closeout` — 4 open todos acknowledged (see STATE.md Deferred Items). Stale pre-ship audit superseded by phase verification (15–18 passed).
**Phases completed:** 4 phases, 18 plans, 35 tasks
**Timeline:** 2026-07-21 → 2026-07-23 (~3 days)
**Git range:** Phase 15 (#35) → Phase 18 (#42)
**Code delta (src/scripts/docs):** ~81 files, +8.7k / −0.5k LOC

**Key accomplishments:**

- Multi-instance registry (`InstanceManager` + `instances.json`) with optional `instance` routing on all API tools, soft-start boot, 0o700/0o600 + token redaction
- Coolify Cloud support (`isCloudUrl`, cloud error codes/hints, `instance.cloud-info`) plus MCP `serverInfo` branding (icons/title/description/websiteUrl)
- Workspace-local `.coolify/manifest.json` with sync/diff, auto-gitignore, stale-404 hints, and mutation auto-hooks
- Live UAT harness (`npm run uat:live`) — declarative matrix, stdio + in-process runners, JSON/Markdown reports, CONTRIBUTING runbook
- 21/21 v3.0 requirements complete (CTX/CLD/BRND/MAN/UAT)

### Known Gaps

- Pending todos deferred: IDE skills (v3.1), setup wizard (v3.1), OpenAPI spec integration
- Manifest todo file leftover (shipped Phase 17)
- Phase 18: 4 `human_needed` live behaviors (full live matrix, timeout path, cross-project scope, v3_gaps skips)

---

## v2.0 Creation & CRUD (Shipped: 2026-07-21)

**Phases completed:** 13 phases, 39 plans, 141 tasks

**Key accomplishments:**

- Bounded projection and formatter pipeline — summary/full filtering, pagination, format rendering, max_chars guard, and shared Zod read params for all Phase 2 discovery tools.
- First vertical read slice — agent can call system.infrastructure_overview and resource.list via MCP with bounded summary output.
- application.get, service.get, and database.get deliver summary-by-default and sanitized full projections via MCP with D-11 table guard on domain tools.
- Cross-type resource.find with relevance-ranked fuzzy matching and separate docs.search static index for Coolify troubleshooting guides
- Uniform buildReadResponse envelope across all P2 tools with end-to-end integration test and Phase 2 validation sign-off
- Wave-1-Infrastruktur für Diagnose: Schema-Stub, Klassifikator, Hint-Generator, Projektoren und 6 Client-Helper — ohne agent-aufrufbare Handler (erst ab 03-02).
- Erster agent-aufrufbarer diagnose-Vertical-Slice: `diagnose({ action: 'app' })` liefert D-05-Felder, strukturierte Hints und parallele Composition mit Graceful Degradation.
- Zweiter agent-aufrufbarer diagnose-Vertical-Slice: `diagnose({ action: 'server' })` liefert D-09-komponierte Server-Ansicht mit paralleler 4-Wege-Composition, Validate-Trigger und Graceful Degradation.
- Dritter und letzter diagnose-Vertical-Slice: `diagnose({ action: 'scan' })` liefert flottenweite Issue-Liste in Severity-Buckets (critical > high > info) mit strukturierten FollowUpHints — alle 3 diagnose-Actions implementiert.
- OUT-06 abgeschlossen: application/service/database get liefern strukturierte `hints[]` via gemeinsamen `generateHints` — konsistent mit diagnose-Oberfläche.
- Handler-Level Diagnose-Flow-Integrationstest mit Mock-Fixtures, Coverage-Gate und Phase-3-Validierungs-Sign-Off — stdio E2E manuell
- Extended toolOutputSchema with ReadResponse _meta fields and child-process MCP regression test — healed all 5 Phase 3 UAT blockers and Phase 2 read-tool regressions
- App lifecycle mutations (start/stop/restart) with strict identifier resolution, COOLIFY_AMBIGUOUS_MATCH guard, and readOnlyHint removed from application tool
- Single-app deploy with force rebuild, 3s wait-mode polling, logs_available hint — no inline logs in deploy responses
- Per-app deployment list/get/cancel tool with graceful 400 handling, full projection redaction, and mutating MCP registration
- Batch deploy by uuids/tags with dedup, best-effort sequential iteration, and per-app logs_available hints — no inline logs
- Handler-level deploy-flow integration suite + Phase 4 validation sign-off — 286 tests green, deployment.ts 97.81% lines
- `application.logs` liefert begrenzte Runtime- und Build-Logs mit JSON-Array-Pipeline, api.sensitive-Gate und sharedLogParamsSchema — P3/P4 Forward-Ref-Hints sind jetzt aufrufbar.
- Service-Tool liefert start/stop/restart/deploy per UUID oder Name — deploy nutzt POST /services/{uuid}/restart?latest=true, Mehrdeutigkeit mit Projekt+Environment-Kontext, fire-and-forget ohne deployment_uuid.
- Database-Tool liefert start/stop/restart per UUID oder Name — fire-and-forget ohne deploy/pull_latest, Mehrdeutigkeit mit Projekt+Environment-Kontext, P3-Forward-Ref-Hints jetzt aufrufbar.
- ROADMAP Phase 5 SC4 marked DEFERRED to v1.1 — service/DB logs omitted from v1 (no stub, no COOLIFY_501) pending Coolify v4.1.3+ / PR #6293
- Handler-Level-Integration über application.logs, Service-/DB-Lifecycle und service.deploy pull_latest — 378 Tests grün, VALIDATION mit 9 Task-Rows signiert.
- Emergency-Tool mit stop_all/redeploy_project/restart_project, COOLIFY_CONFIRM_REQUIRED-Confirm-Gate und Preview-Block { would_affect, sample_uuids, action }
- Handler-level integration suite (27 tests) für emergency confirm gates + reveal masked/plaintext; VALIDATION sign-off mit 459 Tests green und emergency.ts 94.18% line coverage
- npm-Paket `awesome-coolify-mcp` ist publish-ready (Dry-Run grün); Wave-0-Parity-Tests sind RED und warten auf README-Rewrite in Plan 07-02.
- README.md und README.de.md dokumentieren alle 10 Tools und 32 Actions, drei Install-Pfade und Safety — Wave-0-docs-parity ist 6/6 GREEN.
- Statische docs/install.html + docs/index.html liefern 16-Client-MCP-Konfiguration, Deeplinks und 11/11 Security-Tests — alles client-side ohne Backend.
- Coolify 4.1.x read projections resolve real project names via environment_id index — emergency restart/redeploy preview chains without COOLIFY_404
- Service stop sends docker_cleanup=false by default and COOLIFY_422 surfaces Coolify body messages — UAT gap 29 closed on one-click compose services
- Two failing vitest files lock KEY-01..05 and SRV-01..05 behaviors before private_key/server handlers exist
- Phase-8-shared infrastructure: private-key/server CRUD client, COOLIFY_409/SSH_UNREACHABLE errors, PEM hard-mask, resource.list type=server
- private_key MCP handler with PEM-safe CRUD, XOR create, confirm gate, and COOLIFY_409 dependency blocking
- server MCP handler with auto-validation polling, SSH unreachable soft-success, confirm-gated delete, and private_key_uuid resolution on get
- private_key and server handlers wired into registerCoolifyTools — Phase 8 tools agent-callable via MCP (12 tools total)
- Dual-layer D-11 rejection: private_key.list schema accepts reveal; handler returns COOLIFY_422 for reveal:true — live MCP path matches unit tests
- Two failing vitest files lock PROJ-01..05 and D-01..D-15 before project/environment handlers exist
- Project/environment CRUD client, resource.list discovery types, and name-to-UUID resolvers for 09-02/09-03 handlers
- Project CRUD MCP handler mit initial_environment-Garantie, confirm-gated delete und name→UUID-Auflösung — 09-00 project.test.ts GREEN
- Environment-CRUD mit project-scoped Auflösung, confirm-gated delete, Child-Resource-Pre-Check und 409-Duplikat-Hint — 09-00 environment.test.ts GREEN (17/17)
- project and environment handlers wired into registerCoolifyTools — Phase 9 tools agent-callable via MCP (14 tools total)
- Dual-layer validation for project.create initial_environment — optional MCP schema, handler COOLIFY_422 with recovery hints (D-11 pattern)
- 25 vitest it.fails RED scaffolds in application.test.ts covering all Phase 10 requirements before handler implementation
- 7 application CRUD client functions + COOLIFY_VALIDATION_ERROR + 409 conflicts passthrough for Phase 10 handlers
- Five-variant application create handler with Zod gate, instant_deploy fire-and-forget, and 409 force_domain_override recovery
- Curated application update PATCH with HTTP basic auth, secret masking, and 409 force_domain_override recovery
- Confirm-gated application delete with four safe-default flags and non-destructive delete_preview — canonical SAF reference for Phase 11
- 58 it.fails RED tests for service/database CRUD handlers + 13 client HTTP specs — flip GREEN in plans 11-01 through 11-05
- 13 service/database CRUD client functions + yaml-validator compose helper (encode/decode/validate/projectServiceCompose) using yaml@^2.9.0
- Service create with one-click type XOR compose paths, transparent base64 encode, instant_deploy default true, and D-06 compose decode on create/get responses
- 8-engine database create with D-12 public-access confirm gate, instant_deploy default true, SAF-04 masking, and D-13 soft success on start-queue failure
- Service update with curated PATCH + transparent compose I/O, confirm-gated delete with safe defaults, and delete_preview two-stage model
- Database update with curated PATCH + D-12 public-access confirm gate, confirm-gated delete with safe defaults, delete_preview two-stage model, and MCP tool description parity
- projectServiceCompose 3-step fallback chain restores D-06 compose alias for Coolify 4.1.2 plain-YAML responses — G-11-3 and G-11-4 closed
- 1. [Rule 3 - Blocking] it.fails statt bare failing tests für husky-Kompatibilität
- 1. [Rule 2 - Missing Critical] Explizite Env-value-Maskierung
- 1. [Rule 3 - Blocking] is_preview-Tests in Task 1 geflippt für Husky pre-commit
- Application-only `.env` smart-sync with dry_run preview, confirm/prune gates, conflict_policy overwrite|keep_remote|abort, and always-masked disposition
- 1. [Rule 3 - Blocking] it.fails statt roher failing tests für Husky
- Fünf Backup-Client-Methoden plus backup-shared.ts — Frequenz-Schemas, S3-Masking, Confirm-Gate und Payload-Builder als Fundament für 13-02/13-03
- backup:create, backup:list, backup:history im database-Tool — Schedule anlegen, listen, History lesen mit S3-Masking und ask_human_reveal
- 1. [Rule 1 - Bug] backup:delete Schema ohne uuid|name

---

## v1.0 Ops MVP (Shipped: 2026-07-16)

**Phases completed:** 7 phases, 37 plans, 86 tasks

**Key accomplishments:**

- Walking skeleton: MCP stdio server with Zod env fail-fast and `system({ action: 'health' })` returning `{ connected: true, host }` without token leakage
- Structured Coolify error envelope with recovery hints, 3x exponential backoff retry, and two-layer MCP isError responses
- Aggressive secret redaction and stderr-only logging wired into HTTP client and error envelope
- Complete P1 tool surface: system health/version/verify and meta version with Zod discriminatedUnion schemas
- DIST-03 proven: `awesome-coolify-mcp` stdio handshake returns `{ connected: true, host: "puzzlesstool.online" }` with no token leakage
- Bounded projection and formatter pipeline — summary/full filtering, pagination, format rendering, max_chars guard, and shared Zod read params for all Phase 2 discovery tools.
- First vertical read slice — agent can call system.infrastructure_overview and resource.list via MCP with bounded summary output.
- application.get, service.get, and database.get deliver summary-by-default and sanitized full projections via MCP with D-11 table guard on domain tools.
- Cross-type resource.find with relevance-ranked fuzzy matching and separate docs.search static index for Coolify troubleshooting guides
- Uniform buildReadResponse envelope across all P2 tools with end-to-end integration test and Phase 2 validation sign-off
- Wave-1-Infrastruktur für Diagnose: Schema-Stub, Klassifikator, Hint-Generator, Projektoren und 6 Client-Helper — ohne agent-aufrufbare Handler (erst ab 03-02).
- Erster agent-aufrufbarer diagnose-Vertical-Slice: `diagnose({ action: 'app' })` liefert D-05-Felder, strukturierte Hints und parallele Composition mit Graceful Degradation.
- Zweiter agent-aufrufbarer diagnose-Vertical-Slice: `diagnose({ action: 'server' })` liefert D-09-komponierte Server-Ansicht mit paralleler 4-Wege-Composition, Validate-Trigger und Graceful Degradation.
- Dritter und letzter diagnose-Vertical-Slice: `diagnose({ action: 'scan' })` liefert flottenweite Issue-Liste in Severity-Buckets (critical > high > info) mit strukturierten FollowUpHints — alle 3 diagnose-Actions implementiert.
- OUT-06 abgeschlossen: application/service/database get liefern strukturierte `hints[]` via gemeinsamen `generateHints` — konsistent mit diagnose-Oberfläche.
- Handler-Level Diagnose-Flow-Integrationstest mit Mock-Fixtures, Coverage-Gate und Phase-3-Validierungs-Sign-Off — stdio E2E manuell
- Extended toolOutputSchema with ReadResponse _meta fields and child-process MCP regression test — healed all 5 Phase 3 UAT blockers and Phase 2 read-tool regressions
- App lifecycle mutations (start/stop/restart) with strict identifier resolution, COOLIFY_AMBIGUOUS_MATCH guard, and readOnlyHint removed from application tool
- Single-app deploy with force rebuild, 3s wait-mode polling, logs_available hint — no inline logs in deploy responses
- Per-app deployment list/get/cancel tool with graceful 400 handling, full projection redaction, and mutating MCP registration
- Batch deploy by uuids/tags with dedup, best-effort sequential iteration, and per-app logs_available hints — no inline logs
- Handler-level deploy-flow integration suite + Phase 4 validation sign-off — 286 tests green, deployment.ts 97.81% lines
- `application.logs` liefert begrenzte Runtime- und Build-Logs mit JSON-Array-Pipeline, api.sensitive-Gate und sharedLogParamsSchema — P3/P4 Forward-Ref-Hints sind jetzt aufrufbar.
- Service-Tool liefert start/stop/restart/deploy per UUID oder Name — deploy nutzt POST /services/{uuid}/restart?latest=true, Mehrdeutigkeit mit Projekt+Environment-Kontext, fire-and-forget ohne deployment_uuid.
- Database-Tool liefert start/stop/restart per UUID oder Name — fire-and-forget ohne deploy/pull_latest, Mehrdeutigkeit mit Projekt+Environment-Kontext, P3-Forward-Ref-Hints jetzt aufrufbar.
- ROADMAP Phase 5 SC4 marked DEFERRED to v1.1 — service/DB logs omitted from v1 (no stub, no COOLIFY_501) pending Coolify v4.1.3+ / PR #6293
- Handler-Level-Integration über application.logs, Service-/DB-Lifecycle und service.deploy pull_latest — 378 Tests grün, VALIDATION mit 9 Task-Rows signiert.
- Emergency-Tool mit stop_all/redeploy_project/restart_project, COOLIFY_CONFIRM_REQUIRED-Confirm-Gate und Preview-Block { would_affect, sample_uuids, action }
- reveal: boolean default false on shared reads; full projections mask secrets as
- Handler-level integration suite (27 tests) für emergency confirm gates + reveal masked/plaintext; VALIDATION sign-off mit 459 Tests green und emergency.ts 94.18% line coverage
- npm-Paket `awesome-coolify-mcp` ist publish-ready (Dry-Run grün); Wave-0-Parity-Tests sind RED und warten auf README-Rewrite in Plan 07-02.
- README.md und README.de.md dokumentieren alle 10 Tools und 32 Actions, drei Install-Pfade und Safety — Wave-0-docs-parity ist 6/6 GREEN.
- Statische docs/install.html + docs/index.html liefern 16-Client-MCP-Konfiguration, Deeplinks und 11/11 Security-Tests — alles client-side ohne Backend.
- Coolify 4.1.x read projections resolve real project names via environment_id index — emergency restart/redeploy preview chains without COOLIFY_404
- Service stop sends docker_cleanup=false by default and COOLIFY_422 surfaces Coolify body messages — UAT gap 29 closed on one-click compose services
- sanitizeFullProjection masks DB connection URLs and credential-bearing URIs by default; reveal:true unchanged

**Stats:** 7 phases · 37 plans · 86 tasks · ~190 files · +36k LOC · 5 days (2026-07-12 → 2026-07-16) · git `86e1369` → `HEAD`

**Closeout:** override_closeout — audit 48/52 requirements; 4 intentional deferrals accepted.

### Known Gaps (accepted at close)

| REQ-ID | Description | Target |
|--------|-------------|--------|
| CTX-04 | Multi-instance CRUD | v2 |
| CTX-05 | Default/switch instance | v2 |
| CTX-06 | Per-request token override | v2 |
| SVC-04 | Service/DB bounded logs | v1.1 |

**Known verification overrides:** 2 debug artifacts acknowledged resolved (see STATE.md Deferred Items).

**Audit report:** [milestones/v1.0-MILESTONE-AUDIT.md](milestones/v1.0-MILESTONE-AUDIT.md)

---
