# Task Checklist - linear-d19bd14e-0604-456d-9a45-e65b898cf7a2

- Linear Issue: `CO-138` / `d19bd14e-0604-456d-9a45-e65b898cf7a2`
- MCP Task ID: `linear-d19bd14e-0604-456d-9a45-e65b898cf7a2`
- Primary PRD: `docs/PRD-linear-d19bd14e-0604-456d-9a45-e65b898cf7a2.md`
- TECH_SPEC: `tasks/specs/linear-d19bd14e-0604-456d-9a45-e65b898cf7a2.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-d19bd14e-0604-456d-9a45-e65b898cf7a2.md`

## Docs-First
- [x] PRD drafted for the stale merge-closeout rehydrate lane. Evidence: `docs/PRD-linear-d19bd14e-0604-456d-9a45-e65b898cf7a2.md`.
- [x] TECH_SPEC drafted with the bounded stale merge-closeout invalidation seam. Evidence: `tasks/specs/linear-d19bd14e-0604-456d-9a45-e65b898cf7a2.md`, `docs/TECH_SPEC-linear-d19bd14e-0604-456d-9a45-e65b898cf7a2.md`.
- [x] ACTION_PLAN drafted for docs-review, implementation, validation, and handoff. Evidence: `docs/ACTION_PLAN-linear-d19bd14e-0604-456d-9a45-e65b898cf7a2.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] `docs/docs-freshness-registry.json` updated with the new packet entries. Evidence: `docs/docs-freshness-registry.json`.
- [x] Checklist mirrored to `.agent/task/linear-d19bd14e-0604-456d-9a45-e65b898cf7a2.md`. Evidence: `.agent/task/linear-d19bd14e-0604-456d-9a45-e65b898cf7a2.md`.
- [x] Pre-implementation issue-quality review is captured in the spec packet. Evidence: `tasks/specs/linear-d19bd14e-0604-456d-9a45-e65b898cf7a2.md`.
- [x] docs-review approval captured for `linear-d19bd14e-0604-456d-9a45-e65b898cf7a2`. Evidence: `.runs/linear-d19bd14e-0604-456d-9a45-e65b898cf7a2-co-138-docs-review/cli/2026-04-10T07-04-13-496Z-80cbb02d/manifest.json`, `out/linear-d19bd14e-0604-456d-9a45-e65b898cf7a2/manual/20260410T070413Z-docs-review-fallback.md`.

## Workflow
- [x] Issue moved from `Ready` to the live started state (`In Progress`) before active coding. Evidence: provider-worker Linear transition output recorded on 2026-04-10.
- [x] The required turn-level parallelization decision was recorded for this turn. Evidence: provider-worker Linear parallelization output recorded on 2026-04-10 (`stay_serial` / `review_or_validation_only`).
- [x] The detached workspace head was switched onto the lane branch `linear/co-138-stale-merge-closeout-rehydrate`. Evidence: local git branch switch on 2026-04-10.
- [x] Exactly one persistent `## Codex Workpad` comment is kept current on the issue. Evidence: Linear workpad comment `b2a29717-01f2-40c1-95f1-33da64f003c9`, `out/linear-d19bd14e-0604-456d-9a45-e65b898cf7a2/manual/workpad.md`.

## Investigation
- [x] The stale claim seam is narrowed to merge-closeout freshness / invalidation during completed-run rehydrate, not a broader workflow-state rewrite. Evidence: `docs/PRD-linear-d19bd14e-0604-456d-9a45-e65b898cf7a2.md`, `tasks/specs/linear-d19bd14e-0604-456d-9a45-e65b898cf7a2.md`.
- [x] The local `CO-120` artifact path for the stale shape is identified. Evidence: `/Users/kbediako/Code/CO/.runs/local-mcp/cli/control-host/provider-intake-state.json`.

## Implementation
- [x] Add stale merge-closeout invalidation or supersession at the completed-run rehydrate boundary. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`.
- [x] Persist cleaned claim truth so later poll / rehydrate recovery does not revive the stale record. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`.
- [x] Focused regressions cover stale rehydrate, preserved current `Merging` behavior, and poll / rehydrate recovery. Evidence: `orchestrator/tests/ProviderIssueHandoff.test.ts`, `npx vitest run orchestrator/tests/ProviderIssueHandoff.test.ts`.

## Validation
- [x] `MCP_RUNNER_TASK_ID=linear-d19bd14e-0604-456d-9a45-e65b898cf7a2 "/opt/homebrew/Cellar/node/25.2.1/bin/node" "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-138-docs-review --format json`. Evidence: `.runs/linear-d19bd14e-0604-456d-9a45-e65b898cf7a2-co-138-docs-review/cli/2026-04-10T07-04-13-496Z-80cbb02d/manifest.json`, `out/linear-d19bd14e-0604-456d-9a45-e65b898cf7a2/manual/20260410T070413Z-docs-review-fallback.md`.
- [x] `MCP_RUNNER_TASK_ID=linear-d19bd14e-0604-456d-9a45-e65b898cf7a2 node scripts/delegation-guard.mjs`. Evidence: terminal output `Delegation guard: OK (3 subagent manifest(s) found).`
- [x] `MCP_RUNNER_TASK_ID=linear-d19bd14e-0604-456d-9a45-e65b898cf7a2 node scripts/spec-guard.mjs --dry-run`. Evidence: terminal output `Spec guard: OK`.
- [x] `MCP_RUNNER_TASK_ID=linear-d19bd14e-0604-456d-9a45-e65b898cf7a2 npm run build`. Evidence: successful build completion on 2026-04-10.
- [x] `MCP_RUNNER_TASK_ID=linear-d19bd14e-0604-456d-9a45-e65b898cf7a2 npm run lint`. Evidence: successful lint completion on 2026-04-10.
- [x] `MCP_RUNNER_TASK_ID=linear-d19bd14e-0604-456d-9a45-e65b898cf7a2 npm run test`. Evidence: `out/linear-d19bd14e-0604-456d-9a45-e65b898cf7a2/manual/20260410T083028Z-post-main-merge-review-validation.md` records the passing merged-head repo-wide rerun (`324` files / `3341` tests) after a one-off temp-dir cleanup race did not reproduce in the focused rerun.
- [x] `MCP_RUNNER_TASK_ID=linear-d19bd14e-0604-456d-9a45-e65b898cf7a2 npm run docs:check`. Evidence: terminal output `docs:check: OK`.
- [x] `MCP_RUNNER_TASK_ID=linear-d19bd14e-0604-456d-9a45-e65b898cf7a2 npm run docs:freshness`. Evidence: `out/linear-d19bd14e-0604-456d-9a45-e65b898cf7a2/manual/20260410T083028Z-post-main-merge-review-validation.md` records the merged-head pass (`docs:freshness OK - 3494 docs, 3497 registry entries`).
- [x] `MCP_RUNNER_TASK_ID=linear-d19bd14e-0604-456d-9a45-e65b898cf7a2 node scripts/diff-budget.mjs`. Evidence: `out/linear-d19bd14e-0604-456d-9a45-e65b898cf7a2/manual/20260410T083028Z-post-main-merge-review-validation.md` records the post-merge clean-head pass (`scope=working-tree, files=0/25, lines=0/1200, +0/-0`).
- [x] `MCP_RUNNER_TASK_ID=linear-d19bd14e-0604-456d-9a45-e65b898cf7a2 FORCE_CODEX_REVIEW=1 npm run review` or truthful manual fallback recorded. Evidence: `/Users/kbediako/Code/CO/.runs/linear-d19bd14e-0604-456d-9a45-e65b898cf7a2/cli/2026-04-10T06-48-56-057Z-b31e5ab8/review/telemetry.json` records `status: failed`, `review_outcome: failed-boundary`, and `termination_boundary.kind: startup-anchor`; the required manual fallback is recorded in `out/linear-d19bd14e-0604-456d-9a45-e65b898cf7a2/manual/20260410T083028Z-post-main-merge-review-validation.md`.
- [x] Explicit elegance review recorded before any review handoff. Evidence: `out/linear-d19bd14e-0604-456d-9a45-e65b898cf7a2/manual/20260410T083028Z-post-main-merge-review-validation.md`.

## Handoff
- [ ] Workpad refreshed after docs, after implementation, and immediately before any review or merge handoff. Evidence: local source refreshed at `out/linear-d19bd14e-0604-456d-9a45-e65b898cf7a2/manual/workpad.md`, but the latest Linear `upsert-workpad` attempt hit `linear_rate_limited` shared-budget cooldown until `2026-04-10T08:06:28.015Z`.
- [ ] PR attached to the Linear issue before review-state transition. Evidence: pending.
- [x] Latest `origin/main` merged into the branch before review-state transition. Evidence: merge commit `31d8a9aeb`.
- [ ] Unresolved actionable review threads = `0` or waived with evidence before review-state transition. Evidence: pending.
- [ ] PR checks green and actionable review feedback handled or explicitly pushed back before review-state transition. Evidence: pending.
- [x] Issue remains active until review handoff prerequisites are complete. Evidence: current issue state is `In Progress`.
