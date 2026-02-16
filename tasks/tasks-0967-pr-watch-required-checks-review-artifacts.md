# Task Checklist - PR Watch Required-Checks Gate + Review Artifacts Guide (0967)

- MCP Task ID: `0967-pr-watch-required-checks-review-artifacts`
- Primary PRD: `docs/PRD-pr-watch-required-checks-review-artifacts.md`
- TECH_SPEC: `tasks/specs/0967-pr-watch-required-checks-review-artifacts.md`
- ACTION_PLAN: `docs/ACTION_PLAN-pr-watch-required-checks-review-artifacts.md`
- Summary of scope: make `pr watch-merge` gate on required checks (while keeping CodeRabbit enabled), and add a review-artifacts guide with discoverable links.

> Set `MCP_RUNNER_TASK_ID=0967-pr-watch-required-checks-review-artifacts` for orchestrator commands. Guardrails required: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `npm run review`. Mirror with `docs/TASKS.md` and `.agent/task/0967-pr-watch-required-checks-review-artifacts.md`. Flip `[ ]` to `[x]` only with evidence.

## Checklist

### Foundation
- [x] Task scaffolding + mirrors registered. - Evidence: `tasks/tasks-0967-pr-watch-required-checks-review-artifacts.md`, `.agent/task/0967-pr-watch-required-checks-review-artifacts.md`, `tasks/index.json`, `docs/TASKS.md`.
- [x] PRD + TECH_SPEC + ACTION_PLAN drafted. - Evidence: `docs/PRD-pr-watch-required-checks-review-artifacts.md`, `tasks/specs/0967-pr-watch-required-checks-review-artifacts.md`, `docs/ACTION_PLAN-pr-watch-required-checks-review-artifacts.md`, `docs/TECH_SPEC-pr-watch-required-checks-review-artifacts.md`.
- [x] Delegation scout run captured (`<task-id>-<stream>` manifest). - Evidence: `.runs/0967-pr-watch-required-checks-review-artifacts-scout/cli/2026-02-16T03-02-47-094Z-aeacffc3/manifest.json`.
- [x] Docs-review manifest captured (pre-implementation). - Evidence: `.runs/0967-pr-watch-required-checks-review-artifacts/cli/2026-02-16T03-10-17-556Z-b70aa5e9/manifest.json`.

### Implementation
- [x] `pr watch-merge` uses required checks for merge gating when available. - Evidence: `scripts/lib/pr-watch-merge.js`, `tests/pr-watch-merge.spec.ts`.
- [x] Optional pending checks no longer block merge readiness by default. - Evidence: `scripts/lib/pr-watch-merge.js`, `out/0967-pr-watch-required-checks-review-artifacts/manual/e2e-validation.log`, `tests/pr-watch-merge.spec.ts`.
- [x] Review artifacts guide added and discoverable. - Evidence: `docs/guides/review-artifacts.md`, `README.md`, `bin/codex-orchestrator.ts`, `tests/cli-command-surface.spec.ts`.

### Validation and handoff
- [x] Required quality gates passed (build/lint/test/docs/review + diff budget). - Evidence: `.runs/0967-pr-watch-required-checks-review-artifacts/cli/2026-02-16T03-21-12-925Z-f5d7f183/manifest.json`, `out/0967-pr-watch-required-checks-review-artifacts/manual/e2e-validation.log`.
- [x] Implementation-gate manifest captured. - Evidence: `.runs/0967-pr-watch-required-checks-review-artifacts/cli/2026-02-16T03-21-12-925Z-f5d7f183/manifest.json`.
- [x] Standalone post-implementation elegance review completed. - Evidence: `out/0967-pr-watch-required-checks-review-artifacts/manual/post-implementation-standalone-review.log`.
