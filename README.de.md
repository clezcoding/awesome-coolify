<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/clezcoding/awesome-coolify@main/docs/assets/hero-banner.png" alt="awesome-coolify-mcp — ein freundliches Maskottchen neben einem leuchtenden Dashboard mit Server-Fleet, Terminal, Deploy-Pfeil und Safety-Shield" width="100%" />
</p>

<h1 align="center">awesome-coolify-mcp</h1>

<p align="center">
  <strong>Ein MCP-Server. Jede self-hosted Coolify-Instanz, die du betreibst.</strong><br />
  Connectivity prüfen, Fleet entdecken, deployen, Logs verfolgen, Incidents diagnostizieren und gated Emergency-Ops ausführen —<br />
  direkt aus Cursor, Claude, VS Code, Windsurf oder jedem MCP-fähigen Agenten.
</p>

<p align="center">
  <a href="README.md">🇬🇧 English</a>
  ·
  <a href="https://coolify.io">Coolify</a>
  ·
  <a href="https://modelcontextprotocol.io">Model Context Protocol</a>
  ·
  <a href="https://clezcoding.github.io/awesome-coolify/install.html">Install-Konfigurator ↗</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/awesome-coolify-mcp"><img src="https://img.shields.io/npm/v/awesome-coolify-mcp.svg?style=flat-square&color=6b16ed" alt="npm Version" /></a>
  <a href="https://www.npmjs.com/package/awesome-coolify-mcp"><img src="https://img.shields.io/npm/dm/awesome-coolify-mcp.svg?style=flat-square&color=6b16ed" alt="npm Downloads" /></a>
  <img src="https://img.shields.io/badge/Node.js-%3E%3D20-3c873a?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js >= 20" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Coolify%20API-4.1.x-6b16ed?style=flat-square" alt="Coolify API 4.1.x" />
  <img src="https://img.shields.io/badge/MCP-10%20Tools%20·%2032%20Actions-181818?style=flat-square" alt="10 Domänen-Tools, 32 Actions" />
  <a href="LICENSE"><img src="https://img.shields.io/badge/Lizenz-MIT-fcd34d?style=flat-square" alt="MIT Lizenz" /></a>
  <a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-6b16ed?style=flat-square" alt="PRs willkommen" /></a>
</p>

<p align="center">
  <a href="#-überblick">Überblick</a> ·
  <a href="#-warum-awesome-coolify-mcp">Warum</a> ·
  <a href="#-features">Features</a> ·
  <a href="#-architektur">Architektur</a> ·
  <a href="#-schnellstart">Schnellstart</a> ·
  <a href="#-installation">Installation</a> ·
  <a href="#-tools-referenz">Tools</a> ·
  <a href="#-sicherheitsmodell">Sicherheit</a> ·
  <a href="#-demnächst">Roadmap</a>
</p>

<p align="center">
  <a href="https://cursor.com/en/install-mcp?name=awesome-coolify-mcp&config=eyJhd2Vzb21lLWNvb2xpZnktbWNwIjp7ImNvbW1hbmQiOiJucHgiLCJhcmdzIjpbIi15IiwiYXdlc29tZS1jb29saWZ5LW1jcCJdLCJlbnYiOnsiQ09PTElGWV9VUkwiOiJodHRwczovL2Nvb2xpZnkuZXhhbXBsZS5jb20iLCJDT09MSUZZX1RPS0VOIjoiWU9VUl9DT09MSUZZX0FQSV9UT0tFTiJ9fX0=">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://cursor.com/deeplink/mcp-install-dark.svg" />
      <source media="(prefers-color-scheme: light)" srcset="https://cursor.com/deeplink/mcp-install-light.svg" />
      <img src="https://cursor.com/deeplink/mcp-install-dark.svg" alt="awesome-coolify-mcp zu Cursor hinzufügen" height="40" />
    </picture>
  </a>
  &nbsp;&nbsp;
  <a href="vscode:mcp/install?name=awesome-coolify-mcp&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22awesome-coolify-mcp%22%5D%2C%22env%22%3A%7B%22COOLIFY_URL%22%3A%22https%3A%2F%2Fcoolify.example.com%22%2C%22COOLIFY_TOKEN%22%3A%22YOUR_COOLIFY_API_TOKEN%22%7D%7D">
    <img src="https://img.shields.io/badge/VS_Code-MCP_Server_installieren-0098FF?style=for-the-badge&logo=visualstudiocode&logoColor=white" alt="awesome-coolify-mcp in VS Code installieren" height="40" />
  </a>
</p>

<p align="center"><sub>One-Click-Installs mit Platzhalter-Credentials — Details unter <a href="#-installation">Installation</a>, oder den <a href="https://clezcoding.github.io/awesome-coolify/install.html">Browser-Konfigurator</a> nutzen, um echte Werte sicher einzutragen.</sub></p>

---

## 📋 Inhaltsverzeichnis

- [Überblick](#-überblick)
- [Warum awesome-coolify-mcp](#-warum-awesome-coolify-mcp)
- [Features](#-features)
- [Architektur](#-architektur)
- [Schnellstart](#-schnellstart)
- [Installation](#-installation)
  - [1. One-Click-Deeplink](#1-one-click-deeplink)
  - [2. Install-Konfigurator](#2-install-konfigurator-github-pages)
  - [3. Manuelle MCP-Config](#3-manuelle-mcp-config)
- [Unterstützte Clients](#-unterstützte-clients)
- [Umgebungsvariablen](#-umgebungsvariablen)
- [Tools-Referenz](#-tools-referenz)
- [Sicherheitsmodell](#-sicherheitsmodell)
- [Strukturierte Fehler & Retries](#-strukturierte-fehler--retries)
- [Beispiel-Agent-Workflows](#-beispiel-agent-workflows)
- [Status heute](#-status-heute)
- [Demnächst](#-demnächst)
- [Lokale Entwicklung](#-lokale-entwicklung)
- [Links](#-links)

---

## 🔭 Überblick

Self-hosted [Coolify](https://coolify.io) ist eine der besten Open-Source-Alternativen zu Heroku- oder Vercel-artigen PaaS-Plattformen — aber die Anbindung an einen AI-Coding-Agenten bedeutete bisher oft, mehrere kleine, überlappende Community-MCP-Integrationen zusammenzustecken, jede mit eigenem Schema, eigenem Fehlerformat und eigener Vorstellung davon, was „sicher" bedeutet.

**awesome-coolify-mcp** ersetzt diesen Flickenteppich durch einen einzigen, community-gepflegten MCP-Server, der mit Coolifys REST API **4.1.x** über eine klare, **aktionsbasierte** Tool-Oberfläche spricht. Statt Dutzende fast identischer Tool-Namen zu merken, ruft dein Agent eine Handvoll Domänen-Tools mit einem `action`-Feld auf:

```js
application({ action: "deploy", uuid: "<app-uuid>", wait: true })
diagnose({ action: "scan" })
emergency({ action: "stop_all", confirm: true })
```

Unter der Haube läuft jeder Call durch dieselbe Pipeline: Zod-validierte Eingaben, ein Retry-fähiger HTTP-Client, secret-bewusste Output-Maskierung und strukturierte Fehler-Envelopes mit Recovery-Hints — dein Agent scheitert also nachvollziehbar, statt zu raten.

> [!NOTE]
> Dies ist ein Community-Projekt für Leute, die ihre eigene Coolify-Instanz betreiben. **Nicht offiziell mit Coolify Labs verbunden oder von ihnen unterstützt.**

---

## 🆚 Warum awesome-coolify-mcp

| Typisches Setup ohne awesome-coolify-mcp | Mit awesome-coolify-mcp |
|--------------------------------------------|--------------------------|
| Mehrere überlappende Community-MCP-Tools, jedes mit eigenem Schema | **Ein Server, ein konsistentes Schema** |
| Dutzende granulare Einzeltools pro Ressource | **10 Domänen-Tools** × `action`-Discriminator (32 Actions insgesamt) |
| Ad-hoc Fehlermeldungen, die der Agent selbst deuten muss | Strukturierte Codes (`COOLIFY_401`, `COOLIFY_404`, …) + maschinenlesbare Recovery-Hints |
| Secrets können direkt im Agent-Kontext landen | Default-Maskierung + Confirm-Gates auf destruktiven Actions |
| Rohes JSON durchwühlen, um zu sehen, was sich geändert hat | Begrenzte, paginierte Projektionen, abgestimmt auf LLM-Context-Fenster |

Der Fokus liegt heute klar auf **Day-2-Operations**: Connectivity prüfen, herausfinden, was man hat, deployen und beobachten, Logs ziehen, kranke Apps und Server diagnostizieren, die ganze Fleet nach Problemen scannen und im Ernstfall gated Emergency-Actions ausführen. Komplett neue Applications, Services und Datenbanken von Grund auf anzulegen ist in Arbeit — siehe [Demnächst](#-demnächst).

---

## ✨ Features

<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/clezcoding/awesome-coolify@main/docs/assets/features.png" alt="Feature-Highlights: aktionsbasierte Tools, Safety Gates, Diagnose, Deploy und Logs" width="100%" />
</p>

- **Aktionsbasierte Tools in 10 Domänen** — z. B. `application({ action: "deploy", uuid })` statt Dutzende Tool-Namen zu durchsuchen. Jede Domäne (`system`, `resource`, `diagnose`, `application`, `deployment`, `service`, `database`, `emergency`, `docs`, `meta`) folgt derselben Form.
- **Ops-Workflows, die echte Incidents abbilden** — ein `system.infrastructure_overview`-Call für den Gesamtüberblick, Fuzzy-`resource.find`, wenn du nur noch einen Namen oder eine Domain im Kopf hast, `diagnose.app` / `diagnose.server` für einen konkreten Verdächtigen und `diagnose.scan`, wenn du nur weißt, dass irgendetwas fleet-weit nicht stimmt.
- **Deploy-Lifecycle, den Agenten wirklich steuern können** — Start/Stop/Restart, Deploy mit optionalem Wait-and-Poll oder Force-Rebuild, Deployment list/get/cancel und begrenzte Runtime- oder Build-Logs, die dein Context-Fenster nicht sprengen.
- **Service- & Database-Lifecycle** — Start/Stop/Restart/Get, plus Service-Redeploy mit optionalem frischem Image-Pull.
- **Safety by default, nicht per Konvention** — Emergency-Mutationen brauchen explizit `confirm: true`; sensible Keys (`password`, `token`, `secret`, `private`, `env`) erscheinen als `***`, außer du aktivierst `reveal: true`.
- **Agent-freundliche Fehlerfälle** — jeder Fehler ist ein parsebares Envelope mit `code`, menschenlesbarer `message` und `recoveryHints`; transiente Netzwerk-/429-/5xx-Fehler werden automatisch mit exponentiellem Backoff wiederholt.
- **Breite Client-Abdeckung von Anfang an** — Cursor, VS Code / GitHub Copilot, Claude Desktop, Claude Code, Windsurf und 15+ weitere über den [Install-Konfigurator](https://clezcoding.github.io/awesome-coolify/install.html).

---

## 🏗️ Architektur

<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/clezcoding/awesome-coolify@main/docs/assets/architecture.png" alt="Architektur: MCP-Clients sprechen mit den Domänen-Tools von awesome-coolify-mcp, die mit der Coolify REST API 4.1.x sprechen" width="100%" />
</p>

```text
MCP-Client (Cursor / Claude / VS Code / …)
        │  stdio MCP
        ▼
awesome-coolify-mcp  (10 Domänen-Tools + action-Discriminator)
        │  HTTPS + Bearer-Token
        ▼
Coolify REST API 4.1.x  (Server · Projekte · Applications · Services · Datenbanken)
```

Der Server selbst ist bewusst unspektakulär: Er hält keinen langlebigen State und rührt nie an deinen IDE-Config-Dateien. Dein **MCP-Host** (Cursor, Claude, VS Code, …) injiziert `COOLIFY_URL` und `COOLIFY_TOKEN` über den `env`-Block seiner MCP-Config; der Prozess liest sie aus seiner Umgebung (oder optional aus einer lokalen `.env`, wenn du ihn direkt über die CLI startest) und leitet authentifizierte Requests per HTTPS an deine Coolify-Instanz weiter.

---

## 🚀 Schnellstart

**Voraussetzungen**

- Node.js **20+**
- Eine self-hosted Coolify-Instanz auf **4.1.x**
- Ein API-Token aus Coolify → **Keys & Tokens** ([Authorization-Docs](https://coolify.io/docs/api-reference/authorization))

Direkt per `npx` starten — keine globale Installation nötig:

```bash
npx -y awesome-coolify-mcp
```

Die beiden benötigten Umgebungsvariablen in deinem MCP-Host setzen (siehe [Installation](#-installation) für jeden Client). Nach dem Verbinden sieht ein minimaler Smoke-Test so aus:

```js
meta({ action: "version" })                       // Server-Identität — kein Coolify-Call
system({ action: "verify" })                      // Authentifizieren + Connectivity-Check
system({ action: "infrastructure_overview" })     // Server, Projekte, Apps, Services, DBs auf einen Blick
```

> [!IMPORTANT]
> Emergency-Actions (`stop_all`, `redeploy_project`, `restart_project`) erfordern `confirm: true`. Ruf sie zuerst **ohne** `confirm` auf — du bekommst eine `would_affect`-Vorschau, es findet keine Mutation statt. `reveal: true` nur setzen, wenn du wirklich Klartext-Secrets brauchst.

---

## 📦 Installation

Es gibt drei gleichwertig unterstützte Wege — wähle, was zu deinem Workflow passt.

### 1. One-Click-Deeplink

Am besten, wenn du deine Coolify-URL und dein Token schon zur Hand hast. Platzhalter-Credentials funktionieren auch — du wirst zum Ausfüllen aufgefordert oder kannst sie später tauschen.

<p align="center">
  <a href="https://cursor.com/en/install-mcp?name=awesome-coolify-mcp&config=eyJhd2Vzb21lLWNvb2xpZnktbWNwIjp7ImNvbW1hbmQiOiJucHgiLCJhcmdzIjpbIi15IiwiYXdlc29tZS1jb29saWZ5LW1jcCJdLCJlbnYiOnsiQ09PTElGWV9VUkwiOiJodHRwczovL2Nvb2xpZnkuZXhhbXBsZS5jb20iLCJDT09MSUZZX1RPS0VOIjoiWU9VUl9DT09MSUZZX0FQSV9UT0tFTiJ9fX0=">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://cursor.com/deeplink/mcp-install-dark.svg" />
      <source media="(prefers-color-scheme: light)" srcset="https://cursor.com/deeplink/mcp-install-light.svg" />
      <img src="https://cursor.com/deeplink/mcp-install-dark.svg" alt="awesome-coolify-mcp zu Cursor hinzufügen" height="40" />
    </picture>
  </a>
  &nbsp;&nbsp;
  <a href="vscode:mcp/install?name=awesome-coolify-mcp&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22awesome-coolify-mcp%22%5D%2C%22env%22%3A%7B%22COOLIFY_URL%22%3A%22https%3A%2F%2Fcoolify.example.com%22%2C%22COOLIFY_TOKEN%22%3A%22YOUR_COOLIFY_API_TOKEN%22%7D%7D">
    <img src="https://img.shields.io/badge/VS_Code-MCP_Server_installieren-0098FF?style=for-the-badge&logo=visualstudiocode&logoColor=white" alt="awesome-coolify-mcp in VS Code installieren" height="40" />
  </a>
</p>

<details>
<summary><strong>Wie diese Links funktionieren</strong> (zum Aufklappen)</summary>
<br />

Beide Editoren implementieren einen Protocol-Handler, der eine JSON-Server-Konfiguration direkt aus der URL liest:

| Client | Schema | Encoding |
|--------|--------|----------|
| **Cursor** | `cursor://anysphere.cursor-deeplink/mcp/install?name=…&config=…` (gespiegelt unter `https://cursor.com/en/install-mcp?…` als freundlichere Landingpage) | `config` ist base64-kodiertes JSON |
| **VS Code / Copilot** | `vscode:mcp/install?name=…&config=…` | `config` ist URL-kodiertes JSON |

Ein Klick auf den Button öffnet deinen Editor, zeigt den Server, der hinzugefügt werden soll, und lässt dich Command/Env vor der Bestätigung prüfen oder bearbeiten — nichts wird stillschweigend installiert.
</details>

### 2. Install-Konfigurator (GitHub Pages)

Mit dem **[Browser-Konfigurator](https://clezcoding.github.io/awesome-coolify/install.html)** deine echte `COOLIFY_URL` / `COOLIFY_TOKEN` eintragen und ein fertiges Snippet für deinen exakten Client erzeugen — JSON, TOML oder YAML, je nachdem, was der Client erwartet.

Alles läuft **client-seitig im Browser**. Dein Token wird nie an ein Backend gesendet, geloggt oder irgendwo gespeichert außer in der Config-Datei, in die du es einfügst.

### 3. Manuelle MCP-Config

In die MCP-Konfigurationsdatei deines Hosts einfügen. Cursor-Beispiel (`~/.cursor/mcp.json` global oder `.cursor/mcp.json` im Projekt):

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

Eine fertige Copy-Paste-Vorlage liegt außerdem unter [`docs/mcp.example.json`](docs/mcp.example.json).

---

## 🖥️ Unterstützte Clients

| Client | Config-Pfad | Hinweis |
|--------|-------------|---------|
| **Cursor** | `~/.cursor/mcp.json` | One-Click-Deeplink oder manuelles JSON |
| **VS Code / GitHub Copilot** | `.vscode/mcp.json` | Native `inputs`-Prompts für URL/Token — kein Klartext in der Datei |
| **Claude Desktop** | `claude_desktop_config.json` | Aktuell manuelles JSON oder Konfigurator-Output |
| **Claude Code** | `~/.claude.json` oder `.mcp.json` | stdio via `npx -y awesome-coolify-mcp` |
| **Windsurf** | `~/.codeium/windsurf/mcp_config.json` | Gleiches `npx` + `env`-Pattern wie Cursor |

Der **[Install-Konfigurator](https://clezcoding.github.io/awesome-coolify/install.html)** deckt eine deutlich breitere Matrix ab — OpenCode, Codex CLI, Gemini CLI, Cline, Kilo Code, Goose, LM Studio, Hermes Agent, Kimi Code, Google Antigravity, OpenClaw und mehr — jeweils mit der passenden Config-Form.

> [!NOTE]
> Claude Desktop läuft derzeit nur über manuelles JSON / Konfigurator-Output — ein dediziertes `.mcpb`-Bundle steht auf der Roadmap (siehe [Demnächst](#-demnächst)).

---

## 🔐 Umgebungsvariablen

| Variable | Pflicht | Standard | Beschreibung |
|----------|---------|----------|--------------|
| `COOLIFY_URL` | ja | — | Coolify-Basis-URL, ohne trailing slash — z. B. `https://coolify.example.com` |
| `COOLIFY_TOKEN` | ja | — | Bearer-API-Token, team-scoped |
| `COOLIFY_VERIFY_SSL` | nein | `true` | Nur auf `false` setzen bei Self-Signed-Zerts auf lokalen/Dev-Instanzen |
| `COOLIFY_MCP_LOG` | nein | `info` | Log-Level: `debug` · `info` · `error` |

Credentials werden aus der Prozess-Umgebung gelesen (dem `env`-Block deiner IDE-MCP-Config) oder optional aus einer lokalen `.env`, wenn du die CLI direkt startest. Sie erscheinen **nie** in Tool-Responses.

---

## 🧰 Tools-Referenz

Jede Domäne ist **ein MCP-Tool** mit `action`-Discriminator — die Tool-Liste deines Agenten bleibt kurz, während die Funktionsbreite groß bleibt.

```js
system({ action: "health" })
application({ action: "deploy", uuid: "<app-uuid>", wait: true })
emergency({ action: "stop_all", confirm: true })
```

### 🖥️ `system` — Connectivity & Overview

Dein erster Call in jeder Session: Ist Coolify erreichbar, und wie sieht die Fleet gerade aus?

| Action | Zweck |
|--------|-------|
| `health` | Coolify-API-Erreichbarkeit prüfen |
| `version` | Coolify-Instanzversion |
| `verify` | Authentifizieren; liefert Connectivity + Version in einem Call |
| `infrastructure_overview` | Aggregierte Counts über Server, Projekte, Applications, Services, Datenbanken |

### 🏷️ `meta` — Server-Identität

| Action | Zweck |
|--------|-------|
| `version` | awesome-coolify-mcps eigener Paketname + Semver — kein Coolify-Call |

### 🔎 `resource` — Discovery

Für den Fall, dass du ungefähr weißt, was du suchst, aber nicht die exakte UUID.

| Action | Zweck |
|--------|-------|
| `list` | Applications, Services und Datenbanken als Summary-Projektionen, mit Pagination `_meta` |
| `find` | Fuzzy-Suche nach Name, Domain oder IP über Server und Ressourcen — gerankt, begrenzt auf 10 |

### 🩺 `diagnose` — Untersuchung

Das Tool, zu dem du greifst, wenn sich etwas falsch *anfühlt*, du aber noch nicht weißt, was.

| Action | Zweck |
|--------|-------|
| `app` | App-Status, Health, Anzahl Env-Vars und letzte Deployments |
| `server` | Server-Ressourcen, Domains und Erreichbarkeit |
| `scan` | Fleet-weite Issues nach Severity gruppiert — der „Was brennt gerade"-Button |

### 🚀 `application` — App-Ops

| Action | Zweck |
|--------|-------|
| `get` | Detaillierte Application-Konfiguration |
| `start` / `stop` / `restart` | Container-Lifecycle-Kontrolle |
| `deploy` | Deploy auslösen, optional mit `wait`/Poll und `force`-Rebuild |
| `logs` | Paginierte Runtime- oder Build-Logs, begrenzt, damit sie dein Context-Fenster nicht sprengen |

### 📈 `deployment` — Deploy-Tracking

| Action | Zweck |
|--------|-------|
| `list` | Deployments einer bestimmten Application |
| `get` | Status, Commit und Timing-Details eines Deployments |
| `cancel` | Laufendes Deployment saubär abbrechen |

### 🧩 `service` / `database` — Sidecar-Lifecycle

| Tool | Actions |
|------|---------|
| `service` | `get`, `start`, `stop`, `restart`, `deploy` (mit optionalem frischem Image-Pull) |
| `database` | `get`, `start`, `stop`, `restart` |

### 📚 `docs` — Offline-Guides

| Action | Zweck |
|--------|-------|
| `search` | Durchsucht einen gebündelten, kuratierten Coolify-Troubleshooting-Index — kein Live-Web-Fetch, funktioniert also offline und kann nicht als externer Fetch-Vektor missbraucht werden |

### 🚨 `emergency` — High-Impact-Ops (gated)

Nur greifen, wenn es ernst gemeint ist — jede Action unten liegt hinter einem Confirm-Gate.

| Action | Zweck |
|--------|-------|
| `stop_all` | Alle laufenden Applications fleet-weit stoppen — **erfordert `confirm: true`** |
| `redeploy_project` | Alle Apps eines Projekts redeployen — **erfordert `confirm: true`** |
| `restart_project` | Alle Apps eines Projekts neu starten — **erfordert `confirm: true`** |

---

## 🛡️ Sicherheitsmodell

### Confirm-Gate

Destruktive **Emergency**-Actions folgen einem strikten Zwei-Schritt-Muster:

1. Aufruf ohne `confirm` oder mit `false` → du bekommst eine `would_affect`-Vorschau und Fehlercode `COOLIFY_CONFIRM_REQUIRED` zurück — **nichts wird mutiert**.
2. Erneuter Aufruf mit `confirm: true` → die Action wird tatsächlich ausgeführt.

Normale App-/Service-/Database-Mutationen (Start, Stop, Deploy, …) liegen **nicht** hinter diesem Gate — sie folgen einfach der Coolify-API-Semantik, da sie auf eine einzelne Ressource statt auf deine ganze Fleet begrenzt sind.

### Secret-Maskierung

- Keys, die auf `password`, `token`, `secret`, `private` oder `env` matchen, erscheinen standardmäßig als `***` im Tool-Output.
- `reveal: true` nur setzen, wenn du explizit Klartext brauchst — etwa um eine Env-Var in ein anderes System zu kopieren.
- **Log-Zeileninhalte werden nicht maskiert.** Behandle rohe Logs wie jeden anderen sensiblen Output: nicht in langlebiges Agent-Memory oder öffentliche Tickets kopieren.

---

## ⚠️ Strukturierte Fehler & Retries

Jeder API-Fehler kommt als parsebares Envelope zurück, mit dem dein Agent arbeiten kann, statt mit einem rohen Stacktrace:

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
| `COOLIFY_CONFIRM_REQUIRED` | Emergency-Vorschau — `confirm: true` setzen, um fortzufahren |
| `COOLIFY_AMBIGUOUS_MATCH` | Name matcht mehrere Ressourcen — UUID aus der gerankten Liste wählen |

Transiente Fehler (HTTP 429, 5xx oder Netzwerkfehler) werden automatisch bis zu **3-mal** mit exponentiellem Backoff (`1s → 2s → 4s`) wiederholt, bevor der Fehler an deinen Agenten zurückgegeben wird.

---

## 💬 Beispiel-Agent-Workflows

**„Ist Coolify erreichbar, und was habe ich?"**

```js
system({ action: "verify" })
system({ action: "infrastructure_overview" })
resource({ action: "list" })
```

**„Nginx-App finden, deployen, dann Logs zeigen."**

```js
resource({ action: "find", query: "nginx" })
application({ action: "deploy", uuid: "<uuid>", wait: true })
application({ action: "logs", uuid: "<uuid>" })
```

**„Irgendwas stimmt fleet-weit nicht."**

```js
diagnose({ action: "scan" })
diagnose({ action: "app", uuid: "<suspect>" })
diagnose({ action: "server", uuid: "<server>" })
```

**„Emergency: alles stoppen, aber erst den Blast-Radius zeigen."**

```js
emergency({ action: "stop_all" })                 // Vorschau — would_affect, keine Mutation
emergency({ action: "stop_all", confirm: true })  // Ausführen
```

---

## ✅ Status heute

Der Server ist stabil und wird aktiv für Day-2-Operations gegen echte Coolify-4.1.x-Instanzen eingesetzt:

| Fähigkeit | Status |
|-----------|--------|
| Connectivity prüfen + Infrastructure-Overview | ✅ Shipped |
| Discovery: `resource.list` / `resource.find` | ✅ Shipped |
| Diagnose: App, Server, Fleet-weiter Scan + Follow-Up-Hints | ✅ Shipped |
| Deploy-Lifecycle: Start/Stop/Restart, Deploy mit Wait-Mode + Force-Rebuild | ✅ Shipped |
| Deployment-Tracking: List / Get / Cancel | ✅ Shipped |
| App-Logs: Runtime + Build, begrenzt und paginiert | ✅ Shipped |
| Service- & Database-Lifecycle | ✅ Shipped |
| Emergency-Ops: Stop-All, Projekt-Redeploy/Restart, hinter Confirm-Gate | ✅ Shipped |
| Secret-Maskierung mit explizitem `reveal`-Opt-In | ✅ Shipped |
| Strukturierte Fehler, Recovery-Hints, automatische Retries | ✅ Shipped |
| npm-Distribution + Install-Konfigurator für 15+ Clients | ✅ Shipped |

Service-/Database-Log-Tailing pausiert aktuell — Coolifys 4.1.x-REST-API bietet noch keinen `/services/{uuid}/logs`- oder `/databases/{uuid}/logs`-Endpoint (der Fix ist upstream gemerged, aber noch nicht nach 4.1.x zurückportiert). Es kommt, sobald der Endpoint erreichbar ist — kein halbfunktionierender Stub in der Zwischenzeit.

---

## 🔮 Demnächst

<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/clezcoding/awesome-coolify@main/docs/assets/coming-soon.png" alt="Das Maskottchen skizziert eine Roadmap kommender Features: Datenbanken, Scheduled Tasks, Private Keys, Teams und Cloud-Provisioning" width="100%" />
</p>

Der nächste Meilenstein dreht sich um **Erschaffen, nicht nur Betreiben** — awesome-coolify-mcp soll neue Infrastruktur von Grund auf aufbauen können, nicht nur Bestehendes verwalten. Geplante Bereiche, grob nach Priorität:

- **Vollständiges CRUD** für Applications, Services, Datenbanken und Server — anlegen, ändern und löschen, nicht nur Start/Stop/Deploy
- **Environment-Variable-Management** — lesen, schreiben, Bulk-Sync aus einer lokalen `.env`
- **One-Click-Services** — vollständiger Service-Katalog mit Compose-YAML, Storage- und Env-Konfiguration
- **Datenbank-Backups** — Schedules, Executions und On-Demand-Trigger
- **Scheduled Tasks** — Cron-Job-CRUD, Execution-History, Run-Once-Trigger
- **Teams & Multi-Tenancy** — Teams und Mitglieder listen/abrufen, projekt-scoped Tokens
- **Private Keys & Cloud-Provider** — SSH-Key-Management, Hetzner-/DigitalOcean-Provisioning-Tokens
- **GitHub-App-Integration** — Repo-/Branch-Discovery, Enterprise-URLs
- **Claude Desktop `.mcpb`-Packaging** — echtes One-Click-Install, kein manuelles JSON
- **Tiefere Observability** — Container-Level-Metriken, Traefik-Insight, Live-Event-Streams, Log-Suche

Hast du einen Use Case, der hier fehlt? Öffne ein Issue — die Roadmap richtet sich danach, worauf die Community tatsächlich stößt.

---

## 🛠️ Lokale Entwicklung

```bash
git clone https://github.com/clezcoding/awesome-coolify.git
cd awesome-coolify
npm install
npm run build    # tsup → dist/
npm test         # vitest
npm run dev      # Watch-Modus
```

Logs gehen ausschließlich auf **stderr** — stdout ist für das MCP-Protokoll reserviert.

Der Maintainer-Publish-Flow (`build` → `pack --dry-run` → `publish`) ist in [CONTRIBUTING.md](CONTRIBUTING.md) dokumentiert.

---

## 🔗 Links

| Ressource | URL |
|-----------|-----|
| Install-Konfigurator | [clezcoding.github.io/awesome-coolify/install.html](https://clezcoding.github.io/awesome-coolify/install.html) |
| Install-Landingpage | [clezcoding.github.io/awesome-coolify/](https://clezcoding.github.io/awesome-coolify/) |
| Beispiel-MCP-JSON | [docs/mcp.example.json](docs/mcp.example.json) |
| Brand Assets | [docs/assets/](docs/assets/) |
| Coolify | [coolify.io](https://coolify.io) |
| MCP-Spezifikation | [modelcontextprotocol.io](https://modelcontextprotocol.io) |
| Issues & Feature-Requests | [GitHub Issues](https://github.com/clezcoding/awesome-coolify/issues) |
| Contributing | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Lizenz | [MIT](LICENSE) |
