---

## 🛠 Features

Entdecke die modulare und leistungsstarke Struktur von Coolify MCP.

<details>
<summary><b>🗺️ Phasen-Roadmap anzeigen (v1 — Ops-MVP)</b></summary>

### v1 — Ops-MVP (52 Requirements · 7 Phasen)

| Phase | Fokus | Highlights |
|:-----:|-------|------------|
| **1** | Foundation | stdio MCP, Zod, `instances.json`, strukturierte Errors |
| **2** | Discovery | Infrastructure-Overview, Resource-Listen, Docs-Suche |
| **3** | Diagnose | App/Server-Diagnose, globaler Issue-Scan |
| **4** | Deploy | Start/Stop/Restart, Deploy + Wait-Mode, Batch-Deploy |
| **5** | Logs | Runtime-/Build-Logs, Service- & DB-Lifecycle |
| **6** | Safety | Bulk-Ops, `confirm`-Gate, Secret-Masking |
| **7** | Ship | npm publish, Docs, Client-Setup-Guides |

</details>

<details>
<summary><b>📊 Capability-Matrix anzeigen (v1 vs v2)</b></summary>

### Capability-Matrix

| Bereich | v1 | v2 |
|---------|:--:|:--:|
| Multi-Instance-Auth | ✅ | ✅ |
| Deploy & Monitor | ✅ | ✅ |
| Logs (capped / paginated) | ✅ | ✅ |
| Diagnose & Issue-Scan | ✅ | ✅ |
| App/DB/Service-CRUD | — | ✅ |
| Teams & Cloud-Tokens | — | ✅ |
| Backups & Scheduled Tasks | — | ✅ |
| Container-Exec | — | ⏳ API blockiert |

</details>

<details>
<summary><b>🔌 Domänen-Tools und Aktionen anzeigen</b></summary>

### Domänen-Tools (v1)

| Tool | Beispiel-Actions |
|------|------------------|
| `instance` | `add`, `list`, `switch`, `verify`, `set-default` |
| `system` | `overview`, `health`, `issues`, `search-docs` |
| `application` | `list`, `deploy`, `logs`, `diagnose`, `restart` |
| `service` | `list`, `start`, `deploy`, `logs` |
| `database` | `list`, `restart`, `logs` |
| `server` | `list`, `diagnose` |
| `deployment` | `get`, `cancel`, `build-logs` |
| `project` | `redeploy-all`, `restart-all` |
| `emergency` | `stop-all-apps` |

</details>

Vollständiger Katalog: [`mcp_features.md`](mcp_features.md)

---

### 🔗 Quick Links
[📐 Architektur](#architektur) · [🧬 Tool-Schema](#tool-schema) · [🌐 Multi-Instance](#multi-instance) · [🔐 Sicherheit](#sicherheit)

