# codecov-mcp

The most comprehensive [Codecov](https://codecov.io) MCP server — 36 tools covering 100% of the Codecov REST API v2.

Built for [Claude Code](https://claude.com/claude-code) and any MCP-compatible AI agent.

## What is this?

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that gives AI agents complete access to Codecov's coverage data. Instead of switching to the Codecov web UI, your AI assistant can directly:

- Check coverage for any repo, branch, commit, or file
- Review PR coverage impact with line-level detail
- Find flaky tests and track test analytics
- Compare coverage across commits and components
- Monitor AI/LLM evaluation metrics
- Validate `codecov.yaml` configuration files

## Quick Start

### 1. Get a Codecov API Token

Go to **[Codecov Settings > Access](https://app.codecov.io/account)** and generate an **API Access Token** (not an upload token).

### 2. Add to Claude Code

```bash
claude mcp add --transport stdio codecov \
  --env CODECOV_TOKEN=your-token-here \
  -- npx -y codecov-mcp
```

That's it. If you're in a git repo with a GitHub/GitLab/Bitbucket remote, the server auto-detects your service, owner, and repo.

### 3. (Optional) Pin to a specific repo

```bash
claude mcp add --transport stdio codecov \
  --env CODECOV_TOKEN=your-token-here \
  --env CODECOV_SERVICE=github \
  --env CODECOV_OWNER=my-org \
  --env CODECOV_REPO=my-repo \
  -- npx -y codecov-mcp
```

### Alternative: JSON config

Add to your MCP settings file (e.g., `claude_desktop_config.json`):

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

### PowerShell (Windows)

```powershell
claude mcp add --transport stdio codecov `
  --env CODECOV_TOKEN=your-token-here `
  -- npx -y codecov-mcp
```

## Tools (36)

### Coverage
| Tool | Description |
|------|-------------|
| `get_coverage_totals` | Overall coverage for a commit (fastest) |
| `get_coverage_trend` | Time-series coverage data with min/max/avg per interval |
| `get_coverage_report` | Full report with per-file data |
| `get_coverage_tree` | Hierarchical coverage by directory |
| `get_file_coverage` | Line-by-line coverage for a file, with computed uncovered lines |

### Comparison
| Tool | Description |
|------|-------------|
| `compare_coverage` | Compare two commits or a PR — the primary PR review tool |
| `compare_impacted_files` | Files with changed coverage only |
| `compare_file` | Line-level diff for a single file |
| `compare_flags` | Compare by flag (unit, integration, e2e) |
| `compare_components` | Compare by component (frontend, backend) |
| `compare_segments` | Most granular: chunk-level diffs |

### Repository & Branches
| Tool | Description |
|------|-------------|
| `list_repos` | All repos for an owner |
| `get_repo` | Repo details and current coverage |
| `get_repo_config` | Active Codecov YAML config |
| `list_branches` | Branches with coverage data |
| `get_branch` | Coverage for a specific branch |

### Commits
| Tool | Description |
|------|-------------|
| `list_commits` | Commits with coverage totals |
| `get_commit` | Detailed coverage for a commit |
| `list_commit_uploads` | Upload sessions for a commit |

### Pull Requests
| Tool | Description |
|------|-------------|
| `list_pulls` | PRs with coverage impact |
| `get_pull` | Detailed PR coverage |

### Flags & Components
| Tool | Description |
|------|-------------|
| `list_flags` | Coverage flags and percentages |
| `get_flag_coverage_trend` | Time-series for a specific flag |
| `list_components` | Coverage components |

### Owners & Users
| Tool | Description |
|------|-------------|
| `list_owners` | Organizations/users accessible to the token |
| `get_owner` | Owner details |
| `list_users` | Users in an org with activation status |
| `get_user` | User details |
| `update_user` | Activate/deactivate a user (requires confirmation) |
| `list_user_sessions` | Login sessions |

### Test Analytics & Evaluations
| Tool | Description |
|------|-------------|
| `list_test_analytics` | Test results with pass/fail/duration analytics |
| `get_eval_summary` | AI/LLM evaluation metrics |
| `get_eval_comparison` | Compare eval metrics between commits |

### Composite & Utility
| Tool | Description |
|------|-------------|
| `get_coverage_summary` | Full situational awareness in one call (repo + trend + flags + PRs) |
| `find_flaky_tests` | Tests failing on default branch (flaky candidates) |
| `validate_yaml` | Validate codecov.yaml before committing (no auth required) |

## Prompts (5)

MCP prompts are reusable workflows your AI agent can execute:

| Prompt | Description |
|--------|-------------|
| `coverage_review` | Analyze coverage gaps and suggest improvements |
| `pr_coverage_check` | Review a PR's coverage impact |
| `suggest_tests` | Suggest test cases for uncovered lines |
| `flaky_test_report` | Report on flaky tests that need attention |
| `coverage_health_check` | Full repo health report card |

## Resources (4)

MCP resources provide data your agent can read directly:

| URI | Description |
|-----|-------------|
| `codecov://{owner}/repos` | All repos for an owner |
| `codecov://repo/{owner}/{repo}` | Repo coverage summary |
| `codecov://repo/{owner}/{repo}/flags` | Flag coverage |
| `codecov://repo/{owner}/{repo}/components` | Component coverage |

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

\* Not required for `validate_yaml` which uses a public endpoint.

### Auto-Detection

When running inside a git repository, the server automatically detects `service`, `owner`, and `repo` from your `git remote origin` URL. This means zero configuration in most cases — just set your token and go.

### Self-Hosted Codecov

Set `CODECOV_API_BASE_URL` to your instance URL:

```bash
claude mcp add --transport stdio codecov \
  --env CODECOV_TOKEN=your-token \
  --env CODECOV_API_BASE_URL=https://codecov.internal.company.com \
  -- npx -y codecov-mcp
```

### Parameter Resolution Order

For `service`, `owner`, and `repo`, the server resolves values in this order:

1. **Tool argument** — passed directly in the tool call
2. **Environment variable** — `CODECOV_SERVICE`, `CODECOV_OWNER`, `CODECOV_REPO`
3. **Git remote** — auto-detected from `git remote get-url origin`
4. **Error** — clear message explaining what to set

## Supported Services

- `github` — GitHub.com
- `gitlab` — GitLab.com
- `bitbucket` — Bitbucket Cloud
- `github_enterprise` — GitHub Enterprise Server
- `gitlab_enterprise` — GitLab Self-Managed
- `bitbucket_server` — Bitbucket Data Center

## Development

```bash
git clone https://github.com/ScottN-PV/codecov-mcp.git
cd codecov-mcp
npm install
npm run build
npm test
```

### Project Structure

```
src/
├── index.ts          # Entry point (stdio transport)
├── server.ts         # MCP server setup and tool registration
├── client.ts         # Codecov API client with retry and caching
├── config.ts         # Environment variable configuration
├── cache.ts          # LRU cache with TTL
├── types.ts          # TypeScript type definitions
├── schemas/
│   └── shared.ts     # Shared Zod schemas (service, pagination, etc.)
├── tools/            # Tool implementations (one file per API group)
├── prompts/          # MCP prompt definitions
├── resources/        # MCP resource definitions
└── utils/            # Error handling, formatting, git remote parsing
```

## License

MIT
