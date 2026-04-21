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
- PRD: `docs/PRD-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md`
- Task checklist: `tasks/tasks-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md`

## Traceability
- Linear issue: `CO-289` / `30d86aaa-8afb-4e47-8de1-f2ab493a15a9`
- Source anchor: `ctx:sha256:6c59a269dfa69e9b7db180869f29ed426f66424f7f5cab6c4650cd494af19246#chunk:c000001`
- Declared source payload: `.runs/linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9-co289-docs-packet/cli/2026-04-21T06-56-20-392Z-b41cf2db/memory/source-0/source.txt`
- Declared child-lane manifest: `.runs/linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9-co289-docs-packet/cli/2026-04-21T06-56-20-392Z-b41cf2db/manifest.json`
- Source payload note: the declared source payload and `.runs` directory are absent in this child checkout; this packet preserves the parent-provided protected wording and locally inspected code/test seam.

## Summary
- Objective: preserve valid control-host provenance when provider intake rehydrates an already active provider-worker run as `provider_issue_rehydrated_active_run`.
- Scope:
  - parent-owned `providerIssueHandoff.ts` active-run rehydrate/resume provenance repair
  - parent-owned provider intake claim persistence and serialization checks
  - parent-owned same-issue `linear child-lane` authorization regression
  - child-owned docs-first packet and registry mirrors only
- Constraints:
  - do not weaken `provider_worker_child_lane_provenance_invalid`
  - do not redesign the `CO-244` manifest tuple
  - do not touch `CO-216` backlog-promotion/manual-demotion logic

## Issue-Shaping Contract
- User-request translation carried forward: `CO-289` is the rehydrated active-run provenance lane. The manifest tuple from `CO-244` is already the prerequisite evidence; the bug is that resume/rehydrate paths can rebuild the running provider claim with `launch_source: null`, so the child-lane provenance gate cannot see valid control-host lineage.
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
  - treat this as another `CO-244` manifest schema/bootstrap issue
  - treat this as `CO-216` operator-autopilot churn
  - accept child-lane provenance by override or task/run-only matching
  - make child-lane validation less strict
  - solve only freshly launched provider-worker claims
- Explicit non-goals carried forward:
  - no manifest tuple redesign
  - no provider admission or dashboard redesign
  - no `CO-216` logic changes
  - no implementation edits in this child lane

## Parity / Alignment Matrix
- Current truth:
  - `CO-244` gives active provider-worker manifests a place to store `provider_launch_source`, `provider_control_host_task_id`, and `provider_control_host_run_id`.
  - `providerIssueHandoff.ts` active-run rehydrate paths can upsert `provider_issue_rehydrated_active_run` claims with launch provenance unset, which persists as `launch_source: null`.
  - guard coverage rejects delegated child runs when the provider parent claim lacks control-host provenance.
- Reference truth:
  - a rehydrated active run should retain the same provenance truth as a freshly control-host-launched provider run when the attached manifest proves it.
  - invalid or missing manifest provenance should still fail closed.
- Target truth / intended delta:
  - valid rehydrated claims carry `launch_source=control-host` after consuming complete matching manifest provenance.
  - valid same-issue `linear child-lane` launches pass after rehydrate/resume.
  - `provider_worker_child_lane_provenance_invalid` remains the outcome for missing, stale, conflicting, or non-control-host provenance.
- Explicitly out-of-scope differences:
  - changing how `CO-244` writes manifest fields
  - changing `CO-216`
  - broad control-host restart cleanup

## Readiness Gate
- Not done if:
  - rehydrated active-run claims still show `launch_source: null` despite complete matching manifest provenance
  - the fix does not exercise `provider_issue_rehydrated_active_run`
  - same-issue `linear child-lane` still fails on a valid rehydrated parent with `provider_worker_child_lane_provenance_invalid`
  - mismatched manifest provenance is accepted
  - the lane drifts into `CO-244` or `CO-216`
- Pre-implementation issue-quality review evidence:
  - 2026-04-21: local inspection found active-run rehydrate branches in `providerIssueHandoff.ts` that upsert `provider_issue_rehydrated_active_run` claims with launch provenance unset.
  - 2026-04-21: local guard coverage includes a rejection case where a rehydrated provider parent claim has `launch_source: null`.
  - 2026-04-21: the issue is not eligible for the micro-task path because correctness depends on exact provenance fields, exact error codes, and explicit relationship to `CO-244` and `CO-216`.
- Safeguard ownership split:
  - child lane owns only packet and registry files
  - parent lane owns implementation, validation, Linear/workpad reconciliation, PR, and merge

## Technical Requirements
- Functional requirements:
  1. Identify every active-run resume/rehydrate path that writes or preserves `reason: "provider_issue_rehydrated_active_run"`.
  2. When a rehydrated active run points at a manifest with complete matching `provider_launch_source`, `provider_control_host_task_id`, and `provider_control_host_run_id`, persist claim launch provenance instead of leaving `launch_source: null`.
  3. Do not infer provenance from task/run IDs alone.
  4. Preserve `provider_worker_child_lane_provenance_invalid` for absent, conflicting, stale, or non-control-host provenance.
  5. Keep child-lane shells using recorded provenance truth rather than override envs.
  6. Add focused tests proving claim rehydrate, serialized intake state, and child-lane/guard behavior.
- Non-functional requirements:
  - additive provenance preservation only
  - no broad runtime or admission redesign
  - no synthetic provenance when manifest evidence is missing
- Interfaces / contracts:
  - `providerIssueHandoff.ts` rehydrate/resume claim writes
  - `providerIntakeState.ts` claim persistence and serialization
  - manifest provenance fields from `run/manifest.ts`
  - child-lane / delegation guard provenance checks

## Architecture & Data
- Architecture / design adjustments:
  - introduce a small parent-owned resolver or inline helper that extracts trustworthy launch provenance from the attached active run manifest.
  - use that resolver only in `provider_issue_rehydrated_active_run` write paths where the active run and current control-host environment can be matched.
  - leave child-lane validation strict and data-driven.
- Data model changes / migrations:
  - no new manifest fields
  - no new provider-intake fields expected beyond correctly populating existing `launch_source`
  - no offline migration; existing claims repair only when rehydrated through a verified active-run path
- External dependencies / integrations:
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`
  - `orchestrator/tests/ProviderIssueHandoffRefreshSerialization.test.ts`
  - `orchestrator/tests/ProviderIntakeState.test.ts`
  - `orchestrator/tests/ProviderLinearChildLaneShell.test.ts`
  - `tests/delegation-guard.spec.ts`

## Validation Plan
- Child-lane checks:
  - `node -e "JSON.parse(require('node:fs').readFileSync('tasks/index.json','utf8')); JSON.parse(require('node:fs').readFileSync('docs/docs-freshness-registry.json','utf8'));"`
  - protected-term grep over the packet and mirrors
  - `git diff --check -- docs/PRD-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md docs/TECH_SPEC-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md docs/ACTION_PLAN-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md tasks/specs/linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md tasks/tasks-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md .agent/task/linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json`
- Parent-lane checks:
  - focused `ProviderIssueHandoff` active-run rehydrate tests
  - focused `ProviderIssueHandoffRefreshSerialization` persisted claim tests
  - focused `ProviderIntakeState` launch provenance serialization tests
  - focused child-lane / delegation guard tests for rehydrated parent acceptance and invalid provenance rejection
  - `node scripts/spec-guard.mjs --dry-run`

## Open Questions
- Should the parent fix repair only new rehydrate writes, or also normalize an existing in-memory `provider_issue_rehydrated_active_run` claim before child-lane authorization?
- Should the child-lane guard read manifest provenance directly as a backstop, or should the parent ensure provider-intake claim truth is always sufficient after rehydrate?
- Which focused test should be the canonical acceptance case for the `launch_source: null` regression shape?

## Approvals
- Reviewer: parent provider worker
- Date: 2026-04-21
