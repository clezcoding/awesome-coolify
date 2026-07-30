<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/clezcoding/awesome-coolify@main/docs/assets/hero-banner.png" alt="awesome-coolify-mcp — ein freundliches Maskottchen neben einem leuchtenden Dashboard mit Server-Fleet, Terminal, Deploy-Pfeil und Safety-Shield" width="100%" />
</p>

<h1 align="center">awesome-coolify-mcp</h1>

<p align="center">
  <strong>Coolify direkt aus deinem Coding-Agenten betreiben.</strong><br />
  Connectivity prüfen, Infrastruktur entdecken, Workloads erstellen, deployen, Logs verfolgen, Incidents diagnostizieren und gegatete Emergency-Ops ausführen — über eine oder viele self-hosted oder Cloud-Instanzen —<br />
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
  <img src="https://img.shields.io/badge/Node.js-%3E%3D24-3c873a?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js >= 24" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Coolify%20API-4.1.x-6b16ed?style=flat-square" alt="Coolify API 4.1.x" />
  <img src="https://img.shields.io/badge/MCP-19%20tools-181818?style=flat-square" alt="19 tools" />
  <a href="https://github.com/clezcoding/awesome-coolify/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/clezcoding/awesome-coolify/ci.yml?branch=main&style=flat-square&label=CI&color=6b16ed" alt="CI-Status" /></a>
  <a href="https://github.com/clezcoding/awesome-coolify/releases/latest"><img src="https://img.shields.io/github/v/release/clezcoding/awesome-coolify?style=flat-square&color=6b16ed" alt="Aktuelles GitHub-Release" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/Lizenz-MIT-fcd34d?style=flat-square" alt="MIT Lizenz" /></a>
</p>

<p align="center">
  <a href="#-überblick">Überblick</a> ·
  <a href="#-warum-awesome-coolify-mcp">Warum</a> ·
  <a href="#-features">Features</a> ·
  <a href="#-architektur">Architektur</a> ·
  <a href="#-schnellstart">Schnellstart</a> ·
  <a href="#-installation">Installation</a> ·
  <a href="#%EF%B8%8F-coolify-cloud">Cloud</a> ·
  <a href="#-tools-referenz">Tools</a> ·
  <a href="#-mcp-prompts">Prompts</a> ·
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
- [Coolify Cloud](#%EF%B8%8F-coolify-cloud)
- [Unterstützte Clients](#-unterstützte-clients)
- [Umgebungsvariablen](#-umgebungsvariablen)
- [MCP-Prompts](#-mcp-prompts)
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

**awesome-coolify-mcp** **1.1.1** ersetzt diesen Flickenteppich durch einen einzigen, community-gepflegten MCP-Server, der mit Coolifys REST API **4.1.x** über eine klare, **aktionsbasierte** Tool-Oberfläche spricht. Quellcode, Docs und npm-Distribution leben in einem öffentlichen Repo — [`clezcoding/awesome-coolify`](https://github.com/clezcoding/awesome-coolify) — während das installierbare Paket **`awesome-coolify-mcp`** heißt. Statt Dutzende fast identischer Tool-Namen zu merken, ruft dein Agent eines von **19 tools** mit einem `action`-Feld auf:

```js
application({ action: "deploy", uuid: "<app-uuid>", wait: false })
deployment({ action: "watch", deployment_uuid: "<deployment_uuid>", timeout: 300 })
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
| Dutzende granulare Einzeltools pro Ressource | **19 tools** mit konsistenten `action`-Discriminators |
| Ad-hoc Fehlermeldungen, die der Agent selbst deuten muss | Strukturierte Codes (`COOLIFY_401`, `COOLIFY_404`, …) + maschinenlesbare Recovery-Hints |
| Secrets können direkt im Agent-Kontext landen | Default-Maskierung + Confirm-Gates auf destruktiven Actions |
| Rohes JSON durchwühlen, um zu sehen, was sich geändert hat | Begrenzte, paginierte Projektionen, abgestimmt auf LLM-Context-Fenster |

Die ausgelieferte Oberfläche deckt Day-2-Operations und Infrastruktur-Erstellung ab: Connectivity prüfen, Fleets entdecken, Deployments starten und beobachten, begrenzte Logs lesen, Incidents diagnostizieren, gegatete Emergency-Ops ausführen sowie Applications, Services, Databases, SSH-Keys, Server, Projekte, Environments, Backups und Umgebungsvariablen verwalten.

---

## ✨ Features

<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/clezcoding/awesome-coolify@main/docs/assets/features.png" alt="Feature-Highlights: aktionsbasierte Tools, Safety Gates, Diagnose, Deploy und Logs" width="100%" />
</p>

- **18 aktionsbasierte Tools** — z. B. `application({ action: "deploy", uuid })` statt Dutzende granulare Tool-Namen zu durchsuchen. Registriert sind `system`, `meta`, `resource`, `diagnose`, `application`, `emergency`, `deployment`, `service`, `database`, `private_key`, `instance`, `manifest`, `server`, `project`, `environment`, `docs`, `recipe` und `setup`.
- **Multi-Instance-Registry & Routing** — jede Coolify-Instanz in `~/.coolify-mcp/instances.json` via `instance`-Tool registrieren; Credential-Auflösung pro Call ohne Cross-Instance-Leaks.
- **Coolify-Cloud-fähig** — `instance({ action: "cloud-info" })` für lokale Discovery, team-scoped Tokens und strukturierte Cloud-Fehlercodes (`COOLIFY_CLOUD_FORBIDDEN`, `COOLIFY_CLOUD_UNSUPPORTED`).
- **Lokaler Manifest-Cache** — `.coolify/manifest.json`-Sync via `manifest({ action: "sync" })`, Best-Effort-Auto-Hooks bei App/Service/DB-Mutationen und `_meta.manifestWarning` bei veraltetem Cache.
- **Server-Branding** — MCP-Listen-Icon via `serverInfo.icons` (eingebettete Data-URI + jsDelivr-CDN-Einträge aus `docs/assets/`).
- **Ops-Workflows, die echte Incidents abbilden** — ein `system.infrastructure_overview`-Call für den Gesamtüberblick, Fuzzy-`resource.find`, wenn du nur noch einen Namen oder eine Domain im Kopf hast, `diagnose.app` / `diagnose.server` für einen konkreten Verdächtigen und `diagnose.scan`, wenn du nur weißt, dass irgendetwas fleet-weit nicht stimmt.
- **Deploy-Lifecycle, den Agenten steuern können** — Start/Stop/Restart, Force-Rebuild, `deployment.watch` mit begrenztem Backoff, `deployment.logs` für Builds, begrenzte `application.logs` und Runtime-Follow mit Idle-/Gesamt-Timeout.
- **Volle Workload-CRUD** — Applications, Services und Databases erstellen, lesen, aktualisieren, löschen und betreiben; gültige One-Click-IDs live mit `service.list-types` ermitteln.
- **Recipes und geführtes Setup** — Git-Apps, App-plus-Datenbank-Stacks und One-Click-Services erstellen; `setup.preflight`, `setup.wire` oder `setup.resume` ausführen; vier passende IDE-Workflow-Skills installieren.
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
awesome-coolify-mcp  (19 tools + action-Discriminator)
        │  optional ~/.coolify-mcp/instances.json-Auflösung
        │  HTTPS + Bearer-Token
        ▼
Coolify REST API 4.1.x  (Server · Projekte · Applications · Services · Datenbanken)
```

Der Server selbst ist bewusst unspektakulär: Er hält keinen langlebigen State und rührt nie an deinen IDE-Config-Dateien. Dein **MCP-Host** (Cursor, Claude, VS Code, …) injiziert `COOLIFY_URL` und `COOLIFY_TOKEN` über den `env`-Block seiner MCP-Config — oder du registrierst benannte Instanzen in `~/.coolify-mcp/instances.json` via `instance`-Tool. Der Prozess liest Credentials aus der Umgebung (oder der Registry) und leitet authentifizierte Requests per HTTPS an deine Coolify-Instanz weiter.

---

## 🚀 Schnellstart

**Voraussetzungen**

- Node.js **24+** (Active LTS; CI nutzt Node 24)
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

> [!NOTE]
> **Multi-Instance-Nutzer:** jede Coolify-Instanz zuerst mit `instance({ action: "add", name, url, token })` registrieren, dann `system({ action: "verify" })` aufrufen. Single-Instance-Setups können die Registry überspringen und `COOLIFY_URL` / `COOLIFY_TOKEN` in der MCP-Env nutzen.

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

> [!TIP]
> [Coolify Cloud](https://app.coolify.io) nutzen? **Team-scoped** Token erzeugen und Registry-Setup in [docs/de/cloud.md](docs/de/cloud.md) folgen.

### IDE-Skills (Cursor, Claude Code, Codex)

Coolify-Workflow-Skills für Cursor, Claude Code und Codex installieren:

```bash
npx skills add clezcoding/awesome-coolify -a cursor -a claude-code -a codex
```

Nach MCP-Install `setup({ action: "preflight" })` ausführen oder den **[Setup-Guide](docs/en/setup.md)** für gh-Preflight, Projekt-Verknüpfung und Greenfield-Provisioning lesen.

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
> Claude Desktop nutzt derzeit manuelles JSON oder den Konfigurator-Output.

---

## 🔐 Umgebungsvariablen

| Variable | Pflicht | Standard | Beschreibung |
|----------|---------|----------|--------------|
| `COOLIFY_URL` | ja* | — | Coolify-Basis-URL, ohne trailing slash — z. B. `https://coolify.example.com` |
| `COOLIFY_TOKEN` | ja* | — | Bearer-API-Token, team-scoped |
| `COOLIFY_VERIFY_SSL` | nein | `true` | Nur auf `false` setzen bei Self-Signed-Zerts auf lokalen/Dev-Instanzen |
| `COOLIFY_MCP_LOG` | nein | `info` | Log-Level: `debug` · `info` · `error` |

Credentials werden aus der Prozess-Umgebung gelesen (dem `env`-Block deiner IDE-MCP-Config) oder optional aus einer lokalen `.env`, wenn du die CLI direkt startest. Sie erscheinen **nie** in Tool-Responses.

> [!NOTE]
> Mit der Multi-Instance-Registry (`~/.coolify-mcp/instances.json`) werden `COOLIFY_URL` und `COOLIFY_TOKEN` optional — das `instance`-Tool löst Credentials pro Call auf. Env-Vars bleiben der einfachste Weg für Single-Instance-Setups.

---

## ☁️ Coolify Cloud

**awesome-coolify-mcp** funktioniert mit [Coolify Cloud](https://app.coolify.io) mit denselben **19 tools** — team-scoped Tokens, strukturierte Cloud-Fehlercodes (`COOLIFY_CLOUD_FORBIDDEN`, `COOLIFY_CLOUD_UNSUPPORTED`) und lokale `instance`-Action `cloud-info` zur Discovery.

Rufe `instance({ action: "cloud-info" })` vor deiner ersten Cloud-Session auf — liefert `isCloud`, aufgelöste `url`, Credential-`source` (`registry` | `env` | `infer`), `knownLimits` und Docs-Link. **Kein Live-API-Call.**

Vollständiges Setup, Smoke-Test und bekannte Limits → **[docs/de/cloud.md](docs/de/cloud.md)**

---

## 💬 MCP-Prompts

Vier parametrisierte Workflow-Prompts liefern nummerierte Schritt-für-Schritt-Anleitungen (englische Texte), die bestehende Tools orchestrieren. Alle Argumente sind optional — jeder Prompt öffnet ohne Prefill.

| Prompt | Args (alle optional) | Zweck |
|--------|----------------------|-------|
| `deploy` | `instance?`, `uuid?`, `force?` | Application deployen und bis Terminal-Status überwachen |
| `diagnose` | `instance?`, `uuid?` | App-, Server- oder Fleet-weite Probleme untersuchen |
| `new-project` | `instance?`, `name?`, `server_uuid?` | Projekt, Environment und optional Server-Verknüpfung anlegen |
| `incident` | `instance?`, `uuid?`, `project_uuid?` | Triage mit diagnose, logs, restart oder emergency redeploy |

Prompt-Handler lesen `.coolify/manifest.json` nie vom Disk — sie leiten den Agenten an, UUIDs aus dem Manifest zu lösen oder den User zu fragen.

---

## 🧰 Tools-Referenz

Jede Domäne ist **ein MCP-Tool** mit `action`-Discriminator — die Tool-Liste deines Agenten bleibt kurz, während die Funktionsbreite groß bleibt.

```js
system({ action: "health" })
application({ action: "deploy", uuid: "<app-uuid>", wait: false })
deployment({ action: "watch", deployment_uuid: "<deployment_uuid>", timeout: 300 })
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
| `logs` | Application auflösen, Triage-Kontext liefern und optional begrenzte Runtime- oder Deployment-Logs einbeziehen |

### 🚀 `application` — App-Ops

| Action | Zweck |
|--------|-------|
| `get` | Detaillierte Application-Konfiguration |
| `start` / `stop` / `restart` | Container-Lifecycle-Kontrolle |
| `deploy` | Deploy auslösen, optional mit `force`-Rebuild; empfohlen: `wait: false` + `deployment.watch`, legacy: `wait: true` |
| `logs` | Begrenzte Runtime-Logs oder begrenzter Follow-Modus mit Idle- und Gesamt-Timeout |
| `envs:list` / `envs:get` | Env-Vars auflisten oder abrufen (Werte als `***` maskiert, außer mit `reveal: true`) |
| `envs:create` / `envs:update` | Einzelne Env-Vars anlegen oder aktualisieren (Flags: `is_preview`, `is_literal`, `is_multiline`, `is_shown_once`) |
| `envs:delete` | Eine Env-Var löschen — **erfordert `confirm: true`** |
| `envs:bulk-update` | Viele Env-Vars auf einmal patchen — **erfordert `confirm: true`** |
| `envs:sync` | Lokale `.env`-Datei oder Inline-Inhalt diffen/anwenden — **nur Application**; siehe [Ressourcen-Env-Vars](#-ressourcen-umgebungsvariablen-envs) |

### 📈 `deployment` — Deploy-Tracking

| Action | Zweck |
|--------|-------|
| `list` | Deployments einer bestimmten Application |
| `get` | Status, Commit und Timing-Details eines Deployments |
| `watch` | Bis Terminalstatus pollen mit begrenztem Timeout, Backoff und Jitter |
| `cancel` | Laufendes Deployment sauber abbrechen |
| `logs` | Begrenzte Build-Logs per Deployment-UUID oder vom neuesten Deployment einer Application |

### ⏱️ Beobachten — begrenztes Deploy-Monitoring

Nach `application.deploy` mit `wait: false` `deployment.watch` aufrufen — nicht manuell `deployment.get` loopen.

| Verhalten | Detail |
|-----------|--------|
| Standard-Timeout | **300 Sekunden** |
| Poll-Intervall | Start bei **3s**, Cap bei **30s** mit Equal-Jitter-Backoff |
| Timeout-Recovery | `deployment.watch` mit derselben `deployment_uuid` erneut aufrufen (`timeout` bei langsamen Builds erhöhen) |
| Failed / cancelled | Tool liefert klaren Fehler — **nicht als Erfolg werten** |
| Legacy / Kompatibilität | `application.deploy wait:true` funktioniert noch, ist aber nur Back-Compat; Watch bevorzugen |

```js
application({ action: "deploy", uuid: "<app-uuid>", wait: false })
deployment({ action: "watch", deployment_uuid: "<deployment_uuid>", timeout: 300 })
```

Die ausgelieferten IDE-Skill-Packs verwenden denselben begrenzten Watch-Flow und dokumentieren Timeout-Recovery.

### 🧩 `service` / `database` — Sidecar-Lifecycle

| Tool | Actions |
|------|---------|
| `service` | `get`, `list-types`, `create`, `update`, `delete`, `delete_preview`, `start`, `stop`, `restart`, `deploy`, `envs:list`, `envs:get`, `envs:create`, `envs:update`, `envs:delete`, `envs:bulk-update` |
| `database` | `get`, `start`, `stop`, `restart`, `create` (8 Engines), `update`, `delete`, `delete_preview`, `envs:list`, `envs:get`, `envs:create`, `envs:update`, `envs:delete`, `envs:bulk-update`, `backup:create`, `backup:list`, `backup:update`, `backup:delete`, `backup:now`, `backup:history` |

### 🍳 `recipe` — Multi-Ressourcen-Orchestrierung

Ein MCP-Call für häufige Workload-Muster — App+DB-Verdrahtung, Git-Apps oder validierte One-Click-Services.

| Action | Zweck |
|--------|-------|
| `create-git-app` | Git-Application mit lokaler `build_pack`-Erkennung (`Dockerfile` / `Dockerfile.*`-Glob) |
| `create-app-db` | Datenbank + Application erstellen und `DATABASE_URL` (oder `env_key`) verdrahten |
| `create-one-click` | One-Click-Service nach Validierung von `type` gegen live service-templates |

**Safety:** Recipe-Creates sind intentional — **kein Confirm-Gate**. Kein Dry-Run / Preview. Teilfehler **ohne** Auto-Rollback; erzeugte UUIDs in `error.data`. Connection Strings maskiert, außer `reveal: true`.

```js
recipe({ action: "create-git-app", server_uuid, git_repository, git_branch, repo_path: "/path/to/repo" })
recipe({ action: "create-app-db", server_uuid, app_name, db_name, db_engine: "postgresql" })
recipe({ action: "create-one-click", server_uuid, type: "gitea" })
```

Nutze `service.list-types`, um gültige One-Click-Type-IDs vor `create-one-click` zu laden.

### 🌱 Ressourcen-Umgebungsvariablen (`envs:*`)

Coolify-Laufzeitkonfiguration auf Applications, Services und Datenbanken über `envs:*`-Actions auf den bestehenden Domain-Tools — kein separates Env-MCP-Tool.

| Tool | `envs:*`-Actions | Hinweise |
|------|------------------|----------|
| `application` | `envs:list`, `envs:get`, `envs:create`, `envs:update`, `envs:delete`, `envs:bulk-update`, `envs:sync` | Einziges Tool mit lokalem `.env`-Sync |
| `service` | `envs:list`, `envs:get`, `envs:create`, `envs:update`, `envs:delete`, `envs:bulk-update` | Kein Sync — `.env`-Diff/Apply nur über `application` |
| `database` | `envs:list`, `envs:get`, `envs:create`, `envs:update`, `envs:delete`, `envs:bulk-update` | **`is_preview` wird nicht unterstützt** bei Database-Env-Vars (Coolify-OpenAPI-Lücke) |

**Confirm-Gates:** `envs:delete` und `envs:bulk-update` erfordern immer `confirm: true` auf allen drei Tools. Nur auf `application` erfordert `envs:sync` `confirm: true` beim Anwenden (`dry_run: false`, Standard) oder bei `prune: true`.

**Reveal-Richtlinie:** Env-Werte erscheinen standardmäßig als `***`. `reveal: true` nur setzen, wenn der Mensch explizit Klartext will — der Agent darf `reveal: true` nicht automatisch setzen.

**`envs:sync`-Semantik (nur Application):** Genau eines von `env_file` (lokaler Pfad) oder `env_content` (Inline-`.env`-Text). `dry_run: true` liefert einen Diff (`added`, `updated`, `unchanged`, `removed`, optional `conflicts`) ohne API-Writes; Standard `dry_run: false` wendet Änderungen an. Remote-Keys, die lokal fehlen, werden nie gelöscht, außer mit `prune: true` (ebenfalls `confirm: true` nötig). Wenn lokale und Remote-Werte abweichen, nach Rücksprache mit dem Menschen `conflict_policy` auf `overwrite`, `keep_remote` oder `abort` setzen — Apply mit Konflikten ohne Policy liefert `COOLIFY_CONFIRM_REQUIRED`.

```js
application({ action: "envs:list", uuid: "<app-uuid>" })
application({ action: "envs:sync", uuid: "<app-uuid>", env_file: "./.env", dry_run: true })
application({ action: "envs:sync", uuid: "<app-uuid>", env_content: "API_KEY=EXAMPLE_VALUE\n", confirm: true, conflict_policy: "overwrite" })
```

### 💾 Datenbank-Backups (`backup:*`)

Backup-Schedules konfigurieren, auflisten, aktualisieren, löschen und sofort auslösen — plus Ausführungshistorie — über das bestehende `database`-Tool. Kein separates Backup-MCP-Tool.

| Action | Zweck |
|--------|-------|
| `backup:create` | Backup-Schedule anlegen (frequency Pflicht; optional S3, Retention, `backup_now: true`) |
| `backup:list` | Backup-Schedules einer Datenbank auflisten |
| `backup:update` | Schedule-Felder aktualisieren (frequency, Retention, S3-Flags) |
| `backup:delete` | Schedule entfernen — **erfordert `confirm: true`** |
| `backup:now` | Sofort-Backup auslösen |
| `backup:history` | Executions eines Schedules (Status, Timestamps, Größe) |

**Parent-Identität:** Alle Backup-Actions brauchen die Parent-Datenbank via `uuid` oder `name`. Schedule-gebundene Actions (`backup:update`, `backup:delete`, `backup:now`, `backup:history`) brauchen zusätzlich `scheduled_backup_uuid`.

**Confirm-Gates:** `backup:delete` erfordert `confirm: true` — sonst `COOLIFY_CONFIRM_REQUIRED`. `delete_s3` ist standardmäßig **`false`** (nur Config löschen). Bei `delete_s3: true` ist weiterhin `confirm: true` nötig — S3-Artefakte zu löschen gilt als destruktiv.

**Frequency (Pitfall 1):** `backup:create` akzeptiert OpenAPI-Presets (`every_minute`, `hourly`, `daily`, `weekly`, `monthly`, `yearly`) **oder** einen Cron-Ausdruck (cron). `backup:update` akzeptiert **nur presets** — cron bei Update liefert `COOLIFY_VALIDATION_ERROR`.

**`backup:now`-Semantik:** Entspricht Coolify-`PATCH` mit `{ backup_now: true }` auf dem Schedule — kein separater Trigger-Endpoint. Erfordert `scheduled_backup_uuid`.

**Reveal-Richtlinie:** S3-bezogene Credentials in Backup-Config-Responses sind standardmäßig als `***` maskiert. `reveal: true` nur setzen, wenn der Mensch explizit Klartext will — der Agent darf `reveal: true` nicht automatisch setzen.

**Out of scope (v2.x+):** Backup-Execution-Delete, Restore/Import aus Backup und S3-Storage-Destination-CRUD sind in diesem Release nicht verfügbar.

```js
database({ action: "backup:list", uuid: "<db-uuid>" })
database({ action: "backup:create", uuid: "<db-uuid>", frequency: "daily", save_s3: false })
database({ action: "backup:now", uuid: "<db-uuid>", scheduled_backup_uuid: "<schedule-uuid>" })
database({ action: "backup:delete", uuid: "<db-uuid>", scheduled_backup_uuid: "<schedule-uuid>", confirm: true })
```

### 🔑 `private_key` — SSH-Key-CRUD

Coolify Private Keys verwalten — PEM-Inhalt standardmäßig maskiert.

| Action | Zweck |
|--------|-------|
| `list` / `get` | Keys auflisten oder abrufen (PEM maskiert, außer mit `reveal: true`) |
| `create` / `update` | SSH-Keys anlegen oder rotieren |
| `delete` / `delete_preview` | Key löschen oder Abhängigkeiten vorher anzeigen |

### 🖧 `server` — Server-CRUD & Validierung

| Action | Zweck |
|--------|-------|
| `get` | Server-Details, Domains und Erreichbarkeit |
| `create` / `update` | Server registrieren oder rekonfigurieren |
| `validate` | Coolifys Server-Validierung auslösen |
| `delete` / `delete_preview` | Server löschen oder Abhängigkeiten vorher anzeigen |

### 📁 `project` — Projekt-CRUD

| Action | Zweck |
|--------|-------|
| `list` / `get` | Projekte entdecken oder inspizieren |
| `create` / `update` | Projekte anlegen oder umbenennen |
| `delete` / `delete_preview` | Projekt löschen oder Blast Radius vorher anzeigen |

### 🌍 `environment` — Environment-CRUD

| Action | Zweck |
|--------|-------|
| `list` / `get` | Environments in einem Projekt auflisten oder inspizieren |
| `create` | Neues Environment in einem Projekt anlegen |
| `delete` / `delete_preview` | Environment löschen oder Abhängigkeiten vorher anzeigen |

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

### 🗂️ `instance` — Multi-Instance-Registry

Benannte Coolify-Instanzen in `~/.coolify-mcp/instances.json` verwalten. Credential-Auflösung pro Call — keine Cross-Instance-Leaks.

| Action | Zweck |
|--------|-------|
| `list` | Registrierte Instanzen auflisten (Tokens maskiert) |
| `get` | Eine Instanz nach Name abrufen |
| `add` | Neue Instanz registrieren (`name`, `url`, `token`, optional `type: "cloud"`) |
| `update` | URL oder Token einer Instanz rotieren |
| `delete` | Instanz entfernen — **erfordert `confirm: true`** |
| `set-default` | Standard-Instanz für Ops ohne expliziten `instance`-Parameter setzen |
| `import-env` | Opt-in: `COOLIFY_URL` + `COOLIFY_TOKEN` aus Prozess-Env in die Registry kopieren |
| `cloud-info` | Lokale Cloud-Discovery — `isCloud`, `url`, `source`, `knownLimits`, Docs-Link (kein API-Call) |

```js
instance({ action: "add", name: "prod", url: "https://coolify.example.com", token: "<token>" })
instance({ action: "list" })
instance({ action: "cloud-info" })
```

### 📜 `manifest` — lokaler Cache

`.coolify/manifest.json` lesen/schreiben/synchronisieren — Workspace-Cache, **keine** Source of Truth. Remote gewinnt bei UUID-Konflikten.

| Action | Zweck |
|--------|-------|
| `get` | Lokale Manifest-Datei lesen |
| `upsert` | Projekte/Server/Ressourcen in den Cache mergen |
| `set` | Manifest-Abschnitt ersetzen |
| `remove` | Cache-Eintrag einer Ressource entfernen |
| `clear` | Manifest leeren — **erfordert `confirm: true`** |
| `sync` | Cache gegen live Coolify-API abgleichen (optional `dry_run`, `prune` mit `confirm`) |
| `diff` | Nicht-destruktiver Diff-Report — immer sicher |

```js
manifest({ action: "sync", dry_run: true })
manifest({ action: "diff" })
```

> [!NOTE]
> Best-Effort-Auto-Hooks aktualisieren das Manifest nach App/Service/DB-Mutationen. Veraltete UUID-404s anderswo liefern `_meta.manifestWarning` — `manifest({ action: "sync" })` zum Abgleichen ausführen.

### 🧭 `setup` — geführte Projekt-Verdrahtung

| Action | Zweck |
|--------|-------|
| `preflight` | GitHub CLI und Workspace-Voraussetzungen prüfen, ohne das Projekt zu ändern |
| `wire` | Bestehenden Workload verknüpfen oder Greenfield-Projekt provisionieren; optional mit Domains, Env-Sync, Recipe, Manifest und Deploy-Watch |
| `resume` | Pausiertes Setup nach Authentifizierung oder anderer behebbarer Voraussetzung fortsetzen |

`wire` pusht nie automatisch. Fehlt `gh`-Authentifizierung, pausiert der Setup-Flow sauber und setzt bei den bereits abgeschlossenen Schritten fort.

### 🎨 Branding (`serverInfo.icons`)

Der MCP-Server bewirbt Icons in `initialize` via eingebetteter PNG-Data-URI (primär) und jsDelivr-CDN-URLs für `mcp-icon-192.png` und `favicon-32.png`. Cursor kann weiterhin einen Buchstaben-Fallback anzeigen — siehe [Maintainer-Verifizierung](docs/assets/cursor-icon-verify.md). Kein Coolify-API-Call.

---

## 🛡️ Sicherheitsmodell

### Confirm-Gate

Destruktive **Emergency**-Actions folgen einem strikten Zwei-Schritt-Muster:

1. Aufruf ohne `confirm` oder mit `false` → du bekommst eine `would_affect`-Vorschau und Fehlercode `COOLIFY_CONFIRM_REQUIRED` zurück — **nichts wird mutiert**.
2. Erneuter Aufruf mit `confirm: true` → die Action wird tatsächlich ausgeführt.

Normale App-/Service-/Database-Mutationen (Start, Stop, Deploy, …) liegen **nicht** hinter diesem Gate — sie folgen einfach der Coolify-API-Semantik, da sie auf eine einzelne Ressource statt auf deine ganze Fleet begrenzt sind.

**Umgebungsvariablen:** `envs:delete` und `envs:bulk-update` erfordern `confirm: true` auf Application, Service und Database. `envs:sync`-Apply (`dry_run: false`) und `envs:sync` mit `prune: true` erfordern `confirm: true` nur auf Application. `dry_run: true`-Sync-Vorschauen mutieren nie.

### Secret-Maskierung

- Keys, die auf `password`, `token`, `secret`, `private` oder `env` matchen, erscheinen standardmäßig als `***` im Tool-Output.
- `reveal: true` nur setzen, wenn du explizit Klartext brauchst — etwa um eine Env-Var in ein anderes System zu kopieren. **Vorher den Menschen fragen**, bevor du `reveal: true` bei einem `envs:*`-Call setzt.
- **Log-Zeileninhalte werden nicht maskiert.** Behandle rohe Logs wie jeden anderen sensiblen Output: nicht in langlebiges Agent-Memory oder öffentliche Tickets kopieren.

> [!WARNING]
> Registry-Dateien (`~/.coolify-mcp/instances.json`) werden mit `0o700`-Verzeichnis- und `0o600`-Dateirechten geschrieben. Tokens erscheinen nie in Tool-Output, außer du setzt explizit `reveal: true`.

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
| `COOLIFY_CLOUD_FORBIDDEN` | Cloud-Token- oder Team-Berechtigungsproblem (HTTP 403) |
| `COOLIFY_CLOUD_UNSUPPORTED` | Endpunkt auf Coolify Cloud nicht verfügbar (HTTP 404) |

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
application({ action: "deploy", uuid: "<uuid>", wait: false })
deployment({ action: "watch", deployment_uuid: "<deployment_uuid>", timeout: 300 })
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

**„Multi-Instance: registrierte Instanzen auflisten und jeweils verifizieren."**

```js
instance({ action: "list" })
system({ action: "verify" })
```

---

## ✅ Status heute

Paket **1.1.1** liefert **19 tools** und vier MCP-Prompts für Coolify API **4.1.x**:

| Fähigkeit | Status |
|-----------|--------|
| Connectivity prüfen + Infrastructure-Overview | ✅ Shipped |
| Discovery: `resource.list` / `resource.find` | ✅ Shipped |
| Diagnose: App, Server, Fleet-weiter Scan + Follow-Up-Hints | ✅ Shipped |
| Deploy-Lifecycle: Start/Stop/Restart, Deploy mit Wait-Mode + Force-Rebuild | ✅ Shipped |
| Deployment-Tracking: List / Get / Cancel | ✅ Shipped |
| Deployment-Watch und begrenzte Build-Logs | ✅ Shipped |
| Application-Runtime-Logs, begrenzter Follow und `diagnose.logs` | ✅ Shipped |
| Instanz-Intelligence (`intelligence.scorecard`, `graph`, `impact`, `janitor`, `cleanup`) | ✅ Shipped |
| Application-, Service- und Database-CRUD | ✅ Shipped |
| Dynamische One-Click-Type-Discovery und Recipes | ✅ Shipped |
| Setup-Wizard und vier IDE-Workflow-Skills | ✅ Shipped |
| Emergency-Ops: Stop-All, Projekt-Redeploy/Restart, hinter Confirm-Gate | ✅ Shipped |
| SSH-Key-CRUD (`private_key`) mit PEM-Maskierung | ✅ Shipped |
| Server-CRUD + Validierung (`server`) | ✅ Shipped |
| Projekt- & Environment-CRUD (`project`, `environment`) | ✅ Shipped |
| Secret-Maskierung mit explizitem `reveal`-Opt-In | ✅ Shipped |
| Strukturierte Fehler, Recovery-Hints, automatische Retries | ✅ Shipped |
| npm-Distribution + Install-Konfigurator für 15+ Clients | ✅ Shipped |
| Multi-Instance-Registry (`instance`, `instances.json`) | ✅ Shipped |
| Coolify-Cloud-Pfad (`cloud-info`, team-scoped Tokens) | ✅ Shipped |
| Lokaler Manifest-Sync (`.coolify/manifest.json`, Auto-Hooks) | ✅ Shipped |
| Live-UAT-Harness (`npm run uat:live`) | ✅ Shipped |
| Capability-Discovery via `system.version` | ✅ Shipped |
| Deployment-Build-Logs via `deployment.logs` | ✅ Shipped |

> **Capability-Discovery & Build-Logs:** `system({ action: "version" })` liefert `coolifyVersion` (ersetzt das bisherige Feld `version`), `mcpVersion` und eine `capabilities`-Map mit Coolify-4.1.2-Feature-Flags. Für **App-Triage + begrenzten Runtime-Tail** in einem Aufruf: `diagnose({ action: "logs", mode: "full", uuid: "..." })` — prüfe `capabilities.diagnose_logs`. Für **Instanz-Gesundheit, Dependency-Graph, Impact und Janitor/Cleanup**: `intelligence({ action: "scorecard" | "graph" | "impact" | "janitor" | "cleanup", ... })` — prüfe `capabilities.intelligence_scorecard` (und sibling `intelligence_*`-Keys); `cleanup` erfordert `confirm: true`. Für Deployment-**Build**-Logs bevorzugt `deployment({ action: "logs", deployment_uuid: "..." })` (oder `application_uuid` für das neueste Deployment). Der `application.logs`-Pfad mit `deployment_uuid` bleibt aus Back-Compat-Gründen verfügbar. Für **Runtime**-Log-Follow: `application({ action: "logs", uuid: "...", follow: true })` — begrenztes MCP-Polling bis Idle oder Timeout; prüfe `capabilities.application_logs_follow` via `system.version`.

> [!WARNING]
> Coolify 4.1.x bietet keine stabilen Service- oder Database-Log-Endpunkte. Dieser Server behauptet oder registriert deshalb keine Service-/Database-Log-Actions. Nutze Application-Runtime-Logs und Deployment-Build-Logs, bis kompatible Upstream-APIs verfügbar sind.

---

## 🔮 Demnächst

Künftige Arbeit bleibt auf prüfbare Upstream- und Repository-Grenzen beschränkt:

- Service-/Database-Logs ergänzen, sobald kompatible Coolify-APIs stabil und verfügbar sind.
- Nachgewiesene REST-Mappings aus [`docs/COVERAGE.md`](docs/COVERAGE.md) schließen, wenn sie nützliche Agent-Workflows ermöglichen.
- Cross-Instance-Fan-out erst mit expliziten Rate-Limit- und Credential-Isolation-Garantien neu bewerten.

Diese Grenzen enthalten weder Release-Datum noch Kompatibilitätsversprechen. Konkrete Wünsche gehören in [GitHub Issues](https://github.com/clezcoding/awesome-coolify/issues).

---

## 🛠️ Lokale Entwicklung

```bash
git clone https://github.com/clezcoding/awesome-coolify.git
cd awesome-coolify
pnpm install
pnpm run build    # tsup → dist/
pnpm test         # vitest
pnpm run dev      # Watch-Modus
```

Logs gehen ausschließlich auf **stderr** — stdout ist für das MCP-Protokoll reserviert.

Der Maintainer-Publish-Flow (`build` → `pack --dry-run` → `publish`) ist in [CONTRIBUTING.md](CONTRIBUTING.md) dokumentiert.

> [!NOTE]
> Maintainer können Live-UAT gegen eine echte Coolify-Instanz mit `npm run uat:live` ausführen. Siehe [CONTRIBUTING.md — Live UAT Harness](CONTRIBUTING.md#live-uat-harness) für Voraussetzungen und Report-Output — Runbook hier nicht duplizieren.

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
| Changelog | [CHANGELOG.md](CHANGELOG.md) |
| Security-Policy | [SECURITY.md](SECURITY.md) |
| Lizenz | [MIT](LICENSE) |
