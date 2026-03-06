# Project Status - codecov-mcp
*Last updated: 2026-03-06*

## Current Focus
Final documentation fixes from second audit pass. npm publish is the last remaining launch blocker.

## Recent Changes
- 2026-03-06 - Merged PR #5 (launch readiness: security, admin gating, annotations, cross-platform CI)
- 2026-03-06 - Merged PR #3 (installation guide) and PR #4 (bug fixes + pagination)
- 2026-03-06 - Added SECURITY.md with vulnerability disclosure policy
- 2026-03-06 - Gated admin tools behind CODECOV_ENABLE_ADMIN_TOOLS env var
- 2026-03-06 - Added MCP tool annotations (readOnlyHint/destructiveHint) to all 37 tools
- 2026-03-06 - Added cross-platform CI smoke jobs (Windows + macOS)
- 2026-03-06 - Fixed Windows setup guidance to use `cmd /c npx` pattern per Anthropic docs
- 2026-03-06 - Standardized `"type": "stdio"` across all config examples
- 2026-03-05 - Full implementation: 37 tools, 5 prompts, 4 resources
- 2026-03-05 - Fixed all 78 SonarCloud issues
- 2026-03-05 - Fixed 4 runtime bugs found via dogfooding

## Completed
- [x] Core implementation: 37 tools (35 default + 2 admin opt-in), 5 prompts, 4 resources
- [x] 153 tests passing, 92%+ statement coverage
- [x] CI/CD with GitHub Actions, Codecov, SonarCloud, CodeQL
- [x] Cross-platform CI (Linux, Windows, macOS)
- [x] SECURITY.md with disclosure policy
- [x] Admin tools gated behind opt-in env var
- [x] MCP tool annotations on all tools
- [x] Installation guide for all MCP clients and platforms
- [x] README updated with accurate claims and admin tools section
- [x] All audit findings addressed (PRs #3, #4, #5 merged)
- [x] Windows setup guidance corrected to match Anthropic docs
- [x] Standardized `"type": "stdio"` in all config examples

## Next Steps
- [ ] Publish to npm as `codecov-mcp`
- [ ] Mark SonarQube security hotspots as SAFE in web UI
- [ ] Post-launch: CONTRIBUTING.md, issue templates, CODEOWNERS, Dependabot

## Known Issues / Blockers
- Package not yet published to npm (primary install path `npx -y codecov-mcp` will not work until publish)
- SonarQube hotspots (S5852, S4036) must be marked via web UI
- Flag filtering on /totals/ endpoint may not work (API-side issue, documented)

## Notes
- GitHub repo: https://github.com/ScottN-PV/codecov-mcp
- 3 review services active: Codecov, SonarCloud, Greptile
- Admin tools (update_user, list_user_sessions) require CODECOV_ENABLE_ADMIN_TOOLS=true
