# Coolify OpenAPI Specification

Maintainer hub for the pinned Coolify v4.1.2 REST API and awesome-coolify-mcp coverage map.
Use it when reviewing API client changes, adding tool actions, or updating the pinned
Coolify version. It is not an end-user setup guide.

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

## Artifact roles

- `coolify_openapi.yaml` — byte-oriented pinned upstream source.
- `coolify_openapi.json` — parsed input used by coverage tooling.
- `coverage-map.yaml` — owned mapping from MCP actions to client exports and operations.
- `coverage-overrides.yaml` — explicit deferrals, out-of-scope entries, and exceptions.
- [`COVERAGE.md`](./COVERAGE.md) — generated review report; never edit it by hand.

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
pnpm run openapi:coverage -- --check
pnpm exec vitest run tests/openapi-coverage.test.ts
```

Review the diff on `docs/coolify_openapi.{yaml,json}` before committing. Update this file's fetch date and operation count if the upstream spec changed.

---

## Coverage map maintenance

`docs/coverage-map.yaml` links each MCP `tool.action` row to `src/api/client.ts` exports and OpenAPI `METHOD /path` keys. Intentional deferrals and out-of-scope rows live in `docs/coverage-overrides.yaml`.

Coverage tests discover client exports via `/^export (?:async )?function (\w+)/gm` plus the hard-coded `bulkUpdateEnvs` alias. Prefer `export function` / `export async function` declarations in `src/api/client.ts` — `export const` or `export { … }` re-exports are not detected and will fail the map completeness guard.

**ponytail:** manual YAML maintenance ceiling — ~115 catalog actions; no auto-discovery from handlers. Upgrade path: AST or static registry generator if drift becomes painful.

Regenerate the committed gap report:

```bash
pnpm run openapi:coverage          # write docs/COVERAGE.md
pnpm run openapi:coverage -- --check # CI drift gate
```

### Coverage buckets

| Bucket | Meaning |
| --- | --- |
| `covered` | Action, client export, and pinned OpenAPI operation are linked. |
| `deferred` | Known future work with an explicit reason; not a current promise. |
| `out-of-scope` | Deliberately outside MCP behavior or not represented by REST. |
| `gap` | Mapping needs maintainer review; it does not automatically mean a shipped feature is broken. |

### Review checklist

1. Confirm every changed client export and `tool.action` has an owned map entry.
2. Verify operation keys against pinned v4.1.2 artifacts.
3. Require a concrete reason for overrides.
4. Regenerate `docs/COVERAGE.md`; do not hand-edit generated rows or prose.
5. Run the check and OpenAPI coverage test before committing.

---

## Related docs

- [Coverage report](./COVERAGE.md) — four-bucket action ↔ client ↔ OpenAPI join
- [Setup guide](./en/setup.md) — MCP onboarding (separate from API spec)
