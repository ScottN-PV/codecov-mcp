import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

export function registerPrompts(server: McpServer) {
  server.registerPrompt(
    'coverage_review',
    {
      description: 'Perform a thorough coverage review for a repository or specific files. Analyzes current coverage, identifies gaps, and suggests improvements.',
      argsSchema: { owner: z.string().optional(), repo: z.string().optional() },
    },
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

  server.registerPrompt(
    'pr_coverage_check',
    {
      description: 'Check the coverage impact of a pull request. Compares base and head coverage, identifies files with decreased coverage.',
      argsSchema: { owner: z.string().optional(), repo: z.string().optional(), pullid: z.string() },
    },
    async (args) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Check PR #${args.pullid} coverage for ${args.owner || '{{owner}}'}/${args.repo || '{{repo}}'}.\n` +
            `1. Use get_pr_coverage with pullid=${args.pullid} for PR coverage summary and impacted files\n` +
            '2. For any files with decreased coverage, use compare_file to see line-level changes\n' +
            '3. Summarize: overall impact, files that lost coverage, and whether to approve or request changes',
        },
      }],
    }),
  )

  server.registerPrompt(
    'suggest_tests',
    {
      description: 'Analyze a file and suggest specific test cases based on uncovered lines.',
      argsSchema: { owner: z.string().optional(), repo: z.string().optional(), file_path: z.string() },
    },
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

  server.registerPrompt(
    'flaky_test_report',
    {
      description: 'Generate a report of flaky tests that need attention.',
      argsSchema: { owner: z.string().optional(), repo: z.string().optional() },
    },
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

  server.registerPrompt(
    'coverage_health_check',
    {
      description: 'Run a complete coverage health check for a repository and produce a report card.',
      argsSchema: { owner: z.string().optional(), repo: z.string().optional() },
    },
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
