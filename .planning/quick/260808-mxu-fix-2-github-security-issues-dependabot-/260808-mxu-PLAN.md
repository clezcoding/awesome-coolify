---
phase: quick-260808-mxu
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - pnpm-workspace.yaml
  - pnpm-lock.yaml
  - .changeset/fix-transitive-security-overrides.md
autonomous: true
requirements:
  - SEC-MXU-01
  - SEC-MXU-02
  - SEC-MXU-03
must_haves:
  truths:
    - pnpm lockfile resolves fast-uri to >=4.1.2 (GHSA-7p8r-x3mc-p8w7 / CVE-2026-18446)
    - pnpm lockfile resolves js-yaml 3.x to >=3.15.1 (GHSA-5p4m-2wfm-xmqj); js-yaml 4.x unchanged
    - pnpm lockfile resolves nanoid to >=3.3.17 (GHSA-2v37-7h3g-55p8)
    - pnpm audit reports zero high vulnerabilities for the three transitive advisories
    - Patch changeset documents the security bump for release notes
  artifacts:
    - pnpm-workspace.yaml
    - pnpm-lock.yaml
    - .changeset/fix-transitive-security-overrides.md
  key_links:
    - pnpm-workspace.yaml overrides must flow into pnpm-lock.yaml importers and packages entries on install
    - js-yaml override scoped to major 3 only so existing js-yaml@4.3.0 consumers stay on 4.x
    - CI Lint/Test/Build and MegaLinter must stay green after lockfile regen
---

<objective>
Close GitHub Dependabot alert #4 and Scorecard OSV alert #58 by tightening pnpm transitive overrides for fast-uri, js-yaml@3, and nanoid, regenerating the lockfile, and adding a patch changeset.

Purpose: Clear open security alerts without direct parent bumps — same override pattern as 0.4.1 fast-uri/esbuild fix (CHANGELOG 75311d9).

Output: Updated `pnpm-workspace.yaml` + `pnpm-lock.yaml`, patch changeset, green audit/test/build.
</objective>

<execution_context>
@$HOME/.cursor/gsd-core/workflows/execute-plan.md
@$HOME/.cursor/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@pnpm-workspace.yaml
@pnpm-lock.yaml
@CHANGELOG.md

Known baseline (pre-execution):
- `pnpm-workspace.yaml` override `fast-uri: ">=4.1.1"` resolves to 4.1.1 (vulnerable; need >=4.1.2)
- Lock has `js-yaml@3.15.0` (need >=3.15.1) and `js-yaml@4.3.0` (unaffected)
- Lock has `nanoid@3.3.16` (need >=3.3.17)
- `pnpm audit` reports 4 high: fast-uri, nanoid, js-yaml (two advisory rows)
- Prior pattern: postcss direct bump + pnpm overrides comment block in `pnpm-workspace.yaml`
</context>

<tasks>

<task type="tracer">
  <name>Task 1: Tighten pnpm overrides and regenerate lockfile</name>
  <files>pnpm-workspace.yaml, pnpm-lock.yaml</files>
  <action>
Per SEC-MXU-01/02/03, update `pnpm-workspace.yaml` `overrides` (keep existing `esbuild` entry unchanged):

1. `fast-uri: ">=4.1.2"` (was `>=4.1.1`) — closes Dependabot #4 / GHSA-7p8r-x3mc-p8w7
2. `"js-yaml@3": ">=3.15.1"` — scoped to major 3 only; do not add a blanket `js-yaml` override that could disturb 4.x consumers
3. `nanoid: ">=3.3.17"` — closes GHSA-2v37-7h3g-55p8

Extend the existing security comment above `overrides:` to mention all three packages (mirror postcss/fast-uri/esbuild wording style).

Run `pnpm install` to regenerate `pnpm-lock.yaml`. Confirm lock no longer lists vulnerable versions: `fast-uri@4.1.1`, `js-yaml@3.15.0`, or `nanoid@3.3.16`. Confirm `js-yaml@4.3.0` still present if it was before.

Do not edit `package.json` direct deps unless a parent already allows a range bump without override — overrides are the primary fix path per repo precedent.
  </action>
  <verify>
    <automated>node -e "const fs=require('fs');const w=fs.readFileSync('pnpm-workspace.yaml','utf8');const l=fs.readFileSync('pnpm-lock.yaml','utf8');if(!w.includes('fast-uri: \">=4.1.2\"'))process.exit(1);if(!w.includes('js-yaml@3'))process.exit(1);if(!w.includes('nanoid: \">=3.3.17\"'))process.exit(1);if(/fast-uri@4\\.1\\.1/.test(l))process.exit(1);if(/js-yaml@3\\.15\\.0/.test(l))process.exit(1);if(/nanoid@3\\.3\\.16/.test(l))process.exit(1);if(!/fast-uri@4\\.1\\.[2-9]/.test(l))process.exit(1)"</automated>
  </verify>
  <done>Overrides bumped; lockfile resolves patched fast-uri, js-yaml@3, and nanoid; js-yaml@4.x line unchanged.</done>
</task>

<task type="auto">
  <name>Task 2: Audit gate and regression tests</name>
  <files>pnpm-lock.yaml</files>
  <action>
Run `pnpm audit --audit-level high` — must exit 0 with no high-severity findings for fast-uri, js-yaml, or nanoid.

Run `pnpm test` and `pnpm build` — full suite green; no source edits expected.

If audit still flags one of the three packages, inspect `pnpm why &lt;pkg&gt;` and adjust override key (especially js-yaml@3 scoping) before proceeding; do not ship with known high advisories on these packages.
  </action>
  <verify>
    <automated>pnpm audit --audit-level high && pnpm test && pnpm build</automated>
  </verify>
  <done>Zero high audit findings; tests and build pass.</done>
</task>

<task type="auto">
  <name>Task 3: Patch changeset for security bump</name>
  <files>.changeset/fix-transitive-security-overrides.md</files>
  <action>
Add changeset `.changeset/fix-transitive-security-overrides.md` with `patch` bump for `awesome-coolify-mcp`.

Summary line (single sentence): bump transitive fast-uri, js-yaml@3, and nanoid via pnpm overrides to close GHSA-7p8r-x3mc-p8w7, GHSA-5p4m-2wfm-xmqj, and GHSA-2v37-7h3g-55p8 (Dependabot #4 + Scorecard #58).

Match tone of CHANGELOG 75311d9 entry — name advisories, note override mechanism, no version number in body.

Record in SUMMARY: alert IDs closed, resolved lock versions for the three packages, and `pnpm audit` high count before/after.
  </action>
  <verify>
    <automated>test -f .changeset/fix-transitive-security-overrides.md && grep -q 'awesome-coolify-mcp' .changeset/fix-transitive-security-overrides.md && grep -q 'patch' .changeset/fix-transitive-security-overrides.md</automated>
  </verify>
  <done>Changeset file exists with patch bump and advisory references; SUMMARY documents alert closure evidence.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| npm registry → lockfile | Transitive dependency versions cross trust boundary on install |
| lockfile → CI/build | Patched versions must match what GitHub Dependabot/Scorecard evaluate |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-mxu-01 | Tampering | pnpm overrides | medium | mitigate | Pin minimum safe versions; verify lockfile bytes after install |
| T-mxu-02 | Spoofing | npm package resolution | medium | mitigate | Use established override pattern; `pnpm audit` gate in Task 2 |
| T-mxu-SC | Tampering | fast-uri/js-yaml/nanoid resolution | high | mitigate | Lockfile version grep in Task 1 verify; no `[SLOP]` packages added |
</threat_model>

<verification>
- `pnpm audit --audit-level high` exits 0
- `pnpm test` and `pnpm build` green
- Lockfile shows fast-uri >=4.1.2, js-yaml@3 >=3.15.1, nanoid >=3.3.17
- Changeset present for patch release notes
</verification>

<success_criteria>
- Dependabot alert #4 and Scorecard alert #58 OSV entries addressed in lockfile
- No regression in test/build
- Patch changeset ready for merge + Kodiak ship flow
</success_criteria>

<output>
Create `.planning/quick/260808-mxu-fix-2-github-security-issues-dependabot-/260808-mxu-SUMMARY.md` when done
</output>

<!-- gsd-source-audit
GOAL: Fix 2 GitHub security issues — Dependabot fast-uri CVE-2026-18446 and Scorecard OSV alert #58
REQ: SEC-MXU-01 fast-uri >=4.1.2 | SEC-MXU-02 js-yaml@3 >=3.15.1 | SEC-MXU-03 nanoid >=3.3.17
RESEARCH: pnpm overrides pattern in pnpm-workspace.yaml; prior 75311d9 fast-uri bump; lock baseline 4.1.1/3.15.0/3.3.16
CONTEXT: n/a — orchestrator supplied researched context
COVERAGE: all items → Plan 01 Tasks 1–3
-->
