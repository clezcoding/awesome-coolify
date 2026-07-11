---

## ❓ Warum Coolify MCP?

Drei überlappende Tools. Ein verwirrter Agent. Wartungs-Albtraum.

```mermaid
flowchart LR
    subgraph Today["Heute — fragmentiertes Tooling"]
        CLI["Verstreute CLI"]
        MCP1["MCP-Server A"]
        MCP2["MCP-Server B"]
    end

    subgraph Agent["AI-Agent"]
        Cursor["Cursor / Claude / andere"]
    end

    subgraph Future["Coolify MCP"]
        Unified["coolify-mcp<br/>Action-Schema"]
    end

    Cursor --> CLI
    Cursor --> MCP1
    Cursor --> MCP2
    Cursor -.-> Unified

    style Unified fill:#9333EA,color:#fff,stroke:#6366F1
    style Today fill:#1e1b4b,color:#e9d5ff
```

<details>
<summary><b>📊 Vergleich anzeigen: Fragmentiertes Heute vs. Unified Coolify MCP</b></summary>

| Problem heute | Coolify MCP Antwort |
|---------------|---------------------|
| 60+ MCP-Einzeltools | Domänen-Tools + `action`-Parameter |
| Multi-Instance pro Config-Eintrag | Zentrale `instances.json` + Switch |
| Unstrukturierte API-Fehler | `COOLIFY_*` Codes + Recovery-Hints |
| Secrets leaken in den Kontext | Default-Maskierung, `reveal` opt-in |
| Destructive Ops ohne Guardrails | `confirm: true` Pflicht |
| Drei Docs, drei Schemas | Ein README, eine Wahrheit |

</details>

> [!IMPORTANT]
> **Design-Prinzip:** optimiere auf *Agent-Recovery* und *Kontext-Effizienz*, nicht auf API-Endpunkt-Parität am Tag eins.

---

### 🔗 Quick Links
[⚡ Schnellstart](#schnellstart) · [🛠 Features](#features) · [📐 Architektur](#architektur) · [🧬 Tool-Schema](#tool-schema)

