---
phase: 22
slug: setup-wizard-ide-skills
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-27
---

# Phase 22 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|----------------|
| MCP host → `gh` subprocess | Untrusted PATH; fixed argv only via `execFile` | `gh --version`, `gh auth status`, `gh api user`, `gh repo create` |
| `setup` response → agent | Pause banners and status must not leak tokens | `_formattedText` via `wrapSetupMcpError` / `redactSecrets` |
| `setup` wire → Coolify API | Creates/validates resources with bearer token scope | Project/environment/server UUIDs, recipe create |
| `gh repo create` → GitHub | Repo name validated before argv | `repo_name` string |
| Docs/skills → user/agent | Install command and action names must be canonical | `clezcoding/awesome-coolify` slug, MCP action literals |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-22-00-01 | Spoofing | gh mock in tests | low | accept | Unit tests only; `vi.hoisted` mock; no production boundary | closed |
| T-22-00-SC | Tampering | npm installs (Wave 0) | low | accept | No new packages in Wave 0 | closed |
| T-22-01 | Tampering | `gh` subprocess argv | high | mitigate | `execFile` with fixed argv arrays; no shell (`gh-preflight.ts`) | closed |
| T-22-02 | Information Disclosure | `gh auth` output | medium | mitigate | No `--show-token`; `redactSecrets` on formatted output | closed |
| T-22-03 | Denial of Service | `gh` subprocess hang | medium | mitigate | `GH_TIMEOUT_MS=5000` on all `gh` calls (D-04) | closed |
| T-22-01-SC | Tampering | npm installs (Plan 01) | low | accept | No new runtime packages | closed |
| T-22-04 | Tampering | `repo_name` injection into `gh` argv | high | mitigate | `REPO_NAME_REGEX` rejects invalid names before `execFile` | closed |
| T-22-05 | Elevation of Privilege | Unauthorized Coolify creates | medium | mitigate | Existing `COOLIFY_TOKEN` scope; no confirm bypass on destructive ops | closed |
| T-22-06 | Denial of Service | `deploy_and_watch` long poll | medium | mitigate | Bounded watch `timeout:300`; `COOLIFY_WATCH_TIMEOUT` recovery (D-11) | closed |
| T-22-02-SC | Tampering | npm installs (Plan 02) | low | accept | No new packages | closed |
| T-22-07 | Spoofing | Skills install typosquat in docs | medium | mitigate | Pinned `clezcoding/awesome-coolify` across README EN/DE + `docs/install.html` (D-13) | closed |
| T-22-08 | Tampering | Skill doc drift from MCP schemas | medium | mitigate | `skills-manifest.test.ts` grep coverage; copy from `prompts.ts` | closed |
| T-22-03-SC | Tampering | `npx skills` consumer package | low | accept | Document consumer-only; not bundled in `package.json` | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-22-01 | T-22-00-01 | Synthetic gh mocks in unit tests only | plan threat_model | 2026-07-27 |
| AR-22-02 | T-22-00-SC | No new npm deps in Wave 0 | plan threat_model | 2026-07-27 |
| AR-22-03 | T-22-01-SC | No new runtime packages in Plan 01 | plan threat_model | 2026-07-27 |
| AR-22-04 | T-22-02-SC | No new packages in Plan 02 | plan threat_model | 2026-07-27 |
| AR-22-05 | T-22-03-SC | `npx skills` is external consumer tooling | plan threat_model | 2026-07-27 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-27 | 13 | 13 | 0 | /gsd-ship preflight → secure-phase (ASVS L1 short-circuit) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-27
