---

## 🔐 Sicherheit

Mehrschichtige Sicherheitsfunktionen schützen deine selbstgehostete Infrastruktur.

<details>
<summary><b>🛡️ Sicherheitsmaßnahmen & Schutzmechanismen anzeigen</b></summary>

| Maßnahme | Verhalten |
|----------|----------|
| **Token-Storage** | Nur in `instances.json` — nie in Tool-Responses geprinted |
| **Default-Maskierung** | Passwörter, Webhook-Secrets, Env-Werte → `***` |
| **Reveal opt-in** | `reveal: true` / `showSensitive: true` auf expliziten Wunsch |
| **Confirm-Gate** | Destructive Ops brauchen `confirm: true` |
| **Payload-Limits** | `max_chars` cappen große Log-/Output-Payloads |
| **SSL** | `verifySsl` pro Instanz (homelab-freundlich) |

</details>

> [!WARNING]
> Destructive Operationen werden ohne explizite Bestätigung abgelehnt.

```json
// Abgelehnt — confirm fehlt
{ "tool": "emergency", "arguments": { "action": "stop-all-apps" } }

// Erlaubt
{ "tool": "emergency", "arguments": { "action": "stop-all-apps", "confirm": true } }
```

---

### 🔗 Quick Links
[⚡ Schnellstart](#schnellstart) · [🛠 Features](#features) · [📐 Architektur](#architektur) · [🌐 Multi-Instance](#multi-instance)

