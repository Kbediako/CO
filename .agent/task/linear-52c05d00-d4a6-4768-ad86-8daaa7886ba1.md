# Task Checklist - linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1

- Linear Issue: `CO-58` / `52c05d00-d4a6-4768-ad86-8daaa7886ba1`
- MCP Task ID: `linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1`
- Primary PRD: `docs/PRD-linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1.md`
- TECH_SPEC: `tasks/specs/linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1.md`

## Docs-First
- [x] PRD drafted for the unrelated `eval:test` TypeScript smoke baseline repair lane. Evidence: `docs/PRD-linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1.md`.
- [x] TECH_SPEC drafted with the bounded reproduction, classification, and repair seam. Evidence: `tasks/specs/linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1.md`, `docs/TECH_SPEC-linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1.md`.
- [x] ACTION_PLAN drafted for docs-review, reproduction, implementation, validation, and handoff. Evidence: `docs/ACTION_PLAN-linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] `docs/docs-freshness-registry.json` updated with the new packet entries. Evidence: `docs/docs-freshness-registry.json`.
- [x] Checklist mirrored to `.agent/task/linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1.md`. Evidence: `.agent/task/linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1.md`.
- [x] Standalone pre-implementation approval captured in spec notes. Evidence: `tasks/specs/linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1.md` `review_notes`.
- [x] docs-review approval or explicit override captured for `linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1`. Evidence: `.runs/linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1-co-58-docs-review/cli/2026-04-02T08-28-51-569Z-64402b50/manifest.json`, `.runs/linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1-co-58-docs-review/cli/2026-04-02T08-28-51-569Z-64402b50/review/telemetry.json`.

## Workflow
- [x] Issue moved from `Ready` to the live started state (`In Progress`) before active coding. Evidence: packaged `linear transition --state "In Progress"` succeeded for `CO-58`.
- [x] Exactly one persistent `## Codex Workpad` comment is kept current on the issue. Evidence: Linear workpad comment `f17a92a3-0200-4885-9e08-35f104955fe6` (`https://linear.app/asabeko/issue/CO-58/co-restore-unrelated-evaltest-baseline-failing-typescript-smoke#comment-f17a92a3`).
- [x] Workspace was resynced from detached `HEAD` onto a task branch based on the current workspace commit. Evidence: `linear/co-58-restore-eval-test-baseline`.

## Investigation
- [x] The live failure shape for the TypeScript smoke scenario is reproduced on this branch. Evidence: `out/linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1/manual/20260402T091941Z-closeout/00-reproduction-and-validation.md`.
- [x] The exact failing goal statuses for the TypeScript smoke scenario are captured. Evidence: `out/linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1/manual/20260402T091941Z-closeout/00-reproduction-and-validation.md`.
- [x] The owner layer is narrowed to the harness, fixture, or another runtime dependency seam. Evidence: `out/linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1/manual/20260402T091941Z-closeout/00-reproduction-and-validation.md`.

## Implementation
- [x] The smallest truthful repair or explicit blocker ownership is recorded for the TypeScript smoke baseline seam. Evidence: `evaluation/harness/env.ts`, `evaluation/harness/index.ts`, `evaluation/tests/harness.test.ts`, `out/linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1/manual/20260402T091941Z-closeout/00-reproduction-and-validation.md`.
- [x] `npm run eval:test` is green again, or the remaining blocker owner and rationale are explicit. Evidence: `out/linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1/manual/20260402T091941Z-closeout/00-reproduction-and-validation.md`.

## Validation
- [x] `MCP_RUNNER_TASK_ID=linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1 node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-58-docs-review --format json`. Evidence: `.runs/linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1-co-58-docs-review/cli/2026-04-02T08-28-51-569Z-64402b50/manifest.json`.
- [x] `MCP_RUNNER_TASK_ID=linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1 npm run eval:test`. Evidence: `out/linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1/manual/20260402T091941Z-closeout/00-reproduction-and-validation.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1 node scripts/delegation-guard.mjs`. Evidence: `out/linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1/manual/20260402T091941Z-closeout/00-reproduction-and-validation.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1 node scripts/spec-guard.mjs --dry-run`. Evidence: `out/linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1/manual/20260402T091941Z-closeout/00-reproduction-and-validation.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1 npm run build`. Evidence: `out/linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1/manual/20260402T091941Z-closeout/00-reproduction-and-validation.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1 npm run lint`. Evidence: `out/linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1/manual/20260402T091941Z-closeout/00-reproduction-and-validation.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1 npm run test`. Evidence: `out/linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1/manual/20260402T091941Z-closeout/00-reproduction-and-validation.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1 npm run docs:check`. Evidence: `out/linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1/manual/20260402T091941Z-closeout/00-reproduction-and-validation.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1 npm run docs:freshness`. Evidence: `out/linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1/manual/20260402T091941Z-closeout/00-reproduction-and-validation.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1 node scripts/diff-budget.mjs`. Evidence: `out/linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1/manual/20260402T091941Z-closeout/00-reproduction-and-validation.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1 FORCE_CODEX_REVIEW=1 npm run review`. Evidence: `/Users/kbediako/Code/CO/.runs/linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1/cli/2026-04-02T08-20-26-949Z-04a2034b/review/telemetry.json`.
- [x] Explicit elegance review recorded before any review handoff for a non-trivial diff, or skip justification recorded if the final diff stays trivial. Evidence: `out/linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1/manual/20260402T091941Z-closeout/01-review-and-elegance.md`.

## Handoff
- [ ] Workpad refreshed after docs, after implementation, and immediately before any review or merge handoff. Evidence: docs/implementation refreshes complete; final pre-review-handoff refresh still pending.
- [ ] PR attached to the Linear issue before review-state transition. Evidence: pending.
- [ ] Latest `origin/main` merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks green and actionable review feedback handled or explicitly pushed back before review-state transition. Evidence: pending.
- [x] Issue remains active until review handoff prerequisites are complete. Evidence: issue is currently `In Progress`.
