# Task Checklist - linear-74d6e549-46cc-46be-9a61-76ae61b014f4

- Linear Issue: `CO-84` / `74d6e549-46cc-46be-9a61-76ae61b014f4`
- MCP Task ID: `linear-74d6e549-46cc-46be-9a61-76ae61b014f4`
- Primary PRD: `docs/PRD-linear-74d6e549-46cc-46be-9a61-76ae61b014f4.md`
- TECH_SPEC: `tasks/specs/linear-74d6e549-46cc-46be-9a61-76ae61b014f4.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-74d6e549-46cc-46be-9a61-76ae61b014f4.md`

## Docs-First
- [x] PRD drafted for the non-interactive `npm run test` quiet-tail / `MessagePort` leak lane. Evidence: `docs/PRD-linear-74d6e549-46cc-46be-9a61-76ae61b014f4.md`.
- [x] TECH_SPEC drafted with the reproduction-first owner search and validation plan. Evidence: `tasks/specs/linear-74d6e549-46cc-46be-9a61-76ae61b014f4.md`, `docs/TECH_SPEC-linear-74d6e549-46cc-46be-9a61-76ae61b014f4.md`.
- [x] ACTION_PLAN drafted for docs review, reproduction, implementation, validation, and handoff. Evidence: `docs/ACTION_PLAN-linear-74d6e549-46cc-46be-9a61-76ae61b014f4.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] `docs/docs-freshness-registry.json` updated with the new packet entries. Evidence: `docs/docs-freshness-registry.json`.
- [x] Checklist mirrored to `.agent/task/linear-74d6e549-46cc-46be-9a61-76ae61b014f4.md`. Evidence: `.agent/task/linear-74d6e549-46cc-46be-9a61-76ae61b014f4.md`.
- [x] Standalone pre-implementation approval captured in spec notes. Evidence: `tasks/specs/linear-74d6e549-46cc-46be-9a61-76ae61b014f4.md` `review_notes`.
- [x] docs-review approval captured for `linear-74d6e549-46cc-46be-9a61-76ae61b014f4`. Evidence: `.runs/linear-74d6e549-46cc-46be-9a61-76ae61b014f4-co-84-docs-review/cli/2026-04-04T21-04-09-010Z-75101f55/manifest.json`.

## Workflow
- [x] Issue moved from `Ready` to the live started state (`In Progress`) before active coding. Evidence: packaged `linear transition --state "In Progress"` succeeded on 2026-04-05.
- [x] Workspace moved from detached `HEAD` onto a task branch based on the current workspace commit. Evidence: `linear/co-84-non-interactive-test-quiet-tail`.
- [x] Exactly one persistent `## Codex Workpad` comment is kept current on the issue. Evidence: Linear comment `44f26831-4c3f-41f5-bebc-6897452046ee`.

## Investigation
- [x] Prior related packet reviewed so this lane starts from the right boundary. Evidence: `docs/PRD-linear-dbddac50-c205-4402-a7a5-e2325a9c4373.md`, `docs/TECH_SPEC-linear-dbddac50-c205-4402-a7a5-e2325a9c4373.md`, `tasks/specs/linear-dbddac50-c205-4402-a7a5-e2325a9c4373.md`.
- [x] Deterministic current-workspace reproduction of the non-interactive quiet tail captured with evidence. Evidence: `out/linear-74d6e549-46cc-46be-9a61-76ae61b014f4/manual/20260404T210334Z-repro-npm-run-test/`, `out/linear-74d6e549-46cc-46be-9a61-76ae61b014f4/manual/20260405T072200Z-control-direct-npm-test/`.
- [x] Root-cause owner isolated to the smallest truthful seam. Evidence: current-head classification in `tasks/specs/linear-74d6e549-46cc-46be-9a61-76ae61b014f4.md` and the non-interactive progress-reporter gate in `vitest.config.core.ts`.

## Implementation
- [x] The chosen non-interactive full-suite validation path reaches a clean terminal success exit in this workspace. Evidence: `out/linear-74d6e549-46cc-46be-9a61-76ae61b014f4/manual/20260404T215406Z-final-validation-npm-test/`, `out/linear-74d6e549-46cc-46be-9a61-76ae61b014f4/manual/20260405T072200Z-control-direct-npm-test/`.
- [x] The fix preserves truthful failure semantics and full-suite coverage. Evidence: `tests/vitest-progress-config.spec.ts`, `orchestrator/tests/PipelineResolverEnvOverrides.test.ts`, `out/linear-74d6e549-46cc-46be-9a61-76ae61b014f4/manual/20260404T215406Z-final-validation-npm-test/`.
- [x] Root cause and final fix are documented for future provider-worker lanes. Evidence: `docs/PRD-linear-74d6e549-46cc-46be-9a61-76ae61b014f4.md`, `docs/TECH_SPEC-linear-74d6e549-46cc-46be-9a61-76ae61b014f4.md`, `tasks/specs/linear-74d6e549-46cc-46be-9a61-76ae61b014f4.md`.

## Validation
- [x] `MCP_RUNNER_TASK_ID=linear-74d6e549-46cc-46be-9a61-76ae61b014f4 node dist/bin/codex-orchestrator.js linear child-stream --pipeline docs-review --stream co-84-docs-review --format json`. Evidence: `.runs/linear-74d6e549-46cc-46be-9a61-76ae61b014f4-co-84-docs-review/cli/2026-04-04T21-04-09-010Z-75101f55/manifest.json`.
- [x] Reproduction commands from the issue body or narrower diagnostic command shapes executed and classified with evidence. Evidence: `out/linear-74d6e549-46cc-46be-9a61-76ae61b014f4/manual/20260404T210334Z-repro-npm-run-test/`, `out/linear-74d6e549-46cc-46be-9a61-76ae61b014f4/manual/20260405T072200Z-control-direct-npm-test/`.
- [x] Focused regressions or equivalent proof recorded for the chosen owner. Evidence: `npm run test:orchestrator -- tests/vitest-progress-config.spec.ts orchestrator/tests/PipelineResolverEnvOverrides.test.ts`, `out/linear-74d6e549-46cc-46be-9a61-76ae61b014f4/manual/20260404T215406Z-final-validation-npm-test/`.
- [x] `MCP_RUNNER_TASK_ID=linear-74d6e549-46cc-46be-9a61-76ae61b014f4 node scripts/delegation-guard.mjs`. Evidence: terminal `Delegation guard: OK (1 subagent manifest(s) found).`
- [x] `MCP_RUNNER_TASK_ID=linear-74d6e549-46cc-46be-9a61-76ae61b014f4 node scripts/spec-guard.mjs --dry-run`. Evidence: terminal `✅ Spec guard: OK`.
- [x] `MCP_RUNNER_TASK_ID=linear-74d6e549-46cc-46be-9a61-76ae61b014f4 npm run build`. Evidence: terminal exit `0`.
- [x] `MCP_RUNNER_TASK_ID=linear-74d6e549-46cc-46be-9a61-76ae61b014f4 npm run lint`. Evidence: terminal exit `0`.
- [x] `MCP_RUNNER_TASK_ID=linear-74d6e549-46cc-46be-9a61-76ae61b014f4 npm run test`. Evidence: `out/linear-74d6e549-46cc-46be-9a61-76ae61b014f4/manual/20260404T215406Z-final-validation-npm-test/`.
- [x] `MCP_RUNNER_TASK_ID=linear-74d6e549-46cc-46be-9a61-76ae61b014f4 npm run docs:check`. Evidence: terminal `✅ docs:check: OK`.
- [x] `MCP_RUNNER_TASK_ID=linear-74d6e549-46cc-46be-9a61-76ae61b014f4 npm run docs:freshness`. Evidence: terminal `docs:freshness OK - 3308 docs, 3311 registry entries`.
- [x] `MCP_RUNNER_TASK_ID=linear-74d6e549-46cc-46be-9a61-76ae61b014f4 node scripts/diff-budget.mjs`. Evidence: terminal `✅ Diff budget: OK (scope=working-tree, files=11/25, lines=605/1200, +597/-8)`.
- [x] `MCP_RUNNER_TASK_ID=linear-74d6e549-46cc-46be-9a61-76ae61b014f4 FORCE_CODEX_REVIEW=1 npm run review`. Evidence: `.runs/linear-74d6e549-46cc-46be-9a61-76ae61b014f4/cli/2026-04-04T20-56-59-906Z-9ff00c55/review/telemetry.json`, wrapper output `review outcome: clean success`.
- [x] Explicit elegance review recorded before any review handoff. Evidence: 2026-04-05 manual pass concluded the current fix is already minimal because it reuses the existing reporter and adds only one stage-owned env flag plus focused coverage.
- [x] `MCP_RUNNER_TASK_ID=linear-74d6e549-46cc-46be-9a61-76ae61b014f4 npm run pack:smoke` if downstream-facing CLI, package, or skill surfaces change. Evidence: skipped by scope; changed files are limited to `vitest.config.core.ts`, `tests/vitest-progress-config.spec.ts`, `orchestrator/tests/PipelineResolverEnvOverrides.test.ts`, `codex.orchestrator.json`, and docs/task mirrors, with no CLI/package/skills/review-wrapper implementation paths touched.

## Handoff
- [x] Workpad refreshed after docs, after implementation, and immediately before any review or merge handoff. Evidence: Linear workpad comment `44f26831-4c3f-41f5-bebc-6897452046ee` refreshed after validation/review and again after PR + review-thread follow-up.
- [x] PR attached to the Linear issue before review-state transition. Evidence: PR `#362` / `https://github.com/Kbediako/CO/pull/362`, Linear attachment `2c0387d2-686b-4c02-9058-a08115710059`.
- [x] Latest `origin/main` merged into the branch before review-state transition. Evidence: `git fetch origin refs/heads/main:refs/remotes/origin/main && git merge --ff-only origin/main` returned `Already up to date.` before PR open.
- [ ] PR checks green and actionable review feedback handled or explicitly pushed back before review-state transition. Evidence: pending.
- [x] Issue remains active until review handoff prerequisites are complete. Evidence: Linear state is still `In Progress`.
