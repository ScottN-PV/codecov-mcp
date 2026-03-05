import { z } from 'zod'

export const ServiceEnum = z.enum([
  'github', 'gitlab', 'bitbucket',
  'github_enterprise', 'gitlab_enterprise', 'bitbucket_server',
])

export const OwnerRepoParams = z.object({
  service: ServiceEnum.optional()
    .describe('Git hosting service. Defaults to CODECOV_SERVICE env var or auto-detected from git remote.'),
  owner: z.string().optional()
    .describe('Organization or username. Defaults to CODECOV_OWNER env var or auto-detected from git remote.'),
  repo: z.string().optional()
    .describe('Repository name. Defaults to CODECOV_REPO env var or auto-detected from git remote.'),
})

export const OwnerParams = z.object({
  service: ServiceEnum.optional()
    .describe('Git hosting service. Defaults to CODECOV_SERVICE env var or auto-detected from git remote.'),
  owner: z.string().optional()
    .describe('Organization or username. Defaults to CODECOV_OWNER env var or auto-detected from git remote.'),
})

export const ServiceParam = z.object({
  service: ServiceEnum.optional()
    .describe('Git hosting service. Defaults to CODECOV_SERVICE env var or auto-detected from git remote.'),
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
})

/** Validate that compare params have either pullid or both base+head. */
export function validateCompareParams(args: { base?: string; head?: string; pullid?: number }): void {
  if (args.pullid == null && (args.base == null || args.head == null)) {
    throw new Error('Provide either pullid, or both base and head.')
  }
}
