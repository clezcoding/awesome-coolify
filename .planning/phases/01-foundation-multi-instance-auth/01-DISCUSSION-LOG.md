# Phase 1: Foundation & Multi-Instance Auth - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `01-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-07-12
**Phase:** 01-Foundation & Multi-Instance Auth
**Areas discussed:** Instance-Auswahl, Config/Auth (instances.json), Fehler-Envelope, MCP SDK & P1-Tools, Logging & Secrets

---

## Instance-Auswahl

| Option | Description | Selected |
|--------|-------------|----------|
| instanceId optional auf jedem Tool | Default wenn fehlt; pro Call überschreibbar | ✓ (initially, later superseded by single-instance P1) |
| Nur switch/use | Persistenter Wechsel, kein pro-Request-Override | |
| Nur Default | Kein Override | |

| Option | Description | Selected |
|--------|-------------|----------|
| Session-Memory für switch | activeInstance im Prozess | ✓ (initially, deferred v2) |
| Persistiert in instances.json | active-Feld auf Disk | |
| Kein active-State | Nur default + instanceId | |

| Option | Description | Selected |
|--------|-------------|----------|
| Ephemeral token override | Pro Request, nie auf Disk | |
| mcp.json env only | Kein Request-Override | ✓ |
| Bootstrap env | COOLIFY_URL+TOKEN nur für ersten add | |

| Option | Description | Selected |
|--------|-------------|----------|
| Ein MCP-Eintrag pro Instanz | coolify-prod, coolify-staging je mit env | ✓ (for v2 pattern) |
| Ein Eintrag + instances.json URLs | Tokens in mcp.json | |
| Zurück zu instances.json | URL+Token zentral | |

**User's choice:** Evolved to **single instance P1** — see Config/Auth area.
**Notes:** User requested Coolify API research after token-override question. Finding: Bearer per URL, team-scoped; override is MCP-layer only. User rejected override entirely — tokens in mcp.json.

---

## Config / Auth (instances.json)

| Option | Description | Selected |
|--------|-------------|----------|
| Global ~/.coolify-mcp/instances.json | chmod 0600, outside repo | |
| Projekt-lokal + auto-.gitignore | | |
| OS Keychain | | |
| Verschlüsselte Datei | | |
| Nur mcp.json env | Kein instances.json | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Single Instance P1 | Multi-Instance v2 | ✓ |
| COOLIFY_URL + COOLIFY_TOKEN required | Fail fast at startup | ✓ |
| Multi-Instance → v2 | CTX-04/05 deferred | ✓ |

**User's choice:** Single instance; mcp.json env only; multi-instance komplett v2.
**Notes:** User asked about gitignore/encryption alternatives, then decided "einfach bei Single Instance bleiben".

---

## Fehler-Envelope

| Option | Description | Selected |
|--------|-------------|----------|
| README-Format | code, message, recoveryHints[], httpStatus | ✓ |
| MCP isError + Text only | | |
| Beides | isError + JSON | (partial — via spike two-layer) |

| Option | Description | Selected |
|--------|-------------|----------|
| HTTP-mapped codes | COOLIFY_401, etc. | ✓ |
| Numerisch | code: 401 | |
| Coolify message durchreichen | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Retry 429 + 5xx + network | 3x, 1s/2s/4s | ✓ |
| Nur 5xx | | |
| Kein Retry P1 | | |

| Option | Description | Selected |
|--------|-------------|----------|
| recoveryHints Englisch | | ✓ |
| Deutsch/Englisch mix | | |
| Minimal | | |

**User's choice:** README envelope, COOLIFY_* codes, retry 429/5xx, hints EN.

---

## MCP SDK & P1-Tools

| Option | Description | Selected |
|--------|-------------|----------|
| @modelcontextprotocol/server v2 | McpServer + serveStdio | ✓ |
| @modelcontextprotocol/sdk v1 | PROJECT.md text | |
| Claude entscheidet | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Nur system + meta | health, version, verify | ✓ |
| + instance stub | | |
| Alle Domänen als stubs | | |

| Option | Description | Selected |
|--------|-------------|----------|
| action pro Domäne | system({ action: 'health' \| ... }) | ✓ |
| Flache Tools P1 | | |
| Hybrid | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Lokaler Dev-Entry zuerst | node dist/index.js | ✓ |
| npx ab P1 | | |
| tsx dev | | |

**User's choice:** server v2, system+meta only, action-per-domain, local dev first.
**Notes:** Spike 002 recommended SDK v1.29.0 — user overrode with v2.

---

## Logging & Secrets

| Option | Description | Selected |
|--------|-------------|----------|
| stderr only + COOLIFY_MCP_LOG | | ✓ |
| Silent default | | |
| DEBUG flag only | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Aggressive redaction | Bearer, token, api_key, password, secret | ✓ |
| Nur API token | | |
| Token + query params | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Kein Body-Logging P1 | Nur Pfad + Status | ✓ |
| Debug headers redacted | | |
| Debug body redacted | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Nie Env in Responses | connected + host only | ✓ |
| URL teilweise | | |
| config summary tokenSet | | |

**User's choice:** stderr logging, aggressive redaction, no body logs, no env leakage in responses.

---

## Spike Integration

**User note:** "Fertig aber ich habe einen spike mit neuen infos gemacht."

Spikes 001–003 processed 2026-07-12. Findings at `.cursor/skills/spike-findings-awesome-coolify/`. Key conflicts with user decisions documented in CONTEXT.md (SDK v2 vs spike v1; multi-instance deferred vs spike instances.json pattern).

---

## Claude's Discretion

- Exact meta tool shape
- COOLIFY_VERIFY_SSL default (not discussed)
- Zod field naming

## Deferred Ideas

- Multi-instance + instances.json → v2
- Token override (CTX-06) → v2
- Secure storage variants (keychain, encryption, project gitignore)
- health vs verify semantics, SSL homelab default, response format foundation → not discussed / later phases
