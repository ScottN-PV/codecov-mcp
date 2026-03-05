import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { Config } from '../types.js'
import type { CodecovClient } from '../client.js'
import { OwnerRepoParams, BranchParam, PaginationParams } from '../schemas/shared.js'
import { resolveRepoParams } from '../utils/resolve-params.js'
import { normalizeKeysDeep } from '../utils/format.js'
import { toolResult, withErrorHandling } from '../utils/tool-result.js'

export function registerCompositeTools(server: McpServer, config: Config, client: CodecovClient) {
  server.tool(
    'validate_yaml',
    'Validate a codecov.yaml configuration file. Returns whether the YAML is valid and any error messages. Use this before committing codecov.yaml changes to catch configuration errors early. Does not require authentication.',
    {
      yaml_content: z.string().describe('Raw codecov.yaml content to validate.'),
    },
    withErrorHandling(async (args) => {
      const validateUrl = `${config.baseUrl}/validate`
      const data = await client.postPublic<Record<string, unknown>>(validateUrl, args.yaml_content)
      return toolResult(normalizeKeysDeep(data))
    }),
  )

  server.tool(
    'find_flaky_tests',
    'Find tests that are flaky — tests that have failed on the default branch, indicating intermittent failures unrelated to code changes. Returns results sorted by most recent failures. Use this to identify tests that need stabilization.',
    {
      ...OwnerRepoParams.shape,
      ...BranchParam.shape,
      ...PaginationParams.shape,
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
        flakyTests: (data.results as Record<string, unknown>[]).map(r => normalizeKeysDeep(r)),
        _note: 'Tests that fail on the default branch are strong flaky test candidates because the default branch should always be green.',
      })
    }),
  )

  server.tool(
    'get_coverage_summary',
    'Get a quick, comprehensive coverage health summary for a repository in a single call. Combines repo coverage, trend direction, flag breakdown, and open PR count. Use this at the start of a session to get full situational awareness before diving into specifics.',
    {
      ...OwnerRepoParams.shape,
      interval: z.enum(['1d', '7d', '30d']).optional().default('30d')
        .describe('Trend aggregation interval. Defaults to 30d.'),
    },
    withErrorHandling(async (args) => {
      const { service, owner, repo } = resolveRepoParams(config, args)
      const basePath = `/api/v2/${service}/${owner}/repos/${repo}`

      // Execute all 4 API calls in parallel
      const [repoData, trendData, flagsData, pullsData] = await Promise.all([
        client.get<Record<string, unknown>>(`${basePath}/`),
        client.get<Record<string, unknown>>(`${basePath}/coverage/`, {
          interval: args.interval ?? '30d',
          page_size: 100,
        }),
        client.list<Record<string, unknown>>(`${basePath}/flags/`, { page_size: 100 }),
        client.list<Record<string, unknown>>(`${basePath}/pulls/`, { state: 'open', page_size: 1 }),
      ])

      // Compute trend direction
      const results = (trendData as Record<string, unknown>).results as Array<Record<string, unknown>> | undefined
      let direction: 'improving' | 'declining' | 'stable' = 'stable'
      let thirtyDayDelta: number | null = null
      const dataPoints: Array<{ timestamp: string; avg: number }> = []

      if (results && results.length >= 2) {
        const first = results[0] as { avg?: number; timestamp?: string }
        const last = results[results.length - 1] as { avg?: number; timestamp?: string }
        if (first.avg != null && last.avg != null) {
          thirtyDayDelta = last.avg - first.avg
          direction = thirtyDayDelta > 0.5 ? 'improving' : thirtyDayDelta < -0.5 ? 'declining' : 'stable'
        }
        for (const point of results) {
          const p = point as { timestamp?: string; avg?: number }
          if (p.timestamp && p.avg != null) {
            dataPoints.push({ timestamp: p.timestamp, avg: p.avg })
          }
        }
      }

      const repoNormalized = normalizeKeysDeep(repoData) as Record<string, unknown>
      const totals = repoNormalized.totals as Record<string, unknown> | undefined

      return toolResult({
        repo: {
          name: repoNormalized.name,
          branch: repoNormalized.branch,
          coverage: totals?.coverage ?? null,
        },
        trend: { direction, thirtyDayDelta, dataPoints },
        flags: (flagsData.results as Record<string, unknown>[]).map(f => normalizeKeysDeep(f)),
        openPullCount: pullsData.count,
      })
    }),
  )
}
