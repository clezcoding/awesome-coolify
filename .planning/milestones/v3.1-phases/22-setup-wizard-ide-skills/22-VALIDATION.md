---
phase: 22
slug: setup-wizard-ide-skills
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-26
validated: 2026-07-27
---

# Phase 22 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.10 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/mcp/tools/setup.test.ts src/utils/gh-preflight.test.ts src/skills/skills-manifest.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run targeted vitest for setup/gh-preflight/skills files
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| **SETUP-01** | gh preflight subprocess uses fixed argv; missing gh → COOLIFY_SETUP_PAUSED | Unit | `npx vitest run src/utils/gh-preflight.test.ts` | ✅ | ✅ green |
| **SETUP-02** | setup wire/resume orchestration; set_env delegates to application envs:sync | Unit | `npx vitest run src/mcp/tools/setup.test.ts` | ✅ | ✅ green |
| **SETUP-02** | set_env env_file/env_content XOR + conflict abort | Unit | `npx vitest run src/mcp/tools/setup.test.ts -t set_env` | ✅ | ✅ green |
| **SETUP-03** | resume re-runs preflight after pause | Unit | `npx vitest run src/mcp/tools/setup.test.ts -t resume` | ✅ | ✅ green |
| **SKILL-01** | Four skill dirs exist with valid frontmatter | Unit | `npx vitest run src/skills/skills-manifest.test.ts -t "four skill"` | ✅ | ✅ green |
| **SKILL-02** | Skills document watch/recipes/safety + MCP prompt analogs | Unit | `npx vitest run src/skills/skills-manifest.test.ts` | ✅ | ✅ green |

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 22-01-01 | 01 | 1 | SETUP-01 | T-22-01 | gh subprocess uses fixed argv, no shell | unit | `npx vitest run src/utils/gh-preflight.test.ts` | ✅ | ✅ green |
| 22-01-02 | 01 | 1 | SETUP-01 | T-22-02 | gh missing → COOLIFY_SETUP_PAUSED + hints | unit | `npx vitest run src/utils/gh-preflight.test.ts` | ✅ | ✅ green |
| 22-02-01 | 02 | 2 | SETUP-02 | T-22-03 | wire updates manifest via ManifestManager | unit | `npx vitest run src/mcp/tools/setup.test.ts -t "link-existing"` | ✅ | ✅ green |
| 22-02-02 | 02 | 2 | SETUP-03 | — | resume re-runs preflight after pause | unit | `npx vitest run src/mcp/tools/setup.test.ts -t resume` | ✅ | ✅ green |
| 22-02-03 | 02 | 2 | SETUP-02 | — | link-existing no recipe create | unit | `npx vitest run src/mcp/tools/setup.test.ts -t "link-existing"` | ✅ | ✅ green |
| 22-02-04 | 02 | 2 | SETUP-02 | — | set_env envs:sync delegation (Plan 23.1-01) | unit | `npx vitest run src/mcp/tools/setup.test.ts -t set_env` | ✅ | ✅ green |
| 22-03-01 | 03 | 3 | SKILL-01 | T-22-04 | skills dirs exist + valid frontmatter | unit | `npx vitest run src/skills/skills-manifest.test.ts` | ✅ | ✅ green |
| 22-03-02 | 03 | 3 | SKILL-02 | — | skills mention watch/recipes/safety + set_env docs | unit | `npx vitest run src/skills/skills-manifest.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `src/utils/gh-preflight.ts` + `src/utils/gh-preflight.test.ts` — mock `child_process.execFile`
- [x] `src/mcp/tools/setup.ts` + `src/mcp/tools/setup.test.ts` — mock recipe/manifest/project/gh
- [x] `COOLIFY_SETUP_PAUSED` in `CoolifyErrorCode` + `RECOVERY_HINTS` in `src/utils/errors.ts`
- [x] `server.ts` registration + tools/list count test update
- [x] `skills/coolify-*/SKILL.md` (4 files) + frontmatter schema test
- [x] `docs/en/setup.md`, `docs/install.html` skills block, README EN/DE sections

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `npx skills add clezcoding/awesome-coolify` end-to-end | SKILL-01 | Requires user IDE + network | Run install command; verify skill appears in Cursor/Claude Code/Codex |
| Live greenfield setup against Coolify instance | SETUP-02 | Requires COOLIFY_URL/TOKEN + gh auth | Run setup wire action; verify manifest + Coolify linkage |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated

---

## Validation Audit 2026-07-27

| Metric | Count |
|--------|-------|
| Gaps found | 9 (draft frontmatter; all per-task rows pending; missing set_env row) |
| Resolved | 9 |
| Escalated | 0 |

Nyquist reconciliation (23.1-03): confirmed 45 tests green across setup/gh-preflight/skills-manifest; added SETUP-02 set_env row from Plan 23.1-01; earned `status: validated` + `nyquist_compliant: true`.
