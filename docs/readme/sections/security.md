---

## Security

| Measure | Behavior |
|---------|----------|
| **Token storage** | Only in `instances.json` — never echoed in tool responses |
| **Default masking** | Passwords, webhook secrets, env values → `***` |
| **Reveal opt-in** | `reveal: true` / `showSensitive: true` on explicit request |
| **Confirm gate** | Destructive ops require `confirm: true` |
| **Payload limits** | `max_chars` caps large log/output payloads |
| **SSL** | `verifySsl` per instance (homelab-friendly) |

> [!WARNING]
> Destructive operations are rejected without explicit confirmation.

```json
// Rejected — missing confirm
{ "tool": "emergency", "arguments": { "action": "stop-all-apps" } }

// Allowed
{ "tool": "emergency", "arguments": { "action": "stop-all-apps", "confirm": true } }
```
