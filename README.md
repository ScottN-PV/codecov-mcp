# codecov-mcp

[![CI](https://github.com/ScottN-PV/codecov-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/ScottN-PV/codecov-mcp/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/ScottN-PV/codecov-mcp/graph/badge.svg)](https://codecov.io/gh/ScottN-PV/codecov-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

The most comprehensive [Codecov](https://codecov.io) MCP server — **35+ tools** covering the Codecov REST API v2, plus 5 prompts and 4 resources.

Built for [Claude Code](https://claude.com/claude-code) and any MCP-compatible AI agent.

## Why?

Instead of switching to the Codecov web UI, your AI assistant can directly:

- **Review PR coverage** — patch %, impacted files, and line-level diffs in one call
- **Find coverage gaps** — drill from repo → directory → file → uncovered lines
- **Track trends** — see if coverage is improving or declining over time
- **Debug CI** — inspect uploads, flags, and components
- **Find flaky tests** — identify tests failing on your default branch
- **Validate config** — check `codecov.yaml` before committing

---

## Quick Start

### 1. Get a Codecov API Token

Go to **[Codecov Settings > Access](https://app.codecov.io/account)** and generate an **API Access Token** (not an upload token).

### 2. Add codecov-mcp to Your MCP Client

Pick your tool below. Each section shows CLI commands and JSON config for every platform.

<details>
<summary><strong>Claude Code</strong></summary>

**CLI install (macOS / Linux):**

```bash
claude mcp add --transport stdio codecov --env CODECOV_TOKEN=your-token-here -- npx -y codecov-mcp
```

**CLI install (Windows):**

```bash
claude mcp add codecov --env CODECOV_TOKEN=your-token-here -- cmd /c npx -y codecov-mcp
```

For project-scoped instead of user-scoped: add `--scope project` after `add`.

**JSON config (macOS / Linux)** — add to `~/.claude.json` or `.claude.json` in your project root:

```json
{
  "mcpServers": {
    "codecov": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "codecov-mcp"],
      "env": {
        "CODECOV_TOKEN": "your-token-here"
      }
    }
  }
}
```

**JSON config (Windows)** — add to `C:\Users\<username>\.claude.json` or `.claude.json` in your project root:

```json
{
  "mcpServers": {
    "codecov": {
      "type": "stdio",
      "command": "cmd",
      "args": ["/c", "npx", "-y", "codecov-mcp"],
      "env": {
        "CODECOV_TOKEN": "your-token-here"
      }
    }
  }
}
```

</details>

<details>
<summary><strong>Codex CLI</strong></summary>

**CLI install (all platforms):**

```bash
codex mcp add codecov --env CODECOV_TOKEN=your-token-here -- npx -y codecov-mcp
```

Config is stored in `~/.codex/config.toml` (user) or `.codex/config.toml` (project). The same config is shared with the Codex IDE extension.

</details>

<details>
<summary><strong>Gemini CLI / Gemini Code Assist</strong></summary>

**JSON config (all platforms)** — add to `.gemini/settings.json` (project) or `~/.gemini/settings.json` (user):

```json
{
  "mcpServers": {
    "codecov": {
      "command": "npx",
      "args": ["-y", "codecov-mcp"],
      "env": {
        "CODECOV_TOKEN": "your-token-here"
      }
    }
  }
}
```

**Windows:** If you get `spawn npx ENOENT`, change `"command"` to `"cmd"` and `"args"` to `["/c", "npx", "-y", "codecov-mcp"]`.

Gemini Code Assist agent mode in VS Code is powered by Gemini CLI and uses the same config.

</details>

<details>
<summary><strong>VS Code (GitHub Copilot)</strong></summary>

VS Code uses `"servers"` (not `"mcpServers"`).

**JSON config (all platforms)** — create `.vscode/mcp.json` in your project root:

```json
{
  "servers": {
    "codecov": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "codecov-mcp"],
      "env": {
        "CODECOV_TOKEN": "${input:codecov-token}"
      }
    }
  },
  "inputs": [
    {
      "id": "codecov-token",
      "type": "promptString",
      "description": "Codecov API Token",
      "password": true
    }
  ]
}
```

**Windows:** If you get `spawn npx ENOENT`, change `"command"` to `"cmd"` and `"args"` to `["/c", "npx", "-y", "codecov-mcp"]`.

You can also use **MCP: Open User Configuration** from the command palette for user-level config.

</details>

<details>
<summary><strong>Cursor</strong></summary>

**JSON config (all platforms)** — create `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (user):

```json
{
  "mcpServers": {
    "codecov": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "codecov-mcp"],
      "env": {
        "CODECOV_TOKEN": "your-token-here"
      }
    }
  }
}
```

**Windows:** If you get `spawn npx ENOENT`, change `"command"` to `"cmd"` and `"args"` to `["/c", "npx", "-y", "codecov-mcp"]`.

</details>

<details>
<summary><strong>Windsurf</strong></summary>

**JSON config (all platforms)** — edit `~/.codeium/windsurf/mcp_config.json`, or add via **Windsurf Settings > Cascade > MCP Servers**:

```json
{
  "mcpServers": {
    "codecov": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "codecov-mcp"],
      "env": {
        "CODECOV_TOKEN": "your-token-here"
      }
    }
  }
}
```

**Windows:** If you get `spawn npx ENOENT`, change `"command"` to `"cmd"` and `"args"` to `["/c", "npx", "-y", "codecov-mcp"]`.

</details>

<details>
<summary><strong>Claude Desktop</strong></summary>

Open Claude Desktop > **Settings > Developer > Edit Config**, then add:

**JSON config (macOS / Linux):**

```json
{
  "mcpServers": {
    "codecov": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "codecov-mcp"],
      "env": {
        "CODECOV_TOKEN": "your-token-here"
      }
    }
  }
}
```

**JSON config (Windows):**

```json
{
  "mcpServers": {
    "codecov": {
      "type": "stdio",
      "command": "cmd",
      "args": ["/c", "npx", "-y", "codecov-mcp"],
      "env": {
        "CODECOV_TOKEN": "your-token-here"
      }
    }
  }
}
```

Restart Claude Desktop after saving.

</details>

<details>
<summary><strong>Cline</strong></summary>

Open the Cline sidebar > **MCP Servers** icon > **Configure MCP Servers**, then add:

```json
{
  "mcpServers": {
    "codecov": {
      "command": "npx",
      "args": ["-y", "codecov-mcp"],
      "env": {
        "CODECOV_TOKEN": "your-token-here"
      }
    }
  }
}
```

**Windows:** If you get `spawn npx ENOENT`, change `"command"` to `"cmd"` and `"args"` to `["/c", "npx", "-y", "codecov-mcp"]`.

</details>

<details>
<summary><strong>Continue</strong></summary>

Add to `.continue/config.yaml` or via the Continue settings UI:

```yaml
mcpServers:
  - name: codecov
    command: npx
    args:
      - -y
      - codecov-mcp
    env:
      CODECOV_TOKEN: your-token-here
```

See the [Continue MCP docs](https://docs.continue.dev/customize/mcp-tools) for additional options.

</details>

<details>
<summary><strong>Zed</strong></summary>

Add to Zed settings (`settings.json` via **Zed > Settings** or **File > Settings**):

```json
{
  "context_servers": {
    "codecov": {
      "command": {
        "path": "npx",
        "args": ["-y", "codecov-mcp"],
        "env": {
          "CODECOV_TOKEN": "your-token-here"
        }
      }
    }
  }
}
```

</details>

If you're in a git repo with a public GitHub/GitLab/Bitbucket remote, the server auto-detects your service, owner, and repo. Enterprise/self-hosted users should set `CODECOV_SERVICE`, `CODECOV_OWNER`, and `CODECOV_REPO` explicitly.

### 3. Start Using It

Ask your AI agent things like:

> "What's the current coverage for this repo?"
>
> "Show me the coverage impact of PR #42"
>
> "Which files have the worst coverage?"
>
> "What lines in src/auth.ts aren't covered by tests?"
>
> "Are there any flaky tests?"

---

## Tools (37 total, 35 default + 2 admin opt-in)

### Coverage

| Tool | Description |
|------|-------------|
| `get_coverage_totals` | Coverage summary for a commit — totals only by default for efficiency. Set `include_files=true` for per-file data. |
| `get_coverage_trend` | Time-series coverage data with min/max/avg per interval |
| `get_coverage_report` | Full report with per-file coverage and line-level detail |
| `get_coverage_tree` | Hierarchical coverage by directory — great for finding low-coverage areas |
| `get_file_coverage` | Line-by-line coverage for a file, with computed `uncoveredLines` array |

### Comparison (all accept `pullid` for PR comparison)

| Tool | Description |
|------|-------------|
| `compare_coverage` | Compare two commits or a PR — base/head/diff totals and per-file changes |
| `compare_impacted_files` | Only files with changed coverage — efficient for large PRs |
| `compare_file` | Line-level coverage diff for a single file |
| `compare_flags` | Compare by flag (unit, integration, e2e) |
| `compare_components` | Compare by component (frontend, backend) |
| `compare_segments` | Chunk-level diffs — most granular view available |

### Pull Requests

| Tool | Description |
|------|-------------|
| `list_pulls` | PRs with coverage impact, filterable by state |
| `get_pull` | Base/head/patch coverage percentages for a PR |

### Repository & Branches

| Tool | Description |
|------|-------------|
| `list_repos` | All repos for an owner, filterable and sortable |
| `get_repo` | Repo details and current coverage |
| `get_repo_config` | Active Codecov YAML config |
| `list_branches` | Branches with coverage data |
| `get_branch` | Coverage for a specific branch |

### Commits

| Tool | Description |
|------|-------------|
| `list_commits` | Commits with coverage totals |
| `get_commit` | Detailed coverage for a commit |
| `list_commit_uploads` | Upload sessions — useful for debugging CI |

### Flags & Components

| Tool | Description |
|------|-------------|
| `list_flags` | Coverage flags and percentages |
| `get_flag_coverage_trend` | Time-series for a specific flag |
| `list_components` | Coverage components defined in codecov.yaml |

### Owners & Users

| Tool | Description |
|------|-------------|
| `list_owners` | Organizations/users accessible to the token |
| `get_owner` | Owner details |
| `list_users` | Users in an org with activation status |
| `get_user` | User details |

### Admin Tools (opt-in)

These tools are **disabled by default** for safety. Set `CODECOV_ENABLE_ADMIN_TOOLS=true` to enable them.

| Tool | Description |
|------|-------------|
| `update_user` | Activate/deactivate a user (requires `confirm: true`) |
| `list_user_sessions` | Login sessions with tokens and timestamps |

### Test Analytics & Evaluations

| Tool | Description |
|------|-------------|
| `list_test_analytics` | Test results with pass/fail/duration analytics |
| `get_eval_summary` | AI/LLM evaluation metrics |
| `get_eval_comparison` | Compare eval metrics between commits |

### Composite (High-Value Multi-Call Tools)

| Tool | Description |
|------|-------------|
| `get_coverage_summary` | **Start here.** Full situational awareness in one call — repo coverage, trend direction, flag breakdown, and open PR count. |
| `get_pr_coverage` | **Best for code review.** Combines PR details (patch/base/head coverage) with impacted files in one call. |
| `find_flaky_tests` | Tests failing on default branch — strong flaky test candidates |
| `validate_yaml` | Validate `codecov.yaml` before committing (no auth required) |

## Prompts (5)

MCP prompts are reusable workflows your AI agent can execute:

| Prompt | Description |
|--------|-------------|
| `coverage_review` | Analyze coverage gaps and suggest improvements |
| `pr_coverage_check` | Review a PR's coverage impact end-to-end |
| `suggest_tests` | Suggest test cases for uncovered lines in a file |
| `flaky_test_report` | Report on flaky tests that need attention |
| `coverage_health_check` | Full repo health report card with grade and action items |

## Resources (4)

MCP resources provide data your agent can read directly:

| URI | Description |
|-----|-------------|
| `codecov://{owner}/repos` | All repos for an owner |
| `codecov://repo/{owner}/{repo}` | Repo coverage summary |
| `codecov://repo/{owner}/{repo}/flags` | Flag coverage |
| `codecov://repo/{owner}/{repo}/components` | Component coverage |

---

## Configuration

All configuration is via environment variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CODECOV_TOKEN` | Yes* | — | Codecov API access token |
| `CODECOV_API_BASE_URL` | No | `https://api.codecov.io` | API base URL (for self-hosted) |
| `CODECOV_SERVICE` | No | auto-detected | `github`, `gitlab`, `bitbucket`, etc. |
| `CODECOV_OWNER` | No | auto-detected | Organization or username |
| `CODECOV_REPO` | No | auto-detected | Repository name |
| `CODECOV_TIMEOUT_MS` | No | `30000` | Request timeout in ms |
| `CODECOV_MAX_RETRIES` | No | `3` | Max retries on 429/5xx |
| `CODECOV_CACHE_TTL_MS` | No | `300000` | Cache TTL in ms (5 min) |
| `CODECOV_ENABLE_ADMIN_TOOLS` | No | `false` | Enable `update_user` and `list_user_sessions` |

\* Not required for `validate_yaml` which uses a public endpoint.

### Parameter Resolution Order

For `service`, `owner`, and `repo`, the server resolves values in this order:

1. **Tool argument** — passed directly in the tool call
2. **Environment variable** — `CODECOV_SERVICE`, `CODECOV_OWNER`, `CODECOV_REPO`
3. **Git remote** — auto-detected from `git remote get-url origin`
4. **Error** — clear message explaining what to set

### Supported Services

| Service | Value |
|---------|-------|
| GitHub.com | `github` |
| GitLab.com | `gitlab` |
| Bitbucket Cloud | `bitbucket` |
| GitHub Enterprise | `github_enterprise` |
| GitLab Self-Managed | `gitlab_enterprise` |
| Bitbucket Data Center | `bitbucket_server` |

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `CODECOV_TOKEN is not set` | Use an **API Access Token** (not upload token) from [Codecov Settings](https://app.codecov.io/account) |
| `Could not determine git service` | Run from a git repo with a recognized remote, or set `CODECOV_SERVICE`/`CODECOV_OWNER`/`CODECOV_REPO` |
| `Authentication failed (401)` | Token is invalid or expired — generate a new one |
| `Resource not found (404)` | Check owner/repo names and that the repo has coverage data |
| Windows: `spawn npx ENOENT` | Use `"command": "cmd"` with `"args": ["/c", "npx", "-y", "codecov-mcp"]`, or try `"command": "npx.cmd"` |
| Stale data | Set `CODECOV_CACHE_TTL_MS=0` to disable caching |

**More troubleshooting:** [Installation Guide — Troubleshooting](docs/INSTALLATION.md#troubleshooting)

---

## Development

```bash
git clone https://github.com/ScottN-PV/codecov-mcp.git
cd codecov-mcp
npm install
npm run build
npm test
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm test` | Run unit tests |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | Lint with ESLint |

### Project Structure

```
src/
├── index.ts          # Entry point (stdio transport)
├── server.ts         # MCP server setup — registers all tools/prompts/resources
├── client.ts         # Codecov API client with retry and caching
├── config.ts         # Environment variable configuration
├── cache.ts          # LRU cache with TTL
├── types.ts          # TypeScript type definitions
├── schemas/
│   └── shared.ts     # Shared Zod schemas (service, pagination, etc.)
├── tools/            # Tool implementations (one file per API group)
│   ├── coverage.ts   # get_coverage_totals, get_coverage_tree, etc.
│   ├── comparison.ts # compare_coverage, compare_impacted_files, etc.
│   ├── composite.ts  # get_coverage_summary, get_pr_coverage, etc.
│   └── ...           # owners, users, repos, branches, commits, pulls, flags, components, test-analytics, evaluations
├── prompts/          # MCP prompt definitions
├── resources/        # MCP resource definitions
└── utils/            # Error handling, formatting, git remote parsing
```

---

## License

MIT — see [LICENSE](LICENSE) for details.
