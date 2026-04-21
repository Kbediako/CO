# PRD - Preserve provider-worker provenance across rehydrated active-run resume

## Added by Docs Child Lane 2026-04-21

## Traceability
- Linear issue: `CO-289` / `30d86aaa-8afb-4e47-8de1-f2ab493a15a9`
- Linear URL: https://linear.app/asabeko/issue/CO-289
- MCP Task ID: `linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9`
- Canonical task ID: `20260421-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9`
- Canonical spec: `tasks/specs/linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md`
- Task checklist: `tasks/tasks-linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9.md`
- Docs packet child lane manifest: `.runs/linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9-co289-docs-packet/cli/2026-04-21T06-56-20-392Z-b41cf2db/manifest.json`
- Source anchor: `ctx:sha256:6c59a269dfa69e9b7db180869f29ed426f66424f7f5cab6c4650cd494af19246#chunk:c000001`
- Source payload note: the declared `.runs/linear-30d86aaa-8afb-4e47-8de1-f2ab493a15a9-co289-docs-packet/cli/2026-04-21T06-56-20-392Z-b41cf2db/memory/source-0/source.txt` path is absent in this child checkout. This packet is anchored on the parent-provided `CO-289` issue framing, protected terms, source anchor, and local inspection of the current rehydrated active-run and child-lane provenance seams.

## Summary
- Problem Statement: after an existing provider-worker run is reattached as `provider_issue_rehydrated_active_run`, the provider intake claim can be persisted with `launch_source: null` even when the attached active run's manifest carries the completed `CO-244` control-host provenance tuple. That leaves same-issue `linear child-lane` launches failing closed with `provider_worker_child_lane_provenance_invalid`.
- Desired Outcome: rehydrated active-run resume preserves or rehydrates trustworthy control-host provenance from the attached run manifest so valid same-issue child lanes keep passing the strict provenance gate, while missing or mismatched provenance still fails closed.

## User Request Translation (Context Anchor)
- User intent / needs: create the docs-first packet for `CO-289` only so the parent lane can repair provider-worker rehydration provenance without reopening the completed `CO-244` manifest-persistence lane, weakening the child-lane guard, or drifting into unrelated `CO-216` operator-autopilot work.
- Success criteria / acceptance:
  - `provider_issue_rehydrated_active_run` claims no longer lose valid control-host provenance during active-run resume.
  - A rehydrated provider parent claim is not left with `launch_source: null` when the attached active run manifest proves matching `provider_launch_source`, `provider_control_host_task_id`, and `provider_control_host_run_id`.
  - Same-issue `linear child-lane` launches succeed when the parent claim and attached manifest prove the same current control-host owner.
  - Same-issue child lanes still fail with `provider_worker_child_lane_provenance_invalid` when provenance is absent, mismatched, stale, or not `control-host`.
  - Focused regressions cover the rehydrated active-run resume path, the claim serialization path, and the guard/child-lane authorization path.
- Constraints / non-goals:
  - child lane owns only this docs packet and registry mirrors
  - parent lane owns implementation, tests, validation, Linear state, workpad, PR lifecycle, and merge
  - do not edit implementation or tests in this child lane
  - do not run full repo validation suites in this child lane

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `provider_issue_rehydrated_active_run`
  - `provider_control_host_task_id`
  - `provider_control_host_run_id`
  - `provider_launch_source`
  - `launch_source: null`
  - `provider_worker_child_lane_provenance_invalid`
  - `linear child-lane`
  - `CO-244`
  - `CO-216`
- Protected terms / exact artifact and surface names:
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/providerIntakeState.ts`
  - `orchestrator/src/cli/providerLinearChildLaneShell.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/run/manifest.ts`
  - `tests/delegation-guard.spec.ts`
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`
  - `orchestrator/tests/ProviderIssueHandoffRefreshSerialization.test.ts`
  - `orchestrator/tests/ProviderIntakeState.test.ts`
  - `orchestrator/tests/ProviderLinearChildLaneShell.test.ts`
- Nearby wrong interpretations to reject:
  - this is not a redo of `CO-244`; manifest schema/bootstrap provenance was the prerequisite, while this lane is about rehydrated active-run claim persistence
  - this is not `CO-216` operator-autopilot backlog re-promotion or manual-demotion logic
  - this is not a request to disable `provider_worker_child_lane_provenance_invalid`
  - this is not a request to trust task/run-only equality without `provider_launch_source=control-host`
  - this is not a generic provider-worker restart, intake, or dashboard cleanup lane

## Relationship To CO-244
- `CO-244` completed the manifest-side contract: provider-worker manifests can carry `provider_launch_source`, `provider_control_host_task_id`, and `provider_control_host_run_id`, and child helpers can fail closed when that tuple is missing or mismatched.
- `CO-244` did not cover every path that reconstructs provider-intake claims after a live worker is discovered. The rehydrated active-run path in `providerIssueHandoff.ts` can rebuild `provider_issue_rehydrated_active_run` claims while leaving claim provenance unset, which serializes as `launch_source: null`.
- `CO-289` therefore depends on `CO-244` but is narrower than it: use the manifest tuple as evidence during rehydrate/resume, do not change the tuple definition, and keep the same fail-closed behavior for invalid child-lane provenance.

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth |
| --- | --- | --- | --- |
| Attached active run manifest | After `CO-244`, the run manifest may contain `provider_launch_source`, `provider_control_host_task_id`, and `provider_control_host_run_id`. | The manifest tuple is the authoritative control-host provenance evidence. | Rehydrate consumes the tuple only when it is complete and matches the active control-host owner. |
| Rehydrated intake claim | `provider_issue_rehydrated_active_run` paths can upsert a running claim with `launch_source: null` / unset launch provenance. | A rehydrated claim should preserve trustworthy provenance from the attached active run. | The claim stores `launch_source=control-host` when the attached manifest proves valid provenance. |
| `linear child-lane` guard | A same-issue child lane can fail with `provider_worker_child_lane_provenance_invalid` because the parent claim lacks launch provenance. | Valid rehydrated parent claims should satisfy the same guard as freshly launched provider claims. | Valid same-issue child lanes pass; missing/mismatched provenance still fails closed. |
| Adjacent issue scope | `CO-244` and `CO-216` are easy to conflate with this lane. | `CO-244` is manifest persistence; `CO-216` is operator-autopilot backlog demotion churn. | `CO-289` stays on rehydrated active-run provenance only. |

## Acceptance Criteria
- Docs-first packet and registry mirrors exist for `CO-289` before implementation.
- Parent implementation derives rehydrated claim launch provenance from the attached active run only when manifest evidence includes matching `provider_launch_source`, `provider_control_host_task_id`, and `provider_control_host_run_id`.
- Rehydrated active-run claims for matching control-host provenance do not persist as `launch_source: null`.
- Same-issue `linear child-lane` passes when the rehydrated parent claim and manifest prove valid current control-host provenance.
- Missing, stale, conflicting, or non-control-host provenance still returns `provider_worker_child_lane_provenance_invalid`.
- Focused tests cover claim rehydrate/resume, serialization, and child-lane/guard behavior.

## Non-Goals
- No manifest schema redesign beyond consuming the tuple already introduced by `CO-244`.
- No weakening of provider-worker child-lane provenance validation.
- No blanket `DELEGATION_GUARD_OVERRIDE_REASON` or env-only workaround as the steady-state fix.
- No `CO-216` backlog-promotion/manual-demotion behavior change.
- No broad provider-worker restart, retry, CO STATUS, dashboard, or admission-cap redesign under this issue.
- No implementation or test edits in this docs child lane.

## Not Done If
- A rehydrated active provider-worker claim still serializes as `launch_source: null` when its attached run manifest proves matching control-host provenance.
- The parent fix only changes freshly launched provider-worker claims and leaves `provider_issue_rehydrated_active_run` resume paths unchanged.
- Same-issue `linear child-lane` still fails with `provider_worker_child_lane_provenance_invalid` for a valid rehydrated parent.
- The repair accepts task/run-only truth without `provider_launch_source=control-host`.
- Invalid or stale provenance stops failing closed.
- The lane drifts into `CO-244` manifest tuple redesign or `CO-216` operator-autopilot logic.

## Stakeholders
- Product: CO operators who expect same-issue child lanes to remain available after provider-worker recovery/resume without losing auditability.
- Engineering: provider issue handoff, provider intake state, manifest, and child-lane guard maintainers.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - valid rehydrated claims retain launch provenance
  - same-issue child-lane authorization succeeds from a rehydrated active parent
  - invalid provenance still fails closed with `provider_worker_child_lane_provenance_invalid`
- Guardrails / Error Budgets:
  - consume only complete, matching manifest provenance
  - preserve `CO-244` manifest tuple semantics
  - preserve `CO-216` behavior untouched
  - keep implementation bounded to provider handoff/intake/guard surfaces

## User Experience
- Personas:
  - parent provider worker launching a same-issue docs or review child lane after a resume
  - operator diagnosing a provenance-invalid child-lane rejection
- User Journeys:
  - a provider-worker resume discovers an already active same-issue run, reads its manifest provenance, and persists a running claim with valid launch provenance
  - a same-issue `linear child-lane` launch sees valid parent provenance and proceeds
  - a stale or mismatched parent run still fails closed with the existing provenance-invalid error instead of getting an override

## Technical Considerations
- Architectural Notes:
  - the likely parent implementation seam is `providerIssueHandoff.ts` where active-run rehydrate branches currently pass unset launch provenance while writing `provider_issue_rehydrated_active_run`
  - `providerIntakeState.ts` owns the persisted claim shape and should not be taught to infer provenance blindly
  - child-lane shells should continue to rely on recorded provider provenance rather than gaining looser fallback rules
- Dependencies / Integrations:
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/providerIntakeState.ts`
  - `orchestrator/src/cli/providerLinearChildLaneShell.ts`
  - `orchestrator/src/cli/run/manifest.ts`
  - `tests/delegation-guard.spec.ts`
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`
  - `orchestrator/tests/ProviderIssueHandoffRefreshSerialization.test.ts`
  - `orchestrator/tests/ProviderIntakeState.test.ts`

## Open Questions
- Should rehydrate require both claim-level prior provenance and manifest provenance, or is a complete matching attached run manifest sufficient to restore claim `launch_source=control-host`?
- Which rehydrate/resume branches beyond the released-claim and owned-claim active-run paths also write `provider_issue_rehydrated_active_run` with unset launch provenance?
- Does any downstream guard require claim-only provenance, or should it also read manifest `provider_control_host_task_id` / `provider_control_host_run_id` directly when the claim points at a manifest?

## Approvals
- Product: self-approved from the bounded `CO-289` issue wording carried into this packet.
- Engineering: pending parent docs-review / implementation handoff.
- Design: N/A.
