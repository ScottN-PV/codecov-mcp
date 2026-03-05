# Technical Specification
# codecov-mcp — Architecture & Implementation

**Version:** 2.1
**Status:** Final (post-audit revision)
**Date:** 2026-03-05

---

## 1. Architecture Overview

```
┌─────────────────────────────────────┐
│           Claude Code               │
│         (MCP Client)                │
└──────────────┬──────────────────────┘
               │ stdio (JSON-RPC 2.0)
               ▼
┌─────────────────────────────────────┐
│         MCP Server Process          │
│  ┌─────────────────────────────┐    │
│  │      Tool Registry          │    │
│  │  (36 tools + 5 prompts      │    │
│  │   + 4 resources)            │    │
│  └──────────────┬──────────────┘    │
│                 │                   │
│  ┌──────────────▼──────────────┐    │
│  │   In-Memory Cache (LRU)    │    │
│  │   TTL: 5 min default       │    │
│  └──────────────┬──────────────┘    │
│                 │                   │
│  ┌──────────────▼──────────────┐    │
│  │   Codecov API Client        │    │
│  │  (typed, retry, auth)       │    │
│  └──────────────┬──────────────┘    │
│                 │                   │
│  ┌──────────────▼──────────────┐    │
│  │   Git Remote Detector       │    │
│  │  (auto service/owner/repo)  │    │
│  └─────────────────────────────┘    │
└─────────────────┬───────────────────┘
                  │ HTTPS REST
                  ▼
┌─────────────────────────────────────┐
│     Codecov REST API v2             │
│   (codecov.io or self-hosted)       │
└─────────────────────────────────────┘
```

Single Node.js process over stdio. Stateless per-request with optional in-memory cache.

---

## 2. Technology Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Language | TypeScript (strict) | Type safety for API contracts |
| Runtime | Node.js >= 18 | Native `fetch`, wide compatibility |
| MCP SDK | `@modelcontextprotocol/sdk` (pinned) | Official SDK; `McpServer` class API. Pin tested version in package.json. |
| Schema validation | `zod` | Runtime validation of inputs and responses |
| HTTP client | Native `fetch` (Node 18+) | No extra dependency |
| Test framework | `vitest` | Fast, native TS support |
| Build | `tsc` | Direct compilation to `dist/` |
| Linting | `eslint` + `typescript-eslint` | Code quality |
| Package manager | `npm` | Simplest distribution path |
| License | MIT | Standard open source |

---

## 3. Repository Structure

```
codecov-mcp/
├── src/
│   ├── index.ts              # Entry: #!/usr/bin/env node, starts server
│   ├── server.ts             # McpServer creation, tool/prompt/resource registration
│   ├── client.ts             # Codecov API client (all HTTP logic)
│   ├── config.ts             # Environment variable parsing + git remote detection
│   ├── cache.ts              # LRU in-memory cache with TTL
│   ├── types.ts              # TypeScript interfaces for API responses
│   ├── schemas/
│   │   └── shared.ts         # Shared Zod schemas (OwnerRepoParams, etc.)
│   ├── tools/
│   │   ├── index.ts          # Barrel export + tool registry
│   │   ├── owners.ts         # list_owners, get_owner
│   │   ├── users.ts          # list_users, get_user, update_user, list_user_sessions
│   │   ├── repos.ts          # list_repos, get_repo, get_repo_config
│   │   ├── branches.ts       # list_branches, get_branch
│   │   ├── commits.ts        # list_commits, get_commit, list_commit_uploads
│   │   ├── coverage.ts       # get_coverage_trend, get_coverage_totals, get_coverage_report,
│   │   │                     #   get_coverage_tree, get_file_coverage
│   │   ├── comparison.ts     # compare_coverage, compare_components, compare_file,
│   │   │                     #   compare_flags, compare_impacted_files, compare_segments
│   │   ├── pulls.ts          # list_pulls, get_pull
│   │   ├── flags.ts          # list_flags, get_flag_coverage_trend
│   │   ├── components.ts     # list_components
│   │   ├── test-analytics.ts # list_test_analytics
│   │   ├── evaluations.ts    # get_eval_summary, get_eval_comparison
│   │   └── composite.ts      # validate_yaml, find_flaky_tests, get_coverage_summary
│   ├── prompts/
│   │   └── index.ts          # All 5 MCP prompts
│   ├── resources/
│   │   └── index.ts          # All 4 MCP resources
│   └── utils/
│       ├── errors.ts         # Error formatting and MCP error responses
│       ├── format.ts         # Response normalization helpers
│       └── git-remote.ts     # Git remote URL parser for auto-detection
├── tests/
│   ├── client.test.ts
│   ├── config.test.ts
│   ├── cache.test.ts
│   ├── tools/
│   │   ├── repos.test.ts
│   │   ├── coverage.test.ts
│   │   ├── comparison.test.ts
│   │   └── ... (one per tool file)
│   ├── utils/
│   │   └── git-remote.test.ts
│   └── fixtures/             # Mock API responses
├── dist/                     # Compiled output (gitignored)
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── eslint.config.js
├── .env.example
├── LICENSE
├── CONTRIBUTING.md
└── README.md
```

---

## 4. Configuration

### 4.1 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CODECOV_TOKEN` | Yes | — | API access token (Settings > Access > Generate Token) |
| `CODECOV_API_BASE_URL` | No | `https://api.codecov.io` | Override for self-hosted instances |
| `CODECOV_SERVICE` | No | auto-detect | `github`, `gitlab`, `bitbucket`, etc. |
| `CODECOV_OWNER` | No | auto-detect | Default org/owner |
| `CODECOV_REPO` | No | auto-detect | Default repo name |
| `CODECOV_TIMEOUT_MS` | No | `30000` | HTTP request timeout |
| `CODECOV_MAX_RETRIES` | No | `3` | Retry count on 429/5xx |
| `CODECOV_CACHE_TTL_MS` | No | `300000` | Cache TTL (5 min default, 0 to disable) |

### 4.2 Auto-Detection from Git Remote

When `CODECOV_SERVICE`, `CODECOV_OWNER`, or `CODECOV_REPO` are not set, the server attempts to detect them by running `git remote get-url origin` and parsing the result:

```typescript
// Parses these formats:
// git@github.com:owner/repo.git
// https://github.com/owner/repo.git
// https://github.com/owner/repo
// git@gitlab.com:owner/repo.git
// etc.

interface GitRemoteInfo {
  service: string   // 'github' | 'gitlab' | 'bitbucket'
  owner: string
  repo: string
}
```

**Fallback chain:** tool argument > env var > git remote > error with remediation message.

### 4.3 `config.ts` Contract

```typescript
interface Config {
  token?: string              // optional: only required for authenticated tools (all except validate_yaml)
  baseUrl: string             // no trailing slash
  service?: string            // optional: resolved per-request via fallback chain
  defaultOwner?: string
  defaultRepo?: string
  timeoutMs: number
  maxRetries: number
  cacheTtlMs: number
}

function loadConfig(): Config  // never throws; token/service resolved per-request
```

---

## 5. Codecov API Client

### 5.1 Base URL Construction

```
{baseUrl}/api/v2/{service}/{owner}/repos/{repo}/{resource}
```

Owner-level endpoints:
```
{baseUrl}/api/v2/{service}/{owner}/{resource}
```

Service-level endpoints:
```
{baseUrl}/api/v2/{service}/
```

### 5.2 Authentication

```
Authorization: Bearer {token}
```

Token is enforced per-request, not at startup. Tools that require auth (all except `validate_yaml`) throw a clear error if `config.token` is missing at call time. This allows the server to start and serve `validate_yaml` without a token configured.

### 5.3 Client Interface

```typescript
class CodecovClient {
  constructor(config: Config, cache: Cache)

  get<T>(path: string, params?: Record<string, string | number | boolean>): Promise<T>
  patch<T>(path: string, body: Record<string, unknown>): Promise<T>
  post<T>(url: string, body: string, headers?: Record<string, string>): Promise<T>

  // Paginated list fetcher — fetches single page
  list<T>(path: string, params?: Record<string, string | number | boolean>): Promise<PaginatedResponse<T>>
}
```

### 5.4 Pagination

Codecov uses page-based pagination:
```json
{
  "count": 100,
  "next": "https://api.codecov.io/api/v2/.../repos/?page=2",
  "previous": null,
  "results": [...]
}
```

Tools accept `page` and `page_size` params. The client returns a single page per call. The MCP response includes `count` so Claude Code knows the total and can request more pages if needed.

### 5.5 Caching

```typescript
class Cache {
  constructor(ttlMs: number, maxSize?: number)

  get<T>(key: string): T | undefined
  set<T>(key: string, value: T): void
  invalidate(pattern?: string): void
}
```

- LRU eviction with configurable max size (default 100 entries)
- TTL-based expiry (default 5 minutes)
- Cache key = HTTP method + full URL + sorted query params
- Only GET requests are cached
- PATCH requests invalidate related cache entries
- Set `CODECOV_CACHE_TTL_MS=0` to disable

### 5.6 Error Handling

| HTTP Status | Behavior |
|-------------|----------|
| 200 | Return parsed JSON |
| 301 | Follow redirect (for deprecated test-results endpoints) |
| 401 | Throw `AuthenticationError` with token remediation message |
| 403 | Throw `AuthorizationError` |
| 404 | Throw `NotFoundError` with queried resource in message |
| 429 | Retry with exponential backoff (up to `maxRetries`) |
| 5xx | Retry with exponential backoff (up to `maxRetries`) |
| Network error | Throw `NetworkError` |

All errors are caught at the tool dispatch layer and returned as MCP error responses with human-readable, actionable messages.

### 5.7 Retry Strategy

```typescript
async function withRetry<T>(fn: () => Promise<T>, maxRetries: number): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (!isRetryable(err) || attempt === maxRetries) throw err
      const delay = Math.min(1000 * Math.pow(2, attempt), 10000)
      await sleep(delay)
    }
  }
}
```

Retryable: 429, 500, 502, 503, 504, network errors.

---

## 6. MCP Server

### 6.1 Transport

stdio only (v1.0). JSON-RPC 2.0 over stdin/stdout.

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
```

### 6.2 Tool Registration

Using the `McpServer.tool()` API:

```typescript
const server = new McpServer({
  name: 'codecov-mcp',
  version: pkg.version,
})

// Register each tool
server.tool(
  'list_repos',
  'List all repositories for an owner activated in Codecov. Returns coverage, language, and activation state. Filterable by active status, names, or search term.',
  listReposSchema.shape,
  listReposHandler,
)
```

### 6.3 Prompt Registration

```typescript
server.prompt(
  'coverage_review',
  'Run a comprehensive coverage review for a repository.',
  { owner: z.string().optional(), repo: z.string().optional() },
  coverageReviewHandler,
)
```

### 6.4 Resource Registration

```typescript
server.resource(
  'repos',
  'codecov://{owner}/repos',
  'List of all repos for an owner with coverage',
  reposResourceHandler,
)
```

### 6.5 Tool Output Format

All tools return structured JSON:
```typescript
{
  content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
}
```

Field names are descriptive and camelCase. Consistent across tools. This allows Claude Code to parse and reason over results.

**Normalization rules:** API responses use snake_case (`ownerid`, `flag_name`, etc.). All tool outputs normalize to camelCase (`ownerId`, `flagName`). API query parameters remain snake_case (required by the API). A single `normalizeKeys()` utility handles the transformation.

---

## 7. Git Remote Auto-Detection

### 7.1 Implementation

```typescript
// src/utils/git-remote.ts
import { execSync } from 'child_process'

export function detectGitRemote(): GitRemoteInfo | null {
  try {
    const url = execSync('git remote get-url origin', {
      encoding: 'utf8',
      timeout: 5000,
    }).trim()
    return parseGitUrl(url)
  } catch {
    return null
  }
}

export function parseGitUrl(url: string): GitRemoteInfo | null {
  // Handle SSH: git@github.com:owner/repo.git
  // Handle HTTPS: https://github.com/owner/repo.git
  // Handle GitLab, Bitbucket variants
  // Strip .git suffix
  // Map hostname to service enum
}
```

### 7.2 Hostname to Service Mapping

| Hostname pattern | Service |
|-----------------|---------|
| `github.com` | `github` |
| `gitlab.com` | `gitlab` |
| `bitbucket.org` | `bitbucket` |
| Custom (configured) | `github_enterprise` / `gitlab_enterprise` / `bitbucket_server` |

---

## 8. Testing Strategy

### 8.1 Unit Tests

- All HTTP calls mocked with `vitest` mock functions
- Each tool tested with:
  - Valid input → expected output
  - Missing required args → error
  - API 404 → graceful error message
  - API 401 → auth error message
  - API 429 → retry behavior
- Fixtures in `tests/fixtures/` with realistic API responses
- Git remote detection tested with various URL formats

### 8.2 Test Coverage Target

>= 90% statement coverage on all `src/` files.

### 8.3 Integration Tests

Excluded from CI (require real token). Available via `npm run test:integration` for local validation.

---

## 9. Build & Distribution

### 9.1 `package.json` Key Fields

```json
{
  "name": "codecov-mcp",
  "version": "1.0.0",
  "description": "Complete Codecov API coverage for AI agents via Model Context Protocol",
  "license": "MIT",
  "type": "module",
  "bin": {
    "codecov-mcp": "./dist/index.js"
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:integration": "cross-env INTEGRATION=true vitest run tests/integration",
    "lint": "eslint src/",
    "prepublishOnly": "npm run build && npm run test"
  },
  "engines": { "node": ">=18" },
  "keywords": ["codecov", "mcp", "model-context-protocol", "coverage", "testing", "claude-code"]
}
```

### 9.2 `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "declaration": true,
    "sourceMap": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 9.3 Entry Point

`dist/index.js` must have `#!/usr/bin/env node` as first line.

---

## 10. Installation & Registration

### 10.1 Via `claude mcp add` (recommended for personal use)

```bash
claude mcp add --transport stdio codecov \
  --env CODECOV_TOKEN=${CODECOV_TOKEN} \
  -- npx -y codecov-mcp
```

With auto-detection, this is all you need if you're in a git repo.

### 10.2 With explicit configuration

```bash
claude mcp add --transport stdio codecov \
  --env CODECOV_TOKEN=${CODECOV_TOKEN} \
  --env CODECOV_SERVICE=github \
  --env CODECOV_OWNER=my-org \
  --env CODECOV_REPO=my-repo \
  -- npx -y codecov-mcp
```

### 10.3 Via JSON config

```json
{
  "mcpServers": {
    "codecov": {
      "command": "npx",
      "args": ["-y", "codecov-mcp"],
      "env": {
        "CODECOV_TOKEN": "your-token"
      }
    }
  }
}
```

### 10.4 Self-Hosted

```json
{
  "mcpServers": {
    "codecov": {
      "command": "npx",
      "args": ["-y", "codecov-mcp"],
      "env": {
        "CODECOV_TOKEN": "your-token",
        "CODECOV_API_BASE_URL": "https://codecov.your-company.com"
      }
    }
  }
}
```

---

## 11. README Requirements

1. One-line description + badges (npm version, test coverage, license)
2. Why this exists (comparison table vs. other servers)
3. Quick start: `claude mcp add` one-liner
4. Full environment variable reference
5. Complete tool listing with one-line descriptions (grouped)
6. Prompts and Resources listing
7. Self-hosted configuration
8. Contributing guide
9. License (MIT)
