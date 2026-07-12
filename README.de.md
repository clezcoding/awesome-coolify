<p align="center">
  <img src="docs/assets/logo.png" alt="coolify-mcp Logo" width="120" />
</p>

<h1 align="center">coolify-mcp</h1>

<p align="center">
  <strong>Der Open-Source MCP-Server für self-hosted Coolify.</strong><br/>
  Deployen, Logs lesen, diagnostizieren — aus Cursor, Claude Desktop oder jedem MCP-Client.
</p>

<p align="center">
  <a href="README.md">English</a> ·
  <a href="https://coolify.io">Coolify</a> ·
  <a href="https://modelcontextprotocol.io">MCP</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Coolify%20API-4.1.x-6b16ed?style=flat-square" alt="Coolify API 4.1.x" />
  <img src="https://img.shields.io/badge/MCP-action--basiert-181818?style=flat-square" alt="Action-basierte Tools" />
  <img src="https://img.shields.io/badge/Lizenz-MIT-fcd34d?style=flat-square" alt="MIT Lizenz" />
</p>

![coolify-mcp Social Preview](docs/assets/social-preview.png)

---

## Warum coolify-mcp?

Heute existieren drei überlappende MCP-Implementierungen (Coolify CLI MCP, `user-coolify`, `coolify-backup-mcp`) — inkonsistente Schemas, 60+ granulare Tools, doppelte Logik.

**coolify-mcp** ersetzt sie durch einen community-fokussierten Server:

- **Action-basierte Tools** — z.B. `application({ action: 'deploy' })` statt Dutzender Einzeltools
- **Strukturierte Fehler** — `COOLIFY_401`, Recovery-Hints, Retry bei transienten Fehlern
- **Ops-first v1** — Deploy, Logs, Diagnose, Infrastructure-Overview
- **Multi-Instance (v2)** — mehrere Coolify-Installationen aus einer Config

Gebaut für self-hosted [Coolify](https://coolify.io) **4.1.x**. Nicht offiziell mit Coolify Labs verbunden.

---

## Schnellstart

### Voraussetzungen

- Node.js 20+
- Self-hosted Coolify-Instanz mit API-Token ([Keys & Tokens](https://coolify.io/docs/api-reference/authorization))

### Installation (nach npm-Release)

```bash
npx coolify-mcp
```

### Lokale Entwicklung

```bash
git clone https://github.com/YOUR_ORG/awesome-coolify.git
cd awesome-coolify
npm install
npm run build
```

### Cursor / Claude Desktop

In `~/.cursor/mcp.json` oder Claude Desktop MCP-Config eintragen:

```json
{
  "mcpServers": {
    "coolify": {
      "command": "node",
      "args": ["/absoluter/pfad/zu/awesome-coolify/dist/index.js"],
      "env": {
        "COOLIFY_URL": "https://coolify.example.com",
        "COOLIFY_TOKEN": "dein-api-token",
        "COOLIFY_MCP_LOG": "info"
      }
    }
  }
}
```

> **Phase 1:** Eine Coolify-Instanz pro MCP-Server-Eintrag. Mehrere Instanzen = mehrere `mcpServers`-Einträge. Einheitliche `~/.coolify-mcp/instances.json` kommt in **v2**.

Copy-Paste-Vorlage: [`docs/mcp.example.json`](docs/mcp.example.json)

---

## Umgebungsvariablen

| Variable | Pflicht | Beschreibung |
|----------|---------|--------------|
| `COOLIFY_URL` | ja | Basis-URL der Coolify-Instanz (ohne trailing slash) |
| `COOLIFY_TOKEN` | ja | Bearer API-Token (team-scoped) |
| `COOLIFY_MCP_LOG` | nein | `debug` · `info` · `error` (Standard: `info`) |
| `COOLIFY_VERIFY_SSL` | nein | `true` · `false` (Standard: `true`) |

Tokens nur aus Env — nie in Tool-Responses oder Logs.

---

## Tools (action-basiert)

Jede Domäne = ein Tool mit `action`-Discriminator:

```typescript
system({ action: 'health' | 'version' | 'verify' })
meta({ action: 'version' })
// v1+ Domänen (Roadmap):
application({ action: 'list' | 'get' | 'deploy' | 'logs' | ... })
server({ action: 'list' | 'diagnose' | ... })
```

### Phase 1 (Foundation)

| Tool | Actions | Zweck |
|------|---------|-------|
| `system` | `health`, `version`, `verify` | Verbindung und Coolify-Version |
| `meta` | `version` | MCP-Server-Version |

### v1 Roadmap (Ops)

Deploy, Restart, Logs, App/Server-Diagnose, Infrastructure-Overview, Global Issue-Scan — siehe [`.planning/ROADMAP.md`](.planning/ROADMAP.md).

### v2 (volle Parität)

Create/Delete, Multi-Instance-CRUD, Bulk-Ops, Doku-Suche — siehe [`.planning/REQUIREMENTS.md`](.planning/REQUIREMENTS.md#v2-requirements).

---

## Strukturierte Fehler

API-Fehler als parsebares Envelope:

```json
{
  "code": "COOLIFY_401",
  "message": "Unauthorized — invalid or expired API token",
  "recoveryHints": [
    "Verify the token in Coolify UI → Keys & Tokens",
    "Ensure the token has the required team permissions"
  ],
  "httpStatus": 401
}
```

| Code | Bedeutung |
|------|-----------|
| `COOLIFY_401` | Ungültiger oder fehlender Token |
| `COOLIFY_404` | Ressource nicht gefunden |
| `COOLIFY_422` | Validierungsfehler |
| `COOLIFY_500` | Coolify-Serverfehler |
| `COOLIFY_NETWORK` | Verbindung fehlgeschlagen |
| `COOLIFY_TIMEOUT` | Request-Timeout |

Transient (429, 5xx, Netzwerk): Retry bis 3×, exponentielles Backoff (1s → 2s → 4s).

---

## Architektur

```
MCP Client (Cursor / Claude)
        │ stdio JSON-RPC
        ▼
   coolify-mcp (TypeScript)
   ├── Action Routing (Zod-validiert)
   ├── Coolify HTTP Client (ofetch + Bearer)
   └── Error Envelope + Secret-Redaction
        │ HTTPS
        ▼
   Coolify API /api/v1/*
```

Details: [`.planning/research/ARCHITECTURE.md`](.planning/research/ARCHITECTURE.md)

---

## Entwicklung

```bash
npm run build    # tsup → dist/
npm test         # vitest
npm run dev      # Watch-Modus
```

Logs nur auf **stderr** (stdout = MCP-Protokoll).

---

## Mitmachen

Issues und PRs willkommen. Community-Projekt — kein offizielles Coolify-Produkt.

1. [`.planning/PROJECT.md`](.planning/PROJECT.md) — Scope und Entscheidungen
2. Spike-Findings: [`.cursor/skills/spike-findings-awesome-coolify/`](.cursor/skills/spike-findings-awesome-coolify/)
3. Feature-Katalog: [`mcp_features.md`](mcp_features.md)

---

## Lizenz

MIT — siehe [LICENSE](LICENSE) (folgt).

---

## Verwandte Projekte

- [Coolify](https://github.com/coollabsio/coolify) — self-hosted PaaS
- [Model Context Protocol](https://modelcontextprotocol.io) — Standard für AI-Tool-Integration
