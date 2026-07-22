# Phase 8: Keys & Server CRUD - Research

**Researched:** July 16, 2026
**Domain:** Private Key & Server Lifecycle CRUD (Coolify REST API 4.1.x)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### PEM input & masking
- **D-01:** Create accepts **either** inline PEM (`private_key` string) **or** local `key_file` path — XOR, exactly one required.
- **D-02:** Never return PEM material via MCP responses — not on get, list, create, or update; **no `reveal: true` path for private keys** (stricter than app env/basic-auth SAF-04).
- **D-03:** Create response returns `{ uuid, name, fingerprint? }` when fingerprint is available from API or safely derivable; never invent fingerprint; never include PEM.
- **D-04:** List/get summary fields: uuid, name, fingerprint, description; `projection: full` may add more **metadata only**, still no PEM.

### Validate after server create
- **D-05:** After `server.create`, auto-run validate with a **timeout**; return validation result or `{ status: 'pending' }` + retry hint if still unsettled (not infinite block; not pure fire-and-forget).
- **D-06:** Opt-out via `validate` boolean on create, **default `true`** (prefer positive flag over `skip_validate`).
- **D-07:** If server is created but SSH is unreachable: **soft success** (`ok: true`) with `validation.reachable: false` + recovery hints; **no auto-rollback**. Mapping of Roadmap `COOLIFY_SSH_UNREACHABLE` (structured hint vs error code) left to research.
- **D-08:** On-demand `server.validate` uses the **same wait/timeout model** as create. Diagnose tool keeps D-10 non-blocking `trigger_validate` separately.

### List / discover surface
- **D-09:** Private keys listed via **`private_key.list`** on the domain tool — **not** required in `resource.list` (security objects ≠ deploy resources).
- **D-10:** No `server.list`. Servers discovered via existing `resource.find` + extend **`resource.list` with `type: 'server'`**. `server` tool = get / create / update / delete / delete_preview / validate.
- **D-11:** `private_key.list` uses shared read params **without `reveal`**; if `reveal` is passed → `COOLIFY_422`.
- **D-12:** Dedicated **`server.get`** for config/metadata (IP, port, user, private_key_uuid, build-server flag, reachable). No validate side-effect on get. Diagnose remains separate synthesis tool.

### Delete & dependency UX
- **D-13:** Explicit **`delete_preview`** action on both `private_key` and `server` (two-stage model — user overrode emergency-style inline preview).
- **D-14:** `delete_preview` is **optional/recommended**, not mandatory. `delete` only requires `confirm: true` (no session tracking of prior preview).
- **D-15:** Key still referenced by servers: `delete_preview` shows blockers; `delete` with confirm fails with **`COOLIFY_409`** listing dependent server UUIDs when deps > 0. **No `force` in Phase 8.**
- **D-16:** Server delete: `delete_volumes` defaults **`false`**. `delete_preview` lists/counts child resources as **warning**; delete with confirm still allowed (no hard-block on children).

### Claude's Discretion
- **private_key.update scope:** Prefer metadata + PEM rotation (write-only) if Coolify API supports it; else metadata-only (name/description). Researcher must verify API capability and planner must pick the supported path.
- **Validate timeout duration:** Concrete seconds / poll strategy left to research against live Coolify 4.1.x validate endpoint behavior.
- **`COOLIFY_SSH_UNREACHABLE` / `COOLIFY_409` wiring:** New error codes may need adding to `src/utils/errors.ts`; exact envelope shape for soft-unreachable vs hard 409 is researcher/planner discretion within D-07 and D-15.

### Deferred Ideas (OUT OF SCOPE)
- Custom Skills pro IDE für Coolify — docs; out of Phase 8 scope
- Lokale Projekt-Manifest-Datei für Coolify-Metadaten — tooling; out of scope
- MCP Server für Coolify Cloud erweitern — api/cloud; out of scope
- Standard-Setup Tool für neue Coolify-Projekte — tooling; out of scope
- Force-delete of keys still referenced by servers — explicitly out of Phase 8
- Hard-blocking server delete when child apps/services exist — deferred (preview warn only)
- Multi-instance / `instances.json` — later v2.x
</user_constraints>

## Summary

This research establishes the technical blueprint for Phase 8: Keys & Server CRUD. In this phase, we introduce full lifecycle management of SSH private keys and target servers into the `awesome-coolify-mcp` server. Private keys are critical security credentials, requiring highly strict non-leakage guarantees. Servers are the underlying infrastructure nodes for all deployments, requiring immediate reachability checks upon setup.

The Coolify REST API (v4.1.2) fully supports CRUD operations for both private keys and servers. Keys are managed at `/security/keys`, while servers are managed at `/servers`. A key architectural challenge identified is that while servers require a `private_key_uuid` on creation and update, the standard Coolify server GET response only exposes `private_key_id` (the database integer ID) [CITED: coolify-terraform]. To resolve this, our MCP server will automatically construct a lookup map by fetching all private keys, resolving the integer ID to the corresponding UUID, and providing a clean, consistent `private_key_uuid` in the server metadata.

**Primary recommendation:**
Implement the `private_key` and `server` tools as action-driven discriminated unions in `src/mcp/tools/private_key.ts` and `src/mcp/tools/server.ts`, utilizing existing `ofetch` and `zod` patterns, enforcing safe defaults (e.g., local private key file reading, zero-reveal masking, and soft-success validation).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Input Validation | API / Backend | Browser / Client | MCP server validates inputs via Zod schemas before transmitting payloads to Coolify. [VERIFIED: code] |
| Credential Masking | API / Backend | — | The MCP server intercepts and scrubs PEM values, guaranteeing zero leakage even with `reveal: true`. [VERIFIED: code] |
| Server Provisioning | API / Backend | — | Handled by Coolify backend via `/servers` POST endpoints. [CITED: coollabsio/coolify-docs] |
| SSH Key Association | API / Backend | — | Mapped inside Coolify DB via `private_key_id` referencing. [VERIFIED: coollabsio/coolify] |
| Connection Validation | API / Backend | — | Triggered via Coolify's validate endpoint; polled by MCP server until completion. [VERIFIED: coollabsio/coolify] |
| Dependency Checking | API / Backend | — | Checked client-side in the MCP server (polling servers) and enforced by Coolify's DB constraints on key deletion. [VERIFIED: coollabsio/coolify] |

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| KEY-01 | Agent can list private keys | Handled by calling `GET /security/keys` which returns an array of keys. [VERIFIED: coollabsio/coolify-docs] |
| KEY-02 | Agent can get private key details by UUID | Handled by calling `GET /security/keys/{uuid}`. [VERIFIED: coollabsio/coolify-docs] |
| KEY-03 | Agent can create private key (name, PEM, description) | Handled by calling `POST /security/keys` [VERIFIED: coollabsio/coolify-docs]. Local file paths are resolved to PEM before API call [ASSUMED]. |
| KEY-04 | Agent can update private key metadata | Handled by calling `PATCH /security/keys/{uuid}`. [VERIFIED: coollabsio/coolify] |
| KEY-05 | Agent can delete private key with `confirm: true` | Handled by calling `DELETE /security/keys/{uuid}`. [VERIFIED: coollabsio/coolify] |
| SRV-01 | Agent can create server (name, IP, port, user, private_key_uuid) | Handled by calling `POST /servers` which accepts `private_key_uuid`. [VERIFIED: coollabsio/coolify-docs] |
| SRV-02 | Agent can update server configuration | Handled by calling `PATCH /servers/{uuid}`. [VERIFIED: coollabsio/coolify] |
| SRV-03 | Agent can delete server with `confirm: true` and safe defaults | Handled by calling `DELETE /servers/{uuid}` with `confirm: true` validation on the MCP side. [VERIFIED: coollabsio/coolify-docs] |
| SRV-04 | Agent can trigger server validation (SSH/reachability) after create or on demand | Handled by calling `GET /servers/{uuid}/validate` and polling the `settings.is_reachable` flag. [VERIFIED: coollabsio/coolify] |
| SRV-05 | Agent can mark server as build server via update | Handled by patching `is_build_server: true` to `PATCH /servers/{uuid}`. [VERIFIED: coollabsio/coolify] |
</phase_requirements>

## Project Constraints (from .cursor/rules/)

- **Terse Caveman Style (`caveman-activate-md.mdc`):** Drop articles, pleasantries, filler, and hedging in user-facing communication. Use fragments, exact technical terms, and keep code unchanged. Respond in format `[thing] [action] [reason]. [next step]`. [VERIFIED: local rules]
- **Documentation Lookup (`context7.mdc`):** Use the `ctx7` CLI tool to fetch current documentation when investigating libraries, APIs, or setups. [VERIFIED: local rules]
- **Graphify Knowledge Graph (`graphify.mdc`):** Before answering architecture questions, consult `graphify-out/GRAPH_REPORT.md` for hub nodes. Run `graphify update .` after code modifications to keep AST-only graph updated. [VERIFIED: local rules]

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | `^5.3.3` | Code typing & interfaces | Strongly type creation payloads & responses. [VERIFIED: package.json] |
| ofetch | `^1.4.0` | HTTP Client with built-in retries | High reliability, request interception, and secret-redacting. [VERIFIED: package.json] |
| Zod | `^4.4.3` | Input schema validation | Fast, robust validation of API payloads before network transit. [VERIFIED: package.json] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node.js Built-in `fs` | `>=20` | Local key file reading | To read files when `key_file` path is specified in `private_key` create action. [VERIFIED: package.json] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| API Fingerprint | `sshpk` or `ssh-keygen` | Computing fingerprint locally adds extra complexity and bundle bloat. The Coolify API computes and returns fingerprints natively on `GET /security/keys/{uuid}`, so we consume it directly. [VERIFIED: coollabsio/coolify-docs] |

**Version verification:**
Ecosystem versions are confirmed active in `package.json` [VERIFIED: package.json].

## Architecture Patterns

### System Architecture Diagram

```
[Agent Input] ---> [MCP Tool Dispatcher] ---> [Zod Schema Validation]
                          |
                          v (Local key file read if key_file specified)
                  [Local File System]
                          |
                          v (API Payload mapping & client request)
                  [ofetch HTTP Client] 
                          |
         +----------------+----------------+
         |                                 |
         v (POST /security/keys)           v (POST /servers)
[Coolify /security/keys]           [Coolify /servers]
         |                                 |
         | (Succeeds)                      | (Auto-validation triggered)
         v                                 v (GET /servers/{uuid}/validate)
[Masked Key Created]               [Validation Poll Loop]
                                           |
                                           v (Poll GET /servers/{uuid})
                                   [Is Reachable / Validating Check]
                                           |
                                           v (Soft Success / Error Response)
                                   [Server provisioned with Status]
```

### Recommended Project Structure
```
src/
├── mcp/
│   ├── server.ts                  # Register new tools here
│   └── tools/
│       ├── private_key.ts         # Handlers and Zod schemas for private keys
│       ├── server.ts              # Handlers and Zod schemas for servers
│       └── resource.ts            # Extend resource.list with 'server'
```

### Pattern 1: Action-based discriminated Union Handlers
Every tool uses a standard discriminated union of action types parsed via Zod.
```typescript
// Source: src/mcp/tools/resource.ts
export const resourceActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('list'),
    type: z.enum(['application', 'service', 'database', 'server']).optional(),
    ...sharedReadParamsSchema,
  }),
  // ...
]);
```

### Pattern 2: Zero-Reveal Masking of Credentials
Never leak private keys or PEM material in GET, LIST, CREATE or UPDATE.
```typescript
// Source: src/utils/projections.ts
export function sanitizeFullProjection(raw: unknown, reveal = false): unknown {
  // If private key model, always mask private_key PEM regardless of reveal!
  // Force secure masking.
}
```

### Anti-Patterns to Avoid
- **Leaking PEM via reveal: true:** Private keys must NEVER reveal PEM material under any circumstances, even if `reveal: true` is passed. [VERIFIED: CONTEXT.md]
- **Auto-rollback on SSH failure:** If server creation succeeds but validation fails, do not attempt to delete/rollback the server. Return soft success with reachable: false. [VERIFIED: CONTEXT.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fingerprint derivation | SSH key parser / sshpk | Coolify API response | Coolify's API computes and returns the key fingerprint natively on `GET /security/keys/{uuid}`. Using the native value is bulletproof. [VERIFIED: coollabsio/coolify-docs] |
| Local file resolution | Custom file upload endpoint | Local fs reading in MCP handler | Directly reading local `key_file` paths via standard `fs.readFileSync` in the handler is much simpler and faster. [ASSUMED] |

**Key insight:** Leveraging the remote Coolify API's built-in behaviors (fingerprinting and connection validation) is far superior to replicating crypto and network logic on the MCP side.

## Runtime State Inventory

*SKIPPED: Omitted because Phase 8 is a greenfield implementation phase adding new capabilities, not a rename or database migration phase.*

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Coolify API | Core backend | ✓ | v4.1.2 | — [VERIFIED: live API] |
| Node.js | Execution runtime | ✓ | v20+ | — [VERIFIED: package.json] |
| Vitest | Testing | ✓ | ^1.4.0 | — [VERIFIED: package.json] |

## Common Pitfalls

### Pitfall 1: Server GET response lacks Private Key UUID
**What goes wrong:** Calling `GET /servers/{uuid}` does not return `private_key_uuid`, only `private_key_id` (the database integer).
**Why it happens:** The database schema links the two via database integer IDs, and the Coolify API reflects this raw relationship. [CITED: coolify-terraform]
**How to avoid:** Build a lookup map of private keys (`GET /security/keys`) on demand inside the MCP get handler. Match the server's `private_key_id` to the correct private key, and output the key's `uuid`.

### Pitfall 2: Key Delete 422 vs 409
**What goes wrong:** Deleting a referenced private key directly on the Coolify API throws a generic 422 error.
**Why it happens:** Coolify's backend checks for relations in the database before deletion.
**How to avoid:** To return a nice `COOLIFY_409` with actual dependent server UUIDs, the MCP server should fetch all servers via `GET /servers` beforehand. If any server matches the key's ID, reject with `COOLIFY_409` and list the server UUIDs *before* calling the API.

## Code Examples

### Resolution of Private Key UUID from Server Private Key ID
```typescript
import { fetchServers, fetchResources } from '../../api/client.js';

// Resolve private key UUID from ID
export async function getPrivateKeyUuidFromId(
  privateKeyId: number,
  client: any
): Promise<string | null> {
  const keys = await client('/security/keys');
  const match = keys.find((k: any) => k.id === privateKeyId);
  return match ? match.uuid : null;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom SSH execution | `/servers/{uuid}/validate` | June 2026 (v4.1.2) | Validation is fully delegated to Coolify's built-in validation engine. [VERIFIED: coollabsio/coolify] |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | PATCH /security/keys/{uuid} supports name/description updates only. | private_key.update scope | Minimal. If Coolify supports PEM rotation on PATCH, we can pass it, but standard metadata-only updates are fully sufficient. |

## Open Questions (RESOLVED)

1. **How does the Coolify validation endpoint handle timeouts internally?** (RESOLVED)
   - What we know: Calling `GET /servers/{uuid}/validate` returns 201 immediately and runs async.
   - What's unclear: Does it hang forever if the host is down, or does it time out?
   - Recommendation: Use a strict client-side timeout of 30 seconds for polling `is_reachable`. If it doesn't resolve, report soft success with `reachable: false`.
   - RESOLVED: Plans 08-01 (pollServerUntilReachable, 30s default) and 08-03 (runValidationCycle, soft-success on unreachable/pending) implement the 30s client-side poll with soft-success fallback per D-05/D-07. No server-side timeout assumption required.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^1.4.0 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/mcp/tools/private_key.test.ts` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| KEY-01 | List private keys | unit | `npx vitest run -t "private_key list"` | ❌ Wave 0 |
| KEY-02 | Get private key by UUID | unit | `npx vitest run -t "private_key get"` | ❌ Wave 0 |
| KEY-03 | Create private key (PEM / file) | unit | `npx vitest run -t "private_key create"` | ❌ Wave 0 |
| KEY-04 | Update private key metadata | unit | `npx vitest run -t "private_key update"` | ❌ Wave 0 |
| KEY-05 | Delete private key (confirm / 409 check) | unit | `npx vitest run -t "private_key delete"` | ❌ Wave 0 |
| SRV-01 | Create server | unit | `npx vitest run -t "server create"` | ❌ Wave 0 |
| SRV-02 | Update server | unit | `npx vitest run -t "server update"` | ❌ Wave 0 |
| SRV-03 | Delete server (confirm / volumes) | unit | `npx vitest run -t "server delete"` | ❌ Wave 0 |
| SRV-04 | Validate server reachability | unit | `npx vitest run -t "server validate"` | ❌ Wave 0 |
| SRV-05 | Configure build server | unit | `npx vitest run -t "server build"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run` (target files only)
- **Per wave merge:** `npm run test` (full suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/mcp/tools/private_key.test.ts` — covers KEY-01 to KEY-05
- [ ] `src/mcp/tools/server.test.ts` — covers SRV-01 to SRV-05

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | payload validated via Zod schemas at tool entrypoint [VERIFIED: code] |
| V6 Cryptography | yes | Zero-reveal of private keys; PEM is strictly scrubbed on any MCP return path [VERIFIED: code] |

### Known Threat Patterns for Node.js / ofetch

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Credential Leakage in Logs | Information Disclosure | `redactSecrets()` utility filters out API tokens, passwords, and private key strings from any console/stderr output. [VERIFIED: code] |
| SSL / MITM attacks | Tampering | `COOLIFY_VERIFY_SSL` controls strict SSL verification on the `https` fetch agent. [VERIFIED: code] |

## Sources

### Primary (HIGH confidence)
- `/Users/puzzless/Desktop/awesome-coolify/docs/coolify_openapi.yaml` - Verified OpenAPI routing and properties for private keys and servers.
- `coollabsio/coolify/routes/api.php` - Verified exact HTTP methods and paths for keys and servers.
- `coollabsio/coolify/app/Http/Controllers/Api/SecurityController.php` - Verified DB check behavior on private key deletion.

### Secondary (MEDIUM confidence)
- `coolify-terraform` API contract mapping - Verified that GET `/servers` returns `private_key_id` instead of `private_key_uuid`.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - uses same robust dependencies (ofetch, zod) as existing green-lighted tools.
- Architecture: HIGH - uses proven discriminated union action router, custom error mappings, and clean lookup patterns.
- Pitfalls: HIGH - identified and mitigated the undocumented server-to-key relation properties and deletion status behaviors.

**Research date:** July 16, 2026
**Valid until:** August 15, 2026
