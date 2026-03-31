# Task Checklist - linear-271cbab4-de28-4847-a468-128df007c4a0

- Linear Issue: `CO-35` / `271cbab4-de28-4847-a468-128df007c4a0`
- MCP Task ID: `linear-271cbab4-de28-4847-a468-128df007c4a0`
- Primary PRD: `docs/PRD-linear-271cbab4-de28-4847-a468-128df007c4a0.md`
- TECH_SPEC: `tasks/specs/linear-271cbab4-de28-4847-a468-128df007c4a0.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-271cbab4-de28-4847-a468-128df007c4a0.md`

## Docs-First
- [x] PRD drafted for the parent-owned same-issue multi-worker runtime lane. Evidence: `docs/PRD-linear-271cbab4-de28-4847-a468-128df007c4a0.md`.
- [x] TECH_SPEC drafted for the same-issue child-lane runtime, parent-only mutation guard, and nested observability path. Evidence: `tasks/specs/linear-271cbab4-de28-4847-a468-128df007c4a0.md`, `docs/TECH_SPEC-linear-271cbab4-de28-4847-a468-128df007c4a0.md`.
- [x] ACTION_PLAN drafted for docs-review, implementation, runtime proof, validation, and handoff. Evidence: `docs/ACTION_PLAN-linear-271cbab4-de28-4847-a468-128df007c4a0.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] `docs/docs-freshness-registry.json` updated with the new packet entries. Evidence: `docs/docs-freshness-registry.json`.
- [x] Checklist mirrored to `.agent/task/linear-271cbab4-de28-4847-a468-128df007c4a0.md`. Evidence: `.agent/task/linear-271cbab4-de28-4847-a468-128df007c4a0.md`.
- [x] Standalone pre-implementation approval captured in spec notes. Evidence: `tasks/specs/linear-271cbab4-de28-4847-a468-128df007c4a0.md` `review_notes`.
- [x] `docs/TASKS.md` line-budget fallback was handled with the repo-sanctioned archive workflow. Evidence: `npm run docs:archive-tasks`, `out/linear-271cbab4-de28-4847-a468-128df007c4a0/TASKS-archive-2026.md`.
- [x] docs-review approval captured for `linear-271cbab4-de28-4847-a468-128df007c4a0`. Evidence: `.runs/linear-271cbab4-de28-4847-a468-128df007c4a0-co-35-docs-review-rerun/cli/2026-03-30T07-04-16-131Z-88752c3e/manifest.json`.

## Workflow
- [x] Issue moved from `Ready` to the live started state (`In Progress`) before active coding. Evidence: packaged `linear transition --state "In Progress"` succeeded for `CO-35`.
- [x] Exactly one persistent `## Codex Workpad` comment is kept current on the issue. Evidence: packaged `linear upsert-workpad` created comment `84cae2cc-c87c-41ed-9efe-1cc65d9ecdb2`.
- [x] Workspace was resynced from detached `HEAD` onto a task branch based on `origin/main`. Evidence: `linear/co-35-parent-owned-same-issue-multi-worker-runtime`.

## Investigation
- [x] Required `CO-13` and `CO-14` baseline docs plus runtime seams were reviewed before implementation. Evidence: `docs/TECH_SPEC-linear-488135bf-954e-4bd9-be7a-ad09d75f5f29.md`, `docs/TECH_SPEC-linear-62527426-2f74-4134-98e0-bb50c3da7913.md`, `tasks/specs/linear-271cbab4-de28-4847-a468-128df007c4a0.md`.
- [x] The current bounded child-stream seam was narrowed as insufficient for real same-issue worker lanes because it lacks coding scope ownership, stale invalidation, and parent-only Linear mutation enforcement. Evidence: `tasks/specs/linear-271cbab4-de28-4847-a468-128df007c4a0.md` `review_notes`.
- [x] The implementation boundary is explicit and bounded: extend parent-owned lineage, workspace, and proof truth instead of replacing the existing control-host plus provider-worker ownership seam. Evidence: `docs/TECH_SPEC-linear-271cbab4-de28-4847-a468-128df007c4a0.md`.

## Implementation
- [x] Parent `provider-linear-worker` can launch more than one subordinate same-issue child lane with `<parent-task-id>-<stream>` identity and `parent_run_id` lineage. Evidence: `.runs/linear-271cbab4-de28-4847-a468-128df007c4a0/cli/2026-03-30T06-41-23-902Z-6207e53b/provider-linear-worker-child-lanes.json`, `.runs/linear-271cbab4-de28-4847-a468-128df007c4a0-projection-proof/cli/2026-03-30T07-29-09-187Z-9cdd71f2/manifest.json`, `.runs/linear-271cbab4-de28-4847-a468-128df007c4a0-presenter-proof/cli/2026-03-30T07-41-23-610Z-fb57d1ec/manifest.json`, `.runs/linear-271cbab4-de28-4847-a468-128df007c4a0-api-proof/cli/2026-03-30T07-41-25-309Z-a7803050/manifest.json`.
- [x] Subordinate lanes require declared purpose plus explicit file-scope or phase-scope ownership. Evidence: `orchestrator/src/cli/providerLinearChildLaneRunner.ts`, `orchestrator/src/cli/providerLinearChildLaneShell.ts`, `.runs/linear-271cbab4-de28-4847-a468-128df007c4a0/cli/2026-03-30T06-41-23-902Z-6207e53b/provider-linear-worker-child-lanes.json`.
- [x] Overlapping unresolved scopes are rejected or otherwise serialized by the parent contract. Evidence: `orchestrator/src/cli/providerLinearChildLaneShell.ts`, `orchestrator/tests/ProviderLinearChildLaneShell.test.ts`.
- [x] Subordinate output can be accepted, rejected, rerun, or invalidated when stale. Evidence: `orchestrator/src/cli/providerLinearChildLaneShell.ts`, `orchestrator/tests/ProviderLinearChildLaneShell.test.ts`, `out/271cbab4-de28-4847-a468-128df007c4a0/manual/parent-owned-child-lane-runtime-proof.json`.
- [x] Parent-only Linear mutation enforcement blocks subordinate same-issue lanes from mutating workpad, issue state, PR attachment, or review handoffs. Evidence: `orchestrator/src/cli/linearCliShell.ts`, `orchestrator/tests/LinearCliShell.test.ts`.
- [x] Parent proof and read-side observability surface nested `child_lanes` without surfacing subordinate runs as peer issue owners. Evidence: `.runs/linear-271cbab4-de28-4847-a468-128df007c4a0/cli/2026-03-30T06-41-23-902Z-6207e53b/provider-linear-worker-proof.json`, `orchestrator/tests/ObservabilityApiController.test.ts`, `orchestrator/tests/SelectedRunProjection.test.ts`, `orchestrator/tests/SelectedRunPresenter.test.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] Real runtime proof for this lane shows more than one subordinate same-issue lane under one truthful parent issue run. Evidence: `out/271cbab4-de28-4847-a468-128df007c4a0/manual/parent-owned-child-lane-runtime-proof.json`, `.runs/linear-271cbab4-de28-4847-a468-128df007c4a0/cli/2026-03-30T06-41-23-902Z-6207e53b/provider-linear-worker-proof.json`, `.runs/linear-271cbab4-de28-4847-a468-128df007c4a0/cli/2026-03-30T06-41-23-902Z-6207e53b/provider-linear-worker-child-lanes.json`.

## Validation
- [x] `MCP_RUNNER_TASK_ID=linear-271cbab4-de28-4847-a468-128df007c4a0 node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-35-docs-review --format json`. Evidence: `.runs/linear-271cbab4-de28-4847-a468-128df007c4a0-co-35-docs-review-rerun/cli/2026-03-30T07-04-16-131Z-88752c3e/manifest.json`.
- [x] Focused child-lane and provider runtime regression command(s). Evidence: `npx vitest run orchestrator/tests/ProviderLinearChildLaneShell.test.ts orchestrator/tests/ProviderLinearChildStreamShell.test.ts orchestrator/tests/LinearCliShell.test.ts orchestrator/tests/ProviderIssueHandoff.test.ts orchestrator/tests/ProviderLinearWorkerRunner.test.ts orchestrator/tests/SelectedRunProjection.test.ts orchestrator/tests/SelectedRunPresenter.test.ts orchestrator/tests/ObservabilityApiController.test.ts` passed after the dirty-parent launch fix and the current PR follow-up regressions.
- [x] `MCP_RUNNER_TASK_ID=linear-271cbab4-de28-4847-a468-128df007c4a0 node scripts/delegation-guard.mjs`. Evidence: passed locally on 2026-03-30 before PR handoff prep.
- [x] `MCP_RUNNER_TASK_ID=linear-271cbab4-de28-4847-a468-128df007c4a0 node scripts/spec-guard.mjs --dry-run`. Evidence: passed locally on 2026-03-30 before PR handoff prep.
- [x] `MCP_RUNNER_TASK_ID=linear-271cbab4-de28-4847-a468-128df007c4a0 npm run build`. Evidence: passed locally on 2026-03-30 before PR handoff prep.
- [x] `MCP_RUNNER_TASK_ID=linear-271cbab4-de28-4847-a468-128df007c4a0 npm run lint`. Evidence: passed locally on 2026-03-30 before PR handoff prep.
- [x] `MCP_RUNNER_TASK_ID=linear-271cbab4-de28-4847-a468-128df007c4a0 npm run test`. Evidence: `env -i PATH="$PATH" HOME="$HOME" TMPDIR="${TMPDIR:-/tmp}" LANG="${LANG:-en_US.UTF-8}" CI=1 npm run test` passed with `301/301` files and `2644/2644` tests.
- [x] `MCP_RUNNER_TASK_ID=linear-271cbab4-de28-4847-a468-128df007c4a0 npm run docs:check`. Evidence: passed locally on 2026-03-30 before PR handoff prep.
- [x] `MCP_RUNNER_TASK_ID=linear-271cbab4-de28-4847-a468-128df007c4a0 npm run docs:freshness`. Evidence: passed locally on 2026-03-30 before PR handoff prep.
- [x] `MCP_RUNNER_TASK_ID=linear-271cbab4-de28-4847-a468-128df007c4a0 node scripts/diff-budget.mjs`. Evidence: passed locally on 2026-03-30 with `DIFF_BUDGET_OVERRIDE_REASON="CO-35 ships the first end-to-end same-issue child-lane runtime slice, so the diff necessarily spans new parent/child CLI surfaces, proof wiring, docs-first artifacts, and focused regressions across the runtime and observability layers."`.
- [x] `MCP_RUNNER_TASK_ID=linear-271cbab4-de28-4847-a468-128df007c4a0 FORCE_CODEX_REVIEW=1 npm run review`. Evidence: wrapper-led review executed under `FORCE_CODEX_REVIEW=1`; the bounded review crossed its validation-suite boundary without a terminal verdict, so manual correctness or regressions review found and fixed the dirty-parent launch gap before the validation floor was rerun cleanly.
- [x] `MCP_RUNNER_TASK_ID=linear-271cbab4-de28-4847-a468-128df007c4a0 npm run pack:smoke`. Evidence: passed locally on 2026-03-30 before PR handoff prep.
- [x] Explicit elegance review recorded before any review handoff. Evidence: the follow-up pass kept the minimal fix as one dirty-parent launch guard plus one targeted regression; the same outcome is mirrored in the Linear workpad comment `84cae2cc-c87c-41ed-9efe-1cc65d9ecdb2`.

## Handoff
- [x] Workpad refreshed after docs-review, after implementation, and immediately before the current PR feedback sweep. Evidence: Linear workpad comment `84cae2cc-c87c-41ed-9efe-1cc65d9ecdb2`.
- [x] PR attached to the Linear issue before review-state transition. Evidence: https://github.com/Kbediako/CO/pull/327, Linear attachment `78e1b613-93cb-4ad3-884c-8171ab2c641b`.
- [x] Latest `origin/main` merged into the branch before review-state transition. Evidence: current branch head `41c87182ad67d05a68dd1372b167b6cf2665d712` includes the 2026-03-30 merge from `origin/main`.
- [ ] PR checks green and actionable review feedback handled or explicitly pushed back before review-state transition. Evidence: pending.
- [ ] Issue moved only to the correct live review state when coding stops, or kept active until handoff prerequisites are complete. Evidence: pending.
