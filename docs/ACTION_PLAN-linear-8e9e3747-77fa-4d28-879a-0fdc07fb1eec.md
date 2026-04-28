# ACTION_PLAN - CO-406 no-run accepted recover capacity accounting

## Summary
- Goal: make accepted pending-revalidation recover claims with no run or launch token non-occupancy state for provider-worker capacity, while preserving real duplicate launch protection.
- Scope: docs packet, capacity/read-model implementation, focused regressions, validation/review, PR handoff, and Linear lifecycle for CO-406.
- Assumptions:
  - the observed CO-405 shape is representative: `state=accepted`, `reason=provider_issue_rehydration_pending_revalidation`, `run_id=null`, `run_manifest_path=null`, `launch_started_at=null`, and `launch_token=null`
  - CO-404 owns acknowledgement-timeout semantics and is out of scope
  - provider WIP cap constraints from CO-125 remain authoritative

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `accepted pending-revalidation claims`
  - `run_id=null`
  - `run_manifest_path=null`
  - `launch_token=null`
  - `provider_issue_start_blocked:max_concurrency`
  - `provider_issue_rehydration_pending_revalidation`
  - `control_host_provider_worker_recover`
  - `recover/relaunch/nudge`
  - `running=2`
  - `max_allowed=3`
  - `provider-intake-state.json`
  - `co-status --format json`
  - `/ui/data.json`
- Not done if:
  - same-issue no-run recover residue still causes `provider_issue_start_blocked:max_concurrency`
  - active accepted claims are still treated as running/launching without run or launch evidence
  - real running or launching claims can duplicate-launch
  - status/read models only hide the problem while admission remains wrong
  - CO-404 timeout semantics change
- Pre-implementation issue-quality review:
  - 2026-04-28: micro-task path is unavailable because this touches admission safety and status truth.
  - 2026-04-28: the issue is bounded to admission/capacity accounting, not broad control-host authority or acknowledgement timeout.
- Fallback / refactor decision:
  - `remove fallback`: accepted pending-revalidation no-run claims counting as active capacity.
  - `justify retaining fallback`: provider-intake pending-revalidation audit state as visible non-occupancy state.
  - `justify retaining fallback`: duplicate-launch protection for real running or launching claims.
- Durable retention evidence:
  - contract name: provider-intake pending-revalidation audit state
  - owning surface: provider-intake state and control-host status read models
  - steady-state proof: active identifiers may include no-run accepted claims, but running identifiers and capacity slots exclude them unless run or launch evidence exists
  - non-expiring rationale: retained intake state is operator/audit evidence, not a temporary capacity fallback
- Large-refactor check:
  - no large refactor is required if a shared occupancy predicate can align admission and read models
  - file a follow-up only if source inspection reveals multiple incompatible capacity authority paths

## Milestones & Sequencing
1. Create docs-first packet and registry mirrors for `linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec`.
2. Run docs-review and record manifest evidence.
3. Launch and monitor the same-issue tests child lane; keep parent off delegated test files until terminal result.
4. Inspect `providerIssueHandoff.ts`, `controlRuntime.ts`, and provider-intake helpers for accepted-claim occupancy logic.
5. Implement or reuse the smallest shared occupancy classification that excludes no-run accepted pending-revalidation claims but preserves real running/launching duplicate protection.
6. Accept, reject, or invalidate child-lane patch; reconcile test expectations with parent source changes.
7. Run focused regressions and the validation floor.
8. Run manifest-backed standalone review and explicit elegance/minimality pass.
9. Open/attach PR, merge latest `origin/main`, wait for green checks and clean `ready-review`, refresh workpad, and move to `In Review`.

## Dependencies
- Linear issue `CO-406`
- Related Linear issues `CO-404` and `CO-405`
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `orchestrator/src/cli/control/controlRuntime.ts`
- `orchestrator/src/cli/control/providerIntakeState.ts`
- `orchestrator/src/cli/control/providerIssueObservability.ts`
- `orchestrator/tests/ProviderIssueHandoff.test.ts`
- `orchestrator/tests/ControlRuntime.test.ts`
- `co-status --format json`
- `/ui/data.json`

## Validation
- Checks / tests:
  - docs packet JSON parse and protected-term scan
  - docs-review manifest
  - focused `ProviderIssueHandoff` regression for same-issue no-run accepted claim under cap pressure
  - focused duplicate protection regression for real running/launching claim
  - focused `ControlRuntime` or status projection regression for active versus running truth
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - `npm run pack:smoke` if package/CLI surfaces are touched
  - manifest-backed standalone review and elegance pass
- Rollback plan:
  - revert the shared occupancy predicate change, if any, and the regressions together if duplicate protection weakens
  - preserve docs packet and workpad evidence unless the issue itself is reset

## Risks & Mitigations
- Risk: a no-run accepted claim is hidden from status, losing audit trail.
  - Mitigation: keep active provider-intake identifiers visible while excluding the claim from running/launching capacity.
- Risk: duplicate provider workers can launch for the same issue.
  - Mitigation: fail closed when run or launch evidence exists, and add a regression that proves the duplicate guard remains.
- Risk: implementation drifts into CO-404 timeout behavior.
  - Mitigation: leave recover/relaunch/nudge acknowledgement semantics unchanged and keep tests focused on capacity result.
- Risk: parent and child collide on test files.
  - Mitigation: parent avoids delegated test files until child lane terminal status and then explicitly accepts, rejects, or invalidates the patch.

## Approvals
- Reviewer: docs-review / standalone review pending
- Date: 2026-04-28
