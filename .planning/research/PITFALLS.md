# Pitfalls Research

**Domain:** Coolify MCP Server API & Tooling
**Researched:** 2026-07-12
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Broken API Endpoints

**What goes wrong:**
Calling `execute_command` in application container fails. Global deployments list returns empty arrays.

**Why it happens:**
Coolify 4.1.x REST API gaps. Endpoints are documented or used in old CLI/MCPs, but actually broken or missing in current 4.1.x versions.

**How to avoid:**
Hardcode block broken endpoints. Do not expose `execute_command` capability. Use per-app deployment lists instead of the global deployment list.

**Warning signs:**
404 Not Found or 500 Server Error on execution. Empty JSON arrays returned for global lists despite active deployments.

**Phase to address:**
Phase 1 (Ops Tools MVP)

---

### Pitfall 2: Tool Bloat (60+ Tools)

**What goes wrong:**
MCP exposes 60+ individual tools (e.g. `get_application`, `start_application`, `delete_application`). Agent context window gets flooded, causing confusion and poor LLM tool selection.

**Why it happens:**
Lazy 1:1 mapping of REST API endpoints directly to individual MCP tools.

**How to avoid:**
Implement an action-based schema per domain (e.g., `application({ action: 'deploy' })` instead of separate tools for every action).

**Warning signs:**
Long MCP server initialization times. Agent confusion when choosing the right tool for an operation.

**Phase to address:**
Phase 1 (Architecture & MVP Setup)

---

### Pitfall 3: Large Payload Context Crash

**What goes wrong:**
Agent context overflows. LLM UI crashes or hallucinates.

**Why it happens:**
`get_application_logs` or `list_applications` returns a massive JSON string or unbounded log stream.

**How to avoid:**
Enforce `max_chars` cap on payloads. Implement strict pagination (`page`, `per_page`). Use summary projections for lists (essential fields only) rather than full entity dumps. 

**Warning signs:**
Agent memory resets. Excessively long response latency from the MCP server.

**Phase to address:**
Phase 1 (Ops Tools MVP)

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skipping explicit error codes | Fast coding | Agent cannot recover from 401/404/422 automatically | Never |
| Inline API tokens | Easy setup | Leaked credentials in responses and agent context | Never |
| Hardcoded Coolify Instance | Quick testing | Breaks multi-instance context management requirement | Prototype only |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Coolify Deployments | Using global deployment list API | Use per-app deployment list |
| Container Exec | Trusting old CLI `execute` endpoint | Disable `execute` entirely for 4.1.x |
| Destructive Ops | Instant execution without checks | Require `confirm: true` explicit parameter |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Unlimited Logs | Agent crash | Cap lines/chars, use follow mode | App prints massive logs |
| Full App List | Slow response | Use summary projection (essential fields) | >20 apps/databases |
| Wait-Mode Deploy | Timeout/hang | Bounded tail polling, explicit timeout limit | Slow Docker builds |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Unmasked credentials | Secrets leak to LLM context | Mask webhooks, DB passwords by default |
| Config in git/project | API token exposure | Use isolated `~/.coolify-mcp/instances.json` |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Missing follow-up hints | Agent stops after fetch | Add "Logs/Restart" action hints to responses |
| Silent wait-mode | User thinks deploy hung | Emit bounded poll logging during wait |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Deploy Wait-Mode:** Often missing bounded polling — verify timeout handles slow builds gracefully.
- [ ] **Log Pagination:** Often missing max chars — verify big log files don't crash agent context.
- [ ] **Multi-Instance:** Often missing context switch — verify `instances.json` state updates properly across calls.
- [ ] **Masking:** Often missing DB passwords — verify full-payloads hide secrets completely.

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Context Overflow | HIGH | Clear context. Use summary endpoint instead of full. |
| Global List Empty | LOW | Switch to per-app list endpoint. |
| Broken Exec Call | LOW | Output helpful error explaining 4.1.x limitation. Block action. |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Broken APIs | Phase 1 | Tests assert broken endpoints are blocked |
| Tool Bloat | Phase 1 | Schema validation enforces action-based pattern |
| Large Payloads | Phase 1 | Test large log file with strict `max_chars` limit |

## Sources

- `.planning/PROJECT.md`
- `mcp_features.md` (Live-Audit Jul 2026, Coolify 4.1.2)
- Known limitations of Coolify 4.1.x REST API

---
*Pitfalls research for: Coolify MCP Server API & Tooling*
*Researched: 2026-07-12*
