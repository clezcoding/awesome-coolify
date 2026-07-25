===================================================================
  GSD INBOX TRIAGE — clezcoding/awesome-coolify — 2026-07-22
===================================================================

NOTE: Review criteria adapted to this repo's actual templates
(`.github/ISSUE_TEMPLATE/{feature_request,bug_report}.yml`,
`.github/PULL_REQUEST_TEMPLATE.md`). GSD typed templates
(enhancement.yml, chore.yml, feature/enhancement/fix PR templates)
are not present here. CONTRIBUTING issue-first gates use
`Closes #` + changeset for release-relevant changes; there are no
`approved-feature` / `confirmed-bug` labels in this repo's flow.

SUMMARY
-------
Open issues: 0      Open PRs: 1
  Features:    0      Feature PRs:      1 (inferred — new Cloud/branding capability)
  Enhancements:0      Enhancement PRs:  0
  Bugs:        0      Fix PRs:          0
  Chores:      0      Wrong template:   1 (GSD ship body, not repo PR template)
  Unclassified:0      No linked issue:  1

GATE VIOLATIONS (action required)
---------------------------------
  PR #37: Phase 16: Coolify Cloud & Server Branding
    Problem: No `Closes #NNN` / `Fixes #NNN` / `Resolves #NNN` linked issue
    Action:  Open (or link) tracking issue, or accept as owner GSD phase ship and document exception

  PR #37: Phase 16: Coolify Cloud & Server Branding
    Problem: mergeable=CONFLICTING (mergeStateStatus=DIRTY) — cannot merge
    Action:  Rebase/merge main and resolve conflicts before any merge/automerge

  PR #37: Phase 16: Coolify Cloud & Server Branding
    Problem: Release-relevant feature with no `.changeset/*.md` and no `no-changelog` label
    Action:  Run `npx changeset` (or add `no-changelog` if intentionally skipped)

ISSUES NEEDING ATTENTION
------------------------
  (none — inbox empty)

PRS NEEDING ATTENTION
---------------------
  #37 [feature / wrong-template] Phase 16: Coolify Cloud & Server Branding
    Score: ~45% complete vs repo PR template
    Present:
      - Descriptive title
      - Strong Summary / Changes / Requirements / Verification narrative
      - Docs/README updates included in diff
      - Conventional-commit style history (feat/docs/test/chore)
    Missing:
      - Repo PR template sections (Linked Issue, Type of Change, Checklist)
      - `Closes #NNN` linked issue
      - Type of Change checkbox selection
      - Template checklist items (tested/lint/changeset/automerge)
      - Changeset fragment for user-facing release
      - Any labels (`automerge`, type labels, etc.)
    CI: only `kodiakhq: status` (NEUTRAL/skipping) — Lint/Test/Build checks not reported on head
    Review: none
    Linked issue: none → GATE VIOLATION
    Merge: CONFLICTING / DIRTY
    Age: 0 days (created 2026-07-22)
    URL: https://github.com/clezcoding/awesome-coolify/pull/37

READY TO MERGE
--------------
  (none)

STALE ITEMS (>30 days, no activity)
------------------------------------
  (none)

===================================================================
