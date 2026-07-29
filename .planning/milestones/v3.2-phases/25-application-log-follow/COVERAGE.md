# API Coverage — Coolify application logs (Phase 25)

> Full coverage by default. Opt-outs are explicit, reasoned decisions.
> Scope: MCP-side `application.logs follow:true` on Coolify 4.1.2 snapshot API.

| capability | decision | reason |
|---|---|---|
| GET /applications/{uuid}/logs snapshot (one-shot runtime) | INTEGRATE | OBS-03 — unchanged when follow absent/false |
| application.logs follow:true runtime poll loop | INTEGRATE | OBS-02 — deduped aggregate until idle or timeout |
| application.logs build via deployment_uuid | INTEGRATE | OBS-03 — unchanged; uses fetchDeployment |
| follow:true with deployment_uuid | INTEGRATE | D-02 — schema rejects COOLIFY_422 |
| follow:true with offset>0 | INTEGRATE | RESEARCH A3 — schema rejects |
| application_logs_follow capability on system.version | INTEGRATE | D-17/D-18 — MCP discovery flag |
| COOLIFY_LOG_FOLLOW_TIMEOUT dual-signal timeout | INTEGRATE | D-10 — partial logs_lines on budget exhaustion |
| Partial logs_lines on non-429 API error during follow | INTEGRATE | D-07 — hard stop with aggregate |
| App lifecycle status as follow stop signal | OPT-OUT | D-05 — idle/timeout only this phase |
| Pattern / regex / until stop | OPT-OUT | D-08 — deferred |
| Service log follow | OPT-OUT | absent on 4.1.2 — v3.3 SVC-04+ |
| Database log follow | OPT-OUT | absent on 4.1.2 — v3.3 SVC-04+ |
| Hard Zod gate on application_logs_follow | OPT-OUT | D-19 — soft guidance only |
| incident prompt follow documentation | OPT-OUT | D-21 — Phase 26 PROMPT-01 |
| diagnose.logs | OPT-OUT | Phase 26 DIAG-01 |
| MCP chunked log streaming | OPT-OUT | D-09 — single aggregate response |
| OpenAPI SSE / log stream endpoint | OPT-OUT | not in Coolify 4.1.2 spec |
