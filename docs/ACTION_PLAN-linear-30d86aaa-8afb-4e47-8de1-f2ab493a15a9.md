# ACTION_PLAN - Preserve provider-worker provenance across rehydrated active-run resume

## Added by Docs Child Lane 2026-04-21

## Summary
- Goal: ensure `provider_issue_rehydrated_active_run` resume paths preserve valid control-host launch provenance so same-issue `linear child-lane` launches do not fail with `provider_worker_child_lane_provenance_invalid` solely because the rehydrated claim serialized as `launch_source: null`.
- Scope:
  - docs-first packet and registry mirrors for `CO-289`
  - parent-owned `providerIssueHandoff.ts` rehydrate/resume repair
  - parent-owned claim serialization and child-lane/guard regressions
- Assumptions:
  - `CO-244` manifest tuple fields are already available on valid active run manifests
  - the parent implementation will consume only complete, matching manifest provenance
  - strict fail-closed child-lane behavior remains required

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `provider_issue_rehydrated_active_run`, `provider_control_host_task_id`, `provider_control_host_run_id`, `provider_launch_source`, `launch_source: null`, `provider_worker_child_lane_provenance_invalid`, `linear child-lane`, `CO-244`, `CO-216`.
- Not done if:
  - rehydrated active-run claims still persist `launch_source: null` when attached manifest provenance is complete and matching
  - the repair only affects fresh provider-worker launches
  - same-issue `linear child-lane` stays blocked by `provider_worker_child_lane_provenance_invalid` for a valid rehydrated parent
  - missing or mismatched provenance stops failing closed
  - the work is recast as a `CO-244` redo or a `CO-216` follow-up
- Pre-implementation issue-quality review:
  - local inspection confirms this is narrower than `CO-244`: completed manifest provenance can still be lost when `providerIssueHandoff.ts` rewrites active-run claims as `provider_issue_rehydrated_active_run`
  - local guard coverage confirms a claim with `launch_source: null` is rejected for delegated child runs

## Milestones & Sequencing
1. Land this docs-first packet and registry/checklist mirrors for `CO-289`.
2. Parent inspects all `provider_issue_rehydrated_active_run` writers in `providerIssueHandoff.ts`, including released-claim recovery, existing-claim active-run recovery, webhook refresh, and refresh serialization paths.
3. Parent adds or reuses a provenance resolver that reads complete matching `provider_launch_source`, `provider_control_host_task_id`, and `provider_control_host_run_id` from the attached active run manifest.
4. Parent updates rehydrate/resume writes so valid control-host provenance persists on the provider-intake claim instead of `launch_source: null`.
5. Parent adds focused regressions for valid rehydrated parent acceptance and invalid/missing provenance rejection.
6. Parent runs targeted validation and then normal parent-owned guard/review handoff.

## Dependencies
- Completed `CO-244` manifest provenance tuple:
  - `provider_launch_source`
  - `provider_control_host_task_id`
  - `provider_control_host_run_id`
- Current rehydrate and guard surfaces:
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/providerIntakeState.ts`
  - `orchestrator/src/cli/providerLinearChildLaneShell.ts`
  - `orchestrator/src/cli/run/manifest.ts`
  - `tests/delegation-guard.spec.ts`
- Out-of-scope source issue:
  - `CO-216` remains closed over operator-autopilot backlog-promotion/manual-demotion behavior.

## Validation
- Child-lane checks:
  - JSON parse for `tasks/index.json` and `docs/docs-freshness-registry.json`
  - protected-term grep over the six packet/checklist files
  - `git diff --check` over the declared file scope
- Parent-lane checks:
  - focused `ProviderIssueHandoff` active-run rehydrate tests
  - focused `ProviderIssueHandoffRefreshSerialization` persisted claim tests
  - focused `ProviderIntakeState` launch provenance tests
  - focused `ProviderLinearChildLaneShell` and/or `tests/delegation-guard.spec.ts` acceptance/rejection tests
  - `node scripts/spec-guard.mjs --dry-run`
- Rollback plan:
  - revert the bounded rehydration provenance slice if it accepts mismatched provenance or weakens `provider_worker_child_lane_provenance_invalid`

## Risks & Mitigations
- Risk: the fix trusts task/run identity without launch-source parity.
  - Mitigation: require `provider_launch_source=control-host` plus matching `provider_control_host_task_id` and `provider_control_host_run_id`.
- Risk: the fix repairs only one `provider_issue_rehydrated_active_run` branch.
  - Mitigation: grep all active-run writers and add tests for the branch that currently serializes as `launch_source: null`.
- Risk: scope drifts into completed `CO-244` or unrelated `CO-216` behavior.
  - Mitigation: keep `CO-244` as prerequisite manifest evidence and `CO-216` as an explicit non-goal in every packet artifact.
- Risk: child-lane validation is weakened to avoid the immediate failure.
  - Mitigation: preserve `provider_worker_child_lane_provenance_invalid` for absent or mismatched provenance.

## Approvals
- Reviewer: parent provider worker
- Date: 2026-04-21
