---
quick_id: 260718-ast
status: planned
---

# Quick Task 260718-ast: Expand .github/labels.yml

Expand label definitions to be project-specific for awesome-coolify-mcp and include all Dependabot-required labels.

## Task 1: Rewrite labels.yml

**files:** `.github/labels.yml`

**action:**
- Enhance existing type/priority/status/gsd/size/community labels with MCP-specific descriptions
- Add `scope:*` labels for all 14 MCP tool domains + repo areas (mcp-core, coolify-api, docs-site, ci, npm, release)
- Add Dependabot labels: `dependencies` (in dependabot.yml), `npm`, `github-actions`, SemVer `major`/`minor`/`patch`
- Add release workflow labels: `breaking-change`, `needs-changeset`
- Add triage labels: `status: needs-info`, `confirmed`, `ready-to-merge`, `question`, `invalid`

**verify:** All labels referenced in `.github/dependabot.yml`, issue templates, and CONTRIBUTING exist in labels.yml

**done:** labels.yml has 60+ labels with detailed descriptions organized by section
