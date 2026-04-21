---
id: 20260421-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9
title: Preserve provider-worker provenance across rehydrated active-run resume
relates_to: docs/PRD-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md
risk: high
owners:
  - Codex
last_review: 2026-04-21
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md`
- PRD: `docs/PRD-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md`
- Task checklist: `tasks/tasks-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md`

## Traceability
- Linear issue: `CO-289` / `30d86aaa-8afb-4e47-8de1-f2ab493a15a9`
- Shared source anchor: `ctx:sha256:6c59a269dfa69e9b7db180869f29ed426f66424f7f5cab6c4650cd494af19246#chunk:c000001`
- Declared origin manifest: `.runs/linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9-co289-docs-packet/cli/2026-04-21T06-56-20-392Z-b41cf2db/manifest.json`
- Declared source payload: `.runs/linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9-co289-docs-packet/cli/2026-04-21T06-56-20-392Z-b41cf2db/memory/source-0/source.txt`
- Shared source-0 note: the declared payload path is absent in this child checkout; protected wording is anchored on the parent-provided `CO-289` issue intent plus current repo seams.

## Summary
- Objective: preserve control-host provenance on provider-intake claims after active-run rehydrate/resume writes `provider_issue_rehydrated_active_run`.
- Scope:
  - docs-first packet and registry/task mirrors in this child lane
  - parent-owned rehydrate provenance repair in `providerIssueHandoff.ts`
  - parent-owned serialization and same-issue child-lane guard tests
- Constraints:
  - preserve strict `provider_worker_child_lane_provenance_invalid`
  - preserve `CO-244` manifest tuple semantics
  - keep `CO-216` out of scope

## Issue-Shaping Contract
- User-request translation carried forward: the missing piece after `CO-244` is not manifest field availability. It is that active-run rehydrate can re-persist the provider parent claim as `provider_issue_rehydrated_active_run` with `launch_source: null`, causing `linear child-lane` guard logic to reject a same-issue child even when the attached active run has the right manifest provenance.
- Protected terms / exact artifact and surface names:
  - `provider_issue_rehydrated_active_run`
  - `provider_control_host_task_id`
  - `provider_control_host_run_id`
  - `provider_launch_source`
  - `launch_source: null`
  - `provider_worker_child_lane_provenance_invalid`
  - `linear child-lane`
  - `CO-244`
  - `CO-216`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/providerIntakeState.ts`
  - `orchestrator/src/cli/providerLinearChildLaneShell.ts`
  - `orchestrator/src/cli/run/manifest.ts`
  - `tests/delegation-guard.spec.ts`
- Nearby wrong interpretations to reject:
  - this is a new manifest schema lane
  - this should weaken child-lane provenance validation
  - this should accept task/run-only provenance
  - this is a `CO-216` operator-autopilot follow-up
  - this is generic provider-worker restart cleanup
- Explicit non-goals carried forward:
  - no `CO-244` tuple redesign
  - no `CO-216` logic change
  - no broad dashboard/admission/retry work
  - no source/test edits by this child lane

## Parity / Alignment Matrix
- Current truth:
  - completed `CO-244` provides manifest-side fields for `provider_launch_source`, `provider_control_host_task_id`, and `provider_control_host_run_id`
  - some `provider_issue_rehydrated_active_run` claim writes still pass unset launch provenance and serialize as `launch_source: null`
  - a child run whose provider parent claim lacks control-host provenance is rejected
- Reference truth:
  - rehydrated active-run claims should preserve trustworthy manifest-backed control-host provenance
  - child-lane authorization should not require a fresh provider-worker launch when resume evidence proves the same current control-host owner
- Target truth / intended delta:
  - rehydrated active-run claims store launch provenance when the attached manifest tuple is complete and matching
  - same-issue `linear child-lane` passes for valid rehydrated parents
  - invalid provenance still fails closed
- Explicitly out-of-scope differences:
  - `CO-244` manifest writing/backfill rules
  - `CO-216` operator-autopilot rules
  - unrelated provider status presentation

## Readiness Gate
- Not done if:
  - valid rehydrated claims still persist `launch_source: null`
  - same-issue `linear child-lane` still fails with `provider_worker_child_lane_provenance_invalid` for valid rehydrated parent provenance
  - parent accepts missing, stale, conflicting, or non-control-host provenance
  - implementation evidence covers only fresh launches, not `provider_issue_rehydrated_active_run`
- Pre-implementation issue-quality review evidence:
  - 2026-04-21: child-lane code inspection found active-run rehydrate writes with unset launch provenance in `providerIssueHandoff.ts`.
  - 2026-04-21: child-lane test inspection found an explicit guard rejection when the provider parent claim lacks control-host provenance and has `launch_source: null`.
  - 2026-04-21: this issue is narrower than `CO-244` and unrelated to `CO-216`.
- Safeguard ownership split:
  - child lane owns only packet files, registries, and checklist mirrors
  - parent lane owns implementation, tests, validation, Linear/workpad reconciliation, PR lifecycle, and merge

## Technical Requirements
1. Audit all `provider_issue_rehydrated_active_run` writes in `providerIssueHandoff.ts`.
2. Resolve launch provenance from the attached active run's manifest only when `provider_launch_source`, `provider_control_host_task_id`, and `provider_control_host_run_id` are complete and match the active control-host owner.
3. Persist rehydrated claim launch provenance so matching cases are not left as `launch_source: null`.
4. Preserve fail-closed behavior and `provider_worker_child_lane_provenance_invalid` for missing or mismatched evidence.
5. Add focused tests around provider handoff rehydrate, provider-intake serialization, and same-issue `linear child-lane` authorization.
6. Keep `CO-216` out of implementation and tests except as an explicit non-goal reference in docs.

## Current Truth
- `providerIssueHandoff.ts` has active-run branches that upsert `provider_issue_rehydrated_active_run` claims after discovering an `in_progress` provider run.
- Those branches can pass unset launch provenance while writing the active run task/run/manifest path.
- `tests/delegation-guard.spec.ts` rejects delegated child runs when a rehydrated provider parent claim lacks control-host provenance and has `launch_source: null`.
- `CO-244` added or validated manifest-side provenance fields, but rehydrated claim provenance remains a separate persistence seam.

## Proposed Design Direction
- Parent should first introduce a narrow provenance extraction path from attached active run manifests.
- Parent should reuse the existing `CO-244` tuple and require `provider_launch_source=control-host`.
- Parent should update each `provider_issue_rehydrated_active_run` claim write to preserve valid provenance and leave invalid cases unchanged.
- Parent should keep child-lane validation as the proving consumer, not as the workaround surface.

## Validation Plan
- Child-lane checks:
  - `node -e "JSON.parse(require('node:fs').readFileSync('tasks/index.json','utf8')); JSON.parse(require('node:fs').readFileSync('docs/docs-freshness-registry.json','utf8'));"`
  - `rg -n "provider_issue_rehydrated_active_run|provider_control_host_task_id|provider_control_host_run_id|provider_launch_source|launch_source: null|provider_worker_child_lane_provenance_invalid|linear child-lane|CO-244|CO-216" docs/PRD-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md docs/TECH_SPEC-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md docs/ACTION_PLAN-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md tasks/specs/linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md tasks/tasks-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md .agent/task/linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md`
  - `git diff --check -- docs/PRD-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md docs/TECH_SPEC-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md docs/ACTION_PLAN-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md tasks/specs/linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md tasks/tasks-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md .agent/task/linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json`
- Parent-lane checks:
  - focused `ProviderIssueHandoff` active-run rehydrate test
  - focused `ProviderIssueHandoffRefreshSerialization` claim persistence test
  - focused `ProviderIntakeState` launch-source preservation test
  - focused `ProviderLinearChildLaneShell` or `delegation-guard` same-issue child acceptance and rejection tests

## Open Questions
- Which `provider_issue_rehydrated_active_run` branch is the live incident path for `CO-289`?
- Should valid manifest provenance update only the claim's `launch_source`, or should parent also record helper evidence that the manifest tuple was consumed?
- Does any child-stream surface need the same acceptance proof after `linear child-lane` is fixed?

## Approvals
- Reviewer: parent provider worker
- Date: 2026-04-21
