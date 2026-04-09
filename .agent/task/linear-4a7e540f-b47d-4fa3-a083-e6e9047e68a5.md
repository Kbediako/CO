# Task Checklist - linear-4a7e540f-b47d-4fa3-a083-e6e9047e68a5

- Linear Issue: `CO-112` / `4a7e540f-b47d-4fa3-a083-e6e9047e68a5`
- MCP Task ID: `linear-4a7e540f-b47d-4fa3-a083-e6e9047e68a5`
- Primary PRD: `docs/PRD-linear-4a7e540f-b47d-4fa3-a083-e6e9047e68a5.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-4a7e540f-b47d-4fa3-a083-e6e9047e68a5.md`
- Task spec: `tasks/specs/linear-4a7e540f-b47d-4fa3-a083-e6e9047e68a5.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-4a7e540f-b47d-4fa3-a083-e6e9047e68a5.md`

## Docs-First
- [x] PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, and the initial workpad source were drafted or refreshed for `CO-112`. Evidence: `docs/PRD-linear-4a7e540f-b47d-4fa3-a083-e6e9047e68a5.md`, `docs/TECH_SPEC-linear-4a7e540f-b47d-4fa3-a083-e6e9047e68a5.md`, `docs/ACTION_PLAN-linear-4a7e540f-b47d-4fa3-a083-e6e9047e68a5.md`, `tasks/specs/linear-4a7e540f-b47d-4fa3-a083-e6e9047e68a5.md`, `tasks/tasks-linear-4a7e540f-b47d-4fa3-a083-e6e9047e68a5.md`, `.agent/task/linear-4a7e540f-b47d-4fa3-a083-e6e9047e68a5.md`, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `out/linear-4a7e540f-b47d-4fa3-a083-e6e9047e68a5/manual/workpad.md`.
- [x] Standalone pre-implementation self-review notes were captured in the spec packet before coding. Evidence: `tasks/specs/linear-4a7e540f-b47d-4fa3-a083-e6e9047e68a5.md`.
- [x] Docs-review delegation evidence is captured and any repo-baseline fallback is recorded truthfully rather than as a packet-shape blocker. Evidence: `.runs/linear-4a7e540f-b47d-4fa3-a083-e6e9047e68a5-co-112-docs-review/cli/2026-04-09T05-39-47-373Z-741ea904/manifest.json`, `.runs/linear-4a7e540f-b47d-4fa3-a083-e6e9047e68a5-co-112-docs-review/cli/2026-04-09T05-39-47-373Z-741ea904/review/telemetry.json` (`status: succeeded`, `review_outcome: clean-success`).

## Implementation
- [x] Canonical current-turn activity survives provider-worker proof persistence and later hydration. Evidence: `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `orchestrator/tests/ProviderLinearWorkerRunner.test.ts` (canonical persistence, stale-floor rewind, turn-boundary replacement, bookkeeping filtering).
- [x] STATUS prefers richer canonical activity or explicit derived candidates over generic worker-progress filler. Evidence: `orchestrator/src/cli/control/providerIssueObservability.ts`, `orchestrator/tests/ProviderIssueObservability.test.ts`, `orchestrator/src/cli/control/selectedRunProjection.ts`, `orchestrator/tests/SelectedRunProjection.test.ts`.
- [x] STATUS/debug surfaces expose chosen source, candidate set, rejection reasons, and freshness timestamps. Evidence: `orchestrator/src/cli/control/providerIssueObservability.ts`, `orchestrator/src/cli/control/observabilityReadModel.ts`, `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`, `orchestrator/tests/CompatibilityIssuePresenter.test.ts`.
- [x] `controlStatusDashboard.ts` remains thin and formatter-oriented. Evidence: ranking/provenance logic landed in `orchestrator/src/cli/control/providerIssueObservability.ts`, `orchestrator/src/cli/control/selectedRunProjection.ts`, and `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`; `controlStatusDashboard.ts` was intentionally not expanded in this lane.

## Validation
- [x] Focused regressions cover canonical-activity persistence, null-`last_message` plus rich-child-summary selection, repeated hydration/refresh, stale-floor telemetry rewind, and compatibility provenance alignment. Evidence: `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`, `orchestrator/tests/ProviderIssueObservability.test.ts`, `orchestrator/tests/SelectedRunProjection.test.ts`, `orchestrator/tests/CompatibilityIssuePresenter.test.ts`, `orchestrator/tests/ControlRuntime.test.ts`.
- [x] `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `TASK=linear-4a7e540f-b47d-4fa3-a083-e6e9047e68a5 FORCE_CODEX_REVIEW=1 npm run review`, and `npm run pack:smoke` all pass on the branch head or record a truthful existing-baseline fallback. Evidence: full gate floor passed before PR handoff prep on `ec862b969` (review telemetry: `.runs/linear-4a7e540f-b47d-4fa3-a083-e6e9047e68a5/cli/2026-04-09T05-34-25-347Z-b97707fb/review/telemetry.json` with `status: succeeded`, `review_outcome: bounded-success`); follow-up fixes on `b12ac8374` reran `npm run build` and `npx vitest run orchestrator/tests/ProviderLinearWorkerRunner.test.ts`, and the uncommitted review wrapper hit `startup-anchor`, so this tiny delta used a manual correctness plus elegance fallback instead of a false clean signal.

## Handoff
- [x] The issue is in `In Progress`, and exactly one persistent `## Codex Workpad` comment is maintained for the issue. Evidence: Linear workpad comment `c9cae46c-f10a-4c93-ad76-3f66d9f64ddb`, sourced from `out/linear-4a7e540f-b47d-4fa3-a083-e6e9047e68a5/manual/workpad.md`.
- [x] A PR is attached before any review-state handoff. Evidence: `https://github.com/Kbediako/CO/pull/390`, reflected in live Linear `issue-context` attachment `2f800618-2f47-4536-b985-1bab8e5f6196`.
- [ ] Latest `origin/main` is merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks are green, actionable review feedback is handled or explicitly pushed back, `pr ready-review` drains cleanly, and the issue moves to `In Review` only after coding stops. Evidence: pending.
