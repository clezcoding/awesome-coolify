# Phase 16: Coolify Cloud & Server Branding - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-22
**Phase:** 16-Coolify Cloud & Server Branding
**Areas discussed:** Cloud-Error-Hints, Branding-Metadaten & Icon-Hosting, Cloud-Setup-Docs EN/DE, Cloud-Instanz-Verhalten
**Language:** German (user-facing); decisions recorded in CONTEXT.md in English

---

## Cloud-Error-Hints

| Option | Description | Selected |
|--------|-------------|----------|
| Gezielte Cloud-Codes | Own codes where useful + generic 403 fallback | ✓ |
| Nur Hint-Texte erweitern | No new codes; cloud-aware hint strings | |
| Minimal | One generic cloud hint on all 403/404 | |
| You decide | | |

**User's choice:** Gezielte Cloud-Codes
**Notes:** —

| Option | Description | Selected |
|--------|-------------|----------|
| Zwei Fokus-Codes | FORBIDDEN + UNSUPPORTED; keep SENSITIVE | ✓ (via You decide → Claude) |
| Nur Permission | One forbidden code only | |
| Breites Set | Billing/plan/rate-limit/etc. | |
| You decide | | ✓ |

**User's choice:** You decide → Claude locked two focus codes
**Notes:** —

| Option | Description | Selected |
|--------|-------------|----------|
| Nur wenn Instanz als Cloud bekannt | type:cloud or *.coolify.io | ✓ |
| Immer bei typischen Mustern | Body heuristics even on self-hosted | |
| Nur explizites type:cloud | Stricter; env-only risk | |
| You decide | | |

**User's choice:** Nur wenn Instanz als Cloud bekannt
**Notes:** —

| Option | Description | Selected |
|--------|-------------|----------|
| Actionable Agent-Steps | Short EN executable hints | ✓ |
| User-facing Prosa | Longer explanations | |
| Code + Docs-Pointer only | Minimal | |
| You decide | | |

**User's choice:** Actionable Agent-Steps
**Notes:** —

---

## Branding-Metadaten & Icon-Hosting

| Option | Description | Selected |
|--------|-------------|----------|
| Bestehendes favicon-192.png | Reuse existing | |
| Dediziertes MCP-List-Icon | New export from Hex Robot Helper | ✓ |
| logo.png / transparent | Other assets | |
| You decide | | |

**User's choice:** Dediziertes MCP-List-Icon
**Notes:** Source `mascot-d2-robot-hex.png` on brand violet, 192×192

| Option | Description | Selected |
|--------|-------------|----------|
| jsDelivr from public repo | CDN HTTPS | ✓ |
| GitHub Pages | Same-origin Pages URL | |
| Beide URLs | Primary + fallback docs | |
| You decide | | |

**User's choice:** jsDelivr + free-text correction
**Notes:** User: no dual-repo anymore — only `https://github.com/clezcoding/awesome-coolify`; npm already switched. CDN: `cdn.jsdelivr.net/gh/clezcoding/awesome-coolify@main/docs/assets/<file>`

| Option | Description | Selected |
|--------|-------------|----------|
| Package-aligned | title/description/websiteUrl from package | ✓ (via You decide → Claude) |
| Marketing-stärker | Longer marketing copy | |
| Minimal | Weak BRND-03 | |
| You decide | | ✓ |

**User's choice:** You decide → Claude locked package-aligned metadata
**Notes:** title `Awesome Coolify`; websiteUrl GitHub awesome-coolify; description from package.json

| Option | Description | Selected |
|--------|-------------|----------|
| Docs + Fallback-Metadaten | Always document reconnect/limitation | |
| Nur Docs wenn broken | Document after manual fail | |
| Aggressive Verify-Gate | Screenshot required for done | ✓ |
| You decide | | |

**User's choice:** Aggressive Verify-Gate
**Notes:** Client limitation docs only if verify fails with evidence

---

## Cloud-Setup-Docs EN/DE

| Option | Description | Selected |
|--------|-------------|----------|
| Setup + Smoke + bekannte Limits | Recommended depth | ✓ |
| Nur Setup + Smoke | | |
| Ausführliches Cloud-Playbook | | |
| You decide | | |

**User's choice:** Setup + Smoke + bekannte Limits
**Notes:** —

| Option | Description | Selected |
|--------|-------------|----------|
| README-Sektion + Install-Hinweis | | |
| Nur README EN/DE | | |
| Eigenes docs/cloud.md | | ✓ (refined) |
| You decide | | |

**User's choice:** Own docs + README overview pattern
**Notes:** User wants pattern change: each topic gets its own clear doc; README keeps quick overview. Full README split deferred; Cloud first.

| Option | Description | Selected |
|--------|-------------|----------|
| Sibling *.de.md | | |
| Locale-Ordner docs/en + docs/de | | ✓ |
| Nur EN in docs/ | | |
| You decide | | |

**User's choice:** Locale folders `docs/en/cloud.md` + `docs/de/cloud.md`
**Notes:** —

| Option | Description | Selected |
|--------|-------------|----------|
| Agent-first Smoke | | ✓ (via You decide → Claude) |
| Nur curl | | |
| Beides | | |
| You decide | | ✓ |

**User's choice:** You decide → Claude locked agent-first smoke (+ optional curl one-liner)
**Notes:** —

---

## Cloud-Instanz-Verhalten

| Option | Description | Selected |
|--------|-------------|----------|
| Still + Infer + Hints-on-Fail | | ✓ (via You decide → Claude) |
| Soft-Warnung in Response | | |
| Hard-Validate URL | | |
| You decide | | ✓ |

**User's choice:** You decide → Claude locked still + infer + hints-on-fail
**Notes:** —

| Option | Description | Selected |
|--------|-------------|----------|
| Host-Infer zur Laufzeit | Env-only cloud gets cloud codes | ✓ |
| Cloud-Hints nur mit Registry-type | | |
| Env-only Nudge import-env | | |
| You decide | | |

**User's choice:** Host-Infer zur Laufzeit
**Notes:** —

| Option | Description | Selected |
|--------|-------------|----------|
| Leicht anreichern (schema/docs) | | |
| Nur externe Docs | | |
| Cloud-Profil-Action cloud-info | | ✓ |
| You decide | | |

**User's choice:** `instance.cloud-info` action
**Notes:** Flagged as scope expansion; user confirmed

| Option | Description | Selected |
|--------|-------------|----------|
| Lokal/statisch | No live API | ✓ |
| Live Cloud-Probe | | |
| Doch deferren | | |
| Other | | |

**User's choice:** Lokal/statisch
**Notes:** Follow-up 3b after scope flag

| Option | Description | Selected |
|--------|-------------|----------|
| Optional instance routing | | ✓ |
| Nur Registry type:cloud | | |
| Global kein Param | | |
| You decide | | |

**User's choice:** Optional `instance` / else Env+default+infer; response includes isCloud, url, source
**Notes:** —

---

## Claude's Discretion

- Two focus cloud error codes (not broad set)
- Package-aligned MCP title/description/websiteUrl
- Agent-first smoke test (+ optional curl)
- Still + infer + hints-on-fail for add/update (no soft warn / hard URL gate)
- Exact icon filename and SDK field wiring

## Deferred Ideas

- Custom Skills pro IDE — Phase 19+
- Official Coolify OpenAPI integration — separate track
- Local manifest — Phase 17
- Standard setup tool — Phase 19+
- Full README → docs locale split for all sections
- Live cloud-info API probe
- Billing/rate-limit error code zoo
- Update CONVENTIONS.md dual-repo language (single repo authoritative via D-07)
