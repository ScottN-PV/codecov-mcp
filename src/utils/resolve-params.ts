import type { Config, GitRemoteInfo } from '../types.js'
import { CodecovError } from './errors.js'
import { detectGitRemote } from './git-remote.js'

let cachedRemote: GitRemoteInfo | null | undefined

function getGitRemote(): GitRemoteInfo | null {
  if (cachedRemote === undefined) {
    cachedRemote = detectGitRemote()
  }
  return cachedRemote
}

export interface ResolvedParams {
  service: string
  owner: string
  repo: string
}

export interface ResolvedOwnerParams {
  service: string
  owner: string
}

export function resolveRepoParams(
  config: Config,
  args: { service?: string; owner?: string; repo?: string },
): ResolvedParams {
  const remote = getGitRemote()

  const service = args.service || config.service || remote?.service
  const owner = args.owner || config.defaultOwner || remote?.owner
  const repo = args.repo || config.defaultRepo || remote?.repo

  if (!service) {
    throw new CodecovError(
      'Could not determine git service. Set CODECOV_SERVICE env var, pass service as a tool argument, or run from a git repo with a recognized remote.',
    )
  }
  if (!owner) {
    throw new CodecovError(
      'Could not determine owner/org. Set CODECOV_OWNER env var, pass owner as a tool argument, or run from a git repo with a recognized remote.',
    )
  }
  if (!repo) {
    throw new CodecovError(
      'Could not determine repository. Set CODECOV_REPO env var, pass repo as a tool argument, or run from a git repo with a recognized remote.',
    )
  }

  return { service, owner, repo }
}

export function resolveOwnerParams(
  config: Config,
  args: { service?: string; owner?: string },
): ResolvedOwnerParams {
  const remote = getGitRemote()

  const service = args.service || config.service || remote?.service
  const owner = args.owner || config.defaultOwner || remote?.owner

  if (!service) {
    throw new CodecovError(
      'Could not determine git service. Set CODECOV_SERVICE env var, pass service as a tool argument, or run from a git repo with a recognized remote.',
    )
  }
  if (!owner) {
    throw new CodecovError(
      'Could not determine owner/org. Set CODECOV_OWNER env var, pass owner as a tool argument, or run from a git repo with a recognized remote.',
    )
  }

  return { service, owner }
}

export function resolveServiceParam(
  config: Config,
  args: { service?: string },
): string {
  const remote = getGitRemote()
  const service = args.service || config.service || remote?.service

  if (!service) {
    throw new CodecovError(
      'Could not determine git service. Set CODECOV_SERVICE env var, pass service as a tool argument, or run from a git repo with a recognized remote.',
    )
  }

  return service
}

/** Reset cached remote (for testing) */
export function _resetGitRemoteCache(): void {
  cachedRemote = undefined
}
