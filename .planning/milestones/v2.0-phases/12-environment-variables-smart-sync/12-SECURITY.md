---
phase: 12
slug: environment-variables-smart-sync
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-21
---

# Phase 12 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Register built retroactively (no `<threat_model>` in PLAN.md files). Verified at ASVS L1 by gsd-security-auditor.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| MCP tool → Coolify API | Agent-invoked `envs:*` actions on application/service/database | Env keys, values, flags, confirm/reveal |
| Local filesystem → MCP | `envs:sync` `env_file` / `env_content` | `.env` plaintext (bounded, cwd-rooted) |
| MCP response → agent | Sanitized projections / error envelopes | Masked values (`***`) unless `reveal:true` |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T12-01 | Spoofing | env-shared resolveEnvIdentity | high | mitigate | Ambiguous key/uuid match → COOLIFY_AMBIGUOUS_MATCH; no mutate | closed |
| T12-02 | Tampering | envs:delete confirm | high | mitigate | validateEnvMutationConfirm → COOLIFY_CONFIRM_REQUIRED | closed |
| T12-03 | Tampering | envs:bulk-update confirm | high | mitigate | confirm required on all three tools | closed |
| T12-04 | Tampering | envs:sync apply/prune confirm | high | mitigate | Schema: dry_run:false \|\| prune:true requires confirm:true | closed |
| T12-05 | Tampering | sync conflict_policy gate | high | mitigate | Conflicts without conflict_policy → COOLIFY_CONFIRM_REQUIRED | closed |
| T12-06 | Tampering | prune safety | high | mitigate | prune:true requires conflict_policy:overwrite | closed |
| T12-07 | Info Disclosure | value masking | high | mitigate | maskEnvRecord unless reveal:true | closed |
| T12-08 | Info Disclosure | sync disposition masking | high | mitigate | maskSync* forces *** on all disposition values | closed |
| T12-09 | Info Disclosure | reveal opt-in | high | mitigate | reveal defaults false; ask_human_reveal recovery hint | closed |
| T12-10 | Info Disclosure | error/log redaction | high | mitigate | redactSecrets on wrapMcpError and client paths | closed |
| T12-11 | Info Disclosure | env_file path traversal | high | mitigate | cwd-rooted realpath, regular-file, 1 MiB cap | closed |
| T12-12 | Info Disclosure | env_content size | medium | mitigate | 1 MiB byte-length check before parse | closed |
| T12-13 | Elevation | database is_preview | high | mitigate | rejectDatabaseIsPreview + schema omits field | closed |
| T12-14 | Elevation | sync app-only | medium | mitigate | envs:sync only on application tool | closed |
| T12-15 | Repudiation | sync rollback | medium | mitigate | Apply failure rollback + partialData | closed |
| T12-16 | DoS | bulk cap | medium | mitigate | entries.length > 100 rejected | closed |
| T12-17 | Tampering | schema strictness | medium | mitigate | .strict() on all envs:* schemas | closed |
| T12-18 | Info Disclosure | dry_run no writes | high | mitigate | dry_run branch returns disposition without API writes | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on (high) count toward threats_open*
*Disposition: mitigate · accept · transfer*

---

## Accepted Risks Log

No accepted risks.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-21 | 18 | 18 | 0 | gsd-security-auditor (retroactive-STRIDE, ASVS L1) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-21
