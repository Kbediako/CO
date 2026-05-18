---
id: 20260421-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9
title: Preserve provider-worker provenance across rehydrated active-run resume
status: done
relates_to: docs/PRD-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md
risk: high
owners:
  - Codex
last_review: 2026-05-18
review_notes:
  - 2026-05-18: CO-522 spec lifecycle audit found the linked task checklist has zero unchecked items (23 checked), so this spec is terminal and eligible for implementation-docs archive. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-local-classification.json`.
---

## Canonical Reference
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md`
- PRD: `docs/PRD-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md`
- Action plan: `docs/ACTION_PLAN-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md`
- Task checklist: `tasks/tasks-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md`

## Issue-Shaping Contract
`CO-289` is the rehydrated active-run provenance lane. The missing piece after `CO-244` is not field availability; it is that a rebuilt `provider_issue_rehydrated_active_run` provider claim can lose launch provenance and persist `launch_source: null`, causing `linear child-lane` to fail with `provider_worker_child_lane_provenance_invalid`.

Protected terms: `provider_issue_rehydrated_active_run`, `provider_control_host_task_id`, `provider_control_host_run_id`, `provider_launch_source`, `launch_source: null`, `provider_worker_child_lane_provenance_invalid`, `linear child-lane`, `CO-244`, `CO-216`.

Wrong interpretations to reject:
- Do not treat this as `CO-216` operator-autopilot churn.
- Do not weaken or bypass child-lane provenance validation.
- Do not accept task/run-only provenance without `provider_launch_source=control-host`.
- Do not redesign the `CO-244` tuple.

## Current / Reference / Target Truth
- Current: active-run rehydrate can upsert `provider_issue_rehydrated_active_run` claims with unset launch provenance even when an attached manifest has control-host provenance.
- Reference: valid rehydrated parent claims should preserve the same provenance truth as freshly control-host-launched provider workers.
- Target: matching rehydrated claims retain `launch_source=control-host`; missing or mismatched evidence still fails closed.

## Technical Requirements
1. Update `orchestrator/src/cli/control/providerIssueHandoff.ts` so rehydrated active-run claims preserve launch provenance only from truthful evidence.
2. Match the active manifest's `provider_launch_source`, `provider_control_host_task_id`, and `provider_control_host_run_id` (including camelCase aliases) to the current control-host locator.
3. Require retained claim identity to identify the active run by `run_id` or `run_manifest_path`; when both exist, both must match.
4. Use the discovered manifest snapshot instead of rereading the manifest during provenance validation.
5. Preserve strict rejection and diagnostics in `orchestrator/src/cli/providerLinearChildLaneShell.ts`.

## Validation Requirements
- Add active-run rehydrate preservation and fail-closed tests.
- Add persisted-claim serialization coverage for `launch_source` and `launch_token`.
- Add child-lane success and `provider_worker_child_lane_provenance_invalid` diagnostics coverage.
- Run required guards and test suites before review handoff.

## Non-Goals
- No `CO-216` logic change.
- No historical manifest mutation.
- No new manifest schema.
- No child-lane fail-open or blanket `DELEGATION_GUARD_OVERRIDE_REASON`.

## Approval
- Parent provider worker owns implementation, validation, Linear workpad, PR, and merge.
- Date: 2026-04-21.
