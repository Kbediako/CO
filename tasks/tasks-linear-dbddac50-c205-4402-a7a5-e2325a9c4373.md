# Task Checklist - linear-dbddac50-c205-4402-a7a5-e2325a9c4373

- Linear Issue: `CO-69` / `dbddac50-c205-4402-a7a5-e2325a9c4373`
- MCP Task ID: `linear-dbddac50-c205-4402-a7a5-e2325a9c4373`
- Primary PRD: `docs/PRD-linear-dbddac50-c205-4402-a7a5-e2325a9c4373.md`
- TECH_SPEC: `tasks/specs/linear-dbddac50-c205-4402-a7a5-e2325a9c4373.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-dbddac50-c205-4402-a7a5-e2325a9c4373.md`

## Docs-First
- [x] PRD drafted for the full-suite clean-exit restoration lane. Evidence: `docs/PRD-linear-dbddac50-c205-4402-a7a5-e2325a9c4373.md`.
- [x] TECH_SPEC drafted with the bounded reproduction-first owner search and validation plan. Evidence: `tasks/specs/linear-dbddac50-c205-4402-a7a5-e2325a9c4373.md`, `docs/TECH_SPEC-linear-dbddac50-c205-4402-a7a5-e2325a9c4373.md`.
- [x] ACTION_PLAN drafted for docs-review, reproduction, implementation, validation, and handoff. Evidence: `docs/ACTION_PLAN-linear-dbddac50-c205-4402-a7a5-e2325a9c4373.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] `docs/docs-freshness-registry.json` updated with the new packet entries. Evidence: `docs/docs-freshness-registry.json`.
- [x] Checklist mirrored to `.agent/task/linear-dbddac50-c205-4402-a7a5-e2325a9c4373.md`. Evidence: `.agent/task/linear-dbddac50-c205-4402-a7a5-e2325a9c4373.md`.
- [x] Standalone pre-implementation approval captured in spec notes. Evidence: `tasks/specs/linear-dbddac50-c205-4402-a7a5-e2325a9c4373.md` `review_notes`.
- [x] docs-review approval captured for `linear-dbddac50-c205-4402-a7a5-e2325a9c4373`. Evidence: `.runs/linear-dbddac50-c205-4402-a7a5-e2325a9c4373-co-69-docs-review-rerun/cli/2026-04-02T10-02-03-042Z-c947ed42/manifest.json`.

## Workflow
- [x] Issue moved from `Ready` to the live started state (`In Progress`) before active coding. Evidence: packaged `linear transition --state "In Progress"` succeeded on 2026-04-02.
- [x] Workspace moved from detached `HEAD` onto a task branch based on the current workspace commit. Evidence: `linear/co-69-clean-full-suite-vitest-exit`.
- [x] Exactly one persistent `## Codex Workpad` comment is kept current on the issue. Evidence: Linear comment `d4b6a340-e0cd-481c-8670-db13483e9d03`.

## Investigation
- [x] Prior related packet reviewed so this lane starts from the right boundary. Evidence: `tasks/specs/linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955.md`, `tasks/tasks-linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955.md`, `docs/TECH_SPEC-linear-fdefaeca-8c14-4dc3-980e-cdc6cfa6d955.md`.
- [x] Deterministic current-workspace reproduction of the apparent full-suite clean-exit hang captured and classified. Evidence: `out/linear-dbddac50-c205-4402-a7a5-e2325a9c4373/manual/20260402T095856Z-repro-npm-run-test/01-npm-run-test-summary.json`, `out/linear-dbddac50-c205-4402-a7a5-e2325a9c4373/manual/20260402T101507Z-repro-classification.md`.
- [x] Root-cause owner isolated to the smallest truthful seam. Evidence: the apparent hang was a false timeout during the long-running `tests/run-review.spec.ts` and `tests/cli-command-surface.spec.ts` tail, not a reproduced post-suite orphan process; see `out/linear-dbddac50-c205-4402-a7a5-e2325a9c4373/manual/20260402T101507Z-repro-classification.md`.

## Implementation
- [x] The chosen full-suite validation path reaches a clean terminal success exit in this workspace. Evidence: `out/linear-dbddac50-c205-4402-a7a5-e2325a9c4373/manual/20260402T100743Z-full-suite-patience/01-npm-run-test.log`, `out/linear-dbddac50-c205-4402-a7a5-e2325a9c4373/manual/20260402T101507Z-repro-classification.md`.
- [x] The fix or fallback preserves truthful failure semantics and full-suite coverage. Evidence: the approved path remains the default `npm run test` full suite with no dropped files or cleanup-based success reclassification; see `out/linear-dbddac50-c205-4402-a7a5-e2325a9c4373/manual/20260402T101507Z-repro-classification.md`.
- [x] Root cause or approved fallback is documented for future provider-worker lanes. Evidence: `docs/PRD-linear-dbddac50-c205-4402-a7a5-e2325a9c4373.md`, `docs/TECH_SPEC-linear-dbddac50-c205-4402-a7a5-e2325a9c4373.md`, `tasks/specs/linear-dbddac50-c205-4402-a7a5-e2325a9c4373.md`, `out/linear-dbddac50-c205-4402-a7a5-e2325a9c4373/manual/20260402T101507Z-repro-classification.md`.

## Validation
- [x] `MCP_RUNNER_TASK_ID=linear-dbddac50-c205-4402-a7a5-e2325a9c4373 node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-69-docs-review-rerun --format json`. Evidence: `.runs/linear-dbddac50-c205-4402-a7a5-e2325a9c4373-co-69-docs-review-rerun/cli/2026-04-02T10-02-03-042Z-c947ed42/manifest.json`.
- [x] Reproduction commands from the issue body executed and classified with evidence. Evidence: `out/linear-dbddac50-c205-4402-a7a5-e2325a9c4373/manual/20260402T095856Z-repro-npm-run-test/01-npm-run-test-summary.json`, `out/linear-dbddac50-c205-4402-a7a5-e2325a9c4373/manual/20260402T100743Z-full-suite-patience/01-npm-run-test.log`, `out/linear-dbddac50-c205-4402-a7a5-e2325a9c4373/manual/20260402T101507Z-repro-classification.md`.
- [x] Focused regressions or explicit runbook validation recorded for the chosen owner. Evidence: explicit runbook validation and post-exit process sweeps are recorded in `out/linear-dbddac50-c205-4402-a7a5-e2325a9c4373/manual/20260402T101507Z-repro-classification.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-dbddac50-c205-4402-a7a5-e2325a9c4373 node scripts/delegation-guard.mjs`. Evidence: `.runs/linear-dbddac50-c205-4402-a7a5-e2325a9c4373-co-69-implementation-gate/cli/2026-04-02T10-19-16-455Z-c47a274a/manifest.json`.
- [x] `MCP_RUNNER_TASK_ID=linear-dbddac50-c205-4402-a7a5-e2325a9c4373 node scripts/spec-guard.mjs --dry-run`. Evidence: same manifest.
- [x] `MCP_RUNNER_TASK_ID=linear-dbddac50-c205-4402-a7a5-e2325a9c4373 npm run build`. Evidence: same manifest.
- [x] `MCP_RUNNER_TASK_ID=linear-dbddac50-c205-4402-a7a5-e2325a9c4373 npm run lint`. Evidence: same manifest.
- [x] `MCP_RUNNER_TASK_ID=linear-dbddac50-c205-4402-a7a5-e2325a9c4373 npm run test`. Evidence: same manifest plus `out/linear-dbddac50-c205-4402-a7a5-e2325a9c4373/manual/20260402T100743Z-full-suite-patience/01-npm-run-test.log`.
- [x] `MCP_RUNNER_TASK_ID=linear-dbddac50-c205-4402-a7a5-e2325a9c4373 npm run docs:check`. Evidence: same manifest.
- [x] `MCP_RUNNER_TASK_ID=linear-dbddac50-c205-4402-a7a5-e2325a9c4373 npm run docs:freshness`. Evidence: same manifest.
- [x] `MCP_RUNNER_TASK_ID=linear-dbddac50-c205-4402-a7a5-e2325a9c4373 node scripts/diff-budget.mjs`. Evidence: same manifest.
- [x] `MCP_RUNNER_TASK_ID=linear-dbddac50-c205-4402-a7a5-e2325a9c4373 FORCE_CODEX_REVIEW=1 npm run review`. Evidence: `.runs/linear-dbddac50-c205-4402-a7a5-e2325a9c4373-co-69-implementation-gate/cli/2026-04-02T10-19-16-455Z-c47a274a/manifest.json`, `.runs/linear-dbddac50-c205-4402-a7a5-e2325a9c4373-co-69-implementation-gate/cli/2026-04-02T10-19-16-455Z-c47a274a/review/telemetry.json`.
- [x] Explicit elegance review recorded before any review handoff. Evidence: `out/linear-dbddac50-c205-4402-a7a5-e2325a9c4373/manual/20260402T102805Z-elegance-review.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-dbddac50-c205-4402-a7a5-e2325a9c4373 npm run pack:smoke` if downstream-facing CLI, package, or skill surfaces change. Evidence: not needed; this lane changed issue-local docs/task artifacts only.

## Handoff
- [ ] Workpad refreshed after docs, after implementation, and immediately before any review or merge handoff. Evidence: pending Linear workpad updates.
- [ ] PR attached to the Linear issue before review-state transition. Evidence: pending.
- [ ] Latest `origin/main` merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks green and actionable review feedback handled or explicitly pushed back before review-state transition. Evidence: pending.
- [ ] Issue remains active until review handoff prerequisites are complete. Evidence: pending closeout state update.
