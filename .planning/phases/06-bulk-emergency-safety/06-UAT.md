---
status: testing
phase: 06-bulk-emergency-safety
source: [06-VERIFICATION.md]
started: 2026-07-16T04:45:00Z
updated: 2026-07-16T04:45:00Z
mode: mvp
user_story: "As an AI agent operator, I want to trigger bulk project ops and emergency stop-all with a confirm gate, so that high-impact actions are deliberate and never fired by accident."
---

## Current Test

number: 1
name: MCP stdio E2E (Emergency + Reveal)
expected: |
  `npm run build` → Cursor/Claude Desktop gegen echte Coolify 4.1.x konfigurieren →
  `emergency.stop_all` / `redeploy_project` / `restart_project` + confirm gate +
  `application.get` mit `reveal` aufrufen.
  Erwartet: strukturierte Response, formatierter Text, Confirm-Preview bei `confirm:false`,
  Masking/Plaintext bei reveal.
awaiting: user response

## Tests

### 1. MCP stdio E2E (Emergency + Reveal)
expected: Strukturierte Response, formatierter Text, Confirm-Preview bei confirm:false, Masking/Plaintext bei reveal über echten MCP stdio-Transport.
result: [pending]

### 2. Live UAT Emergency (nur Non-Prod)
expected: `emergency.stop_all confirm:false` zeigt Preview → `confirm:true` auf Non-Prod-Testprojekt → redeploy/restart verifizieren. Apps gestoppt/redeployed/restarted; Preview zeigt korrekte would_affect/sample_uuids. **NIEMALS Production.**
result: [pending]

### 3. Live UAT Reveal (echte App mit Secrets)
expected: `application.get projection:full` default → `***` → `reveal:true` → Plaintext; analog service/database/diagnose; Fehlerpfad bei 401 weiter redacted; Log-Zeilen weiter unmaskiert.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
