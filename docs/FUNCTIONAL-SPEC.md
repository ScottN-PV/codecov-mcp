# Functional Specification
# codecov-mcp — All Tools, Prompts, and Resources

**Version:** 2.1
**Status:** Final (post-audit revision)
**Date:** 2026-03-05
**Source of truth:** OpenAPI spec at `https://api.codecov.io/api/v2/schema/`

This document defines every MCP tool, prompt, and resource. Each tool entry specifies:
- Tool name and description (as it appears in the MCP registry)
- Codecov API endpoint it maps to
- Input schema (Zod)
- Output shape
- Edge cases and behavior notes

---

## Shared Zod Base Schemas

Define in `src/schemas/shared.ts`:

```typescript
import { z } from 'zod'

export const ServiceEnum = z.enum([
  'github', 'gitlab', 'bitbucket',
  'github_enterprise', 'gitlab_enterprise', 'bitbucket_server'
])

export const OwnerRepoParams = z.object({
  service: ServiceEnum.optional()
    .describe('Git hosting service. Defaults to CODECOV_SERVICE env var or auto-detected from git remote.'),
  owner: z.string().optional()
    .describe('Organization or username. Defaults to CODECOV_OWNER env var or auto-detected from git remote.'),
  repo: z.string().optional()
    .describe('Repository name. Defaults to CODECOV_REPO env var or auto-detected from git remote.'),
})

export const PaginationParams = z.object({
  page: z.number().int().min(1).optional()
    .describe('Page number (1-based).'),
  page_size: z.number().int().min(1).max(100).optional().default(25)
    .describe('Results per page. Default 25, max 100.'),
})

export const BranchParam = z.object({
  branch: z.string().optional()
    .describe('Branch name. Defaults to the repository default branch.'),
})

export const ShaParam = z.object({
  sha: z.string().optional()
    .describe('Commit SHA. If omitted, uses HEAD of specified or default branch.'),
})

export const CompareParams = z.object({
  base: z.string().optional()
    .describe('Base commit SHA or branch name (required if pullid not specified).'),
  head: z.string().optional()
    .describe('Head commit SHA or branch name (required if pullid not specified).'),
  pullid: z.number().int().optional()
    .describe('Pull request number. If provided, base/head are inferred from the PR.'),
}).refine(
  (d) => d.pullid != null || (d.base != null && d.head != null),
  { message: 'Provide either pullid, or both base and head.' }
)
```

### Parameter Resolution Order
For `owner`, `repo`, and `service`: tool argument > environment variable > git remote auto-detection > error.

---

## Tool Groups Overview

| # | Group | Tools | API Section |
|---|-------|-------|------------|
| 1 | Owners & Users | 6 | `/{service}/`, `/{service}/{owner}/users/`, etc. |
| 2 | Repositories | 3 | `.../repos/` |
| 3 | Branches | 2 | `.../branches/` |
| 4 | Commits | 3 | `.../commits/` |
| 5 | Coverage | 5 | `.../coverage/`, `.../report/`, `.../totals/`, `.../file_report/` |
| 6 | Comparison | 6 | `.../compare/` |
| 7 | Pulls | 2 | `.../pulls/` |
| 8 | Flags | 2 | `.../flags/` |
| 9 | Components | 1 | `.../components/` |
| 10 | Test Analytics | 1 | `.../test-analytics/` |
| 11 | Evaluations | 2 | `.../evals/` |
| 12 | Utility / Composite | 3 | Various |

**Total: 36 tools** (33 API endpoints + 3 composite/utility)

---

## Group 1: Owners & Users

### `list_owners`

**Description:** List all organizations and users the authenticated token has access to on a given git service. Use this to discover which owners/orgs you can query repos for.

**API:** `GET /api/v2/{service}/`

**Input:**
```typescript
z.object({
  service: ServiceEnum.optional(),
  ...PaginationParams.shape,
})
```

**Output:**
```typescript
{
  count: number,
  owners: Array<{ service: string, username: string, name: string | null }>
}
```

---

### `get_owner`

**Description:** Get details about a specific owner (organization or user), including their username and display name.

**API:** `GET /api/v2/{service}/{owner}/`

**Input:**
```typescript
z.object({
  service: ServiceEnum.optional(),
  owner: z.string().optional(),
})
```

**Output:**
```typescript
{ service: string, username: string, name: string | null }
```

---

### `list_users`

**Description:** List users in an organization with their activation status. Use this to see who is consuming activated seats or to find specific users. Filterable by activation status, admin status, or search term.

**API:** `GET /api/v2/{service}/{owner}/users/`

**Input:**
```typescript
z.object({
  service: ServiceEnum.optional(),
  owner: z.string().optional(),
  activated: z.boolean().optional().describe('Filter by activation status.'),
  is_admin: z.boolean().optional().describe('Filter to admin users only.'),
  search: z.string().optional().describe('Search users by username or name.'),
  ...PaginationParams.shape,
})
```

**Output:**
```typescript
{
  count: number,
  users: Array<{
    ownerId: number, username: string, name: string | null,
    email: string | null, activated: boolean, isAdmin: boolean,
    lastPullTimestamp: string | null,
  }>
}
```

---

### `get_user`

**Description:** Get details for a specific user in an organization by username or owner ID.

**API:** `GET /api/v2/{service}/{owner}/users/{user_id}/`

**Input:**
```typescript
z.object({
  service: ServiceEnum.optional(),
  owner: z.string().optional(),
  user_id: z.string().describe('Username or owner ID from list_users.'),
})
```

**Output:** Same as single user in `list_users`.

---

### `update_user`

**Description:** Activate or deactivate a user in an organization. This is the only mutating endpoint. Requires org admin permissions. Guarded by a required `confirm` parameter to prevent accidental invocations by autonomous agents.

**API:** `PATCH /api/v2/{service}/{owner}/users/{user_id}/`

**Input:**
```typescript
z.object({
  service: ServiceEnum.optional(),
  owner: z.string().optional(),
  user_id: z.string().describe('Username or owner ID.'),
  activated: z.boolean().describe('Set activation status.'),
  confirm: z.literal(true).describe('Must be true. Safety guard to prevent accidental mutations.'),
})
```

**Output:**
```typescript
{ ownerId: number, username: string, activated: boolean, isAdmin: boolean }
```

---

### `list_user_sessions`

**Description:** List user login sessions for an organization. Requires admin access. Use this for security auditing — see who has active sessions and when they expire.

**API:** `GET /api/v2/{service}/{owner}/user-sessions/`

**Input:**
```typescript
z.object({
  service: ServiceEnum.optional(),
  owner: z.string().optional(),
  ...PaginationParams.shape,
})
```

**Output:**
```typescript
{
  count: number,
  sessions: Array<{
    username: string | null, name: string | null,
    hasActiveSession: boolean, expiryDate: string,
  }>
}
```

---

## Group 2: Repositories

### `list_repos`

**Description:** List all repositories for an owner that have been activated in Codecov. Returns coverage percentage, language, and activation state. Filterable by active status, specific names, or search term.

**API:** `GET /api/v2/{service}/{owner}/repos/`

**Input:**
```typescript
z.object({
  ...OwnerRepoParams.omit({ repo: true }).shape,
  active: z.boolean().optional().describe('Filter to repos that have received uploads (true) or not (false).'),
  names: z.array(z.string()).optional().describe('Filter to specific repo names.'),
  search: z.string().optional().describe('Search repos by name.'),
  ...PaginationParams.shape,
})
```

**Output:**
```typescript
{
  count: number,
  repos: Array<{
    name: string, private: boolean, activated: boolean,
    language: string | null, branch: string,
    active: boolean, updatedAt: string | null,
    totals: CoverageTotals | null,
  }>
}
```

---

### `get_repo`

**Description:** Get detailed metadata and current coverage for a single repository, including its default branch, activation status, and latest coverage totals.

**API:** `GET /api/v2/{service}/{owner}/repos/{repo}/`

**Input:** `OwnerRepoParams`

**Output:**
```typescript
{
  name: string, private: boolean, activated: boolean,
  language: string | null, branch: string,
  active: boolean, updatedAt: string | null,
  totals: CoverageTotals | null,
}
```

---

### `get_repo_config`

**Description:** Get the Codecov YAML configuration for a repository, including coverage targets, ignore paths, flags, and comment settings. Useful for understanding what thresholds and flags are configured.

**API:** `GET /api/v2/{service}/{owner}/repos/{repo}/config/`

**Input:** `OwnerRepoParams`

**Output:**
```typescript
{
  uploadToken: string | null,   // masked for security
  graphToken: string | null,    // masked for security
  yaml: object | null,          // parsed YAML config as JSON
}
```

**Note:** Token values should be masked (e.g., first 4 chars + `****`) to prevent accidental exposure.

---

## Group 3: Branches

### `list_branches`

**Description:** List all branches for a repository with their most recent commit SHA and coverage. Use this to compare coverage across branches or find branches with recent activity. Supports ordering.

**API:** `GET /api/v2/{service}/{owner}/repos/{repo}/branches/`

**Input:**
```typescript
z.object({
  ...OwnerRepoParams.shape,
  author: z.string().optional().describe('Filter by commit author username.'),
  ordering: z.string().optional().describe('Sort field (e.g. "updatestamp", "-updatestamp").'),
  ...PaginationParams.shape,
})
```

**Output:**
```typescript
{
  count: number,
  branches: Array<{
    name: string, updatedAt: string,
    headCommit: { sha: string, coverage: number | null, timestamp: string } | null,
  }>
}
```

---

### `get_branch`

**Description:** Get coverage data for a specific branch, including the head commit SHA and its coverage percentage.

**API:** `GET /api/v2/{service}/{owner}/repos/{repo}/branches/{name}/`

**Input:**
```typescript
z.object({
  ...OwnerRepoParams.shape,
  branch: z.string().describe('Branch name.'),
})
```

**Output:** Same shape as single branch in `list_branches`.

---

## Group 4: Commits

### `list_commits`

**Description:** List commits for a repository with their coverage percentages and processing state. Filterable by branch. Use this to find when coverage changed and which commits affected it.

**API:** `GET /api/v2/{service}/{owner}/repos/{repo}/commits/`

**Input:**
```typescript
z.object({
  ...OwnerRepoParams.shape,
  ...BranchParam.shape,
  ...PaginationParams.shape,
})
```

**Output:**
```typescript
{
  count: number,
  commits: Array<{
    sha: string, message: string | null, timestamp: string,
    author: { service: string, username: string, name: string } | null,
    branch: string | null, ciPassed: boolean | null,
    state: 'complete' | 'pending' | 'error' | 'skipped',
    totals: CoverageTotals | null,
    parent: string | null,
  }>
}
```

---

### `get_commit`

**Description:** Get detailed coverage data for a specific commit, including total lines, hits, misses, and partial coverage counts.

**API:** `GET /api/v2/{service}/{owner}/repos/{repo}/commits/{commitid}/`

**Input:**
```typescript
z.object({
  ...OwnerRepoParams.shape,
  sha: z.string().describe('Commit SHA.'),
})
```

**Output:** Same shape as single commit in `list_commits`.

---

### `list_commit_uploads`

**Description:** List all coverage uploads for a specific commit. Shows which flags were uploaded, upload state, and any errors. Use this to debug missing coverage or understand what flags contributed to a commit's coverage.

**API:** `GET /api/v2/{service}/{owner}/repos/{repo}/commits/{commitid}/uploads/`

**Input:**
```typescript
z.object({
  ...OwnerRepoParams.shape,
  sha: z.string().describe('Commit SHA.'),
  ...PaginationParams.shape,
})
```

**Output:**
```typescript
{
  count: number,
  uploads: Array<{
    uploadId: number, state: string, uploadType: string,
    flags: string[], createdAt: string, updatedAt: string,
    jobCode: string | null, buildCode: string | null,
    buildUrl: string | null, name: string | null,
    provider: string | null, totals: CoverageTotals | null,
    errors: Array<{ errorCode: string }>,
  }>
}
```

---

## Group 5: Coverage

### `get_coverage_trend`

**Description:** Get time-series coverage statistics for a repository over a specified interval. Each data point contains the min, max, and average coverage percentage for that interval. Use this to detect coverage trends, regression, or improvement over time.

**API:** `GET /api/v2/{service}/{owner}/repos/{repo}/coverage/`

**Input:**
```typescript
z.object({
  ...OwnerRepoParams.shape,
  ...BranchParam.shape,
  interval: z.enum(['1d', '7d', '30d'])
    .describe('Aggregation interval. 1d=daily, 7d=weekly, 30d=monthly. REQUIRED.'),
  start_date: z.string().optional().describe('Start date (ISO 8601, e.g. 2024-01-01).'),
  end_date: z.string().optional().describe('End date (ISO 8601).'),
  ...PaginationParams.shape,
})
```

**Output:**
```typescript
{
  count: number,
  dataPoints: Array<{
    timestamp: string,   // start of interval
    min: number,         // minimum coverage % in interval
    max: number,         // maximum coverage % in interval
    avg: number,         // average coverage % in interval
  }>
}
```

**Note:** `interval` is **required** by the API.

---

### `get_coverage_totals`

**Description:** Get a coverage summary for a commit — overall coverage percentage, total lines, hits, misses, partials, branches, methods, and complexity. The fastest way to get a coverage number. Filterable by flag, path prefix, or component.

**API:** `GET /api/v2/{service}/{owner}/repos/{repo}/totals/`

**Input:**
```typescript
z.object({
  ...OwnerRepoParams.shape,
  ...ShaParam.shape,
  ...BranchParam.shape,
  flag: z.string().optional().describe('Filter to a specific flag (e.g. unit, integration).'),
  path: z.string().optional().describe('Filter to files under this path prefix.'),
  component_id: z.string().optional().describe('Filter to a specific component.'),
})
```

**Output:**
```typescript
{
  totals: CoverageTotals,
  files: Array<{ name: string, totals: CoverageTotals }> | null,
}
```

---

### `get_coverage_report`

**Description:** Get the full coverage report for a commit, broken down by file. Returns coverage percentage and line counts for every file. Filterable by flag, path prefix, or component.

**API:** `GET /api/v2/{service}/{owner}/repos/{repo}/report/`

**Input:**
```typescript
z.object({
  ...OwnerRepoParams.shape,
  ...ShaParam.shape,
  ...BranchParam.shape,
  flag: z.string().optional().describe('Filter to a specific flag.'),
  path: z.string().optional().describe('Filter to files under this path prefix.'),
  component_id: z.string().optional().describe('Filter to a specific component.'),
})
```

**Output:**
```typescript
{
  totals: CoverageTotals,
  files: Array<{
    name: string,
    totals: CoverageTotals,
    lineCoverage: Array<[number, CoverageValue]>,  // [lineNum, hitCount|null]
  }>
}
```

---

### `get_coverage_tree`

**Description:** Get hierarchical coverage data organized by directory structure. Returns coverage percentages at each directory level. Use `depth` to control how many levels deep. More useful than per-file listing for large repos to identify which parts of the codebase have the lowest coverage.

**API:** `GET /api/v2/{service}/{owner}/repos/{repo}/report/tree`

**Input:**
```typescript
z.object({
  ...OwnerRepoParams.shape,
  ...ShaParam.shape,
  ...BranchParam.shape,
  path: z.string().optional().describe('Root path to start tree from. Defaults to repo root.'),
  depth: z.number().int().min(1).max(10).optional().default(1)
    .describe('Directory levels deep to return. Default 1.'),
  flag: z.string().optional().describe('Filter to a specific flag.'),
  component_id: z.string().optional().describe('Filter to a specific component.'),
})
```

**Output:**
```typescript
{
  items: Array<{
    name: string,
    fullPath: string,
    coverage: number,
    lines: number, hits: number, misses: number, partials: number,
  }>
}
```

---

### `get_file_coverage`

**Description:** Get line-by-line coverage data for a specific file. Returns hit count per line, showing exactly which lines are covered, uncovered, or partially covered. Essential for identifying untested code within a file you are editing.

**API:** `GET /api/v2/{service}/{owner}/repos/{repo}/file_report/{path}/`

**Input:**
```typescript
z.object({
  ...OwnerRepoParams.shape,
  file_path: z.string().describe('Path to file relative to repo root (e.g. src/utils/parser.ts).'),
  ...ShaParam.shape,
  ...BranchParam.shape,
})
```

**Output:**
```typescript
{
  filePath: string,
  commitSha: string,
  commitFileUrl: string,
  totals: CoverageTotals,
  lineCoverage: Array<{
    lineNumber: number,
    coverage: 'hit' | 'miss' | 'partial' | null,
    hitCount: number | null,
  }>,
  uncoveredLines: number[],    // convenience: just the uncovered line numbers
}
```

**Note:** The `uncoveredLines` field is computed by the MCP server (not from the API) for AI convenience — reduces token usage when the agent only needs to know what's missing.

---

## Group 6: Comparison

### `compare_coverage`

**Description:** Compare coverage between two commits, branches, or a pull request. Returns overall coverage delta and lists files that changed coverage. The primary tool for understanding how a code change affected test coverage.

**API:** `GET /api/v2/{service}/{owner}/repos/{repo}/compare/`

**Input:**
```typescript
z.object({
  ...OwnerRepoParams.shape,
  ...CompareParams.shape,
})
```

**Output:**
```typescript
{
  baseCommit: string, headCommit: string,
  totals: { base: CoverageTotals | null, head: CoverageTotals | null, diff: CoverageTotals | null },
  files: Array<{
    name: string,
    baseTotals: CoverageTotals | null,
    headTotals: CoverageTotals | null,
    diffTotals: CoverageTotals | null,
    hasChanged: boolean,
  }>,
  untracked: string[],
}
```

---

### `compare_components`

**Description:** Compare coverage by component between two commits. Components are logical groupings defined in codecov.yaml (e.g. frontend, backend). Use this in monorepos.

**API:** `GET /api/v2/{service}/{owner}/repos/{repo}/compare/components`

**Input:**
```typescript
z.object({
  ...OwnerRepoParams.shape,
  ...CompareParams.shape,
})
```

**Output:**
```typescript
{
  components: Array<{
    componentId: string, name: string,
    baseReportTotals: CoverageTotals, headReportTotals: CoverageTotals, diffTotals: CoverageTotals,
  }>
}
```

---

### `compare_file`

**Description:** Get line-by-line coverage comparison for a single file between two commits. Shows which lines changed coverage status.

**API:** `GET /api/v2/{service}/{owner}/repos/{repo}/compare/file/{file_path}`

**Input:**
```typescript
z.object({
  ...OwnerRepoParams.shape,
  ...CompareParams.shape,
  file_path: z.string().describe('File path relative to repo root.'),
})
```

**Output:**
```typescript
{
  name: string,
  totals: { base: CoverageTotals | null, head: CoverageTotals | null, diff: CoverageTotals | null },
  hasDiff: boolean,
  changeSummary: { linesAdded: number, linesRemoved: number, coverageChange: number | null },
  lines: Array<{
    value: string, number: { base: number | null, head: number | null },
    coverage: { base: CoverageValue, head: CoverageValue },
    isDiff: boolean, isAdded: boolean, isRemoved: boolean,
  }>
}
```

---

### `compare_flags`

**Description:** Compare coverage by flag (e.g. unit, integration, e2e) between two commits. See which test category gained or lost coverage.

**API:** `GET /api/v2/{service}/{owner}/repos/{repo}/compare/flags`

**Input:**
```typescript
z.object({
  ...OwnerRepoParams.shape,
  ...CompareParams.shape,
})
```

**Output:**
```typescript
{
  flags: Array<{
    name: string,
    baseReportTotals: CoverageTotals | null,
    headReportTotals: CoverageTotals,
    diffTotals: CoverageTotals,
  }>
}
```

---

### `compare_impacted_files`

**Description:** List only files with changed coverage between two commits. More efficient than full comparison when you only need to know which files got better or worse. Returns a `state` field: 'processed' when complete, 'pending' when still computing.

**API:** `GET /api/v2/{service}/{owner}/repos/{repo}/compare/impacted_files`

**Input:**
```typescript
z.object({
  ...OwnerRepoParams.shape,
  ...CompareParams.shape,
})
```

**Output:**
```typescript
{
  state: 'processed' | 'pending',
  baseCommit: string, headCommit: string,
  totals: { base: CoverageTotals | null, head: CoverageTotals | null, diff: CoverageTotals | null },
  files: Array<{
    name: string,
    baseTotals: CoverageTotals | null,
    headTotals: CoverageTotals | null,
    diffTotals: CoverageTotals | null,
    hasChanged: boolean,
  }>,
  untracked: string[],
}
```

**Note:** When `state` is `'pending'`, the response message should indicate the comparison is still being computed and suggest retrying.

---

### `compare_segments`

**Description:** Get segment-level (chunk) coverage diffs for a file between two commits. Each segment shows a contiguous block of changed lines with their before/after coverage. This is the most granular diff available.

**API:** `GET /api/v2/{service}/{owner}/repos/{repo}/compare/segments/{file_path}`

**Input:**
```typescript
z.object({
  ...OwnerRepoParams.shape,
  ...CompareParams.shape,
  file_path: z.string().describe('File path relative to repo root.'),
})
```

**Output:**
```typescript
{
  segments: Array<{
    header: string,
    hasUnintendedChanges: boolean,
    lines: Array<{
      value: string, number: { base: number | null, head: number | null },
      coverage: { base: CoverageValue, head: CoverageValue },
      isDiff: boolean, isAdded: boolean, isRemoved: boolean,
    }>
  }>
}
```

---

## Group 7: Pull Requests

### `list_pulls`

**Description:** List pull requests for a repository with their coverage state. Filterable by state (open/merged/closed) and date. Use this to audit which open PRs are reducing coverage.

**API:** `GET /api/v2/{service}/{owner}/repos/{repo}/pulls/`

**Input:**
```typescript
z.object({
  ...OwnerRepoParams.shape,
  state: z.enum(['open', 'closed', 'merged']).optional()
    .describe('Filter PRs by state. Omit for all.'),
  start_date: z.string().optional().describe('Filter PRs updated after this date (ISO 8601).'),
  ordering: z.string().optional().describe('Sort field (e.g. "pullid", "-pullid").'),
  ...PaginationParams.shape,
})
```

**Output:**
```typescript
{
  count: number,
  pulls: Array<{
    pullId: number, title: string | null, state: 'open' | 'merged' | 'closed',
    author: { service: string, username: string, name: string } | null,
    baseTotals: CoverageTotals | null, headTotals: CoverageTotals | null,
    updatedAt: string, ciPassed: boolean | null,
  }>
}
```

---

### `get_pull`

**Description:** Get detailed coverage information for a specific pull request, including base/head totals and comparison data. The primary tool for PR-level coverage review.

**API:** `GET /api/v2/{service}/{owner}/repos/{repo}/pulls/{pullid}/`

**Input:**
```typescript
z.object({
  ...OwnerRepoParams.shape,
  pullid: z.number().int().describe('Pull request number.'),
})
```

**Output:** Same shape as single pull in `list_pulls`.

---

## Group 8: Flags

### `list_flags`

**Description:** List all coverage flags for a repository (e.g. unit, integration, e2e, frontend, backend) with their current coverage percentage. Use this to discover which flags exist before querying flag-specific trends.

**API:** `GET /api/v2/{service}/{owner}/repos/{repo}/flags/`

**Input:**
```typescript
z.object({
  ...OwnerRepoParams.shape,
  ...PaginationParams.shape,
})
```

**Output:**
```typescript
{
  count: number,
  flags: Array<{ flagName: string, coverage: number | null }>
}
```

---

### `get_flag_coverage_trend`

**Description:** Get time-series coverage data for a specific flag. Track how unit test coverage, integration test coverage, or any other flag category is trending over time — independently of overall repo coverage.

**API:** `GET /api/v2/{service}/{owner}/repos/{repo}/flags/{flag_name}/coverage/`

**Input:**
```typescript
z.object({
  ...OwnerRepoParams.shape,
  flag: z.string().describe('Flag name (e.g. unit, integration, e2e).'),
  interval: z.enum(['1d', '7d', '30d'])
    .describe('Aggregation interval. REQUIRED.'),
  ...BranchParam.shape,
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  ...PaginationParams.shape,
})
```

**Output:** Same shape as `get_coverage_trend`.

---

## Group 9: Components

### `list_components`

**Description:** List all components defined for a repository with their current coverage. Components are logical file groupings defined in codecov.yaml. Use this to see coverage per module in monorepos.

**API:** `GET /api/v2/{service}/{owner}/repos/{repo}/components/`

**Input:**
```typescript
z.object({
  ...OwnerRepoParams.shape,
  ...BranchParam.shape,
  ...ShaParam.shape,
})
```

**Output:**
```typescript
{
  components: Array<{
    componentId: string, name: string, coverage: number | null,
  }>
}
```

**Note:** Components endpoint returns a flat array, NOT paginated.

---

## Group 10: Test Analytics

### `list_test_analytics`

**Description:** List test runs for a repository from Codecov Test Analytics. Returns tests with their pass/fail outcome, duration, failure message, and framework. Filterable by branch, commit, outcome, and duration range. Test data is retained for 60 days.

**API:** `GET /api/v2/{service}/{owner}/repos/{repo}/test-analytics/`

**Input:**
```typescript
z.object({
  ...OwnerRepoParams.shape,
  branch: z.string().optional().describe('Filter by branch name.'),
  commit_sha: z.string().optional().describe('Filter by commit SHA.'),
  outcome: z.enum(['pass', 'failure', 'error', 'skip']).optional()
    .describe('Filter by test outcome.'),
  duration_min: z.number().int().optional().describe('Minimum duration in seconds.'),
  duration_max: z.number().int().optional().describe('Maximum duration in seconds.'),
  ...PaginationParams.shape,
})
```

**Output:**
```typescript
{
  count: number,
  testRuns: Array<{
    testId: string, name: string | null,
    classname: string | null, testsuite: string | null,
    computedName: string | null,
    outcome: 'pass' | 'failure' | 'error' | 'skip',
    durationSeconds: number | null,
    failureMessage: string | null,
    framework: string | null, filename: string | null,
    commitSha: string | null, branch: string | null,
    flags: string[] | null, uploadId: number | null,
    timestamp: string,
  }>
}
```

**Note:** The `/test-results/` endpoints are deprecated (HTTP 301). This `/test-analytics/` endpoint is the replacement.

---

## Group 11: Evaluations

### `get_eval_summary`

**Description:** Get a summary of AI/LLM evaluations for a repository and commit. Returns average duration, cost, pass/fail counts, and per-metric scores (e.g. accuracy, relevance). Use this to track AI model quality between commits. Supports filtering by classname (describe block in vitest, or run name in Langfuse).

**API:** `GET /api/v2/{service}/{owner}/repos/{repo}/evals/summary/`

**Input:**
```typescript
z.object({
  ...OwnerRepoParams.shape,
  commit: z.string().optional().describe('Commit SHA for evaluation summary.'),
  classname: z.string().optional().describe('Filter by class name, describe block, or Langfuse run name.'),
})
```

**Output:**
```typescript
{
  avgDurationSeconds: number,
  avgCost: number,
  totalItems: number,
  passedItems: number,
  failedItems: number,
  scores: Record<string, { sum: number, avg: number }>,
}
```

**Note:** Requires `TA_TIMESERIES_ENABLED` permission. This is a newer endpoint — schema may evolve.

---

### `get_eval_comparison`

**Description:** Compare AI/LLM evaluation metrics between two commits. Use this to detect model regressions or improvements.

**API:** `GET /api/v2/{service}/{owner}/repos/{repo}/evals/compare/`

**Input:**
```typescript
z.object({
  ...OwnerRepoParams.shape,
  base_sha: z.string().optional().describe('Base commit SHA.'),
  head_sha: z.string().optional().describe('Head commit SHA.'),
})
```

**Output:**
```typescript
{
  base: { avgDurationSeconds: number, avgCost: number, totalItems: number, passedItems: number, failedItems: number, scores: Record<string, { sum: number, avg: number }> } | null,
  head: { avgDurationSeconds: number, avgCost: number, totalItems: number, passedItems: number, failedItems: number, scores: Record<string, { sum: number, avg: number }> } | null,
  diff: { durationChange: number | null, costChange: number | null, passRateChange: number | null } | null,
}
```

**Note:** Evaluations are a newer Codecov feature. Response shape is typed to current known schema but may gain additional fields over time. Unknown fields will be passed through.

---

## Group 12: Utility & Composite Tools

### `validate_yaml`

**Description:** Validate a codecov.yaml configuration file. Returns whether the YAML is valid and any error messages. Use this before committing codecov.yaml changes to catch configuration errors early.

**API:** `POST {baseUrl}/validate` (uses `CODECOV_API_BASE_URL`, defaults to `https://api.codecov.io`)

**Input:**
```typescript
z.object({
  yaml_content: z.string().describe('Raw codecov.yaml content to validate.'),
})
```

**Output:**
```typescript
{
  valid: boolean,
  message: string,        // "Valid!" or error description
}
```

**Note:** This endpoint does not require authentication. The server must not enforce `CODECOV_TOKEN` for this tool.

---

### `find_flaky_tests`

**Description:** Find tests that are flaky — tests that have failed on the default branch, indicating intermittent failures unrelated to code changes. Wraps list_test_analytics with failure-focused filtering and returns results sorted by most recent failures. Use this to identify tests that need stabilization.

**API:** Composite — wraps `GET /api/v2/{service}/{owner}/repos/{repo}/test-analytics/`

**Input:**
```typescript
z.object({
  ...OwnerRepoParams.shape,
  branch: z.string().optional().describe('Branch to check. Defaults to default branch.'),
  ...PaginationParams.shape,
})
```

**Output:**
```typescript
{
  flakyTestCount: number,
  flakyTests: Array<{
    testId: string, name: string | null,
    testsuite: string | null, classname: string | null,
    durationSeconds: number | null,
    failureMessage: string | null,
    framework: string | null,
    lastFailedAt: string,
  }>
}
```

**Implementation:** Calls `list_test_analytics` with `outcome=failure` on the default branch. Tests that fail on the default branch (not just feature branches) are strong flaky test candidates because the default branch should be green.

---

### `get_coverage_summary`

**Description:** Get a quick, comprehensive coverage health summary for a repository in a single call. Combines repo coverage, 30-day trend direction, flag breakdown, and open PR count. Use this at the start of a session to get full situational awareness before diving into specifics.

**API:** Composite — calls `get_repo`, `get_coverage_trend` (with `interval`), `list_flags`, `list_pulls`

**Input:**
```typescript
z.object({
  ...OwnerRepoParams.shape,
  interval: z.enum(['1d', '7d', '30d']).optional().default('30d')
    .describe('Trend aggregation interval. Defaults to 30d.'),
})
```

**Output:**
```typescript
{
  repo: { name: string, branch: string, coverage: number | null },
  trend: {
    direction: 'improving' | 'declining' | 'stable',
    thirtyDayDelta: number | null,
    dataPoints: Array<{ timestamp: string, avg: number }>,
  },
  flags: Array<{ flagName: string, coverage: number | null }>,
  openPullCount: number,
}
```

**Value:** Without this tool, getting full situational awareness requires 4 separate tool calls. This reduces latency and token overhead at session start.

---

## MCP Prompts

### `coverage_review`

**Description:** Run a comprehensive coverage review for a repository. Checks overall trends, identifies lowest-coverage areas, and flags regressions.

**Arguments:** `owner` (optional), `repo` (optional)

**Template:**
```
Review the coverage for {{owner}}/{{repo}}.
1. Get the coverage summary to understand current state
2. Check the coverage tree to find the 5 lowest-coverage directories
3. Look at the 30-day trend — is coverage improving, declining, or stable?
4. List any flags and their coverage percentages
5. Summarize findings with specific recommendations
```

---

### `pr_coverage_check`

**Description:** Check the coverage impact of a specific pull request before merge.

**Arguments:** `owner` (optional), `repo` (optional), `pullid` (required)

**Template:**
```
Check the coverage impact of PR #{{pullid}} in {{owner}}/{{repo}}.
1. Get the PR details including patch coverage
2. Compare impacted files between base and head
3. Identify any files that lost coverage
4. Check if any new files are completely untested
5. Report: patch coverage %, files that lost coverage, and recommendation (safe to merge / needs tests)
```

---

### `suggest_tests`

**Description:** Analyze a file's coverage and suggest which test cases should be written.

**Arguments:** `owner` (optional), `repo` (optional), `file_path` (required)

**Template:**
```
Analyze test coverage for {{file_path}} in {{owner}}/{{repo}}.
1. Get line-by-line coverage for the file
2. Identify all uncovered lines and group them by function/method
3. For each uncovered block, describe what the code does and suggest a specific test case
4. Prioritize suggestions by: error handling paths first, then business logic, then utilities
```

---

### `flaky_test_report`

**Description:** Identify and triage flaky tests in a repository.

**Arguments:** `owner` (optional), `repo` (optional)

**Template:**
```
Identify flaky tests in {{owner}}/{{repo}}.
1. Find tests that have failed on the default branch
2. For each flaky test, show: name, failure message, duration, and how recently it failed
3. Group by test suite or framework
4. Prioritize which tests to fix first based on failure frequency and impact
5. Suggest concrete next steps for each high-priority flaky test
```

---

### `coverage_health_check`

**Description:** Run a full health check combining coverage, trends, test health, and PR status.

**Arguments:** `owner` (optional), `repo` (optional)

**Template:**
```
Run a complete coverage health check for {{owner}}/{{repo}}.
1. Get coverage summary (overall coverage, trend, flags)
2. Find the 5 lowest-coverage directories in the coverage tree
3. Check for flaky tests on the default branch
4. List open PRs and their coverage impact
5. Produce a health report card with: overall grade, trend direction, top risks, and recommended actions
```

---

## MCP Resources

### `codecov://{owner}/repos`
**Description:** List of all repositories for a specific owner accessible to the configured token with their current coverage. Owner is resolved via parameter resolution order (env var or git remote).
**Implementation:** Calls `list_repos` with the resolved owner.

### `codecov://repo/{owner}/{repo}`
**Description:** Current coverage summary for a specific repository.
**Implementation:** Calls `get_repo`.

### `codecov://repo/{owner}/{repo}/flags`
**Description:** Coverage flags and their current percentages for a repository.
**Implementation:** Calls `list_flags`.

### `codecov://repo/{owner}/{repo}/components`
**Description:** Coverage components and their current percentages for a repository.
**Implementation:** Calls `list_components`.

---

## Appendix A: Shared Output Types

### CoverageValue

Used in line-level coverage data (file reports, comparisons, segments):

```typescript
type CoverageValue = number | null
// number = hit count for that line (0 = uncovered, >0 = covered N times)
// null = line is not relevant to coverage (blank, comment, declaration)
```

### CoverageTotals

Used across many tools:

```typescript
interface CoverageTotals {
  files: number
  lines: number
  hits: number
  misses: number
  partials: number
  coverage: number | null    // percentage, e.g. 82.4
  branches: number
  methods: number
  sessions: number
  complexity: number | null
  complexityTotal: number | null
  complexityRatio: number | null
  diff: object | null
}
```

---

## Appendix B: Error Messages

All error responses must be human-readable and actionable:

| Scenario | Message |
|----------|---------|
| Missing token | `CODECOV_TOKEN is not set. Generate an API token at: Codecov Settings > Access > Generate Token` |
| 404 repo | `Repository '{owner}/{repo}' not found on Codecov. Ensure it has been activated at codecov.io.` |
| 404 flag | `Flag '{flag}' not found. Use list_flags to see available flags.` |
| 404 branch | `Branch '{branch}' not found. Use list_branches to see available branches.` |
| 401 | `Authentication failed. Verify your CODECOV_TOKEN is valid. If using an upload token, switch to an API access token.` |
| 403 | `Access denied. Your token may not have permission to access {owner}/{repo}.` |
| 429 | `Rate limit reached. Retrying in {n}s...` |
| Pending comparison | `Comparison is still being computed (state: pending). Try again in a few seconds.` |

---

## Appendix C: Complete API Path Reference

| Tool | Method | Path |
|------|--------|------|
| `list_owners` | GET | `/api/v2/{service}/` |
| `get_owner` | GET | `/api/v2/{service}/{owner}/` |
| `list_users` | GET | `/api/v2/{service}/{owner}/users/` |
| `get_user` | GET | `/api/v2/{service}/{owner}/users/{user_id}/` |
| `update_user` | PATCH | `/api/v2/{service}/{owner}/users/{user_id}/` |
| `list_user_sessions` | GET | `/api/v2/{service}/{owner}/user-sessions/` |
| `list_repos` | GET | `/api/v2/{service}/{owner}/repos/` |
| `get_repo` | GET | `/api/v2/{service}/{owner}/repos/{repo}/` |
| `get_repo_config` | GET | `/api/v2/{service}/{owner}/repos/{repo}/config/` |
| `list_branches` | GET | `.../repos/{repo}/branches/` |
| `get_branch` | GET | `.../repos/{repo}/branches/{name}/` |
| `list_commits` | GET | `.../repos/{repo}/commits/` |
| `get_commit` | GET | `.../repos/{repo}/commits/{commitid}/` |
| `list_commit_uploads` | GET | `.../repos/{repo}/commits/{commitid}/uploads/` |
| `get_coverage_trend` | GET | `.../repos/{repo}/coverage/` |
| `get_coverage_totals` | GET | `.../repos/{repo}/totals/` |
| `get_coverage_report` | GET | `.../repos/{repo}/report/` |
| `get_coverage_tree` | GET | `.../repos/{repo}/report/tree` |
| `get_file_coverage` | GET | `.../repos/{repo}/file_report/{path}/` |
| `compare_coverage` | GET | `.../repos/{repo}/compare/` |
| `compare_components` | GET | `.../repos/{repo}/compare/components` |
| `compare_file` | GET | `.../repos/{repo}/compare/file/{path}` |
| `compare_flags` | GET | `.../repos/{repo}/compare/flags` |
| `compare_impacted_files` | GET | `.../repos/{repo}/compare/impacted_files` |
| `compare_segments` | GET | `.../repos/{repo}/compare/segments/{path}` |
| `list_pulls` | GET | `.../repos/{repo}/pulls/` |
| `get_pull` | GET | `.../repos/{repo}/pulls/{pullid}/` |
| `list_flags` | GET | `.../repos/{repo}/flags/` |
| `get_flag_coverage_trend` | GET | `.../repos/{repo}/flags/{flag_name}/coverage/` |
| `list_components` | GET | `.../repos/{repo}/components/` |
| `list_test_analytics` | GET | `.../repos/{repo}/test-analytics/` |
| `get_eval_summary` | GET | `.../repos/{repo}/evals/summary/` |
| `get_eval_comparison` | GET | `.../repos/{repo}/evals/compare/` |
| `validate_yaml` | POST | `{baseUrl}/validate` |
| `find_flaky_tests` | — | Composite (wraps list_test_analytics) |
| `get_coverage_summary` | — | Composite (wraps multiple endpoints) |
