# ACTION_PLAN - CO: keep fresh Ready issue admission fair under retained/released refresh residue

## Added by Bootstrap 2026-04-14

## Summary
- Goal: close `CO-181` by bounding retained/released reconciliation so fair `fresh_discovery` can admit unrelated `Ready` work when provider capacity remains, while preserving `CO-160` / `CO-161` no-burn behavior and surfacing stuck phase/count diagnostics.
- Scope: docs-first packet and task registration in this child lane; parent-owned implementation in provider refresh/admission seams, focused regressions, diagnostics proof, validation, review, and PR lifecycle.
- Assumptions:
  - `CO-160` and `CO-161` remain authoritative for retained released no-burn and unrelated discovery replay protection
  - `CO-181` is about refresh-cycle fairness under remaining capacity, not Linear labels or filters
  - `provider_refresh_lifecycle_stuck` / `restart_required` truth must remain visible for real refresh stalls

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - preserve `provider_refresh_lifecycle_stuck`, `restart_required`, `dispatch_source_issue_by_id`, `dispatch_source_tracked_issues:fresh_discovery`, `fresh_discovery`, `provider-intake-state.json`, retained claims, released claims, `Ready issue admission`, `CO-160`, `CO-161`, and `CO-180`
- Not done if:
  - retained/released residue can still starve `fresh_discovery` while capacity remains
  - retained released no-burn scenarios regain `dispatch_source_issue_by_id`
  - the mixed two-active-claims plus one-free-slot regression does not claim the unrelated `Ready` issue
  - stuck diagnostics lack phase/count data
  - the fix becomes a label/filter change or broad scheduler redesign
- Pre-implementation issue-quality review:
  - keep the lane bounded to fair fresh discovery under remaining capacity, retained/released reconciliation bounds, stuck phase/count diagnostics, and `CO-160` / `CO-161` no-burn preservation
  - parent owns implementation and validation; this child lane owns docs packet only

## Milestones & Sequencing
1. Draft and register the `CO-181` docs-first packet, mirror the checklist, and leave the child-lane patch uncommitted for parent export.
2. Parent accepts the docs packet, refreshes any parent-owned registries or workpad state, and runs the appropriate docs-review/spec guard flow.
3. Parent implements a narrow refresh-cycle admission/reconciliation bound in the existing provider handoff/lifecycle seams.
4. Parent adds focused regressions for the two-active plus retained/released residue plus one-free-slot `Ready` issue case, preserved no-burn scenarios, and stuck phase/count diagnostics.
5. Parent runs focused validation first, then the required guard/review/elegance/handoff gates before PR lifecycle and Linear review-state transition.

## Dependencies
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`
- `orchestrator/src/cli/control/providerPollingHealth.ts`
- `orchestrator/src/cli/control/providerIntakeState.ts`
- `orchestrator/tests/ProviderIssueHandoff.test.ts`
- `orchestrator/tests/ControlServerPublicLifecycle.test.ts`
- `provider-intake-state.json`

## Validation
- Checks / tests:
  - child lane: documentation diff review only, no full repo validation suites
  - parent lane: focused Vitest for provider handoff/lifecycle behavior
  - parent lane: `node scripts/spec-guard.mjs --dry-run`
  - parent lane: required repo validation, standalone review, and elegance pass before PR handoff
- Rollback plan:
  - revert the admission/reconciliation bound and diagnostics additions together if they suppress genuinely runnable work or weaken no-burn behavior
  - preserve the existing `CO-160` / `CO-161` released-claim behavior as the rollback baseline

## Risks & Mitigations
- Risk: `fresh_discovery` admits duplicate work for an already-retained active claim.
  - Mitigation: keep existing retained active claim ownership checks before claiming discovery results.
- Risk: retained released claims are replayed through generic discovery and leave released state.
  - Mitigation: preserve the `CO-161` replay-blocking behavior for released-only cached reasons.
- Risk: bounding retained/released reconciliation hides a real reopened issue.
  - Mitigation: keep explicit newer-evidence reopen paths and live tracked-issue evidence authoritative when present.
- Risk: diagnostics become a broad CO STATUS redesign.
  - Mitigation: add only phase/count fields needed to explain refresh starvation, preferably in existing provider polling health or `provider-intake-state.json` surfaces.

## Approvals
- Reviewer: pending parent docs-review and implementation validation
- Date: 2026-04-14
