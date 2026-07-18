# Security Policy

This repository is **private**. It contains development tooling for the awesome-coolify MCP server. Do not share access credentials or API tokens outside authorized maintainers.

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.1.x   | Yes       |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Preferred:** [GitHub Security Advisories](https://github.com/clezcoding/awesome-coolify/security/advisories/new) (private report; visible to maintainers only).
2. **Alternative:** Open a private communication channel with the repository maintainer if you do not have GitHub access to this private repo.

Please include:

- Description of the issue and potential impact
- Steps to reproduce
- Affected versions or commit SHA
- Suggested fix (if any)

**Do not** open public issues for undisclosed security problems.

## Response Timeline

| Stage | Target |
| ----- | ------ |
| Initial acknowledgment | Within 72 hours |
| Triage and severity assessment | Within 7 days |
| Fix or mitigation plan | Depends on severity; critical issues prioritized |

We will coordinate disclosure timing with reporters after a fix is available.

## Scope

In scope:

- This MCP server codebase (authentication, credential handling, API proxy behavior)
- Scripts and configuration that could expose Coolify credentials

Out of scope:

- Vulnerabilities in Coolify itself (report to [Coolify](https://github.com/coollabsio/coolify))
- Issues requiring physical access to a maintainer's machine
- Social engineering against individual users

## Safe Harbor

We appreciate good-faith security research. We will not pursue legal action against researchers who follow this policy and avoid privacy violations, data destruction, or service disruption.
