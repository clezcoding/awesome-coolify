---
phase: 22
slug: setup-wizard-ide-skills
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-26
---

# Phase 22 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.10 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test -- src/mcp/tools/setup.test.ts src/utils/gh-preflight.test.ts -x` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test -- src/mcp/tools/setup.test.ts src/utils/gh-preflight.test.ts -x`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 22-01-01 | 01 | 1 | SETUP-01 | T-22-01 | gh subprocess uses fixed argv, no shell | unit | `pnpm test -- src/utils/gh-preflight.test.ts -x` | ❌ W0 | ⬜ pending |
| 22-01-02 | 01 | 1 | SETUP-01 | T-22-02 | gh missing → COOLIFY_SETUP_PAUSED + hints | unit | `pnpm test -- src/utils/gh-preflight.test.ts -x` | ❌ W0 | ⬜ pending |
| 22-02-01 | 02 | 2 | SETUP-02 | T-22-03 | wire updates manifest via ManifestManager | unit | `pnpm test -- src/mcp/tools/setup.test.ts -x` | ❌ W0 | ⬜ pending |
| 22-02-02 | 02 | 2 | SETUP-03 | — | resume re-runs preflight after pause | unit | `pnpm test -- src/mcp/tools/setup.test.ts -x` | ❌ W0 | ⬜ pending |
| 22-02-03 | 02 | 2 | SETUP-02 | — | link-existing no recipe create | unit | `pnpm test -- src/mcp/tools/setup.test.ts -x` | ❌ W0 | ⬜ pending |
| 22-03-01 | 03 | 3 | SKILL-01 | T-22-04 | skills dirs exist + valid frontmatter | unit | `pnpm test -- src/skills/skills-manifest.test.ts -x` | ❌ W0 | ⬜ pending |
| 22-03-02 | 03 | 3 | SKILL-02 | — | skills mention watch/recipes/safety | unit | snapshot/grep test | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/utils/gh-preflight.ts` + `src/utils/gh-preflight.test.ts` — mock `child_process.execFile`
- [ ] `src/mcp/tools/setup.ts` + `src/mcp/tools/setup.test.ts` — mock recipe/manifest/project/gh
- [ ] `COOLIFY_SETUP_PAUSED` in `CoolifyErrorCode` + `RECOVERY_HINTS` in `src/utils/errors.ts`
- [ ] `server.ts` registration + tools/list count test update
- [ ] `skills/coolify-*/SKILL.md` (4 files) + optional frontmatter schema test
- [ ] `docs/en/setup.md`, `docs/install.html` skills block, README EN/DE sections

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `npx skills add clezcoding/awesome-coolify` end-to-end | SKILL-01 | Requires user IDE + network | Run install command; verify skill appears in Cursor/Claude Code/Codex |
| Live greenfield setup against Coolify instance | SETUP-02 | Requires COOLIFY_URL/TOKEN + gh auth | Run setup wire action; verify manifest + Coolify linkage |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
