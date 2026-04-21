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
- Action plan: `docs/ACTION_PLAN-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md`
- Task checklist: `tasks/tasks-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md`

## Problem
The provider handoff service can rediscover an active provider-worker run and persist a `provider_issue_rehydrated_active_run` claim without launch provenance. That leaves the claim with `launch_source: null`, so `linear child-lane` correctly fails closed with `provider_worker_child_lane_provenance_invalid` even when the active manifest proves the worker was control-host launched.

## Requirements
1. Audit each `provider_issue_rehydrated_active_run` write in `orchestrator/src/cli/control/providerIssueHandoff.ts`.
2. Preserve claim launch provenance only when the claim already carries control-host launch intent, the retained run identity matches the active run, and the active manifest snapshot contains matching `provider_launch_source`, `provider_control_host_task_id`, and `provider_control_host_run_id`.
3. Accept both snake_case and camelCase manifest aliases so old and current manifest serializers remain compatible.
4. Preserve fail-closed behavior for missing, stale, conflicting, non-control-host, or different-run evidence.
5. Keep child-lane validation data-driven; do not add override-only acceptance.
6. Surface operator diagnostics that name the required claim and manifest fields.

## Design
- Add a small rehydrate provenance resolver in `providerIssueHandoff.ts`.
- Carry the discovered manifest snapshot on the internal provider run record so rehydrate provenance validation does not reread `manifest.json` after active-run discovery.
- Require the claim to identify the active run by retained `run_id` and/or `run_manifest_path`; when both are present, both must match.
- Compare the active manifest tuple to the current control-host locator.
- Return explicit null launch fields when evidence is absent or mismatched.
- Keep synthetic release records with an empty manifest snapshot so they cannot accidentally preserve provenance.

## Data Contract
Required manifest fields:
- `provider_launch_source` or `providerLaunchSource`
- `provider_control_host_task_id` or `providerControlHostTaskId`
- `provider_control_host_run_id` or `providerControlHostRunId`

Required claim fields for preservation:
- `launch_source=control-host`
- non-empty `launch_token`
- retained run identity that identifies the active run

No migration or historical manifest mutation is part of this issue.

## Relationship To CO-244
`CO-244` made the control-host tuple available and kept child-lane provenance strict. `CO-289` handles the uncovered rehydration path where the active manifest can be valid but the rebuilt intake claim loses launch provenance. The fix consumes `CO-244` evidence; it does not alter `CO-244` semantics.

## Validation Plan
- `ProviderIssueHandoff` tests for active-run rehydrate preservation and mismatch clearing.
- `ProviderIssueHandoffRefreshSerialization` tests for persisted claim `launch_source`/`launch_token`, camelCase manifest aliases, manifest-path-only retained identity, absent claim provenance, and discovery snapshot TOCTOU behavior.
- `ProviderLinearChildLaneShell` tests for success and `provider_worker_child_lane_provenance_invalid` diagnostics.
- Required repo gates: delegation guard, spec guard, build, lint, focused provider tests, full test suite, docs checks, stewardship, diff budget, pack smoke, standalone review, elegance pass, and PR readiness drain.

## Risks
- Over-preserving stale provenance could authorize a child lane for the wrong parent. Mitigation: require retained identity and matching control-host tuple.
- Rereading manifest provenance after discovery can race with manifest changes. Mitigation: validate against the discovery snapshot.
- Treating absent evidence as valid would weaken `CO-244`. Mitigation: explicit null fallback and fail-closed tests.

## Non-Goals
- No `CO-216` operator-autopilot changes.
- No manifest schema redesign.
- No historical manifest backfill.
- No child-lane fail-open behavior.

## Approvals
- Reviewer: parent provider worker.
- Date: 2026-04-21.
