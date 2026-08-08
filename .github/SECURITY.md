# Security Policy

This is a public repository. Never publish Coolify credentials, API tokens, private
instance URLs, or unredacted logs here.

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 1.0.x   | Yes       |
| < 1.0   | No        |

## Reporting a Vulnerability

Report vulnerabilities through a
[private GitHub Security Advisory](https://github.com/clezcoding/awesome-coolify/security/advisories/new).
Do not open a public issue, discussion, or pull request for an undisclosed vulnerability.
Do not include live credentials; use placeholders and the minimum sanitized evidence needed.

Please include:

- Description of the issue and potential impact
- Steps to reproduce
- Affected versions or commit SHA
- A minimal proof of concept with secrets removed
- Suggested fix, if known

## Response Timeline

| Stage | Target |
| ----- | ------ |
| Initial acknowledgment | Within 72 hours |
| Triage and severity assessment | Within 7 days |
| Fix or mitigation plan | Depends on severity; critical issues prioritized |

We will coordinate disclosure timing with reporters after a fix is available.

## Scope

In scope:

- MCP stdio transport, tool and prompt inputs, and output redaction
- Coolify API proxying, authentication, registry, and manifest handling
- Setup, release, UAT, and maintenance scripts
- Configuration paths that could expose credentials

Out of scope:

- Vulnerabilities in Coolify itself; report those to
  [Coolify's security process](https://github.com/coollabsio/coolify/security)
- Vulnerabilities in third-party dependencies without a project-specific exploit; report
  them upstream first
- Issues requiring physical access to a maintainer's machine
- Social engineering against individual users

## Safe Harbor

We appreciate good-faith security research. We will not pursue legal action against
researchers who follow this policy, stay within authorized systems, minimize data access,
stop when sensitive data appears, and avoid privacy violations, data destruction, or
service disruption.
