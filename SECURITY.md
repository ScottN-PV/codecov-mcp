# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 0.1.x   | Yes                |

## Reporting a Vulnerability

If you discover a security vulnerability in codecov-mcp, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please email: **security@codecov-mcp.dev** or use [GitHub's private vulnerability reporting](https://github.com/ScottN-PV/codecov-mcp/security/advisories/new).

### What to include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response timeline

- **Acknowledgment:** within 48 hours
- **Initial assessment:** within 5 business days
- **Fix or mitigation:** as soon as practical, typically within 30 days

## Security Considerations

### Token Handling

This server requires a Codecov API access token passed via the `CODECOV_TOKEN` environment variable. The token is:

- Never logged or included in error messages
- Used only for authenticating requests to the Codecov API
- Stored only in process memory for the duration of the server session

### Admin Tools

The server includes two sensitive tools that are **disabled by default**:

- `update_user` — can activate/deactivate users in an organization
- `list_user_sessions` — exposes session tokens and timestamps

To enable these tools, set `CODECOV_ENABLE_ADMIN_TOOLS=true` in your environment. Only enable these if you need user administration capabilities and understand the implications.

### Read-Only by Default

With admin tools disabled (the default), all tools are strictly read-only. No mutations to your Codecov data are possible.
