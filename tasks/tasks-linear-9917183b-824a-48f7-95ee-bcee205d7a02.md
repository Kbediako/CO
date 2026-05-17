# Task Checklist - linear-9917183b-824a-48f7-95ee-bcee205d7a02

- Linear Issue: `CO-204` / `9917183b-824a-48f7-95ee-bcee205d7a02`
- MCP Task ID: `linear-9917183b-824a-48f7-95ee-bcee205d7a02`
- Primary PRD: `docs/PRD-linear-9917183b-824a-48f7-95ee-bcee205d7a02.md`
- TECH_SPEC: `tasks/specs/linear-9917183b-824a-48f7-95ee-bcee205d7a02.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-9917183b-824a-48f7-95ee-bcee205d7a02.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-9917183b-824a-48f7-95ee-bcee205d7a02.md`
- Shared source 0 anchor: `ctx:sha256:4afe5dcb5f1db495381ab4c4ae5ef0278307e18bcc09334d3f3e378ad4da2b5a#chunk:c000001`
- Accepted child-lane manifest: `.runs/linear-9917183b-824a-48f7-95ee-bcee205d7a02-regression-tests/cli/2026-04-16T07-46-57-204Z-d0960b5a/manifest.json`

## Docs-First
- [x] PRD drafted for CO STATUS stale invalidated child-lane summary projection. Evidence: `docs/PRD-linear-9917183b-824a-48f7-95ee-bcee205d7a02.md`.
- [x] TECH_SPEC drafted with protected terms, current/reference/target parity, candidate timestamp requirements, and validation plan. Evidence: `tasks/specs/linear-9917183b-824a-48f7-95ee-bcee205d7a02.md`.
- [x] ACTION_PLAN drafted for child-lane tests, parent implementation, validation, and review handoff. Evidence: `docs/ACTION_PLAN-linear-9917183b-824a-48f7-95ee-bcee205d7a02.md`.
- [x] Pre-implementation issue-quality review recorded in spec notes. Evidence: spec readiness gate.
- [x] Registry and mirrors updated: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, docs TECH_SPEC mirror, and `.agent/task` mirror. Evidence: those files.

## Child-Lane Scope
- [x] Parent recorded same-issue `parallelize_now` / `independent_scope_available` decision for focused test coverage. Evidence: Linear parallelization record for `9917183b-824a-48f7-95ee-bcee205d7a02`.
- [x] Child lane `regression-tests` completed. Evidence: `.runs/linear-9917183b-824a-48f7-95ee-bcee205d7a02-regression-tests/cli/2026-04-16T07-46-57-204Z-d0960b5a/manifest.json`.
- [x] Parent accepted the child-lane patch after confirming it stayed scoped to the test file. Evidence: child-lane accept record at `2026-04-16T07:51:48.494Z`.
- [x] Child lane stayed scoped to `orchestrator/tests/ProviderIssueObservability.test.ts`; parent owns source implementation and final validation.

## Implementation Acceptance
- [x] Disposed child lanes with `decision=invalidated`, `decision=rejected`, or `decision=accepted` no longer contribute active `child_lane_summary` candidates. Evidence: `orchestrator/src/cli/control/providerIssueObservability.ts`.
- [x] Child-lane summary candidate freshness no longer uses parent `decision_at`. Evidence: `childLaneSummaryRecordedAt(...)` in `providerIssueObservability.ts`.
- [x] Active or pending child-lane summaries remain visible. Evidence: focused regression in `orchestrator/tests/ProviderIssueObservability.test.ts`.
- [x] Historical child-lane records remain untouched. Evidence: implementation changes projection helpers only.

## Validation
- [x] Focused provider issue observability suite passed. Evidence: `npx vitest run --config vitest.config.core.ts orchestrator/tests/ProviderIssueObservability.test.ts` returned 33/33 passing.
- [x] `node scripts/delegation-guard.mjs` passed. Evidence: `Delegation guard: OK (2 subagent manifest(s) found)`.
- [x] `node scripts/spec-guard.mjs --dry-run` passed. Evidence: `Spec guard: OK`.
- [x] Docs-review child stream passed. Evidence: `.runs/linear-9917183b-824a-48f7-95ee-bcee205d7a02-docs-review/cli/2026-04-16T07-57-56-440Z-ad51414f/manifest.json`.
- [x] Required validation floor passed: `npm run build`, `npm run lint`, `npm run test` (342 files / 3960 tests), `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, `node scripts/diff-budget.mjs`, and `npm run pack:smoke`.
- [x] Manifest-backed standalone review and explicit elegance review completed before PR handoff. Evidence: `.runs/linear-9917183b-824a-48f7-95ee-bcee205d7a02/cli/2026-04-16T07-44-42-931Z-b12a6085/review/telemetry.json` (`status=succeeded`, `review_outcome=bounded-success`, no actionable findings) and `out/linear-9917183b-824a-48f7-95ee-bcee205d7a02/manual/elegance-review.md`.
- [ ] PR created or updated, attached to Linear, checks green, and `pr ready-review` drain clean before review-state transition.

## Handoff
- [ ] Workpad refreshed with final validation, review/elegance status, PR link, and handoff state.
- [ ] Issue moved to `In Review` only after required validation, attached PR, green checks, and clean feedback drain.

## Progress Log
- 2026-04-16: Parent moved `CO-204` from `Ready` to `In Progress`, created the single workpad, recorded required pre-turn decomposition and parallelization decision, launched and accepted child lane `regression-tests`, implemented child-lane summary projection filtering, and ran the focused provider issue observability test successfully.
- 2026-04-16: Required local gates passed through full test, docs, stewardship, diff budget, and pack smoke; standalone review/elegance and PR handoff remain pending.
- 2026-04-16: Manifest-backed standalone review completed with `status=succeeded` / `review_outcome=bounded-success`; wrapper blocked a validation-runner attempt and retried read-only, then returned no actionable findings. Manual elegance review kept the helper split intentionally.
