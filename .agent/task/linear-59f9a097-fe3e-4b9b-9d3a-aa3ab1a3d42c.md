# Task Checklist - linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c

- Linear Issue: `CO-211` / `59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c`
- MCP Task ID: `linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c`
- Primary PRD: `docs/PRD-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md`
- Task spec: `tasks/specs/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md`
- Source anchor: `ctx:sha256:d4239a4784c1cf71c95ab480b4a3821dc2c83dc3648d3b8d4a8c5387ccdfb3f8#chunk:c000001`
- Apr 18 recurrence source anchor: `ctx:sha256:6a9427aa000f73b2f7d86bab415ae29c6ebbeb9172e159c03bc6d29ae012ff52#chunk:c000001`
- Apr 21 Rework source anchor: `ctx:sha256:159ce815aa248f1705d76a533af179440608299883a742a504b31e83b029a294#chunk:c000001`

## Docs-First
- [x] PRD drafted for repeated refresh-stuck restart churn while active provider workers remain healthy. Evidence: `docs/PRD-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md`.
- [x] TECH_SPEC drafted with issue-shaping contract, protected terms, readiness gate, and parent-owned validation requirements. Evidence: `docs/TECH_SPEC-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md`, `tasks/specs/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md`.
- [x] ACTION_PLAN drafted for parent implementation and closeout. Evidence: `docs/ACTION_PLAN-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md`.
- [x] Task checklist and `.agent` mirror drafted within child-lane scope. Evidence: `tasks/tasks-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md`, `.agent/task/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md`.
- [x] Registry and snapshot mirrors updated within this docs lane. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Pre-implementation issue-quality review recorded in the TECH_SPEC readiness gate. Evidence: `docs/TECH_SPEC-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md`, `tasks/specs/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md`.
- [x] Apr 21 Rework packet refresh recorded for `probe_timeout` recurrence after merged PRs `#506` and `#544`. Evidence: PRD, TECH_SPEC mirrors, ACTION_PLAN, and this checklist.

## Source / Assumptions
- [x] Shared source-0 metadata anchor recorded. Evidence: `ctx:sha256:737c3cf3d517b1a44673a4ef90593a10f7303f6e022a667e75cceca113e8acb8#chunk:c000001`.
- [x] Child lane verified the shared source-0 payload is metadata/provenance only, not the issue body. Evidence: `.runs/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c-docs-packet/cli/2026-04-17T02-07-55-950Z-cb83673c/memory/source-0/source.txt`.
- [x] Child lane read the current issue body through the packaged read-only issue-context helper without Linear mutation. Evidence: `node /Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js linear issue-context --issue-id 59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c --format json`.
- [x] Apr 18 recurrence source-0 payload verified as metadata/provenance only. Evidence: `.runs/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c-docs-apr18-refresh/cli/2026-04-18T18-35-19-649Z-1ede381a/memory/source-0/source.txt`.
- [x] PR #506 merge evidence recorded from local git history. Evidence: `e98d459f4dfdb47a22d981fedbf5ba11053d3a95` (`fix(control-host): quarantine repeated refresh-stuck restart churn`).
- [x] Apr 21 Rework child-lane evidence recorded. Evidence: `.runs/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c-docs-apr21-rework/cli/2026-04-21T10-55-06-746Z-91d3806a/manifest.json` completed with a zero-byte advisory patch; parent owns this refresh.
- [x] PR #544 merge status confirmed during Rework reset. Evidence: parent Linear/GitHub inspection before source edits.
- [x] Parent-owned recurrence boundary updated: `probe_timeout` restart records must retain local provider-intake diagnostics and same-series repeated timeout churn must quarantine without hiding first-sample fail-closed truth. Evidence: PRD, TECH_SPEC, ACTION_PLAN, and this checklist.
- [x] Parent-owned recurrence source boundary recorded: quarantined samples must preserve fail-closed unhealthy streaks and diagnostic retention. Evidence: PRD, TECH_SPEC, ACTION_PLAN, and this checklist.
- [x] Parent/child ownership split recorded. Evidence: this checklist, the PRD, and the TECH_SPEC readiness gate.

## Parent Implementation Acceptance
- [x] Reproduce or simulate the Apr 17 churn shape where active `CO-207` / `CO-210`-like provider workers remain running while control-host polling enters `provider_refresh_lifecycle_stuck` / `restart_required`. Evidence: focused tests in `orchestrator/tests/ControlHostSupervision.test.ts`; `npm run test:orchestrator -- orchestrator/tests/ControlHostSupervision.test.ts` passed with 74 tests.
- [x] Persist machine-checkable restart/churn evidence covering restart series, `owner rotations`, `refresh phases`, and `surviving provider workers`. Evidence: timeout restart records now retain the fallback diagnostic loaded from local `provider-intake-state.json`; tests assert restart history preserves polling fields, running workers, provider keys, and stale terminal claim exclusion.
- [x] Diagnostics identify the stuck refresh phase, request or claim class, operation age, queued/checking state, and current provider keys around `stalled_after_ms=45000`. Evidence: fallback diagnostic tests cover `refresh_phase`, `refresh_request_class`, `refresh_provider_keys`, `operation_elapsed_ms`, `queued`, `checking`, and `stalled_after_ms`.
- [x] Fix or quarantine the root re-entry condition so healthy active workers do not trigger repeated supervisor restarts within normal polling cadence. Evidence: `active_worker_probe_timeout_quarantine` in `orchestrator/src/cli/control/controlHostSupervision.ts` and the timeout shell path in `orchestrator/src/cli/controlHostSupervisionCliShell.ts`.
- [x] Quarantined samples preserve fail-closed unhealthy streaks and diagnostic retention after PR #506. Evidence: the repeated-timeout path reuses existing quarantine handling while retaining the diagnostic snapshot; focused and full test suites passed.
- [x] `probe_timeout` samples retain fallback provider-intake diagnostics and repeated same-series timeout churn is quarantined only after one fail-closed restart record. Evidence: focused tests cover first timeout fail-closed behavior, repeated same-worker quarantine, and non-lifecycle timeout non-quarantine.
- [x] Genuine stuck refreshes still surface `provider_refresh_lifecycle_stuck` and `restart_required=true`. Evidence: timeout quarantine requires retained polling truth with `provider_refresh_lifecycle_stuck` and `restart_required=true`; unrelated/non-lifecycle timeouts remain fail-closed.
- [x] Recovery preserves active `provider-linear-worker` processes and request-budget/no-request-burn safeguards. Evidence: timeout fallback reads only local persisted provider-intake state and performs no Linear or issue-by-id reads in the stuck pass; focused tests preserve running workers.
- [x] `co-status --format json` post-recovery truth captured with an evidence-backed caveat. Evidence: shared-root provider-intake state at `2026-04-21T11:40:10.645Z` showed `polling.stuck=false`, `polling.restart_required=false`, and running workers `CO-211`, `CO-225`, and `CO-268`; direct worker-local `co-status --format json` was blocked by EPERM/stale endpoint, so the caveat is recorded rather than overclaiming command success.
- [x] Focused regression coverage includes repeated restart churn and a no-regression path for `CO-194` stale terminal claims. Evidence: `npm run test:orchestrator -- orchestrator/tests/ControlHostSupervision.test.ts` passed with 74 tests; `npm run test` passed with 4436 tests.

## Validation
- [x] Docs child lane scoped JSON syntax check. Evidence: `jq empty tasks/index.json docs/docs-freshness-registry.json` exits `0`.
- [x] Docs child lane scoped whitespace check. Evidence: `git diff --check -- docs/PRD-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md tasks/specs/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md docs/TECH_SPEC-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md docs/ACTION_PLAN-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md tasks/tasks-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md .agent/task/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json` exits `0`.
- [x] Parent focused repeated-churn regression coverage. Evidence: `npm run test:orchestrator -- orchestrator/tests/ControlHostSupervision.test.ts` passed with 74 tests.
- [x] Parent focused quarantined-sample recurrence coverage. Evidence: focused timeout recurrence tests cover first fail-closed restart followed by same-series quarantine.
- [x] Parent focused `probe_timeout` recurrence coverage. Evidence: focused tests cover retained provider-intake fallback diagnostics and non-lifecycle timeout non-quarantine.
- [x] Parent focused `CO-194` no-regression coverage. Evidence: focused test verifies stale terminal provider-intake claims are not treated as timeout-active workers.
- [x] Parent docs-review evidence captured before implementation. Evidence: `.runs/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c-docs-review/cli/2026-04-21T11-10-22-712Z-bf38322e/manifest.json`.
- [x] Parent post-recovery status proof captured with caveat. Evidence: shared-root provider-intake state at `2026-04-21T11:40:10.645Z` showed `polling.stuck=false`, `polling.restart_required=false`, and running workers; direct worker-local `co-status --format json` was blocked by EPERM/stale endpoint.
- [x] Full validation gates passed. Evidence: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `git diff --check`, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, `node scripts/diff-budget.mjs`, and `PACK_SMOKE_ALLOW_MARKETPLACE_SKIP=1 ... npm run pack:smoke`.
- [x] Standalone review fallback and elegance pass completed. Evidence: manifest-backed `npm run review -- --uncommitted` was attempted under `FORCE_CODEX_REVIEW=1` but stalled/drifted without concrete findings; manual review found and fixed the over-broad quarantine condition by requiring lifecycle-stuck `restart_required` truth, then an explicit minimality pass kept the change narrow.

## Handoff Status
- [x] Child lane leaves packet and registry/checklist changes in place for patch export. Evidence: dirty working tree in this child workspace.
- [x] Parent recorded same-issue parallelization and child-lane completion. Evidence: `linear parallelization --decision parallelize_now --reason independent_scope_available` plus `.runs/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c-docs-apr21-rework/cli/2026-04-21T10-55-06-746Z-91d3806a/manifest.json`.
- [x] Parent proceeds with implementation. Evidence: source diff in `orchestrator/src/cli/control/controlHostSupervision.ts`, `orchestrator/src/cli/controlHostSupervisionCliShell.ts`, and `orchestrator/tests/ControlHostSupervision.test.ts`.
- [ ] Parent updates Linear workpad and PR lifecycle artifacts. Evidence: pending final workpad refresh, PR attach, ready-review drain, and review-state handoff.

## Progress Log
- 2026-04-17: Created the scoped docs-first packet from the current `CO-211` issue body via read-only `linear issue-context`, with the shared source-0 metadata-only caveat recorded in the packet.
- 2026-04-17: Preserved the exact protected terms and the explicit `Not Done If` contract, including `CO-210` child-lane manifest hydration semantics staying out of scope.
- 2026-04-17: Completed the requested scoped checks: `jq empty` and `git diff --check`.
- 2026-04-18: Refreshed the packet for Apr 18 recurrence evidence after merged PR #506, recorded that the new source-0 payload is metadata/provenance only, and kept the parent source fix for quarantined samples preserving fail-closed unhealthy streaks and diagnostic retention out of child-lane scope.
- 2026-04-21: Rework reset deleted stale workpad `96efe788-0b44-4af8-b921-e41bd2b9edbb`, reset from `origin/main`, recorded the Apr 21 `probe_timeout` recurrence under active `CO-225`, `CO-276`, and `CO-289` workers, and launched `docs-apr21-rework`; the child lane completed with a zero-byte advisory patch.
- 2026-04-21: Parent implemented retained provider-intake timeout diagnostics, same-active-worker timeout quarantine, non-lifecycle timeout fail-closed protection, and `CO-194` stale terminal claim coverage; validation gates passed and review fallback/elegance evidence was recorded.

## Relevant Files
- `docs/PRD-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md`
- `docs/TECH_SPEC-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md`
- `docs/ACTION_PLAN-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md`
- `tasks/specs/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md`
- `tasks/tasks-linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md`
- `.agent/task/linear-59f9a097-fe3e-4b9b-9d3a-aa3ab1a3d42c.md`
- `tasks/index.json`
- `docs/TASKS.md`
- `docs/docs-freshness-registry.json`

## Notes
- Do not change `CO-210` child-lane manifest hydration semantics in this lane.
- Do not collapse the issue into attach-only recovery or status-only projection.
- Do not hide `provider_refresh_lifecycle_stuck` / `restart_required` truth.
- Do not kill or restart healthy active provider workers as the recovery mechanism.
- Do not clear fail-closed unhealthy streaks or drop diagnostic retention from quarantined samples.
- Do not let repeated `probe_timeout` samples churn without retained local provider-intake diagnostics and a same-active-worker-series quarantine guard.
