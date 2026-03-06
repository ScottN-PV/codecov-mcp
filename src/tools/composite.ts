import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { Config } from '../types.js'
import type { CodecovClient } from '../client.js'
import { OwnerRepoParams, BranchParam, PaginationParams } from '../schemas/shared.js'
import { resolveRepoParams } from '../utils/resolve-params.js'
import { normalizeKeysDeep } from '../utils/format.js'
import { toolResult, withErrorHandling } from '../utils/tool-result.js'

interface TrendPoint {
  timestamp: string
  avg: number
}

function computeTrend(results: Array<Record<string, unknown>> | undefined): {
  direction: 'improving' | 'declining' | 'stable'
  thirtyDayDelta: number | null
  dataPoints: TrendPoint[]
} {
  if (!results || results.length < 2) {
    return { direction: 'stable', thirtyDayDelta: null, dataPoints: [] }
  }

  const dataPoints: TrendPoint[] = []
  for (const point of results) {
    const p = point as { timestamp?: string; avg?: number }
    if (p.timestamp && p.avg != null) {
      dataPoints.push({ timestamp: p.timestamp, avg: p.avg })
    }
  }

  const first = results[0] as { avg?: number }
  const last = results.at(-1) as { avg?: number }
  let thirtyDayDelta: number | null = null
  let direction: 'improving' | 'declining' | 'stable' = 'stable'

  if (first.avg != null && last?.avg != null) {
    thirtyDayDelta = last.avg - first.avg
    if (thirtyDayDelta > 0.5) direction = 'improving'
    else if (thirtyDayDelta < -0.5) direction = 'declining'
  }

  return { direction, thirtyDayDelta, dataPoints }
}

export function registerCompositeTools(server: McpServer, config: Config, client: CodecovClient) {
  server.registerTool(
    'validate_yaml',
    {
      description: 'Validate a codecov.yaml configuration file. Returns whether the YAML is valid and any error messages. Use this before committing codecov.yaml changes to catch configuration errors early. Does not require authentication.',
      annotations: { readOnlyHint: true },
      inputSchema: {
        yaml_content: z.string().describe('Raw codecov.yaml content to validate.'),
      },
    },
    withErrorHandling(async (args) => {
      const validateUrl = `${config.baseUrl}/validate`
      const data = await client.postPublic<Record<string, unknown>>(validateUrl, args.yaml_content)
      return toolResult(normalizeKeysDeep(data))
    }),
  )

  server.registerTool(
    'find_flaky_tests',
    {
      description: 'Find tests that are flaky — tests that have failed on the default branch, indicating intermittent failures unrelated to code changes. Returns results sorted by most recent failures. Use this to identify tests that need stabilization.',
      annotations: { readOnlyHint: true },
      inputSchema: {
        ...OwnerRepoParams.shape,
        ...BranchParam.shape,
        ...PaginationParams.shape,
      },
    },
    withErrorHandling(async (args) => {
      const { service, owner, repo } = resolveRepoParams(config, args)
      const params: Record<string, string | number | boolean> = {
        outcome: 'failure',
        ordering: '-updated_at',
        page: args.page ?? 1,
        page_size: args.page_size ?? 25,
      }
      if (args.branch) params.branch = args.branch

      const data = await client.list<Record<string, unknown>>(
        `/api/v2/${service}/${owner}/repos/${repo}/test-analytics/`,
        params,
      )
      return toolResult({
        count: data.count,
        flakyTests: data.results.map(r => normalizeKeysDeep(r)),
        _note: 'Tests that fail on the default branch are strong flaky test candidates because the default branch should always be green.',
      })
    }),
  )

  server.registerTool(
    'get_coverage_summary',
    {
      description: 'Get a quick, comprehensive coverage health summary for a repository in a single call. Combines repo coverage, trend direction, flag breakdown, and open PR count. Use this at the start of a session to get full situational awareness before diving into specifics.',
      annotations: { readOnlyHint: true },
      inputSchema: {
        ...OwnerRepoParams.shape,
        interval: z.enum(['1d', '7d', '30d']).optional().default('30d')
          .describe('Trend aggregation interval. Defaults to 30d.'),
      },
    },
    withErrorHandling(async (args) => {
      const { service, owner, repo } = resolveRepoParams(config, args)
      const basePath = `/api/v2/${service}/${owner}/repos/${repo}`

      const [repoData, trendData, flagsData, pullsData] = await Promise.all([
        client.get<Record<string, unknown>>(`${basePath}/`),
        client.get<Record<string, unknown>>(`${basePath}/coverage/`, {
          interval: args.interval ?? '30d',
          page_size: 100,
        }),
        client.list<Record<string, unknown>>(`${basePath}/flags/`, { page_size: 100 }),
        client.list<Record<string, unknown>>(`${basePath}/pulls/`, { state: 'open', page_size: 1 }),
      ])

      const trendResults = trendData.results as Array<Record<string, unknown>> | undefined
      const trend = computeTrend(trendResults)

      const repoNormalized = normalizeKeysDeep(repoData) as Record<string, unknown>
      const totals = repoNormalized.totals as Record<string, unknown> | undefined

      return toolResult({
        repo: {
          name: repoNormalized.name,
          branch: repoNormalized.branch,
          coverage: totals?.coverage ?? null,
        },
        trend,
        flags: flagsData.results.map(f => normalizeKeysDeep(f)),
        openPullCount: pullsData.count,
      })
    }),
  )

  server.registerTool(
    'get_pr_coverage',
    {
      description: 'Get a comprehensive coverage summary for a pull request in a single call. Combines PR details (patch/base/head coverage) with the top files that had coverage changes, sorted by largest impact. This is the go-to tool for code review workflows — use it to answer "how does this PR affect coverage?"',
      annotations: { readOnlyHint: true },
      inputSchema: {
        ...OwnerRepoParams.shape,
        pullid: z.number().int().describe('Pull request number.'),
        max_files: z.number().int().min(1).max(100).optional().default(15)
          .describe('Maximum number of impacted files to include (sorted by largest coverage change). Default 15. Use compare_impacted_files for full paginated access.'),
      },
    },
    withErrorHandling(async (args) => {
      const { service, owner, repo } = resolveRepoParams(config, args)
      const basePath = `/api/v2/${service}/${owner}/repos/${repo}`

      const [pullData, impactedData] = await Promise.all([
        client.get<Record<string, unknown>>(`${basePath}/pulls/${args.pullid}/`),
        client.get<Record<string, unknown>>(`${basePath}/compare/impacted_files`, { pullid: args.pullid }),
      ])

      const pullNormalized = normalizeKeysDeep(pullData) as Record<string, unknown>
      const impactedNormalized = normalizeKeysDeep(impactedData) as Record<string, unknown>

      let allFiles = ((impactedNormalized.files ?? impactedNormalized.impactedFiles ?? []) as Array<Record<string, unknown>>)
      const totalFiles = allFiles.length

      // Sort by absolute coverage change (largest impact first)
      allFiles = allFiles.slice().sort((a, b) => {
        const aDiff = a.diffTotals as Record<string, unknown> | null
        const bDiff = b.diffTotals as Record<string, unknown> | null
        const aChange = typeof aDiff?.coverage === 'number' ? Math.abs(aDiff.coverage) : 0
        const bChange = typeof bDiff?.coverage === 'number' ? Math.abs(bDiff.coverage) : 0
        return bChange - aChange
      })

      const maxFiles = args.max_files
      const truncated = allFiles.length > maxFiles

      const result: Record<string, unknown> = {
        pullid: args.pullid,
        title: pullNormalized.title,
        state: pullNormalized.state,
        baseCoverage: pullNormalized.baseTotals,
        headCoverage: pullNormalized.headTotals,
        patchCoverage: pullNormalized.patchTotals,
        ciPassed: pullNormalized.ciPassed,
        totalImpactedFiles: impactedNormalized.state === 'pending' ? null : totalFiles,
        impactedFiles: allFiles.slice(0, maxFiles),
        comparisonState: impactedNormalized.state,
      }

      if (truncated) {
        result._truncated = `Showing top ${maxFiles} of ${totalFiles} impacted files (sorted by largest change). Use compare_impacted_files with pagination for full list.`
      }

      if (impactedNormalized.state === 'pending') {
        result._note = 'Comparison is still being computed. Impacted files may be incomplete. Try again in a few seconds.'
      }

      return toolResult(result)
    }),
  )
}
