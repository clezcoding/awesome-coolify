# Milestones

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
