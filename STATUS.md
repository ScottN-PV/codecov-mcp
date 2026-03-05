# Project Status - codecov-mcp
*Last updated: 2026-03-05*

## Current Focus
Real-world feedback applied, SonarCloud issues resolved. 37 tools, 5 prompts, 4 resources. Ready for expanded test coverage.

## Recent Changes
- 2026-03-05 - Research, planning, and specs completed (see docs/)
- 2026-03-05 - Planning audit reconciled (13 findings addressed, specs at v2.1)
- 2026-03-05 - Project scaffolded: git, npm, TypeScript, ESLint, Vitest
- 2026-03-05 - Core implemented: config, client (retry + cache), schemas, error handling, git remote detection
- 2026-03-05 - All 36 tools implemented across 13 tool group files
- 2026-03-05 - 5 MCP prompts and 4 MCP resources implemented
- 2026-03-05 - 75 unit tests passing (config, cache, errors, format, git-remote, schemas, client, resolve-params, tool-result)
- 2026-03-05 - README with full documentation, LICENSE (MIT)
- 2026-03-05 - CI/CD: GitHub Actions (Node 20+22), Codecov, SonarCloud, Greptile
- 2026-03-05 - Applied real-world feedback: new get_pr_coverage tool, get_coverage_totals context efficiency fix, improved descriptions
- 2026-03-05 - Fixed all 78 SonarCloud issues: migrated to registerTool/registerPrompt/registerResource, readonly members, cognitive complexity, type assertions, nested ternaries, node: prefix, RegExp.exec, top-level await, .at()

## Completed
- [x] Initialize git repo and npm project scaffold
- [x] Implement core: config, client, cache, error handling
- [x] Implement all 37 tools (36 original + get_pr_coverage)
- [x] Implement 5 prompts and 4 resources
- [x] README and documentation
- [x] MIT License
- [x] CI/CD with GitHub Actions, Codecov, SonarCloud
- [x] Real-world feedback: context-efficient totals, PR coverage tool, improved descriptions
- [x] Fix all SonarCloud issues (78 → 0 expected)

## Next Steps
- [ ] Expand unit tests (tool handlers, prompts, resources — mock API responses)
- [ ] Reach 90%+ test coverage target (currently ~16%)
- [ ] Integration tests (live API)
- [ ] Test end-to-end with Claude Code
- [ ] Publish to npm as `codecov-mcp`

## Known Issues / Blockers
- Evaluations endpoints may evolve (newer Codecov feature)
- Flag filtering on /totals/ endpoint may not work (API-side issue, documented in tool description)

## Notes
- GitHub repo: https://github.com/ScottN-PV/codecov-mcp
- 5 existing competitors; best covers ~25% of API with 8 tools
- We have: 37 tools, multi-service, prompts, resources, caching, auto-detection
