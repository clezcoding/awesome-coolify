# Debug: Compose Projection Plain YAML (G-11-3 / G-11-4)

**Discovered:** Phase 11 UAT, Tests 3 & 4  
**Severity:** major  
**Status:** resolved  
**Resolved:** 2026-07-19 via 11-06-PLAN.md (cd79e91)

## Symptoms

- `service.get` / create / update responses missing `compose` field
- `compose_decode_error: "invalid base64 in docker_compose_raw"` present
- Plain YAML visible in Coolify native `docker_compose` field
- POST create with raw YAML works (base64 encode on outbound path)

## Root Cause

`projectServiceCompose()` in `src/utils/yaml-validator.ts:36-57`:

1. Only reads `docker_compose_raw`
2. Passes value to `decodeCompose()` which requires base64 charset regex
3. Coolify 4.1.2 returns **plain YAML** in `docker_compose_raw` on GET (one-click + custom compose services)
4. Decode fails → emits error, no `compose` alias
5. Never falls back to `docker_compose` field

Unit tests mock base64-encoded `docker_compose_raw` — live API shape not covered.

## Fix Applied

3-step fallback chain in `projectServiceCompose`:

1. Try base64 decode `docker_compose_raw` → if valid YAML, use decoded
2. If decode fails but string validates as YAML → use raw directly (Coolify 4.1.2 shape)
3. Else if `docker_compose` present and valid YAML → use as compose
4. Strip `docker_compose_raw` + `docker_compose` from output unconditionally (D-06)
5. Emit unified `compose_decode_error` only when no source resolves

Unit tests added for four Coolify 4.1.2 response shapes. service.ts handlers unchanged — fix contained in yaml-validator.

## Live Evidence (pre-fix)

- One-click: `uptime-kuma` uuid `fv8y68q4b5wia1yo2a7mgdep`
- Custom compose: `uat-test4-compose-transparent` (deleted in Test 5)
- Coolify host: puzzlesstool.online 4.1.2

## Live Verification (post-fix, 2026-07-19)

- Test 3 one-click: uuid `nzt4gay3a1xpbu40x6ols5jj` — GET full+reveal PASS
- Test 4 custom compose: uuid `ionfbxrz3h3h6ww031y2mdvc` — GET full+reveal PASS
- Note: create POST may omit compose (Coolify API limitation); GET with `projection:'full', reveal:true` is authoritative
