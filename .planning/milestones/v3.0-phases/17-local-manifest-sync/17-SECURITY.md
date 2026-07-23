---
phase: 17
slug: local-manifest-sync
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-22
---

# Phase 17 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| test sandbox → host fs | RED scaffolds must not escape tmp workspace | Fake UUIDs, temp manifests |
| workspace fs → `.coolify/manifest.json` | Local cache I/O confined to project root | UUIDs, names, domains (no tokens) |
| manifest cache → git | `.gitignore` prevents committing live cache | Path `.coolify/` |
| agent → manifest tool args | Untrusted MCP params | Action payloads, confirm/prune flags |
| manifest tool → Coolify API | sync/diff network boundary | Creds from InstanceManager; UUID/name/domain responses |
| Coolify API success → manifest cache | Auto-hooks after primary mutation | uuid/type/name/domains/project+env only |
| Coolify API 404 → agent | Stale-UUID hint injection | Generic recovery hints only |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-17-00-01 | Tampering | tmp workspace cleanup | low | mitigate | mkdtempSync + afterEach rmSync; COOLIFY_MCP_TEST_WORKSPACE seam | closed |
| T-17-00-02 | Information Disclosure | test fixtures with real UUIDs | low | accept | Deterministic fake UUIDs only | closed |
| T-17-00-SC | Tampering | npm installs (Wave 0) | high | mitigate | No new packages in Wave 0 | closed |
| T-17-01-01 | Tampering / Path Traversal | resolveProjectRoot + manifest path | high | mitigate | Walk-up markers; fail-closed without markers; path = join(root, `.coolify`, `manifest.json`) | closed |
| T-17-01-02 | Information Disclosure | manifest storing tokens | high | mitigate | Zod `.strict()` schemas; no token fields; autoUpsert excludes credentials | closed |
| T-17-01-03 | Tampering | concurrent manifest writes | medium | mitigate | `withWriteLock` + atomic temp+rename; UAT #2 concurrency probe passed | closed |
| T-17-01-04 | Information Disclosure | `.coolify/` committed to git | high | mitigate | `ensureGitignore` appends `.coolify/` on save; example file outside gitignored dir | closed |
| T-17-01-SC | Tampering | npm installs | high | accept | No new packages — zod/ofetch already approved | closed |
| T-17-02-01 | Tampering | manifest tool input args | high | mitigate | `z.discriminatedUnion` + `.strict()`; confirm gates on clear/prune | closed |
| T-17-02-02 | Information Disclosure | sync/diff leaking tokens | medium | mitigate | Responses carry UUIDs/names/domains only; no credentials | closed |
| T-17-02-03 | Denial of Service | auto-retry on 404 | high | mitigate | D-15: hints only — no auto-sync / auto-retry | closed |
| T-17-02-04 | Tampering | sync prune without confirm | high | mitigate | Prune requires `confirm:true` AND `prune:true` | closed |
| T-17-02-05 | Information Disclosure | 404 hint leaking entries | low | mitigate | Hint only when `hasUuid`; generic STALE_MANIFEST_HINTS text | closed |
| T-17-02-06 | Spoofing | sync wrong instance | medium | mitigate | `InstanceManager.resolveCredentials` per request; explicit `instance` wins | closed |
| T-17-02-SC | Tampering | npm installs | high | accept | No new packages | closed |
| T-17-03-01 | Tampering | auto-hook before primary success | high | mitigate | Hooks only after primary API success | closed |
| T-17-03-02 | Denial of Service | hook failure fails primary | high | mitigate | try/catch → `_meta.manifestWarning` only | closed |
| T-17-03-03 | Information Disclosure | tokens via autoUpsert | high | mitigate | autoUpsert shape excludes credentials | closed |
| T-17-03-04 | Tampering | concurrent auto-hooks | medium | mitigate | `withWriteLock` serializes writes | closed |
| T-17-03-SC | Tampering | npm installs | high | accept | No new packages | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above `workflow.security_block_on` count toward threats_open*
*Disposition: mitigate · accept · transfer*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-17-01 | T-17-00-02 | Test fixtures use deterministic fake UUIDs — no production data | plan author | 2026-07-22 |
| AR-17-02 | T-17-01-SC / T-17-02-SC / T-17-03-SC | No new npm packages; supply-chain risk unchanged from pinned deps | plan author | 2026-07-22 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-22 | 20 | 20 | 0 | gsd-secure-phase (ASVS L1 short-circuit after UAT; register authored at plan time) |

## Security Audit 2026-07-22

| Metric | Count |
|--------|-------|
| Threats found | 20 |
| Closed | 20 |
| Open | 0 |

### Evidence (L1)

- Path confinement: `manifestFilePath()` → `join(resolveProjectRoot(), '.coolify', 'manifest.json')`; fail-closed without markers (`src/utils/project-root.ts`)
- No secrets in schema: all nested Zod objects `.strict()`; no token fields (`src/utils/manifest.ts`)
- Atomic concurrency: `withWriteLock` + temp+rename; UAT #2 + #3 concurrency probes passed
- Gitignore: `ensureGitignore` on save (MAN-02)
- 404 hints: `injectStaleManifestHints` + `hasUuid` gate; no auto-retry (D-15)
- Prune gate: `confirm===true && prune===true` (`src/mcp/tools/manifest.ts`)
- Auto-hooks: `withManifestUpsert`/`withManifestRemove` after success; `manifestWarning` on failure (application/service/database)

### ASVS L1 Notes

Register authored at plan time across 17-00..17-03. `threats_open: 0` at `security_block_on: high`. L1 grep-depth short-circuit applied.
