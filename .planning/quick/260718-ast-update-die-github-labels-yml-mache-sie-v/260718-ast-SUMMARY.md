---
quick_id: 260718-ast
status: complete
---

# Quick Task 260718-ast Summary

## Done

Rewrote `.github/labels.yml` from 24 to 68 labels with project-specific descriptions.

### Added categories
- **scope:** 20 labels — one per MCP tool domain + mcp-core, coolify-api, docs-site, npm, ci, release
- **Dependabot:** npm, github-actions, major, minor, patch (plus existing dependencies)
- **Status:** needs-info, confirmed, ready-to-merge
- **Release:** breaking-change, needs-changeset
- **Community:** question, invalid

### Dependabot coverage
- `dependencies` + `type: chore` — referenced in `.github/dependabot.yml` for npm and github-actions
- `major`/`minor`/`patch` — auto-applied by Dependabot when present (GitHub docs)
- `npm`/`github-actions` — ecosystem labels for manual triage

### Preserved
All labels used by issue templates (`type: bug`, `type: feature`, `status: needs-triage`) and existing GSD/size labels.

## Commit

Code change only — labels.yml updated.
