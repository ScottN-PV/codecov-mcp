import { describe, it, expect } from 'vitest'
import { parseGitUrl } from '../../src/utils/git-remote.js'

describe('parseGitUrl', () => {
  it('parses GitHub SSH URL', () => {
    expect(parseGitUrl('git@github.com:my-org/my-repo.git')).toEqual({
      service: 'github',
      owner: 'my-org',
      repo: 'my-repo',
    })
  })

  it('parses GitHub SSH URL without .git', () => {
    expect(parseGitUrl('git@github.com:owner/repo')).toEqual({
      service: 'github',
      owner: 'owner',
      repo: 'repo',
    })
  })

  it('parses GitHub HTTPS URL', () => {
    expect(parseGitUrl('https://github.com/my-org/my-repo.git')).toEqual({
      service: 'github',
      owner: 'my-org',
      repo: 'my-repo',
    })
  })

  it('parses GitHub HTTPS URL without .git', () => {
    expect(parseGitUrl('https://github.com/owner/repo')).toEqual({
      service: 'github',
      owner: 'owner',
      repo: 'repo',
    })
  })

  it('parses GitLab SSH URL', () => {
    expect(parseGitUrl('git@gitlab.com:group/project.git')).toEqual({
      service: 'gitlab',
      owner: 'group',
      repo: 'project',
    })
  })

  it('parses Bitbucket HTTPS URL', () => {
    expect(parseGitUrl('https://bitbucket.org/team/repo.git')).toEqual({
      service: 'bitbucket',
      owner: 'team',
      repo: 'repo',
    })
  })

  it('returns null for unknown host', () => {
    expect(parseGitUrl('git@custom-git.example.com:org/repo.git')).toBeNull()
  })

  it('returns null for invalid URL', () => {
    expect(parseGitUrl('not-a-url')).toBeNull()
  })
})
