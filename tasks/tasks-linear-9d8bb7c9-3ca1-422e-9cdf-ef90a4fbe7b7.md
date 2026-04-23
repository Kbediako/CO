# Task Checklist: CO-331 queue cap and follow-up admission truth

## Scope

- Task id: `linear-9d8bb7c9-3ca1-422e-9cdf-ef90a4fbe7b7`
- Registry id: `20260423-linear-9d8bb7c9-3ca1-422e-9cdf-ef90a4fbe7b7`
- Linear issue: `CO-331`
- Issue id: `9d8bb7c9-3ca1-422e-9cdf-ef90a4fbe7b7`

## Owned Files

- `docs/PRD-linear-9d8bb7c9-3ca1-422e-9cdf-ef90a4fbe7b7.md`
- `docs/TECH_SPEC-linear-9d8bb7c9-3ca1-422e-9cdf-ef90a4fbe7b7.md`
- `docs/ACTION_PLAN-linear-9d8bb7c9-3ca1-422e-9cdf-ef90a4fbe7b7.md`
- `tasks/specs/linear-9d8bb7c9-3ca1-422e-9cdf-ef90a4fbe7b7.md`
- `tasks/tasks-linear-9d8bb7c9-3ca1-422e-9cdf-ef90a4fbe7b7.md`
- `.agent/task/linear-9d8bb7c9-3ca1-422e-9cdf-ef90a4fbe7b7.md`
- `tasks/index.json`
- `docs/TASKS.md`
- `docs/docs-freshness-registry.json`
- `orchestrator/src/cli/control/providerOperatorAutopilot.ts`
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `orchestrator/src/cli/control/providerIntakeState.ts`
- `orchestrator/tests/ProviderOperatorAutopilot.test.ts`
- `orchestrator/tests/ProviderIssueHandoff.test.ts`
- `orchestrator/tests/ProviderIntakeState.test.ts`

## Acceptance Criteria

- [x] Newly created or explicitly backlogged follow-up issues remain non-admitted until a real queue policy promotes them. Evidence: `ProviderOperatorAutopilot` follow-up traceability hold regression.
- [x] Active provider claims never exceed configured `max_allowed`, even under resumable/retry rehydration. Evidence: `ProviderIssueHandoff` retry/resumable direct admission cap regression and updated deferred retry fresh-discovery expectation.
- [x] Regression coverage proves backlog/ready/admitted state stays aligned across Linear, provider intake, and `co-status`. Evidence: focused autopilot, provider handoff, and intake summary regressions passed.
- [x] Operator-facing evidence makes queue-cap or promotion drift explicit when it occurs. Evidence: new `backlog_head_follow_up_traceability_pending` hold summary and `provider_issue_start_blocked:max_concurrency` cap assertion.

## Validation

- [x] Focused provider tests pass. Evidence: `npm run test:orchestrator -- orchestrator/tests/ProviderOperatorAutopilot.test.ts orchestrator/tests/ProviderIssueHandoff.test.ts orchestrator/tests/ProviderIntakeState.test.ts` passed with 440 tests on 2026-04-23.
- [x] `npm run build` passes.
- [ ] Full validation floor passes. Current blockers: `docs:check` and `docs:freshness` fail on pre-existing missing `linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb` docs refs; related follow-up `CO-333` created. Full `npm run test` first run reached 4426/4427 passing and failed only on a CO-331 assertion that was corrected; focused CO-331 suite reran green.
- [ ] Standalone review completes with no blocking findings or a documented fallback.
- [ ] Elegance/minimality pass is complete.

## Notes

- 2026-04-23: Issue moved to `In Progress`, workpad created, and parallelization decision recorded as `stay_serial` / `single_bounded_change` because the admission and promotion seams had to be mapped before any safe child-lane split existed.
- 2026-04-23: Implementation added follow-up traceability holds, admission occupancy for retry/resumable rows, and active summary projection for queued retry rows. Focused provider regressions and build passed.
- 2026-04-23: Same-issue `docs-review` child stream produced manifest `.runs/linear-9d8bb7c9-3ca1-422e-9cdf-ef90a4fbe7b7-docs-review/cli/2026-04-23T09-10-12-994Z-fa87c91f/manifest.json` but failed at `docs:check` on unrelated missing CO-276 task packet refs. Filed `CO-333` as the related Backlog owner for that blocker.
