# ACTION_PLAN - Record provider control-host provenance on provider-worker manifests

## Added by Parent Lane 2026-04-18

## Summary
- Goal: make control-host-launched provider-worker manifests retain `provider_launch_source`, `provider_control_host_task_id`, and `provider_control_host_run_id` so same-issue child-lane and child-stream launches succeed without weakening provenance validation.
- Scope:
  - docs-first packet and registry mirrors for `CO-244`
  - manifest schema/bootstrap/backfill/provider-worker-context changes
  - focused regression tests and live same-issue helper proof
- Assumptions:
  - the active worker environment still reflects the live control-host owner
  - child-lane and child-stream shells continue to consume provider-worker context rather than introducing independent fallback rules
  - strict mismatch behavior remains required

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `provider_worker_child_lane_provenance_invalid`, `provider_launch_source`, `provider_control_host_task_id`, `provider_control_host_run_id`, `linear child-lane`, `linear child-stream`.
- Not done if:
  - the parent manifest still writes `provider_launch_source=null`
  - the tuple is repaired only in memory
  - same-issue child-lane or child-stream still fails on matching env/manifest truth
  - mismatch behavior no longer fails closed
- Pre-implementation issue-quality review:
  - successful same-turn docs child lane was rejected because it drifted from the issue contract; the parent packet re-centers the lane on the exact `CO-244` provenance tuple and child-helper contract

## Milestones & Sequencing
1. Land the parent-owned docs-first packet and registry/checklist mirrors for `CO-244`, recording the successful-but-rejected docs child-lane as historical evidence only.
2. Patch manifest schema/bootstrap/backfill and provider-worker context loading so the full control-host provenance tuple is recorded and treated as authoritative only when launch-source and task/run all match.
3. Extend focused regressions for bootstrap/backfill, child-lane happy path, child-stream happy path, and strict mismatch behavior.
4. Run targeted validation plus at least one live same-issue child-stream proof, then run the remaining guard/check commands needed before review handoff.

## Dependencies
- Active control-host env:
  - `CODEX_ORCHESTRATOR_PROVIDER_LAUNCH_SOURCE=control-host`
  - `CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_TASK_ID=local-mcp`
  - `CODEX_ORCHESTRATOR_PROVIDER_CONTROL_HOST_RUN_ID=control-host`
- Source issue evidence from `CO-232` showing a provider-worker manifest with null provenance fields while the live control-host owner file showed matching task/run truth.
- Current implementation surfaces:
  - `orchestrator/src/cli/run/manifest.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - child helper shells/tests

## Validation
- Checks / tests:
  - `npm run generate:manifest-types`
  - `npx vitest run orchestrator/tests/Manifest.test.ts orchestrator/tests/ProviderLinearWorkerRunner.test.ts orchestrator/tests/ProviderLinearChildLaneShell.test.ts orchestrator/tests/ProviderLinearChildStreamShell.test.ts`
  - `npm run build`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - live `linear child-stream --pipeline docs-review|implementation-gate|docs-relevance-advisory`
  - `node scripts/spec-guard.mjs --dry-run`
  - remaining repo review/handoff gates before `In Review`
- Rollback plan:
  - revert the bounded provenance-persistence slice if it weakens mismatch handling or introduces launch-source/task/run disagreement

## Risks & Mitigations
- Risk: tests pass but the live parent manifest still does not update.
  - Mitigation: inspect the actual parent manifest after a repaired load path and keep the live child-stream proof as a required closeout artifact.
- Risk: launch-source matching remains too loose and accepts task/run-only truth.
  - Mitigation: require `provider_launch_source=control-host` in both runtime logic and focused regressions.
- Risk: docs drift away from the actual implementation after the rejected child-lane attempt.
  - Mitigation: parent owns the accepted packet and keeps the rejected child-lane recorded only as historical evidence.

## Approvals
- Reviewer: parent provider worker
- Date: 2026-04-18
