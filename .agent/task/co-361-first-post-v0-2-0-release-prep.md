# Agent Task Mirror - CO-361

- Linear Issue: `CO-361`
- MCP Task ID: `co-361-first-post-v0-2-0-release-prep`
- PRD: `docs/PRD-co-361-first-post-v0-2-0-release-prep.md`
- TECH_SPEC: `docs/TECH_SPEC-co-361-first-post-v0-2-0-release-prep.md`
- ACTION_PLAN: `docs/ACTION_PLAN-co-361-first-post-v0-2-0-release-prep.md`
- Checklist: `tasks/tasks-co-361-first-post-v0-2-0-release-prep.md`

## Scope
Prepare the first post-`v0.2.0` release PR with the smallest truthful package/public posture diff and no publish/tag/merge actions.

## Current Status
- Clean worktree created from `origin/main`, then rebased onto current `origin/main` commit `ca2fff503` after the CO-372 packet landed on main.
- Audit narrowed the blocker to version metadata plus stale public/package wording on the release-facing README/book/version-policy surfaces; no broader workflow or runtime change is needed.
- Docs-review succeeded through the documented local child-run fallback after the delegation MCP clean-worktree path rejection.
- Targeted posture checks passed: local `codex-cli 0.125.0`, live `gpt-5.5` model availability, npm latest `@openai/codex=0.125.0`, and published `@kbediako/codex-orchestrator=0.2.0`.
- Release-prep validation passed: delegation guard, spec guard, `docs:freshness`, `docs:check`, `build`, `pack:audit`, `pack:smoke`, and the diagnostics manifest at `.runs/co-361-first-post-v0-2-0-release-prep/cli/2026-04-25T15-05-32-540Z-fd806d24/manifest.json`.
- Standalone review wrapper was attempted against the diagnostics manifest but churned without a verdict, so readiness falls back to manual diff audit plus the passing targeted validation set.
- Branch is ready for PR handoff without publish/tag/merge actions.
