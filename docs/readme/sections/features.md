---

## 🛠 Features

Explore the modular, powerful layout of Coolify MCP.

<details>
<summary><b>🗺️ View Phase-by-Phase Roadmap (v1 — Ops MVP)</b></summary>

### v1 — Ops MVP (52 requirements · 7 phases)

| Phase | Focus | Highlights |
|:-----:|-------|------------|
| **1** | Foundation | stdio MCP, Zod, `instances.json`, structured errors |
| **2** | Discovery | Infrastructure overview, resource lists, docs search |
| **3** | Diagnose | App/server diagnose, global issue scan |
| **4** | Deploy | Start/stop/restart, deploy + wait-mode, batch deploy |
| **5** | Logs | Runtime/build logs, service & DB lifecycle |
| **6** | Safety | Bulk ops, `confirm` gate, secret masking |
| **7** | Ship | npm publish, docs, client setup guides |

</details>

<details>
<summary><b>📊 View Capability Matrix (v1 vs v2)</b></summary>

### Capability matrix

| Area | v1 | v2 |
|------|:--:|:--:|
| Multi-instance auth | ✅ | ✅ |
| Deploy & monitor | ✅ | ✅ |
| Logs (capped / paginated) | ✅ | ✅ |
| Diagnose & issue scan | ✅ | ✅ |
| App/DB/Service CRUD | — | ✅ |
| Teams & cloud tokens | — | ✅ |
| Backups & scheduled tasks | — | ✅ |
| Container exec | — | ⏳ API blocked |

</details>

<details>
<summary><b>🔌 View Domain Tools & Available Actions</b></summary>

### Domain tools (v1)

| Tool | Example actions |
|------|-----------------|
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

Full catalog: [`mcp_features.md`](mcp_features.md)

---

### 🔗 Quick Links
[📐 Architecture](#architecture) · [🧬 Tool Schema](#tool-schema) · [🌐 Multi-instance](#multi-instance) · [🔐 Security](#security)

