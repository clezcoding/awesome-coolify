# Feature Research

**Domain:** Coolify MCP Server
**Researched:** 2026-07-12
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Context/Auth Verify | Must connect to API | LOW | Basic token validation |
| Resource Discovery | Find apps, DBs, servers | MEDIUM | ID, Name, FQDN lookup |
| App/Service/DB Lifecycle | Core ops (start/stop/restart/deploy) | MEDIUM | Essential for day-to-day |
| Logs Access | Debugging requires logs | MEDIUM | Needs pagination/limits |
| Deploy Wait-Mode | Agents need to know deploy status | HIGH | Poll terminal status |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Unified Action Schema | Better Agent UX than 60+ tools | HIGH | Consolidate CRUD by domain |
| Payload Limits/Warnings | Prevent context window bloat | MEDIUM | max_chars cap, summary views |
| Secret Masking | Prevent credential leak in logs | MEDIUM | Default `***`, reveal opt-in |
| Bulk/Emergency Ops | Fast recovery (stop all, redeploy project) | LOW | Agent can fix systemic issues |
| Multi-Instance Context | Manage dev/prod Coolify servers | MEDIUM | Switch credentials dynamically |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| 60+ Granular Tools | Follows REST API 1:1 | Agent context bloat, hard to pick | Action-based schema |
| Full Log Dumps | Complete context | Breaks LLM context window | Bounded tail, pagination |
| Raw Env Dumps | See configuration | Leaks DB/API passwords | Mask by default |
| Exec into Container | Debugging | API missing/broken | Use SSH via shell tool |

## Feature Dependencies

```text
[Auth Verify]
    └──requires──> [Instance Context]

[App Lifecycle]
    └──requires──> [Resource Discovery]
                       └──requires──> [Auth Verify]

[Wait-Mode Polling] ──enhances──> [App Lifecycle]

[Action Schema] ──conflicts──> [Granular Tools]
```

### Dependency Notes

- **[Auth Verify] requires [Instance Context]:** Need URL and Token to verify.
- **[App Lifecycle] requires [Resource Discovery]:** Need UUID to target apps.
- **[Wait-Mode Polling] enhances [App Lifecycle]:** Agent waits for finish instead of fire-and-forget.
- **[Action Schema] conflicts with [Granular Tools]:** Mutually exclusive design choices.

## MVP Definition

### Launch With (v1 Ops MVP)

Minimum viable product — what's needed to validate the concept.

- [x] Auth / Connect — Base connection.
- [x] Resource Read (Apps, DBs, Services) — Agent needs context.
- [x] Basic Control (Start, Stop, Restart, Deploy) — Agent needs to fix things.
- [x] App Logs (Bounded) — Agent needs to debug.
- [x] Deploy Wait-Mode — Agent needs success confirmation.

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] Create/Update Resources — Provisioning support.
- [ ] Environment Var Sync — Config management.
- [ ] Bulk Ops — Project-wide actions.
- [ ] Cloud Tokens (Hetzner) — Infrastructure provisioning.

### Future Consideration (v2+ Full Parity)

Features to defer until product-market fit is established.

- [ ] Private Keys / GitHub Apps — Complex setup flow.
- [ ] Backup Scheduling — Admin task, less frequent.
- [ ] Multi-Tenancy (Teams) — Not needed for basic ops.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Lifecycle Control | HIGH | MEDIUM | P1 |
| Logs & Debug | HIGH | MEDIUM | P1 |
| Action Schema UX | HIGH | HIGH | P1 |
| Config Sync | MEDIUM | MEDIUM | P2 |
| Server Provisioning | MEDIUM | HIGH | P3 |
| Multi-Tenancy | LOW | LOW | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | user-coolify (Current) | coolify-backup-mcp | Our Approach (awesome-coolify) |
|---------|------------------------|--------------------|--------------------------------|
| Tool Schema | 60+ Granular Tools | 30+ Tools | Unified Action Schema |
| Large Logs | Dumps Full | Truncates | Bounded tail + pagination |
| Wait-Mode Deploy | Fire and forget | Fire and forget | Poll until finished |
| Secrets | Raw | Raw | Masked by default |

## Sources

- mcp_features.md (Live Audit Jul 2026)
- Coolify API 4.1.x Docs

---
*Feature research for: Coolify MCP Server*
*Researched: 2026-07-12*
