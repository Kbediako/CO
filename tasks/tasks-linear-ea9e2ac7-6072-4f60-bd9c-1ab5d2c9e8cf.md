# Task Checklist - linear-ea9e2ac7-6072-4f60-bd9c-1ab5d2c9e8cf

- Linear Issue: `CO-157` / `ea9e2ac7-6072-4f60-bd9c-1ab5d2c9e8cf`
- MCP Task ID: `linear-ea9e2ac7-6072-4f60-bd9c-1ab5d2c9e8cf`
- Primary PRD: `docs/PRD-linear-ea9e2ac7-6072-4f60-bd9c-1ab5d2c9e8cf.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-ea9e2ac7-6072-4f60-bd9c-1ab5d2c9e8cf.md`
- Task spec: `tasks/specs/linear-ea9e2ac7-6072-4f60-bd9c-1ab5d2c9e8cf.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-ea9e2ac7-6072-4f60-bd9c-1ab5d2c9e8cf.md`

## Docs-First
- [x] PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, and the saved workpad source were drafted for `CO-157`. Evidence: `docs/PRD-linear-ea9e2ac7-6072-4f60-bd9c-1ab5d2c9e8cf.md`, `docs/TECH_SPEC-linear-ea9e2ac7-6072-4f60-bd9c-1ab5d2c9e8cf.md`, `docs/ACTION_PLAN-linear-ea9e2ac7-6072-4f60-bd9c-1ab5d2c9e8cf.md`, `tasks/specs/linear-ea9e2ac7-6072-4f60-bd9c-1ab5d2c9e8cf.md`, `tasks/tasks-linear-ea9e2ac7-6072-4f60-bd9c-1ab5d2c9e8cf.md`, `.agent/task/linear-ea9e2ac7-6072-4f60-bd9c-1ab5d2c9e8cf.md`, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `out/linear-ea9e2ac7-6072-4f60-bd9c-1ab5d2c9e8cf/manual/workpad.md`.
- [x] Pre-implementation issue-quality review notes were captured in the task spec before implementation. Evidence: `tasks/specs/linear-ea9e2ac7-6072-4f60-bd9c-1ab5d2c9e8cf.md`.
- [x] Docs-review delegation evidence is captured, or a truthful manual fallback is recorded if the wrapper stops for reasons outside the packet. Evidence: `.runs/linear-ea9e2ac7-6072-4f60-bd9c-1ab5d2c9e8cf-co-157-docs-review-final/cli/2026-04-12T13-49-48-276Z-e51840f8/manifest.json`.

## Workflow
- [x] `linear issue-context` inspected live team states before any transition. Evidence: packaged `linear issue-context --issue-id ea9e2ac7-6072-4f60-bd9c-1ab5d2c9e8cf --format json`.
- [x] Exactly one explicit same-turn parallelization decision was recorded for this turn. Evidence: packaged `linear parallelization --decision stay_serial --reason overlapping_scope`.
- [x] Issue moved from `Ready` to `In Progress` before active coding. Evidence: packaged `linear transition --issue-id ea9e2ac7-6072-4f60-bd9c-1ab5d2c9e8cf --state "In Progress" --format json`.
- [x] Exactly one persistent `## Codex Workpad` comment is kept current on the issue. Evidence: Linear comment `12fc26ab-0bc2-44d3-b487-88936836602e`, packaged `linear upsert-workpad --issue-id ea9e2ac7-6072-4f60-bd9c-1ab5d2c9e8cf --body-file out/linear-ea9e2ac7-6072-4f60-bd9c-1ab5d2c9e8cf/manual/workpad.md`.

## Investigation
- [x] Source issue `CO-133` closeout behavior was reconciled against the standing provider-worker contract. Evidence: packaged `linear issue-context --issue-id 42b8cf7e-8c1c-4ff7-a479-96e15ad5f6b5 --format json`, `tasks/specs/linear-ea9e2ac7-6072-4f60-bd9c-1ab5d2c9e8cf.md`.
- [x] The missing workflow branch was narrowed to prompt/docs guidance rather than runtime enforcement or validation implementation. Evidence: `docs/PRD-linear-ea9e2ac7-6072-4f60-bd9c-1ab5d2c9e8cf.md`, `docs/TECH_SPEC-linear-ea9e2ac7-6072-4f60-bd9c-1ab5d2c9e8cf.md`.

## Implementation
- [x] Provider-worker workflow guidance explicitly covers the forced invalid-split non-repro case with truthful `forbid_parallel` reason branching (`parent_only_mutation` for direct clean closeout, `blocked_by_dependency` only for real remaining dependencies). Evidence: `orchestrator/src/cli/providerLinearWorkerRunner.ts`.
- [x] Focused regression coverage preserves the exact `clean-main-baseline-failures` and `cli-orchestrator-cleanup-fallout` example in prompt output. Evidence: `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`.

## Validation
- [x] `MCP_RUNNER_TASK_ID=linear-ea9e2ac7-6072-4f60-bd9c-1ab5d2c9e8cf "/opt/homebrew/Cellar/node/25.2.1/bin/node" "/Users/kbediako/Code/CO/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-157-docs-review-final --format json`. Evidence: `.runs/linear-ea9e2ac7-6072-4f60-bd9c-1ab5d2c9e8cf-co-157-docs-review-final/cli/2026-04-12T13-49-48-276Z-e51840f8/manifest.json`.
- [x] Focused `ProviderLinearWorkerRunner` regression run passes. Evidence: `npx vitest run orchestrator/tests/ProviderLinearWorkerRunner.test.ts` (`143 passed`).
- [x] Standalone review and explicit elegance review are captured before review handoff if the final diff remains non-trivial. Evidence: `out/linear-ea9e2ac7-6072-4f60-bd9c-1ab5d2c9e8cf/manual/standalone-review.md`, `out/linear-ea9e2ac7-6072-4f60-bd9c-1ab5d2c9e8cf/manual/elegance-review.md`.

## Handoff
- [ ] Workpad refreshed after docs-first, after implementation, and immediately before any review handoff. Evidence: pending.
- [ ] PR attached to the Linear issue before any review-state transition. Evidence: pending.
- [ ] Latest `origin/main` merged into the branch before review-state transition, PR checks are green, and `pr ready-review` drains cleanly. Evidence: pending.
