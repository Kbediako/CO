# Task Checklist - 0992-release-0-1-38-skills-docs-alignment

- MCP Task ID: `0992-release-0-1-38-skills-docs-alignment`
- Primary PRD: `docs/PRD-release-0-1-38-skills-docs-alignment.md`
- TECH_SPEC: `tasks/specs/0992-release-0-1-38-skills-docs-alignment.md`
- ACTION_PLAN: `docs/ACTION_PLAN-release-0-1-38-skills-docs-alignment.md`

> Set `MCP_RUNNER_TASK_ID=0992-release-0-1-38-skills-docs-alignment` for orchestrator commands. Required quality lane: `node scripts/delegation-guard.mjs --task 0992-release-0-1-38-skills-docs-alignment`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `npm run review`, `npm run pack:smoke`.

## Foundation
- [x] Standalone pre-implementation review of task/spec recorded in spec + checklist notes. - Evidence: decision + scope note in `tasks/specs/0992-release-0-1-38-skills-docs-alignment.md`; delegated synthesis in this run.
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/checklist mirror). - Evidence: `docs/PRD-release-0-1-38-skills-docs-alignment.md`, `docs/TECH_SPEC-release-0-1-38-skills-docs-alignment.md`, `docs/ACTION_PLAN-release-0-1-38-skills-docs-alignment.md`, `tasks/tasks-0992-release-0-1-38-skills-docs-alignment.md`, `.agent/task/0992-release-0-1-38-skills-docs-alignment.md`.
- [x] `tasks/index.json` + `docs/TASKS.md` updated for task registration/status. - Evidence: `tasks/index.json`, `docs/TASKS.md`.
- [x] Delegated bounded audit streams captured with manifest evidence. - Evidence: `.runs/0992-release-0-1-38-skills-docs-alignment-audit/cli/2026-03-03T05-25-05-133Z-66ac3e37/manifest.json`.
- [x] docs-review manifest captured (pre-implementation). - Evidence: `.runs/0992-release-0-1-38-skills-docs-alignment/cli/2026-03-03T05-30-38-656Z-ccbf714e/manifest.json`.

## Implementation
- [x] Deep skills/docs/SOP contradiction audit completed with findings triage. - Evidence: targeted alignment edits across `AGENTS.md`, `docs/AGENTS.md`, `.agent/AGENTS.md`, `.agent/SOPs/*`, `README.md`, `docs/README.md`, `skills/*`.
- [x] Fork-context capability assessment completed and decision recorded (guidance-only vs programmatic CO path). - Evidence: `out/0992-release-0-1-38-skills-docs-alignment/manual/fork-context/fork-context-evaluation-2026-03-03.md`, `out/0992-release-0-1-38-skills-docs-alignment/manual/fork-context/run-fork-false.jsonl`, `out/0992-release-0-1-38-skills-docs-alignment/manual/fork-context/run-fork-true.jsonl`.
- [x] Fork-context observability patch landed (manifest `collab_tool_calls[].fork_context` + `doctor --usage` counters) with no behavior change. - Evidence: `schemas/manifest.json`, `packages/shared/manifest/types.ts`, `orchestrator/src/cli/services/commandRunner.ts`, `orchestrator/src/cli/doctorUsage.ts`, `orchestrator/tests/CommandRunnerCollabCaptureLimit.test.ts`, `orchestrator/tests/DoctorUsage.test.ts`, `out/0992-release-0-1-38-skills-docs-alignment/manual/fork-context/scoped-fork-context-tests.log`.
- [x] Minimal corrective edits applied for validated contradictions/staleness. - Evidence: docs/skills alignment edits already staged in this task.
- [ ] Release bump PR prepared/merged for `0.1.38`.
- [ ] Signed tag + release workflow + npm publish verified.
- [ ] `codex-orchestrator` skill install verified globally.

## Validation
- [x] 01 `node scripts/delegation-guard.mjs --task 0992-release-0-1-38-skills-docs-alignment`. - Evidence: fail `out/0992-release-0-1-38-skills-docs-alignment/manual/final-01-delegation-guard.log`; fix/pass `out/0992-release-0-1-38-skills-docs-alignment/manual/final-01-delegation-guard-rerun1.log`.
- [x] 02 `node scripts/spec-guard.mjs --dry-run`. - Evidence: `out/0992-release-0-1-38-skills-docs-alignment/manual/final-02-spec-guard.log`.
- [x] 03 `npm run build`. - Evidence: `out/0992-release-0-1-38-skills-docs-alignment/manual/final-03-build.log`.
- [x] 04 `npm run lint`. - Evidence: `out/0992-release-0-1-38-skills-docs-alignment/manual/final-04-lint.log`.
- [x] 05 `npm run test`. - Evidence: `out/0992-release-0-1-38-skills-docs-alignment/manual/final-05-test.log`.
- [x] 06 `npm run docs:check`. - Evidence: `out/0992-release-0-1-38-skills-docs-alignment/manual/final-06-docs-check.log`.
- [x] 07 `npm run docs:freshness`. - Evidence: `out/0992-release-0-1-38-skills-docs-alignment/manual/final-07-docs-freshness.log`.
- [x] 08 `node scripts/diff-budget.mjs`. - Evidence: fail `out/0992-release-0-1-38-skills-docs-alignment/manual/final-08-diff-budget.log`; override pass `out/0992-release-0-1-38-skills-docs-alignment/manual/final-08-diff-budget-rerun1.log`.
- [x] 09 `npm run review`. - Evidence: fail `out/0992-release-0-1-38-skills-docs-alignment/manual/final-09-review.log`; override pass `out/0992-release-0-1-38-skills-docs-alignment/manual/final-09-review-rerun1.log`.
- [x] 10 `npm run pack:smoke`. - Evidence: `out/0992-release-0-1-38-skills-docs-alignment/manual/final-10-pack-smoke.log`.

## Closeout
- [x] Checklist mirror synced (`tasks/`, `.agent/task/`, `docs/TASKS.md`). - Evidence: this file, `.agent/task/0992-release-0-1-38-skills-docs-alignment.md`, `docs/TASKS.md`.
- [ ] Final release decision + evidence note added.
