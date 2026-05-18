# Task Checklist - linear-5de4b04b-ec1e-4ab5-b75a-270989af4599

- Linear Issue: `CO-215` / `5de4b04b-ec1e-4ab5-b75a-270989af4599`
- MCP Task ID: `linear-5de4b04b-ec1e-4ab5-b75a-270989af4599`
- Primary PRD: `docs/PRD-linear-5de4b04b-ec1e-4ab5-b75a-270989af4599.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-5de4b04b-ec1e-4ab5-b75a-270989af4599.md`
- Task spec: `tasks/specs/linear-5de4b04b-ec1e-4ab5-b75a-270989af4599.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-5de4b04b-ec1e-4ab5-b75a-270989af4599.md`
- Source anchor: `ctx:sha256:2ac878f3d195fac62c08cd13c1747e33d4960f3aa5ec0484caee93b20cb2a167#chunk:c000001`

## Docs-First
- [x] PRD drafted for race-safe `linear transition` with expected-state/CAS semantics and expected updated_at. Evidence: `docs/PRD-linear-5de4b04b-ec1e-4ab5-b75a-270989af4599.md`.
- [x] TECH_SPEC drafted with issue-shaping contract, protected terms, readiness gate, and parent-owned validation requirements. Evidence: `docs/TECH_SPEC-linear-5de4b04b-ec1e-4ab5-b75a-270989af4599.md`, `tasks/specs/linear-5de4b04b-ec1e-4ab5-b75a-270989af4599.md`.
- [x] ACTION_PLAN drafted for parent implementation and closeout. Evidence: `docs/ACTION_PLAN-linear-5de4b04b-ec1e-4ab5-b75a-270989af4599.md`.
- [x] Task checklist and `.agent` mirror drafted within child-lane scope. Evidence: `tasks/tasks-linear-5de4b04b-ec1e-4ab5-b75a-270989af4599.md`, `.agent/task/linear-5de4b04b-ec1e-4ab5-b75a-270989af4599.md`.
- [x] Canonical registry mirrors updated within this docs lane. Evidence: `tasks/index.json`, `docs/docs-freshness-registry.json`.
- [x] Parent recorded the active `docs/TASKS.md` omission after docs-review proved the file was at the `450`-line cap and `npm run docs:archive-tasks` found no eligible succeeded tasks to archive. Evidence: `.runs/linear-5de4b04b-ec1e-4ab5-b75a-270989af4599-docs-review/cli/2026-04-17T09-41-12-983Z-851b1e54/errors/03-docs-check.json`, `scripts/tasks-archive.mjs`, `docs/tasks-archive-policy.json`.
- [x] Pre-implementation issue-quality review recorded in the TECH_SPEC readiness gate. Evidence: `docs/TECH_SPEC-linear-5de4b04b-ec1e-4ab5-b75a-270989af4599.md`, `tasks/specs/linear-5de4b04b-ec1e-4ab5-b75a-270989af4599.md`.

## Source / Assumptions
- [x] Shared source anchor recorded. Evidence: `ctx:sha256:2ac878f3d195fac62c08cd13c1747e33d4960f3aa5ec0484caee93b20cb2a167#chunk:c000001`.
- [x] Child lane recorded that the expected shared source payload path is absent in this checkout. Evidence: `docs/PRD-linear-5de4b04b-ec1e-4ab5-b75a-270989af4599.md`, `docs/TECH_SPEC-linear-5de4b04b-ec1e-4ab5-b75a-270989af4599.md`.
- [x] Child lane anchored the packet on protected issue wording plus current repo truth from `providerLinearWorkflowFacade.ts`, `linearCliShell.ts`, `providerLinearWorkflowStates.ts`, and `providerMergeCloseout.ts` without Linear mutation. Evidence: this checklist, the PRD, and the TECH_SPEC readiness gate.
- [x] Parent/child ownership split recorded. Evidence: this checklist, the PRD, and the TECH_SPEC readiness gate.

## Parent Implementation Acceptance
- [ ] Extend `linear transition` with expected-state/CAS semantics and expected updated_at. Evidence: pending parent source diff and focused tests.
- [ ] Fail closed on stale live-state mismatch, including terminal/completed workflow type. Evidence: pending parent focused tests.
- [ ] Prevent the stale `Done -> Merging race` by default. Evidence: pending parent focused race-case test.
- [ ] Require explicit `--force` plus force reason for override. Evidence: pending parent CLI and helper tests.
- [ ] Extend audit output with mismatch truth, `--force`, and force reason. Evidence: pending parent focused audit test or artifact.
- [ ] Thread the shared contract through `In Review -> Merging` and `Merging -> Done`. Evidence: pending parent `ProviderMergeCloseout.test.ts`.
- [ ] Preserve `CO-212` / `PR #507` reclaim truth while landing the guard. Evidence: pending parent focused validation notes.

## Validation
- [x] Docs child lane scoped JSON syntax check. Evidence: `jq empty tasks/index.json docs/docs-freshness-registry.json` exits `0`.
- [x] Docs child lane scoped whitespace check. Evidence: `git diff --check -- docs/PRD-linear-5de4b04b-ec1e-4ab5-b75a-270989af4599.md tasks/specs/linear-5de4b04b-ec1e-4ab5-b75a-270989af4599.md docs/TECH_SPEC-linear-5de4b04b-ec1e-4ab5-b75a-270989af4599.md docs/ACTION_PLAN-linear-5de4b04b-ec1e-4ab5-b75a-270989af4599.md tasks/tasks-linear-5de4b04b-ec1e-4ab5-b75a-270989af4599.md .agent/task/linear-5de4b04b-ec1e-4ab5-b75a-270989af4599.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json` exits `0`.
- [x] Docs child lane protected-term check. Evidence: `rg -n "linear transition|expected-state/CAS semantics|expected updated_at|terminal/completed workflow type|Done -> Merging race|In Review -> Merging|Merging -> Done|--force|force reason|audit output|providerLinearWorkflowFacade.ts|linearCliShell.ts|providerLinearWorkflowStates.ts|providerMergeCloseout.ts|CO-212|PR #507" docs/PRD-linear-5de4b04b-ec1e-4ab5-b75a-270989af4599.md docs/TECH_SPEC-linear-5de4b04b-ec1e-4ab5-b75a-270989af4599.md docs/ACTION_PLAN-linear-5de4b04b-ec1e-4ab5-b75a-270989af4599.md tasks/specs/linear-5de4b04b-ec1e-4ab5-b75a-270989af4599.md tasks/tasks-linear-5de4b04b-ec1e-4ab5-b75a-270989af4599.md .agent/task/linear-5de4b04b-ec1e-4ab5-b75a-270989af4599.md` exits `0`.
- [ ] Parent focused `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`. Evidence: pending parent test run.
- [ ] Parent focused `orchestrator/tests/LinearCliShell.test.ts`. Evidence: pending parent test run.
- [ ] Parent focused `orchestrator/tests/ProviderMergeCloseout.test.ts`. Evidence: pending parent test run.
- [ ] Parent docs-review evidence captured before implementation. Evidence: pending parent manifest.
- [ ] Parent post-patch `node scripts/spec-guard.mjs --dry-run` captured. Evidence: pending parent command output.

## Handoff Status
- [x] Child lane leaves packet and registry/checklist changes in place for patch export. Evidence: dirty working tree in this child workspace.
- [x] Parent manually integrated the clean child patch artifact after `git apply --check` and explicit accept failed because the helper had already auto-invalidated the lane. Evidence: `.runs/linear-5de4b04b-ec1e-4ab5-b75a-270989af4599-co215-docs-packet/cli/2026-04-17T09-16-32-281Z-7ee373ad/provider-linear-child-lane.patch`.
- [ ] Parent updates Linear workpad and PR lifecycle artifacts. Evidence: pending parent lane.

## Progress Log
- 2026-04-17: Created the scoped docs-first packet from protected issue wording plus direct inspection of the current transition, workflow-state, and merge-closeout seams because the expected source payload was absent in this child checkout.
- 2026-04-17: Preserved the exact protected terms, including `linear transition`, expected-state/CAS semantics, expected updated_at, terminal/completed workflow type, `Done -> Merging race`, `In Review -> Merging`, `Merging -> Done`, `--force`, force reason, audit output, and the `CO-212` / `PR #507` reference.
- 2026-04-17: Completed the requested scoped checks: `jq empty`, protected-term `rg`, and `git diff --check`.
- 2026-04-17: Parent kept `tasks/index.json` and `docs/docs-freshness-registry.json` but omitted the active `docs/TASKS.md` snapshot because the repo was already at the `450`-line cap and `npm run docs:archive-tasks` reported no eligible succeeded tasks to archive.

## Relevant Files
- `docs/PRD-linear-5de4b04b-ec1e-4ab5-b75a-270989af4599.md`
- `docs/TECH_SPEC-linear-5de4b04b-ec1e-4ab5-b75a-270989af4599.md`
- `docs/ACTION_PLAN-linear-5de4b04b-ec1e-4ab5-b75a-270989af4599.md`
- `tasks/specs/linear-5de4b04b-ec1e-4ab5-b75a-270989af4599.md`
- `tasks/tasks-linear-5de4b04b-ec1e-4ab5-b75a-270989af4599.md`
- `.agent/task/linear-5de4b04b-ec1e-4ab5-b75a-270989af4599.md`
- `tasks/index.json`
- `docs/docs-freshness-registry.json`

## Notes
- Do not widen this lane into a broad workflow-state redesign.
- Do not weaken merge-closeout safety to hide the stale `Done -> Merging race`.
- Do not add `--force` without mandatory force reason and audit output.
- Do not reopen `CO-212` / `PR #507` reclaim semantics in this lane.
