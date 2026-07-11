---

## 📐 Architektur

Detaillierter Überblick über die Funktionsweise von Coolify MCP.

```mermaid
flowchart TB
    subgraph Clients["MCP-Clients"]
        direction LR
        C1["Cursor IDE"]
        C2["Claude Desktop"]
        C3["Andere MCP-Hosts"]
    end

    subgraph Server["Coolify MCP Server"]
        direction TB
        P["MCP-Protokoll<br/><code>@modelcontextprotocol/sdk</code>"]
        R["Action-Router<br/><code>domain + action</code>"]
        X["Context-Manager<br/><code>~/.coolify-mcp/instances.json</code>"]
        H["Coolify HTTP-Client<br/>Retry · Auth · Errors"]
        F["Formatter<br/>Mask · Paginate · max_chars"]
    end

    subgraph Remote["Self-hosted Coolify 4.1.x"]
        direction LR
        A["Instanz A"]
        B["Instanz B"]
        N["Instanz N…"]
    end

    Clients --> P --> R
    R --> X & H --> F --> P
    H --> A & B & N
    X -.->|URL + Token| A & B

    classDef accent fill:#9333EA,color:#fff,stroke:#6366F1
    class P,R accent
```

### 🧠 Architektur-Mindmap

<img src="assets/architecture-mindmap.png" alt="Coolify MCP Server Architektur-Mindmap" width="100%" />

<details>
<summary><b>🗂️ Layer-Verantwortlichkeiten anzeigen</b></summary>

### Layer-Verantwortlichkeiten

| Layer | Verantwortung |
|-------|---------------|
| **Protokoll** | JSON-RPC über stdio, Tool-Registrierung |
| **Router** | `application({ action: 'deploy' })` → Handler |
| **Context** | Multi-Instance-Registry, Default, aktiver Switch |
| **HTTP-Client** | Token-Injection, exponentielles Backoff |
| **Formatter** | Summary/Full-Projektion, Secret-Masking |

</details>

<details>
<summary><b>⚙️ Technischen Tech-Stack anzeigen</b></summary>

### Tech-Stack

| Komponente | Wahl |
|------------|------|
| Sprache | TypeScript 5.x |
| MCP-SDK | `@modelcontextprotocol/sdk` |
| Validierung | Zod |
| Transport | stdio |
| Distribution | npm (`npx @clezcoding/coolify-mcp`) |

</details>

---

### 🔗 Quick Links
[🧬 Tool-Schema](#tool-schema) · [🌐 Multi-Instance](#multi-instance) · [🔐 Sicherheit](#sicherheit) · [📅 Roadmap](#roadmap)

