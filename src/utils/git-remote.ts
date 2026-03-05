import { execSync } from 'child_process'
import type { GitRemoteInfo } from '../types.js'

const SERVICE_MAP: Record<string, string> = {
  'github.com': 'github',
  'gitlab.com': 'gitlab',
  'bitbucket.org': 'bitbucket',
}

export function detectGitRemote(): GitRemoteInfo | null {
  try {
    const url = execSync('git remote get-url origin', {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()

    return parseGitUrl(url)
  } catch {
    return null
  }
}

export function parseGitUrl(url: string): GitRemoteInfo | null {
  // SSH: git@github.com:owner/repo.git
  const sshMatch = url.match(/^git@([^:]+):([^/]+)\/(.+?)(?:\.git)?$/)
  if (sshMatch) {
    const service = SERVICE_MAP[sshMatch[1]]
    if (service) {
      return { service, owner: sshMatch[2], repo: sshMatch[3] }
    }
  }

  // HTTPS: https://github.com/owner/repo.git
  const httpsMatch = url.match(/^https?:\/\/([^/]+)\/([^/]+)\/(.+?)(?:\.git)?$/)
  if (httpsMatch) {
    const service = SERVICE_MAP[httpsMatch[1]]
    if (service) {
      return { service, owner: httpsMatch[2], repo: httpsMatch[3] }
    }
  }

  return null
}
