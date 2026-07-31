---
phase: 29
slug: drift-heal
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-30
---

# Phase 29 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| MCP client → manifest.audit | Untrusted instance arg | Local manifest + live inventory reads only |
| MCP client → application.envs:promote | Untrusted source/target UUIDs, dry_run, confirm, conflict_policy, reveal | Env values (secrets), mutation args |
| Coolify env API → MCP | Env payloads may contain secrets | Masked via `maskEnvRecord` unless reveal policy allows |
| Audit findings → agent | Advisory remediation hints | FollowUpHint objects — no auto-mutation |
| Promote preview → apply | Suggestions become writes only after confirm | `validateEnvMutationConfirm`, `keep_remote` default |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-29-01 | Information Disclosure | envs:promote preview | high | mitigate | `maskEnvRecord` / `maskPromoteValue`; tests assert masked values by default (T-29-01) | closed |
| T-29-02 | Tampering | envs:promote apply | high | mitigate | `dry_run` default true; `confirm:true` required on apply; `keep_remote` default conflict policy | closed |
| T-29-03 | Spoofing | instance routing / target selection | high | mitigate | Single routed instance per call; explicit `source_uuid` + `target_uuid`; no cross-instance fan-out | closed |
| T-29-04 | Elevation of Privilege | manifest.audit auto-mutation | high | mitigate | Advisory-only D-06; audit handler never calls `ManifestManager.save`/`upsert`; spy tests confirm | closed |
| T-29-SC | Tampering | npm installs | low | accept | No new packages added in Phase 29 | closed |

*Status: open · closed — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate · accept · transfer*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|--------|
| AR-29-SC | T-29-SC | Phase 29 adds no new npm dependencies; supply-chain risk unchanged from baseline | Phase 29 PLAN (29-00..29-03) | 2026-07-30 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-30 | 5 | 5 | 0 | gsd-ship preflight (L1 grep verification) |

### Security Audit 2026-07-30

| Metric | Count |
|--------|-------|
| Threats found | 5 |
| Closed | 5 |
| Open | 0 |

**Evidence summary (L1):**

- T-29-01: `application.ts` `maskEnvRecord` / `maskPromoteValue`; tests `application.test.ts` masked preview assertions
- T-29-02: `application.ts:611-615` confirm gate; `dry_run !== false` default; `keep_remote` default policy
- T-29-03: promote schema requires `source_uuid` + `target_uuid`; single-instance routing via `withInstanceRoutingSchema`
- T-29-04: `manifest.ts:626-673` audit read-only; test confirms `ManifestManager.save`/`upsert` never called
- T-29-SC: `package.json` dependencies unchanged (no new packages)

**Unregistered flags:** None — verification 18/18 passed; no open threat flags in SUMMARY.md.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-30
