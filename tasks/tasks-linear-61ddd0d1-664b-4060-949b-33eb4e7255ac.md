# Task Checklist - linear-61ddd0d1-664b-4060-949b-33eb4e7255ac

- Linear Issue: `CO-297` / `61ddd0d1-664b-4060-949b-33eb4e7255ac`
- MCP Task ID: `linear-61ddd0d1-664b-4060-949b-33eb4e7255ac`
- Primary PRD: `docs/PRD-linear-61ddd0d1-664b-4060-949b-33eb4e7255ac.md`
- TECH_SPEC: `tasks/specs/linear-61ddd0d1-664b-4060-949b-33eb4e7255ac.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-61ddd0d1-664b-4060-949b-33eb4e7255ac.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-61ddd0d1-664b-4060-949b-33eb4e7255ac.md`
- Parent manifest: `.runs/linear-61ddd0d1-664b-4060-949b-33eb4e7255ac/cli/2026-04-21T15-20-09-709Z-20bf52c5/manifest.json`

## Docs-First
- [x] Issue context inspected before transition. Evidence: `linear issue-context --issue-id 61ddd0d1-664b-4060-949b-33eb4e7255ac --format json`.
- [x] Issue moved to live started state. Evidence: `linear transition ... --state "In Progress"` returned `ok: true`.
- [x] Required workpad created. Evidence: Linear workpad comment `bf0c2e0f-830b-42c0-97b6-1f15929229bd`.
- [x] Parallelization decision recorded. Evidence: `stay_serial` / `single_bounded_change` with docs/test/research/review slice evidence.
- [x] PRD drafted. Evidence: `docs/PRD-linear-61ddd0d1-664b-4060-949b-33eb4e7255ac.md`.
- [x] TECH_SPEC drafted and mirrored. Evidence: `tasks/specs/linear-61ddd0d1-664b-4060-949b-33eb4e7255ac.md`, `docs/TECH_SPEC-linear-61ddd0d1-664b-4060-949b-33eb4e7255ac.md`.
- [x] ACTION_PLAN drafted. Evidence: `docs/ACTION_PLAN-linear-61ddd0d1-664b-4060-949b-33eb4e7255ac.md`.
- [x] Checklist mirrored to `.agent/task`. Evidence: `.agent/task/linear-61ddd0d1-664b-4060-949b-33eb4e7255ac.md`.
- [x] Docs-review evidence captured before implementation. Evidence: `.runs/linear-61ddd0d1-664b-4060-949b-33eb4e7255ac-docs-review/cli/2026-04-21T15-29-40-340Z-ca623bb8/manifest.json` and `review/telemetry.json` `clean-success`.

## Implementation
- [x] Repo-owned hook source added. Evidence: `scripts/hooks/continue_co_orchestration.py`.
- [x] Installed hook synced. Evidence: `/Users/kbediako/.codex/hooks/continue_co_orchestration.py` checksum matches repo-owned source (`bb617dc49232846921d7a03a1e5937843e82cae65761f8ad228e274aae3147d9`).
- [x] Raw substring persistence removed. Evidence: source now parses only final structured stop-control lines.
- [x] Resume prompt updated to require `CO_ORCHESTRATOR_STOP: <sentinel>`.
- [x] Repo-root matching bounded to path descendants. Evidence: sibling-prefix cwd regression leaves state enabled.

## Validation
- [x] False read-only stop regression passes. Evidence: `npx vitest run --config vitest.config.core.ts tests/co-orchestration-autocontinue-hook.spec.ts`.
- [x] Quoted sentinel regression passes. Evidence: `npx vitest run --config vitest.config.core.ts tests/co-orchestration-autocontinue-hook.spec.ts`.
- [x] Structured `CO_ORCHESTRATOR_CRITICAL_BLOCKER` regression passes. Evidence: `npx vitest run --config vitest.config.core.ts tests/co-orchestration-autocontinue-hook.spec.ts`.
- [x] Structured `CO_ORCHESTRATOR_DONE` regression passes. Evidence: `npx vitest run --config vitest.config.core.ts tests/co-orchestration-autocontinue-hook.spec.ts`.
- [x] Structured `CO_ORCHESTRATOR_DESTRUCTIVE_DECISION_REQUIRED` regression passes. Evidence: `npx vitest run --config vitest.config.core.ts tests/co-orchestration-autocontinue-hook.spec.ts`.
- [x] Indented structured stop example regression passes. Evidence: focused Vitest spec passed after the standalone-review P2 fix.
- [x] Sibling-prefix cwd regression passes. Evidence: focused Vitest spec passed 8 tests after the repo-root boundary review fix.
- [x] Default state path uses the current operator home instead of a user-specific absolute path. Evidence: focused Vitest spec passed 10 tests after the Codex and CodeRabbit PR feedback fixes.
- [x] Non-positive `max_in_progress` values clamp to sane resume guidance. Evidence: focused Vitest spec passed 10 tests after the CodeRabbit feedback fix.
- [x] Relevant repo validation gates pass. Evidence after the CodeRabbit feedback fixes: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npx vitest run --config vitest.config.core.ts tests/co-orchestration-autocontinue-hook.spec.ts` (10 tests), `node scripts/diff-budget.mjs`, checksum parity, `npm run build`, `npm run lint` (three existing warnings only), `npm run test` (348 files / 4472 tests), `npm run docs:check`, `npm run docs:freshness`, and `npm run repo:stewardship`.
- [x] Final CodeRabbit MD058 table-spacing feedback fixed and docs gates rerun. Evidence: `node scripts/spec-guard.mjs --dry-run`, `npm run docs:check`, and `npm run docs:freshness` passed after adding the task-spec table spacer.
- [x] Standalone review and elegance review complete before review handoff. Evidence: `.runs/linear-61ddd0d1-664b-4060-949b-33eb4e7255ac/cli/2026-04-21T15-20-09-709Z-20bf52c5/review/telemetry.json` status `succeeded`, outcome `bounded-success` after command-intent containment; final CodeRabbit-fix rerun found no actionable issues and manual elegance pass found no simplification patch.

## Progress Log
- 2026-04-22: initial context found no existing workpad or PR, transitioned CO-297 into `In Progress`, created the workpad, recorded serial parallelization, and drafted the docs-first packet.
- 2026-04-22: docs-review rerun completed clean-success, repo-owned hook source was added, installed hook was synced from the source, and focused hook regressions passed against isolated temp state.
- 2026-04-22: merged current `origin/main` after resolving docs/index/registry conflicts by retaining both CO-282 and CO-297 entries; merged-base validation gates passed through full core test, docs, stewardship, and diff-budget.
- 2026-04-22: addressed standalone-review P2 by rejecting indented/code-block stop-control examples, added the regression, reran the focused hook spec (7 tests), and resynced the installed hook.
- 2026-04-22: addressed second standalone-review P2 by replacing string-prefix repo matching with path-boundary matching, added the sibling-prefix cwd regression, reran the focused hook spec (8 tests), and resynced the installed hook.
- 2026-04-22: post-second-review-fix validation passed through delegation/spec guards, build, lint, full core test (348 files / 4466 tests), docs gates, stewardship, and diff-budget.
- 2026-04-22: merged current `origin/main` (`0231b52d5`), reran the full validation floor (348 files / 4469 tests), reran forced standalone review to `clean-success`, and completed the explicit elegance pass with no patch.
- 2026-04-22: PR ready-review detected new `origin/main` (`adfae4702`) and dirty merge state; resolved `docs/TASKS.md`, `docs/docs-freshness-registry.json`, and `tasks/index.json` by preserving both CO-297 and incoming CO-286 entries, then reran the validation floor (348 files / 4470 tests).
- 2026-04-22: addressed Codex PR review P2 by deriving the default state path from `Path.home()` / `~/.codex/hooks/co_orchestration_autocontinue.json`, added a temp-`HOME` regression, reran validation through full core test (348 files / 4471 tests), resynced the installed hook, reran forced standalone review to `bounded-success`, and completed the explicit elegance pass with no patch.
- 2026-04-22: addressed CodeRabbit feedback by adding the spec comma, clamping non-positive `max_in_progress` to `1`, adding a focused resume-prompt regression, rerunning validation through full core test (348 files / 4472 tests), and resyncing the installed hook.
- 2026-04-22: reran forced standalone review after the CodeRabbit feedback fixes to `bounded-success`; final manual elegance pass found no simplification patch.
- 2026-04-22: addressed final CodeRabbit MD058 feedback by adding the blank line before the task-spec parity table, reran `spec-guard`, `docs:check`, and `docs:freshness`, reran forced standalone review to `bounded-success` with no actionable findings, and kept the explicit elegance pass at no simplification patch.

## Notes
- Do not broaden into provider-worker state transitions or global Codex hook redesign.
- Do not touch the real `co_orchestration_autocontinue.json` in tests.
