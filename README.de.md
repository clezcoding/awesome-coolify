<p align="center">
  <img src="docs/assets/logo.png" alt="awesome-coolify-mcp Maskottchen" width="140" />
</p>

<h1 align="center">awesome-coolify-mcp</h1>

<p align="center">
  <strong>Der Open-Source MCP-Server für self-hosted Coolify.</strong><br />
  Deployen, Logs lesen, Fleet-Probleme diagnostizieren und Emergency-Ops ausführen — aus Cursor, Claude, VS Code oder jedem MCP-Client.
</p>

<p align="center">
  <a href="README.md">English</a>
  ·
  <a href="https://coolify.io">Coolify</a>
  ·
  <a href="https://modelcontextprotocol.io">Model Context Protocol</a>
  ·
  <a href="docs/install.html">Install-Konfigurator</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/awesome-coolify-mcp"><img src="https://img.shields.io/npm/v/awesome-coolify-mcp.svg?style=flat-square&color=6b16ed" alt="npm Version" /></a>
  <img src="https://img.shields.io/badge/Node.js-%3E%3D20-3c873a?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js >= 20" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Coolify%20API-4.1.x-6b16ed?style=flat-square" alt="Coolify API 4.1.x" />
  <img src="https://img.shields.io/badge/MCP-10%20aktionsbasierte%20Tools-181818?style=flat-square" alt="10 aktionsbasierte MCP-Tools" />
  <img src="https://img.shields.io/badge/Lizenz-MIT-fcd34d?style=flat-square" alt="MIT Lizenz" />
</p>

<p align="center">
  <a href="#überblick">Überblick</a>
  ·
  <a href="#features">Features</a>
  ·
  <a href="#architektur">Architektur</a>
  ·
  <a href="#schnellstart">Schnellstart</a>
  ·
  <a href="#installation">Installation</a>
  ·
  <a href="#tools-referenz">Tools</a>
  ·
  <a href="#sicherheitsmodell">Sicherheit</a>
  ·
  <a href="#lokale-entwicklung">Entwicklung</a>
</p>

![awesome-coolify-mcp — Coolify aus jedem MCP-Client betreiben](docs/assets/social-preview.png)

---

## Überblick

Self-hosted [Coolify](https://coolify.io) ist eine starke PaaS-Alternative — aber der Betrieb aus einem AI-Coding-Agenten bedeutet oft überlappende MCP-Server, inkonsistente Schemas und 60+ Einzeltools.

**awesome-coolify-mcp** ist ein community-fokussierter MCP-Server für die Coolify REST API **4.1.x** mit **aktionsbasierter** Tool-Oberfläche:

| Vorher | Mit awesome-coolify-mcp |
|--------|-------------------------|
| Coolify CLI MCP + `user-coolify` + `coolify-backup-mcp` | Ein Server, ein Schema |
| Dutzende granulare Tools pro Ressource | **10 Domänen-Tools** × `action`-Discriminator |
| Ad-hoc Fehlermeldungen | Strukturierte Codes (`COOLIFY_401`, …) + Recovery-Hints |
| Secrets leicht im Agent-Kontext | Default-Maskierung + Emergency-Confirm-Gates |

v1 ist **Ops-first**: Connectivity prüfen, Ressourcen finden, deployen und Status beobachten, Logs ziehen, Apps/Server diagnostizieren, Fleet scannen und gated Emergency-Actions ausführen. Create/Delete-CRUD folgt in v2.

> [!NOTE]
> Community-Projekt für self-hosted Coolify. **Nicht offiziell mit Coolify Labs verbunden.**

---

## Features

![Feature-Highlights: Action-Tools, Safety Gates, Diagnose, Deploy und Logs](docs/assets/features.png)

- **Aktionsbasierte Tools in 10 Domänen** — z.B. `application({ action: "deploy", uuid })` statt Dutzender Tool-Namen.
- **Ops-Workflows für echte Incidents** — Infrastructure-Overview, Fuzzy-`resource.find`, App-/Server-Diagnose, Fleet-`diagnose.scan` nach Severity.
- **Deploy-Lifecycle** — Start/Stop/Restart, Deploy mit optionalem Wait/Poll und Force-Rebuild, Deployment list/get/cancel, begrenzte Runtime-/Build-Logs.
- **Service- & Database-Lifecycle** — Start/Stop/Restart/Get (Service-Redeploy mit optionalem Image-Pull).
- **Safety by default** — Emergency-Mutationen brauchen `confirm: true`; sensible Keys als `***`, Klartext nur mit `reveal: true`.
- **Agent-freundliche Fehler** — parsebare Envelopes mit `code`, `message`, `recoveryHints` und Retry bei transienten 429/5xx/Netzwerkfehlern.
- **Breite Client-Abdeckung** — Cursor, VS Code / Copilot, Claude Desktop, Claude Code, Windsurf, plus 15+ Hosts über den [Install-Konfigurator](docs/install.html).

---

## Architektur

![Architektur: MCP-Clients → awesome-coolify-mcp Domänen-Tools → Coolify API 4.1.x](docs/assets/architecture.png)

```text
MCP-Client (Cursor / Claude / VS Code / …)
        │  stdio MCP
        ▼
awesome-coolify-mcp  (10 Domänen-Tools + action)
        │  HTTPS Bearer-Token
        ▼
Coolify REST API 4.1.x  (Server · Projekte · Apps · Services · Datenbanken)
```

Der **Host** injiziert `COOLIFY_URL` und `COOLIFY_TOKEN` über den MCP-Config-`env`-Block. Der Server liest die IDE-Config nie selbst — nur Prozess-Environment (und optional lokale `.env` für CLI-Läufe).

---

## Schnellstart

**Voraussetzungen**

- Node.js **20+**
- Self-hosted Coolify **4.1.x**
- API-Token aus Coolify → **Keys & Tokens** ([Authorization-Docs](https://coolify.io/docs/api-reference/authorization))

```bash
npx -y awesome-coolify-mcp
```

Credentials im MCP-Host setzen (siehe [Installation](#installation)). Minimaler Smoke nach Connect:

```js
meta({ action: "version" })
system({ action: "verify" })
system({ action: "infrastructure_overview" })
```

> [!IMPORTANT]
> Emergency-Actions (`stop_all`, `redeploy_project`, `restart_project`) erfordern `confirm: true`. Zuerst **ohne** Confirm für die `would_affect`-Vorschau — keine Mutation. `reveal: true` nur bei echtem Bedarf an Klartext-Secrets.

---

## Installation

Drei gleichwertige Wege: One-Click-Deeplink, Browser-Konfigurator oder manuelles JSON.

### 1. One-Click-Deeplink

Ideal mit fertigen Credentials (Platzhalter OK — Secrets besser über den Konfigurator):

| Client | Install |
|--------|---------|
| **Cursor** | [awesome-coolify-mcp zu Cursor hinzufügen](cursor://anysphere.cursor-deeplink/mcp/install?name=awesome-coolify-mcp&config=eyJhd2Vzb21lLWNvb2xpZnktbWNwIjp7ImNvbW1hbmQiOiJucHgiLCJhcmdzIjpbIi15IiwiYXdlc29tZS1jb29saWZ5LW1jcCJdLCJlbnYiOnsiQ09PTElGWV9VUkwiOiJodHRwczovL2Nvb2xpZnkuZXhhbXBsZS5jb20iLCJDT09MSUZZX1RPS0VOIjoiWU9VUl9DT09MSUZZX0FQSV9UT0tFTiJ9fX0=) |
| **VS Code / GitHub Copilot** | [Install via vscode:mcp/install](vscode:mcp/install?name=awesome-coolify-mcp&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22awesome-coolify-mcp%22%5D%2C%22env%22%3A%7B%22COOLIFY_URL%22%3A%22https%3A%2F%2Fcoolify.example.com%22%2C%22COOLIFY_TOKEN%22%3A%22YOUR_COOLIFY_API_TOKEN%22%7D%7D) |

### 2. Install-Konfigurator (GitHub Pages)

Mit dem **[Browser-Konfigurator](docs/install.html)** `COOLIFY_URL` / `COOLIFY_TOKEN` eingeben und client-spezifische Snippets erzeugen (JSON, TOML, YAML, …).

Alles läuft **client-seitig im Browser** — Tokens gehen nie an ein Backend.

### 3. Manuelle MCP-Config

In die MCP-Config des Hosts einfügen. Cursor-Beispiel (`~/.cursor/mcp.json` oder Projekt-`.cursor/mcp.json`):

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

---

## Unterstützte Clients

| Client | Config-Pfad | Hinweis |
|--------|-------------|---------|
| **Cursor** | `~/.cursor/mcp.json` | Deeplink oder manuelles JSON |
| **VS Code / GitHub Copilot** | `.vscode/mcp.json` | Native `inputs` für URL/Token |
| **Claude Desktop** | `claude_desktop_config.json` | Manuelles JSON oder Konfigurator (kein `.mcpb` in v1) |
| **Claude Code** | `~/.claude.json` oder `.mcp.json` | stdio via `npx -y awesome-coolify-mcp` |
| **Windsurf** | `~/.codeium/windsurf/mcp_config.json` | Gleiches npx + env Pattern |

**Vollständige 15+ Client-Matrix** (OpenCode, Codex CLI, Gemini CLI, Cline, Hermes, Kimi Code u.a.): [Install-Konfigurator](docs/install.html).

> [!NOTE]
> Claude Desktop in diesem Release nur als manuelles JSON / Konfigurator-Output — noch kein `.mcpb`-Bundle.

---

## Umgebungsvariablen

| Variable | Pflicht | Standard | Beschreibung |
|----------|---------|----------|--------------|
| `COOLIFY_URL` | ja | — | Coolify-Basis-URL (ohne trailing slash), z.B. `https://coolify.example.com` |
| `COOLIFY_TOKEN` | ja | — | Bearer API-Token (team-scoped) |
| `COOLIFY_VERIFY_SSL` | nein | `true` | Nur in Dev auf `false` bei Self-Signed-Zerts |
| `COOLIFY_MCP_LOG` | nein | `info` | `debug` · `info` · `error` |

Tokens aus Prozess-Env (IDE MCP `env`) oder optionaler `.env` für lokale CLI. Sie erscheinen **nie** in Tool-Responses.

---

## Tools-Referenz

Jede Domäne = **ein MCP-Tool** mit `action`-Discriminator.

Beispiel:

```js
system({ action: "health" })
application({ action: "deploy", uuid: "<app-uuid>", wait: true })
emergency({ action: "stop_all", confirm: true })
```

### `system` — Connectivity & Overview

| Action | Zweck |
|--------|-------|
| `health` | Coolify-API-Erreichbarkeit prüfen |
| `version` | Coolify-Instanzversion |
| `verify` | Authentifizieren; Connectivity + Version |
| `infrastructure_overview` | Aggregierte Counts: Server, Projekte, Apps, Services, Datenbanken |

### `meta` — Server-Identität

| Action | Zweck |
|--------|-------|
| `version` | awesome-coolify-mcp Paketname + Semver (kein Coolify-Call) |

### `resource` — Discovery

| Action | Zweck |
|--------|-------|
| `list` | Applications, Services, Datenbanken mit Summary-Projektionen + Pagination `_meta` |
| `find` | Fuzzy-Suche über Server und Ressourcen (gerankt, begrenzt) |

### `diagnose` — Untersuchung

| Action | Zweck |
|--------|-------|
| `app` | App-Status, Health, Env, letzte Deployments |
| `server` | Server-Ressourcen, Domains, Erreichbarkeit |
| `scan` | Fleet-weite Issues nach Severity |

### `application` — App-Ops

| Action | Zweck |
|--------|-------|
| `get` | Detaillierte Application-Konfiguration |
| `start` / `stop` / `restart` | Container-Lifecycle |
| `deploy` | Deploy auslösen (optional Wait/Poll, Force-Rebuild) |
| `logs` | Paginierte Runtime- oder Build-Logs (begrenzt) |

### `deployment` — Deploy-Tracking

| Action | Zweck |
|--------|-------|
| `list` | Deployments einer Application |
| `get` | Status, Commit, Details |
| `cancel` | Laufendes Deployment abbrechen |

### `service` / `database` — Sidecar-Lifecycle

| Tool | Actions |
|------|---------|
| `service` | `get`, `start`, `stop`, `restart`, `deploy` (optional Image-Pull) |
| `database` | `get`, `start`, `stop`, `restart` |

### `docs` — Offline-Guides

| Action | Zweck |
|--------|-------|
| `search` | Bundled Coolify-Guides durchsuchen (lokaler Index, kein Live-Web-Fetch) |

### `emergency` — High-Impact-Ops (gated)

| Action | Zweck |
|--------|-------|
| `stop_all` | Alle laufenden Applications fleet-weit stoppen — **`confirm: true`** |
| `redeploy_project` | Alle Apps eines Projekts redeployen — **`confirm: true`** |
| `restart_project` | Alle Apps eines Projekts neu starten — **`confirm: true`** |

---

## Sicherheitsmodell

### Confirm-Gate

Destruktive **Emergency**-Actions sind gated:

1. Aufruf ohne / mit `confirm: false` → `would_affect`-Vorschau (`COOLIFY_CONFIRM_REQUIRED`) — **keine Mutation**.
2. Erneut mit `confirm: true` → Ausführung.

Normale App-/Service-/Database-Mutationen (Start/Stop/Deploy, …) liegen **nicht** hinter diesem Gate — sie folgen der Coolify-API.

### Secret-Masking

- Keys mit `password`, `token`, `secret`, `private` oder `env` erscheinen standardmäßig als `***`.
- `reveal: true` nur bei explizitem Bedarf an Klartext.
- **Log-Zeileninhalt wird nicht maskiert** — rohe Logs nicht dauerhaft in Agent-Memory oder öffentliche Tickets legen.

---

## Strukturierte Fehler & Retries

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
| `COOLIFY_CONFIRM_REQUIRED` | Emergency-Vorschau — `confirm: true` zum Fortfahren |
| `COOLIFY_AMBIGUOUS_MATCH` | Name matcht mehrere Ressourcen — UUID wählen |

Transiente Fehler (429, 5xx, Netzwerk): Retry bis **3×**, exponentielles Backoff (`1s → 2s → 4s`).

---

## Beispiel-Agent-Workflows

**„Ist Coolify erreichbar und was habe ich?“**

```js
system({ action: "verify" })
system({ action: "infrastructure_overview" })
resource({ action: "list" })
```

**„Nginx-App finden, deployen, Logs zeigen.“**

```js
resource({ action: "find", query: "nginx" })
application({ action: "deploy", uuid: "<uuid>", wait: true })
application({ action: "logs", uuid: "<uuid>" })
```

**„Irgendwas stimmt fleet-weit nicht.“**

```js
diagnose({ action: "scan" })
diagnose({ action: "app", uuid: "<suspect>" })
diagnose({ action: "server", uuid: "<server>" })
```

**„Emergency-Stop (erst Preview).“**

```js
emergency({ action: "stop_all" })                 // Preview
emergency({ action: "stop_all", confirm: true })  // Ausführen
```

---

## Was in v1 ist / was folgt

| In v1 (shipped) | Deferred auf v2+ |
|-----------------|------------------|
| Ops: Deploy, Logs, Diagnose, Overview | Create/Delete-CRUD für Apps/Services/DBs/Server |
| Aktionsbasierte 10-Tool-Oberfläche | Volle Parität mit jedem Legacy-MCP-Endpoint |
| Strukturierte Fehler + Retries | Env-Var-Sync-Workflows |
| Secret-Masking + Emergency-Confirm | Breitere Multi-Instance-Runtime-UX |
| npm-`npx`-Distribution + Install-Docs | Claude Desktop `.mcpb`-Packaging |

---

## Lokale Entwicklung

```bash
git clone https://github.com/clezcoding/awesome-coolify-mcp.git
cd awesome-coolify-mcp
npm install
npm run build    # tsup → dist/
npm test         # vitest
npm run dev      # Watch-Modus
```

Logs nur auf **stderr** — stdout ist für das MCP-Protokoll reserviert.

Maintainer-Publish-Flow (`build` → `pack --dry-run` → `publish`) in [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Links

| Ressource | URL |
|-----------|-----|
| Install-Konfigurator | [docs/install.html](docs/install.html) |
| Beispiel-MCP-JSON | [docs/mcp.example.json](docs/mcp.example.json) |
| Brand Assets | [docs/assets/](docs/assets/) |
| Coolify | [coolify.io](https://coolify.io) |
| MCP-Spezifikation | [modelcontextprotocol.io](https://modelcontextprotocol.io) |
| Issues | [GitHub Issues](https://github.com/clezcoding/awesome-coolify-mcp/issues) |
