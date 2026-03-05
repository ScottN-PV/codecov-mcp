# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-03-05

### Added

- **37 MCP tools** covering 100% of Codecov REST API v2:
  - Coverage: `get_coverage_totals`, `get_coverage_trend`, `get_coverage_report`, `get_coverage_tree`, `get_file_coverage`
  - Comparison: `compare_coverage`, `compare_impacted_files`, `compare_file`, `compare_flags`, `compare_components`, `compare_segments`
  - Pull Requests: `list_pulls`, `get_pull`
  - Repositories: `list_repos`, `get_repo`, `get_repo_config`
  - Branches: `list_branches`, `get_branch`
  - Commits: `list_commits`, `get_commit`, `list_commit_uploads`
  - Flags: `list_flags`, `get_flag_coverage_trend`
  - Components: `list_components`
  - Owners: `list_owners`, `get_owner`
  - Users: `list_users`, `get_user`, `update_user`, `list_user_sessions`
  - Test Analytics: `list_test_analytics`
  - Evaluations: `get_eval_summary`, `get_eval_comparison`
  - Composite: `get_coverage_summary`, `get_pr_coverage`, `find_flaky_tests`, `validate_yaml`
- **5 MCP prompts**: `coverage_review`, `pr_coverage_check`, `suggest_tests`, `flaky_test_report`, `coverage_health_check`
- **4 MCP resources**: repos list, repo summary, flags, components
- Auto-detection of service/owner/repo from git remote
- LRU cache with configurable TTL
- Retry with exponential backoff on 429/5xx
- Support for GitHub, GitLab, Bitbucket (cloud and self-hosted)
- Support for self-hosted Codecov instances

[0.1.0]: https://github.com/ScottN-PV/codecov-mcp/releases/tag/v0.1.0
