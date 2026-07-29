# API Coverage — Coolify diagnose.logs & incident DX (Phase 26)

> Full coverage by default. Opt-outs are explicit, reasoned decisions.
> Scope: MCP `diagnose.logs` composite (app triage + bounded log tail), incident prompt, `diagnose_logs` capability, coolify-setup troubleshooting — Coolify 4.1.2 snapshot API.

| capability | decision | reason |
|---|---|---|
| `diagnose.logs` mode full (diagnose.app + runtime tail) | INTEGRATE | DIAG-01 — `runDiagnoseAppCore` + `buildRuntimeLogPayload` |
| `diagnose.logs` mode logs-only (omit diagnose key) | INTEGRATE | D-03 — handler omits `diagnose` sibling |
| `diagnose.logs` with `deployment_uuid` (build logs only) | INTEGRATE | D-05 — XOR with runtime; `processDeploymentBuildLogs` |
| Soft partial `diagnose_failed` + logs on triage failure | INTEGRATE | D-07 — top-level success with error sibling |
| Empty runtime logs soft OK + hint | INTEGRATE | D-08 — `EMPTY_RUNTIME_LOGS_HINT` parity Phase 24 |
| Defaults `lines=100` / `max_chars=20000` | INTEGRATE | D-09 — reuse `application.logs` defaults |
| `buildRuntimeLogPayload` shared with `application.logs` | INTEGRATE | OBS-03 — extracted helper; runtime path unchanged |
| `diagnose_logs` capability on `system.version` | INTEGRATE | D-14 — sixth key, soft guidance only |
| MCP prompt `incident` → `diagnose.logs` mode full | INTEGRATE | PROMPT-01 / D-10 |
| MCP prompt conditional `deployment.logs` step | INTEGRATE | D-11 — build/deploy suspicion only |
| MCP prompt application log follow + capability check | INTEGRATE | D-12 — `application_logs_follow` gate |
| App-only guardrail (no service/DB log steps) | INTEGRATE | D-13 — prompt + setup skill |
| `coolify-setup` App log troubleshooting section | INTEGRATE | SKILL-01 / D-15/D-16 |
| README EN/DE + `docs/COVERAGE.md` diagnose.logs row | INTEGRATE | D-17 — openapi:coverage regen |
| `follow:true` inside `diagnose.logs` | OPT-OUT | D-02 — one-shot tail only; follow via `application.logs` |
| Service / DB log endpoints | OPT-OUT | absent on 4.1.2 — CONTEXT boundary |
| Hard Zod gate on `diagnose_logs` capability | OPT-OUT | D-14 — soft guidance only (Phase 24 D-04 parity) |
| Full incident runbook in coolify-setup | OPT-OUT | D-15 — links to coolify-incident skill |
| OpenAPI SSE / log stream endpoint | OPT-OUT | not in Coolify 4.1.2 spec |
