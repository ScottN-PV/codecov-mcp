import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

export function registerPrompts(server: McpServer) {
  server.prompt(
    'coverage_review',
    'Perform a thorough coverage review for a repository or specific files. Analyzes current coverage, identifies gaps, and suggests improvements.',
    { owner: z.string().optional(), repo: z.string().optional() },
    async (args) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Review coverage for ${args.owner || '{{owner}}'}/${args.repo || '{{repo}}'}.\n` +
            '1. Use get_coverage_totals to get overall coverage\n' +
            '2. Use get_coverage_tree to find the lowest-coverage directories\n' +
            '3. For the 3 worst files, use get_file_coverage to identify uncovered lines\n' +
            '4. Summarize findings and suggest which files most need tests',
        },
      }],
    }),
  )

  server.prompt(
    'pr_coverage_check',
    'Check the coverage impact of a pull request. Compares base and head coverage, identifies files with decreased coverage.',
    { owner: z.string().optional(), repo: z.string().optional(), pullid: z.string() },
    async (args) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Check PR #${args.pullid} coverage for ${args.owner || '{{owner}}'}/${args.repo || '{{repo}}'}.\n` +
            `1. Use get_pull with pullid=${args.pullid} for PR details\n` +
            `2. Use compare_impacted_files with pullid=${args.pullid} to see changed files\n` +
            '3. For any files with decreased coverage, use compare_file to see line-level changes\n' +
            '4. Summarize: overall impact, files that lost coverage, and whether to approve or request changes',
        },
      }],
    }),
  )

  server.prompt(
    'suggest_tests',
    'Analyze a file and suggest specific test cases based on uncovered lines.',
    { owner: z.string().optional(), repo: z.string().optional(), file_path: z.string() },
    async (args) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Suggest tests for ${args.file_path} in ${args.owner || '{{owner}}'}/${args.repo || '{{repo}}'}.\n` +
            `1. Use get_file_coverage for "${args.file_path}" to see uncovered lines\n` +
            '2. Analyze the uncovered code paths\n' +
            '3. Suggest specific test cases that would cover those lines\n' +
            '4. Prioritize by risk: error handling, edge cases, critical paths',
        },
      }],
    }),
  )

  server.prompt(
    'flaky_test_report',
    'Generate a report of flaky tests that need attention.',
    { owner: z.string().optional(), repo: z.string().optional() },
    async (args) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Generate a flaky test report for ${args.owner || '{{owner}}'}/${args.repo || '{{repo}}'}.\n` +
            '1. Use find_flaky_tests to get tests failing on the default branch\n' +
            '2. Group by severity (failure rate)\n' +
            '3. For each flaky test, note the failure count and last failure date\n' +
            '4. Produce an actionable prioritized list for the team',
        },
      }],
    }),
  )

  server.prompt(
    'coverage_health_check',
    'Run a complete coverage health check for a repository and produce a report card.',
    { owner: z.string().optional(), repo: z.string().optional() },
    async (args) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Run a complete coverage health check for ${args.owner || '{{owner}}'}/${args.repo || '{{repo}}'}.\n` +
            '1. Get coverage summary (overall coverage, trend, flags)\n' +
            '2. Find the 5 lowest-coverage directories in the coverage tree\n' +
            '3. Check for flaky tests on the default branch\n' +
            '4. List open PRs and their coverage impact\n' +
            '5. Produce a health report card with: overall grade, trend direction, top risks, and recommended actions',
        },
      }],
    }),
  )
}
