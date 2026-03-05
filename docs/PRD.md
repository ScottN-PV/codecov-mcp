# Product Requirements Document
# codecov-mcp — Complete Codecov API Coverage for AI Agents

**Version:** 2.1
**Status:** Final (post-audit revision)
**Date:** 2026-03-05
**Package:** `codecov-mcp` (npm)
**License:** MIT

---

## 1. Purpose

Build a Model Context Protocol (MCP) server that exposes the complete Codecov REST API v2 as Claude Code tools, prompts, and resources. The goal is to give Claude Code (and any MCP-compatible AI client) full situational awareness of test coverage and test health across a codebase — enabling it to reason about, report on, and act on coverage data as a first-class part of its development workflow.

The Codecov CLI handles **uploading** coverage data. This project handles everything else: **reading, comparing, trending, and analyzing** coverage and test results.

---

## 2. Background & Motivation

### 2.1 Current State

Five community Codecov MCP servers exist. None is official (Codecov/Sentry has not built one). The landscape:

| Server | Tools | Quality | API Coverage |
|--------|-------|---------|-------------|
| turquoisedragon2926/codecov-mcp-server | 8 | No tests, dormant | ~25% |
| smart145/codecov-mcp-server (fork) | 8 | No tests, dormant | ~25% |
| egulatee/mcp-server-codecov | 5 + 3 prompts + 4 resources | 97% test coverage, active | ~15% |
| stedwick/codecov-mcp | 1 + 1 prompt | Archived | ~3% |
| rwojsznis/codecov-mcp | 1 | No tests | ~3% |

All servers completely omit:
- Coverage trend time-series data
- Coverage flags and flag-specific trends
- Components and component comparison
- Branch management
- Test Analytics (flaky tests, failure rates, durations)
- Evaluations (AI/LLM eval tracking)
- Pull request listing and detailed analysis
- Segment-level coverage diffs
- Upload inspection per commit
- User/org management and sessions
- YAML configuration validation

### 2.2 Why This Matters

Without full API coverage, Claude Code can't:
- Warn that a PR reduces patch coverage before it's pushed
- Identify which tests are flaky on main
- Detect that coverage has been quietly declining for 3 weeks
- Attribute a coverage drop to a specific commit
- Distinguish unit test coverage from integration test coverage
- Track AI/LLM evaluation metrics between commits

With full API coverage, Claude Code becomes a proactive quality agent, not just a passive reporter.

---

## 3. Goals

| # | Goal |
|---|------|
| G1 | Cover 100% of active Codecov REST API v2 endpoints (33 endpoints) as named MCP tools |
| G2 | Provide high-value composite tools that make Claude Code faster and more accurate at code review |
| G3 | Include MCP Prompts for common coverage workflows (review, PR check, flaky test triage) |
| G4 | Include MCP Resources for on-demand coverage context |
| G5 | Support both codecov.io and self-hosted Codecov instances |
| G6 | Be installable in one command via `npx` or `claude mcp add` |
| G7 | Auto-detect owner/repo from git remote for zero-config personal use |
| G8 | Expose rich, structured output that Claude Code can reason about without further prompting |
| G9 | Be the definitive, community-standard Codecov MCP server |

---

## 4. Non-Goals

- **Not** handling uploading coverage (the CLI does this)
- **Not** implementing a Codecov UI or dashboard
- **Not** supporting Codecov API v1 (deprecated)
- **Not** requiring a database or persistent state beyond in-memory cache
- **Not** supporting the undocumented internal GraphQL API
- **Not** managing GitHub/GitLab/Bitbucket authentication directly
- **Not** exposing Bundle Analysis data (no query API exists)
- **Not** exposing Automated Test Selection data (CLI-only feature)
- **Not** exposing Codecov AI review/test generation (GitHub App only)

---

## 5. Users

**Primary user:** Claude Code acting as an autonomous development agent, driven by the project author for personal code review workflows.

**Secondary user:** Any MCP-compatible AI client (Cursor, Claude Desktop, Windsurf, VS Code Copilot, etc.) being used by a developer who wants to query Codecov data conversationally.

---

## 6. User Stories

### Coverage Awareness
- *As Claude Code*, I can check overall repo coverage before deciding whether to write more tests.
- *As Claude Code*, I can fetch line-by-line coverage for any file I'm editing, so I know exactly which lines are untested.
- *As Claude Code*, I can browse the coverage tree to identify which directories have the lowest coverage.

### PR & Commit Analysis
- *As Claude Code*, I can fetch patch coverage for any open PR, so I can warn the user if their changes are insufficiently tested before merging.
- *As Claude Code*, I can compare coverage between two commits or branches, attributing changes to specific changesets.
- *As Claude Code*, I can get the list of files impacted by a PR, filtered to only those that lost coverage.

### Trend Analysis
- *As Claude Code*, I can query 30-day coverage trends for a repository, detecting slow coverage decay.
- *As Claude Code*, I can compare coverage trends across flags (unit, integration, e2e) to identify underinvested test categories.

### Test Health
- *As Claude Code*, I can list test results with failure rates and durations, identifying flaky or slow tests.
- *As Claude Code*, I can filter tests by outcome, duration, or branch to focus on specific problems.

### AI/LLM Evaluations
- *As Claude Code*, I can check evaluation metrics (accuracy, cost, pass/fail rates) between commits to detect model regressions.

### Operational
- *As a developer*, I can install this server with a single command and point it at a self-hosted Codecov instance.
- *As a developer*, I can run the server against any git service (GitHub, GitLab, Bitbucket) by setting an environment variable.
- *As a developer*, I can configure default owner/repo so every tool call doesn't repeat them.
- *As a developer*, I can auto-detect owner/repo from my git remote for zero-config use.

---

## 7. Success Criteria

| Criterion | Measure |
|-----------|---------|
| API completeness | All 33 active endpoints implemented as tools |
| Composite tools | High-value composite tools for common AI workflows |
| MCP Prompts | At least 5 workflow prompts for coverage review scenarios |
| MCP Resources | At least 4 browsable resources for coverage context |
| Tool discoverability | Every tool has a description sufficient for autonomous AI tool selection |
| Zero-install usage | Works via `npx -y codecov-mcp` |
| Self-hosted support | `CODECOV_API_BASE_URL` env var routes all requests to custom instance |
| Multi-service | GitHub, GitLab, Bitbucket (+ enterprise variants) supported from day 1 |
| Test coverage | >= 90% unit test coverage on the server itself |
| Response quality | All tools return structured JSON with descriptive field names |
| Auto-detection | Owner/repo inferred from git remote when env vars not set |

---

## 8. Constraints

- Must implement MCP stdio transport for Claude Code compatibility
- Must use the `@modelcontextprotocol/sdk` TypeScript SDK
- Must not bundle secrets or tokens in source code
- All configuration via environment variables (with git remote auto-detection fallback)
- Node.js >= 18 required (for native fetch)
- Published to npm as `codecov-mcp`
- MIT license

---

## 9. Future Enhancements (Post v1.0)

- HTTP/SSE transport for remote/cloud deployment
- Docker containerization
- Webhook ingestion for real-time coverage change notifications
- Caching persistence across sessions
- Bundle Analysis endpoints (when Codecov adds query API)
- Smithery.ai and MCP registry listings
