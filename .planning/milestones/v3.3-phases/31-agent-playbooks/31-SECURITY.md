---
phase: 31
slug: agent-playbooks
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-31
---

# Phase 31 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| MCP client → diagnose.analyze | Untrusted app identifiers; read-only advisory | App identity args; capped log lines |
| Coolify logs → log-patterns | Untrusted log text; regex on sliced windows | Pattern matches + capped evidence |
| MCP client → recipe.recommend | Untrusted stack phrase; advisory plan only | Live catalog keys; plan_steps |
| CDN/GitHub catalog → recommend | Third-party template JSON | Validated catalog_id via Object.hasOwn |
| MCP prompts → agent | Static orchestration guidance | No credentials; confirm gates cited |
| Analyze/recommend response → agent | Advisory payloads | No auto-mutations; hints only |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-31-01 | Tampering | log-patterns regex | medium | mitigate | EVIDENCE_CAP=3; SPIKE_MIN_COUNT=5; CRASH_LOOP min ≥3; lines/max_chars capped upstream | closed |
| T-31-02 | Elevation of Privilege | rollback prompt | high | mitigate | STOP + human approval before confirm:true; tool enforces COOLIFY_CONFIRM_REQUIRED | closed |
| T-31-03 | Tampering | catalog matching | high | mitigate | Object.hasOwn guard; live fetchServiceTemplates only; no invented catalog IDs | closed |
| T-31-04 | Elevation of Privilege | diagnose.analyze | high | mitigate | D-06 advisory-only; `advisory: true`; no mutation client calls in handler | closed |
| T-31-05 | Denial of Service | ReDoS in matchers | medium | mitigate | Simple bounded regexes; input sliced by lines/max_chars before match | closed |
| T-31-06 | Information Disclosure | analyze response | low | accept | Same log visibility as diagnose.logs; no secret reveal beyond existing log content | closed |
| T-31-07 | Spoofing | prompt social engineering | medium | mitigate | PLAY-02 atomic composition only; no embedded credentials; D-20 no confirm bypass | closed |
| T-31-08 | Tampering | maintenance-window lifecycle | medium | mitigate | Prompt cites confirm on destructive ops; mutations stay on gated actions | closed |
| T-31-09 | Elevation of Privilege | recommend auto-create | high | mitigate | D-14 advisory; no create* calls; `advisory: true` + `catalog_source: live` | closed |
| T-31-10 | Spoofing | CDN catalog poison | medium | mitigate | Official coollabsio paths in fetchServiceTemplates; Object.hasOwn key validation | closed |
| T-31-11 | Information Disclosure | README capability notes | low | accept | Documents public MCP actions only; no secrets | closed |
| T-31-12 | Tampering | coverage declaration drift | medium | mitigate | Composite-only coverage-map rows + Phase 31 no-new-API override | closed |
| T-31-SC | Tampering | npm installs | high | accept | Phase adds no new packages | closed |

*Status: open · closed — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate · accept · transfer*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-31-06 | T-31-06 | Analyze exposes same log content as diagnose.logs; masking deferred to existing log pipeline | Phase 31 PLANs (31-01) | 2026-07-31 |
| AR-31-11 | T-31-11 | README documents already-public MCP surface | Phase 31 PLAN 31-04 | 2026-07-31 |
| AR-31-SC | T-31-SC | No new npm dependencies; supply-chain risk unchanged | Phase 31 PLANs (31-00..31-04) | 2026-07-31 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-31 | 13 | 13 | 0 | gsd-ship preflight (L1 grep; ASVS 1) |

### Security Audit 2026-07-31

| Metric | Count |
|--------|-------|
| Threats found | 13 |
| Closed | 13 |
| Open | 0 |

**Evidence summary (L1):**

- T-31-01 / T-31-05: `src/utils/log-patterns.ts` EVIDENCE_CAP, SPIKE_MIN_COUNT, bounded regexes
- T-31-04: `handleDiagnoseAnalyze` sets `advisory: true`; test `does not call mutation clients` green
- T-31-02 / T-31-07 / T-31-08: `src/mcp/prompts.ts` rollback STOP language; `tests/mcp/prompts.test.ts` 12/12
- T-31-03 / T-31-09 / T-31-10: `handleRecipeRecommend` Object.hasOwn + `advisory: true`; no create* calls
- T-31-11 / T-31-12: README EN/DE + `docs/coverage-map.yaml` composite rows; COVERAGE Phase 31 note
- T-31-SC: no package.json dependency changes in phase commits

**Unregistered flags:** None — SUMMARY.md files report no open Threat Flags.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-31
