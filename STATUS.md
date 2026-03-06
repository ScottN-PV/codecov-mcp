# Project Status - codecov-mcp
*Last updated: 2026-03-06*

## Current Focus
Launch readiness: all audit findings addressed, PRs merged, ready for final review and npm publish.

## Recent Changes
- 2026-03-06 - Merged PR #3 (installation guide) and PR #4 (bug fixes + pagination)
- 2026-03-06 - Added SECURITY.md with vulnerability disclosure policy
- 2026-03-06 - Gated admin tools (update_user, list_user_sessions) behind CODECOV_ENABLE_ADMIN_TOOLS env var
- 2026-03-06 - Added MCP tool annotations (readOnlyHint/destructiveHint) to all 37 tools
- 2026-03-06 - Added cross-platform CI smoke jobs (Windows + macOS)
- 2026-03-06 - Broadened cache invalidation for mutations (patch clears collection too)
- 2026-03-06 - Fixed codecov.yml project target (90% -> 85%), prepublishOnly now includes lint
- 2026-03-06 - Removed dead test:integration script
- 2026-03-06 - Softened enterprise auto-detect claims in README
- 2026-03-06 - Updated spec docs with correct tool counts (37)
- 2026-03-05 - Full implementation: 37 tools, 5 prompts, 4 resources
- 2026-03-05 - 150 tests passing, CI green (Node 20+22)
- 2026-03-05 - Fixed all 78 SonarCloud issues
- 2026-03-05 - Fixed 4 runtime bugs found via dogfooding

## Completed
- [x] Core implementation: 37 tools (35 default + 2 admin opt-in), 5 prompts, 4 resources
- [x] 152 tests passing, 92%+ statement coverage
- [x] CI/CD with GitHub Actions, Codecov, SonarCloud, CodeQL
- [x] Cross-platform CI (Linux, Windows, macOS)
- [x] SECURITY.md with disclosure policy
- [x] Admin tools gated behind opt-in env var
- [x] MCP tool annotations on all tools
- [x] Installation guide for all MCP clients and platforms
- [x] README updated with accurate claims and admin tools section

## Next Steps
- [ ] Push launch-readiness branch, open PR, verify CI
- [ ] Merge to main after CI passes
- [ ] Mark SonarQube security hotspots as SAFE in web UI
- [ ] Publish to npm as `codecov-mcp`
- [ ] Post-launch: CONTRIBUTING.md, issue templates, CODEOWNERS, Dependabot

## Known Issues / Blockers
- SonarQube hotspots (S5852, S4036) must be marked via web UI
- Flag filtering on /totals/ endpoint may not work (API-side issue, documented)

## Notes
- GitHub repo: https://github.com/ScottN-PV/codecov-mcp
- 3 review services active: Codecov, SonarCloud, Greptile
- Admin tools (update_user, list_user_sessions) require CODECOV_ENABLE_ADMIN_TOOLS=true
