# Coolify OpenAPI Specification

Canonical Coolify REST API spec for awesome-coolify-mcp coverage tooling. Both formats are tracked in git; provenance lives here, not in the spec `info.version` field.

---

## Source

| Field | Value |
| --- | --- |
| **Upstream URL** | `https://raw.githubusercontent.com/coollabsio/coolify/v4.1.2/openapi.yaml` |
| **Pinned tag** | `v4.1.2` |
| **Fetch date** | 2026-07-27 |
| **Operation count** | 136 (after Scalar dereference) |
| **Committed artifacts** | [`coolify_openapi.yaml`](./coolify_openapi.yaml) · [`coolify_openapi.json`](./coolify_openapi.json) |

Do not float on `v4.x`, `next`, or `main` without an explicit phase decision to re-pin (D-09).

---

## Refresh procedure

Re-fetch from the pinned tag, convert to JSON, regenerate coverage, and update the fetch date above:

```bash
curl -fsSL https://raw.githubusercontent.com/coollabsio/coolify/v4.1.2/openapi.yaml \
  -o docs/coolify_openapi.yaml

node --input-type=module -e "
import { readFileSync, writeFileSync } from 'fs';
import { parse } from 'yaml';
const yaml = readFileSync('docs/coolify_openapi.yaml', 'utf8');
writeFileSync('docs/coolify_openapi.json', JSON.stringify(parse(yaml), null, 2));
"

pnpm run openapi:coverage
pnpm test tests/openapi-coverage.test.ts
```

Review the diff on `docs/coolify_openapi.{yaml,json}` before committing. Update this file's fetch date and operation count if the upstream spec changed.

---

## Coverage map maintenance

`docs/coverage-map.yaml` links each MCP `tool.action` row to `src/api/client.ts` exports and OpenAPI `METHOD /path` keys. Intentional deferrals and out-of-scope rows live in `docs/coverage-overrides.yaml`.

**ponytail:** manual YAML maintenance ceiling — ~115 catalog actions; no auto-discovery from handlers. Upgrade path: AST or static registry generator if drift becomes painful.

Regenerate the committed gap report:

```bash
pnpm run openapi:coverage          # write docs/COVERAGE.md
pnpm run openapi:coverage -- --check # CI drift gate
```

---

## Related docs

- [Coverage report](./COVERAGE.md) — four-bucket action ↔ client ↔ OpenAPI join
- [Setup guide](./en/setup.md) — MCP onboarding (separate from API spec)
