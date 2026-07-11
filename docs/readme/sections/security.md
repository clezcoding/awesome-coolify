---

## 🔐 Security

Multi-layered security features keep your self-hosted setup safe.

<details>
<summary><b>🛡️ View Security Measures & Safeguards Table</b></summary>

| Measure | Behavior |
|---------|----------|
| **Token storage** | Only in `instances.json` — never echoed in tool responses |
| **Default masking** | Passwords, webhook secrets, env values → `***` |
| **Reveal opt-in** | `reveal: true` / `showSensitive: true` on explicit request |
| **Confirm gate** | Destructive ops require `confirm: true` |
| **Payload limits** | `max_chars` caps large log/output payloads |
| **SSL** | `verifySsl` per instance (homelab-friendly) |

</details>

> [!WARNING]
> Destructive operations are rejected without explicit confirmation.

```json
// Rejected — missing confirm
{ "tool": "emergency", "arguments": { "action": "stop-all-apps" } }

// Allowed
{ "tool": "emergency", "arguments": { "action": "stop-all-apps", "confirm": true } }
```

---

### 🔗 Quick Links
[⚡ Quick Start](#quick-start) · [🛠 Features](#features) · [📐 Architecture](#architecture) · [🌐 Multi-instance](#multi-instance)

