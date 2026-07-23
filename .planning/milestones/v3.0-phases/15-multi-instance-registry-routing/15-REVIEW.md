---
phase: 15-multi-instance-registry-routing
reviewed: 2026-07-21T22:55:00Z
depth: standard
files_reviewed: 23
files_reviewed_list:
  - src/config/env.test.ts
  - src/config/env.ts
  - src/mcp/integration.test.ts
  - src/mcp/server.test.ts
  - src/mcp/server.ts
  - src/mcp/tools/application.ts
  - src/mcp/tools/database.ts
  - src/mcp/tools/deployment.ts
  - src/mcp/tools/diagnose.ts
  - src/mcp/tools/emergency.ts
  - src/mcp/tools/environment.ts
  - src/mcp/tools/instance.test.ts
  - src/mcp/tools/instance.ts
  - src/mcp/tools/private_key.ts
  - src/mcp/tools/project.ts
  - src/mcp/tools/resource.ts
  - src/mcp/tools/server.ts
  - src/mcp/tools/service.ts
  - src/mcp/tools/shared-read-params.ts
  - src/mcp/tools/system.ts
  - src/utils/errors.ts
  - src/utils/instance-registry.test.ts
  - src/utils/instance-registry.ts
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 15: Code Review Report

**Reviewed:** 2026-07-21T22:55:00Z  
**Depth:** standard  
**Files Reviewed:** 23  
**Status:** issues_found

## Summary

Re-Review nach Fix-Pass. **CR-01..CR-03 und WR-01..WR-04 sind behoben:** `private_key` delete/delete_preview nutzt `routingEnv`; `instance.update` lehnt Token `***` ab; korrupte Registry wirft `COOLIFY_VALIDATION_ERROR` inkl. Schema-Validierung pro Eintrag; stale `default` hat eigenen Fehlerpfad; `handleInstanceAction(args, env)` ist verdrahtet; `readOnlyHint` am instance-Tool entfernt.

Routing-Architektur (`parseWithInstanceRouting` / `safeParseWithInstanceRouting` + `resolveRoutingEnv`) bleibt konsistent. Verbleibend: drei Warnings (Token-`***` bei add/import-env, fehlendes `default` trotz Instanzen, Zod→NETWORK bei throw-Parse-Tools) plus Test-/UX-Infos.

## Warnings

### WR-01: `instance.add` / `import-env` akzeptieren maskiertes Token `***`

**File:** `src/mcp/tools/instance.ts:242-252` (add), `src/mcp/tools/instance.ts:290-308` (import-env)  
**Issue:** Nur `update` blockiert `token === '***'` (CR-02-Fix). `add` und `import-env` persistieren den Platzhalter unverändert — Agent kopiert oft masked Output von `list`/`get` in `add`. Ergebnis: Registry-Eintrag mit unbrauchbarem Token, alle API-Calls gegen diese Instanz schlagen fehl (Auth), bis manuelles Re-Add.

**Fix:**
```typescript
function rejectMaskedToken(token: string): void {
  if (token === '***') {
    throw new CoolifyApiError({
      code: 'COOLIFY_VALIDATION_ERROR',
      message:
        'Cannot persist masked placeholder token *** — pass the real token (use reveal:true on get if needed)',
      recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
    });
  }
}

// in add / import-env before InstanceManager.add:
rejectMaskedToken(parsed.token); // bzw. creds.token
```

### WR-02: Instanzen ohne `default` → irreführendes `COOLIFY_NO_INSTANCE`

**File:** `src/utils/instance-registry.ts:325-347`  
**Issue:** Wenn `instances.length > 0`, aber `registry.default` fehlt (manueller JSON-Edit) oder beim Load verworfen wird (`typeof parsed.default !== 'string'`), fällt `resolveCredentials` durch zu `noInstanceError()` — Message „No Coolify instance configured“, obwohl Einträge existieren. Recovery zeigt auf `instance.add` statt `instance.set-default`. Stale-default-Zweig (Zeilen 335–344) deckt nur gesetzten, nicht-matchenden Default ab.

**Fix:**
```typescript
const registry = InstanceManager.loadRegistry();
if (registry.instances.length > 0) {
  if (registry.default) {
    const entry = registry.instances.find((i) => i.name === registry.default);
    if (entry) {
      return { url: entry.url, token: entry.token, verifySsl: entry.verifySsl };
    }
    throw new CoolifyApiError({
      code: 'COOLIFY_VALIDATION_ERROR',
      message: `Registry default '${registry.default}' does not match any registered instance`,
      recoveryHints: [
        'Run instance.set-default with a valid instance name from instance.list.',
        'Or fix registry.default in ~/.coolify-mcp/instances.json to an existing name.',
      ],
    });
  }
  throw new CoolifyApiError({
    code: 'COOLIFY_VALIDATION_ERROR',
    message: 'Registry has instances but no default is set',
    recoveryHints: [
      'Run instance.set-default with a name from instance.list.',
      'Or pass instance: <name> explicitly on the tool call.',
    ],
  });
}
throw noInstanceError();
```

### WR-03: Ungültiger `instance`-Param wird bei throw-Parse-Tools als `COOLIFY_NETWORK` gemeldet

**File:** `src/mcp/tools/shared-read-params.ts:21-35`, genutzt u. a. in `src/mcp/tools/system.ts:123-124`, `resource.ts:224`, `server.ts:310`, `diagnose.ts:483`, `deployment.ts:208`, `emergency.ts:290`  
**Issue:** `parseWithInstanceRouting` wirft rohes `ZodError` bei ungültigem Slug (z. B. `instance: 'PROD'`). Handler fangen mit `wrapMcpError` — ohne `CoolifyApiError` und ohne HTTP-Status mappt `mapApiError` auf **`COOLIFY_NETWORK`** inkl. Firewall/DNS-Hints. Tools mit `safeParseWithInstanceRouting` + `throwValidationError` (application/service/database/…) liefern korrekt Validation. Inkonsistente Multi-Instance-UX; Agents debuggen Netzwerk statt Param.

**Fix:** In `parseWithInstanceRouting` Zod-Fehler als `CoolifyApiError` werfen, oder alle Domain-Tools auf `safeParseWithInstanceRouting` + Validation-Mapper umstellen:
```typescript
export function parseWithInstanceRouting<T extends Record<string, unknown>>(
  schema: z.ZodType<T>,
  args: unknown,
): T & { instance?: string } {
  const result = safeParseWithInstanceRouting(schema, args);
  if (!result.success) {
    throw new CoolifyApiError({
      code: 'COOLIFY_VALIDATION_ERROR',
      message: result.error.issues.map((i) => i.message).join('; '),
      recoveryHints: RECOVERY_HINTS.COOLIFY_VALIDATION_ERROR,
    });
  }
  return result.data;
}
```

## Info

### IN-01: `server.test.ts` readOnlyHint-Regex matcht über Tool-Grenzen

**File:** `src/mcp/server.test.ts:137-153`  
**Issue:** Pattern `'application'[\\s\\S]*readOnlyHint:\\s*true` ist gierig und trifft `readOnlyHint` späterer Tools (`docs`). `application`/`service`/`database` haben kein `readOnlyHint` (korrekt laut `integration.test.ts`), der Test kann trotzdem grün sein. Flaky False-Positive — Testzuverlässigkeit.

**Fix:** Tool-Block bis nächstes `registerTool` schneiden (wie diagnose/deployment-Tests und `integration.test.ts`); Assertion an echte read-only Tools anpassen (`system`/`meta`/`resource`/`docs`).

### IN-02: Stale TODO in Registry-Tests

**File:** `src/utils/instance-registry.test.ts:7`  
**Issue:** Kommentar behauptet, Plan 15-01 würde den Test-Pfad noch verdrahten — `COOLIFY_MCP_TEST_REGISTRY_DIR` ist bereits aktiv.

**Fix:** TODO entfernen oder durch kurzen Hinweis ersetzen, dass der Env-Override der offizielle Test-Hook ist.

### IN-03: `import-env` hart auf `type: 'self-hosted'`

**File:** `src/mcp/tools/instance.ts:295-301`  
**Issue:** Import setzt immer `type: 'self-hosted'`, auch bei Cloud-URLs. Funktional oft egal (Routing nutzt url/token), aber `instance.list`/`get` zeigen falschen Typ.

**Fix:** Optional `type` am `import-env`-Schema; Default per Hostname-Heuristik (`*.coolify.io` → `cloud`) oder explizites Agent-Param.

---

_Reviewed: 2026-07-21T22:55:00Z_  
_Reviewer: Claude (gsd-code-reviewer)_  
_Depth: standard_
