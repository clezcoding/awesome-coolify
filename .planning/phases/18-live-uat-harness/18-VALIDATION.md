---
phase: 18
slug: live-uat-harness
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-23
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm run lint` |
| **Full suite command** | `pnpm run test` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm run lint`
- **After every plan wave:** Run `pnpm run test` + `pnpm run build`
- **Before `/gsd-verify-work`:** Full suite must be green; local `node scripts/live-uat.mjs` against UAT instance for phase gate
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 18-01-T1 | 01 | 1 | UAT-01, UAT-04 | — | Declarative matrix covers every registered tool + v3 rows | structural | matrix JSON parse + registerTool regex coverage check | ❌ created in plan | ⬜ pending |
| 18-01-T2 | 01 | 1 | UAT-02, UAT-05 | T-18-01, T-18-02 | tsx respawn, creds, redact, UAT gate | integration | `node scripts/live-uat.mjs` (empty UUID exit 2, no token leak) | ❌ created in plan | ⬜ pending |
| 18-02-T1 | 02 | 2 | UAT-01, UAT-03 | T-18-01, T-18-04 | McpStdioClient + stdio runner | structural | grep live-uat.mjs for McpStdioClient/runStdioRows/SIGTERM/30s | ❌ created in plan | ⬜ pending |
| 18-02-T2 | 02 | 2 | UAT-03 | T-18-01 | JSON stdout + --out + Markdown + exit codes | structural | grep live-uat.mjs for buildReport/writeMarkdown/exit mapping | ❌ created in plan | ⬜ pending |
| 18-03-T1 | 03 | 3 | UAT-01, UAT-05 | T-18-02 | In-process dispatch + two-tier flag gate + UAT scope | integration | `node scripts/live-uat.mjs` (planned rows for write/destructive without flags) | ❌ created in plan | ⬜ pending |
| 18-03-T2 | 03 | 3 | UAT-04, UAT-05 | T-18-02 | v3_gaps skip + --full + merged report | integration | `node scripts/live-uat.mjs --full --out /tmp/uat-full.json` | ❌ created in plan | ⬜ pending |
| 18-04-T1 | 04 | 2 | UAT-06 | T-18-08 | npm script + tarball exclusion | structural | `npm pack --dry-run --json` excludes scripts/live-uat | ❌ created in plan | ⬜ pending |
| 18-04-T2 | 04 | 2 | UAT-06 | — | CONTRIBUTING runbook | docs | Inspect `CONTRIBUTING.md` for `uat:live` + flags + v3_gaps | ❌ created in plan | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave Gate (live run, before /gsd-verify-work)

Per-task structural checks keep feedback latency < 60s during execution. The full live UAT run against the real Coolify instance is deferred to the **phase gate** (run once before `/gsd-verify-work`), not per task:

- [ ] `node scripts/live-uat.mjs --out /tmp/uat.json` against the live UAT instance exits 0 or 1 (or 2 on setup abort)
- [ ] /tmp/uat.json and /tmp/uat.md both exist
- [ ] stdout parses as JSON with rows, summary, and v3_gaps
- [ ] None of stdout, /tmp/uat.json, /tmp/uat.md contains the resolved COOLIFY_TOKEN

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Full live pass against real Coolify UAT project | UAT-01, UAT-04 | Needs local credentials + dedicated `UAT_PROJECT_UUID` | Set env, run `npm run uat:live`, confirm exit 0 and JSON report |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify (structural checks for harness-building tasks; live run deferred to wave gate)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Every plan (18-01..04) has at least one automated verify per task
- [x] No watch-mode flags
- [x] Feedback latency < 60s (structural per-task checks; live run is phase gate only)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
