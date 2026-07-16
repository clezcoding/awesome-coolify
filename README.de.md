<p align="center">
  <img src="docs/assets/logo.png" alt="awesome-coolify-mcp logo" width="120" />
</p>

<h1 align="center">awesome-coolify-mcp</h1>

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

![awesome-coolify-mcp Social Preview](docs/assets/social-preview.png)

---

## Warum awesome-coolify-mcp?

Heute existieren drei überlappende MCP-Implementierungen (Coolify CLI MCP, `user-coolify`, `coolify-backup-mcp`) — inkonsistente Schemas, 60+ granulare Tools, doppelte Logik.

**awesome-coolify-mcp** ersetzt sie durch einen community-fokussierten Server:

- **Action-basierte Tools in 10 Domänen** — z.B. `application({ action: 'deploy' })` statt Dutzender Einzeltools
- **Strukturierte Fehler** — `COOLIFY_401`, Recovery-Hints, Retry bei transienten Fehlern
- **Ops-first v1** — Deploy, Logs, Diagnose, Infrastructure-Overview, Emergency-Controls mit Safety-Gates

Gebaut für self-hosted [Coolify](https://coolify.io) **4.1.x**. Nicht offiziell mit Coolify Labs verbunden.

---

## Schnellstart

**Voraussetzungen:** Node.js 20+, self-hosted Coolify-Instanz, API-Token ([Keys & Tokens](https://coolify.io/docs/api-reference/authorization)).

```bash
npx -y awesome-coolify-mcp
```

Der Host-Client injiziert `COOLIFY_URL` und `COOLIFY_TOKEN` über die MCP-Config — siehe [Installation](#installation).

> **Sicherheit:** Emergency-Actions (`stop_all`, `redeploy_project`, `restart_project`) erfordern `confirm: true`. Sensible Keys sind standardmäßig maskiert — `reveal: true` nur bei Bedarf für Klartext.

---

## Installation

Drei gleichwertige Wege — Deeplink, Konfigurator oder manuelles Einfügen.

### One-Click (Deeplink)

Für Experten mit fertigen Credentials (Platzhalter-Env OK; bevorzugt den [Konfigurator](#konfigurator-github-pages) für Secrets):

- **Cursor:** [awesome-coolify-mcp zu Cursor hinzufügen](cursor://anysphere.cursor-deeplink/mcp/install?name=awesome-coolify-mcp&config=eyJhd2Vzb21lLWNvb2xpZnktbWNwIjp7ImNvbW1hbmQiOiJucHgiLCJhcmdzIjpbIi15IiwiYXdlc29tZS1jb29saWZ5LW1jcCJdLCJlbnYiOnsiQ09PTElGWV9VUkwiOiJodHRwczovL2Nvb2xpZnkuZXhhbXBsZS5jb20iLCJDT09MSUZZX1RPS0VOIjoiWU9VUl9DT09MSUZZX0FQSV9UT0tFTiJ9fX0=)
- **VS Code / GitHub Copilot:** [Install via vscode:mcp/install](vscode:mcp/install?name=awesome-coolify-mcp&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22awesome-coolify-mcp%22%5D%2C%22env%22%3A%7B%22COOLIFY_URL%22%3A%22https%3A%2F%2Fcoolify.example.com%22%2C%22COOLIFY_TOKEN%22%3A%22YOUR_COOLIFY_API_TOKEN%22%7D%7D)

### Konfigurator (GitHub Pages)

Nutze den **[GitHub-Pages-Install-Konfigurator](docs/install.html)**, um Credentials einzugeben und client-spezifische Config-Snippets zu erzeugen. Alles läuft **client-seitig im Browser** — Tokens werden nie an ein Backend gesendet.

**Credentials beschaffen:**

- **`COOLIFY_URL`** — deine Coolify-Basis-URL (z.B. `https://coolify.example.com`, ohne trailing slash)
- **`COOLIFY_TOKEN`** — Coolify UI → **Keys & Tokens** → API-Token mit passenden Team-Rechten erstellen

### Manuell

JSON (oder TOML/YAML aus dem Konfigurator) in die MCP-Config deines Clients einfügen. Beispiel für Cursor (`~/.cursor/mcp.json` oder `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "awesome-coolify-mcp": {
      "command": "npx",
      "args": ["-y", "awesome-coolify-mcp"],
      "env": {
        "COOLIFY_URL": "https://coolify.example.com",
        "COOLIFY_TOKEN": "YOUR_COOLIFY_API_TOKEN",
        "COOLIFY_VERIFY_SSL": "true",
        "COOLIFY_MCP_LOG": "info"
      }
    }
  }
}
```

Copy-Paste-Vorlage: [`docs/mcp.example.json`](docs/mcp.example.json)

Der **Host** injiziert `env` in den Prozess — awesome-coolify-mcp liest die Client-Config selbst nie.

---

## Clients

Wichtigste MCP-Hosts:

| Client | Config-Pfad | Hinweis |
|--------|-------------|---------|
| **Cursor** | `~/.cursor/mcp.json` | One-Click-Deeplink oder manuelles JSON |
| **VS Code / GitHub Copilot** | `.vscode/mcp.json` | Native `inputs` für URL/Token-Prompts |
| **Claude Desktop** | `claude_desktop_config.json` | Manuelles JSON oder Konfigurator-Output — kein `.mcpb`-Packaging in Phase 7 |
| **Claude Code** | `~/.claude.json` oder `.mcp.json` | stdio via `npx -y awesome-coolify-mcp` |
| **Windsurf** | `~/.codeium/windsurf/mcp_config.json` | Gleiches npx + env Pattern |

**Vollständige 15+ Client-Matrix** (OpenCode, Codex CLI, Gemini CLI, Cline, Hermes, Kimi Code u.a.): siehe **[Install-Konfigurator](docs/install.html)**.

> **D-18:** Kein Claude Desktop `.mcpb`-Packaging in Phase 7 — Claude Desktop = manuelles JSON oder Pages-Konfigurator-Output.

---

## Umgebungsvariablen

| Variable | Pflicht | Standard | Beschreibung |
|----------|---------|----------|--------------|
| `COOLIFY_URL` | ja | — | Basis-URL der Coolify-Instanz (ohne trailing slash) |
| `COOLIFY_TOKEN` | ja | — | Bearer API-Token (team-scoped) |
| `COOLIFY_VERIFY_SSL` | nein | `true` | Nur in Dev auf `false` bei Self-Signed-Zerts |
| `COOLIFY_MCP_LOG` | nein | `info` | `debug` · `info` · `error` |

Tokens aus Env / optionaler `.env` — nie in Tool-Responses.

---

## Tools (aktionsbasiert)

Jede Domäne = ein MCP-Tool mit `action`-Discriminator. Beispiel: `system({ action: 'health' })`.

| Tool | Action | Zweck |
|------|--------|-------|
| `system` | `health` | Coolify-API-Erreichbarkeit prüfen |
| `system` | `version` | Coolify-Instanzversion abrufen |
| `system` | `verify` | Authentifizierung + Connectivity + Instanzversion |
| `system` | `infrastructure_overview` | Aggregierte Counts für Server, Projekte, Apps, Services, Datenbanken |
| `meta` | `version` | awesome-coolify-mcp Serverversion und Name |
| `resource` | `list` | Applications, Services und Datenbanken mit Summary-Projektionen |
| `resource` | `find` | Fuzzy-Suche über Server und Ressourcen |
| `diagnose` | `app` | App-Status, Health, Env und letzte Deployments diagnostizieren |
| `diagnose` | `server` | Server-Ressourcen, Domains und Erreichbarkeit prüfen |
| `diagnose` | `scan` | Fleet-weiter Issue-Scan nach Severity gruppiert |
| `application` | `get` | Detaillierte Konfiguration einer Application |
| `application` | `start` | Application-Container starten |
| `application` | `stop` | Application-Container stoppen |
| `application` | `restart` | Application-Container neu starten |
| `application` | `deploy` | Deployment auslösen (optional wait/poll, force rebuild) |
| `application` | `logs` | Paginierte Runtime- oder Build-Logs |
| `deployment` | `list` | Deployments einer Application auflisten |
| `deployment` | `get` | Deployment-Status, Commit und Details |
| `deployment` | `cancel` | Laufendes Deployment abbrechen |
| `service` | `start` | Alle Service-Container starten |
| `service` | `stop` | Alle Service-Container stoppen |
| `service` | `restart` | Alle Service-Container neu starten |
| `service` | `deploy` | Service redeployen (optional Image-Pull) |
| `service` | `get` | Detaillierte Konfiguration eines Services |
| `database` | `start` | Datenbank-Container starten |
| `database` | `stop` | Datenbank-Container stoppen |
| `database` | `restart` | Datenbank-Container neu starten |
| `database` | `get` | Detaillierte Konfiguration einer Datenbank |
| `docs` | `search` | Bundled Coolify-Guides durchsuchen |
| `emergency` | `stop_all` | Alle laufenden Applications fleet-weit stoppen — **requires confirm:true** |
| `emergency` | `redeploy_project` | Alle Apps eines Projekts redeployen — **requires confirm:true** |
| `emergency` | `restart_project` | Alle Apps eines Projekts neu starten — **requires confirm:true** |

---

## Sicherheit

**Emergency-Tool**-Actions sind destruktiv und gated:

- `stop_all`, `redeploy_project` und `restart_project` erfordern explizit **`confirm: true`**
- Aufruf **ohne** `confirm` zeigt zuerst die `would_affect`-Vorschau — keine Mutation

**Secret-Masking** (Standard an):

- Keys mit `password`, `token`, `secret`, `private` oder `env` werden in Tool-Output als `***` maskiert
- **`reveal: true`** für Klartext nur bei explizitem Bedarf
- **Log-Zeileninhalt wird nicht maskiert** — rohe Logs nicht dauerhaft in Agent-Memory oder Tickets speichern

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

## Nicht in v1

Create/Delete-CRUD, Multi-Instance-Runtime, Env-Var-Sync und volle Parität mit Legacy-MCPs kommen in v2.

---

## Entwicklung

```bash
git clone https://github.com/clezcoding/awesome-coolify-mcp.git
cd awesome-coolify-mcp
npm install
npm run build    # tsup → dist/
npm test         # vitest
npm run dev      # Watch-Modus
```

Logs nur auf **stderr** (stdout = MCP-Protokoll).

Für den Maintainer-npm-Publish-Workflow (`npm run build` → `npm pack --dry-run` → `npm publish --access public`) siehe **[CONTRIBUTING.md](CONTRIBUTING.md)**.

---

## Lizenz

MIT — siehe [LICENSE](LICENSE)
