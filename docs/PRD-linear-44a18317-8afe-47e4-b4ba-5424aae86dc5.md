# PRD - CO: Harden CO STATUS end-to-end truth agreement, visual coverage, and legacy monitor cleanup

## Added by Bootstrap 2026-04-03

## Traceability
- Linear issue: `CO-76` / `44a18317-8afe-47e4-b4ba-5424aae86dc5`
- Linear URL: https://linear.app/asabeko/issue/CO-76/co-harden-co-status-end-to-end-truth-agreement-visual-coverage-and
- Source issues:
  - `CO-55` / `cd3020f3-b6be-4adb-ae00-1a15497de036`
  - `CO-67` / `f3193657-a549-43a2-8cff-50c5284df986`
  - `CO-73` / `6bed26fd-ea66-43c1-8324-b10871769435`
  - `CO-74` / `c4c32123-af51-4552-b55a-03d17917659c`

## Summary
- Problem Statement: `CO STATUS` now has several narrow fixes and one live operator-dashboard read model, but it still lacks a single hardening lane that treats the shipped terminal surface as a product with an explicit truth contract. The remaining gaps are no longer just one bug: coverage is scattered, visual proof is incomplete, `co-status --format json` still advertises readiness rather than a STATUS snapshot, and older selected-run naming/surface remnants still make it harder to tell which path is authoritative for the current dashboard.
- Desired Outcome: one explicit `CO STATUS` contract ties the interactive terminal view, a machine-readable STATUS JSON snapshot, and the authoritative read-side projection together; every currently rendered field/state is mapped to automated coverage or manual proof; real screenshots for representative states are embedded inline in Linear; and any remaining legacy monitor-era naming or duplicate truth paths are removed or narrowed when they do not materially serve the current STATUS surface.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): finish the hardening pass that earlier STATUS lanes only prepared. The terminal view must be truthful across all visible sections and states, a machine-readable STATUS snapshot must reflect the same shared values, rate-limit and token semantics must be explicit and deterministic, and the issue closeout must include real screenshots captured from this device rather than text-only or synthetic substitutes.
- Success criteria / acceptance:
  - a documented coverage matrix exists for every current `CO STATUS` field/state
  - interactive terminal `CO STATUS` and `co-status --format json` agree on the same shared authoritative values
  - `/ui/data.json` and `/api/v1/state` remain the authoritative read-side comparison sources for overlapping STATUS fields
  - tokens, runtime, running rows, retry rows, polling health, rate-limit selection, and reset countdown behavior are deterministic and tested
  - real inline screenshots cover normal live, paused/inspect, compact/constrained-height, empty/idle, and retry or degraded/unavailable telemetry states
  - legacy selected-run or pre-`CO STATUS` seams that only add drift or maintenance burden are removed or renamed narrowly instead of being preserved for symmetry
- Constraints / non-goals:
  - do not reopen broader product redesign, UI redesign, or unrelated observability features
  - do not replace real-device screenshot proof with rendered cards, mocks, or JSON dumps
  - do not preserve duplicate truth paths or stale naming if they no longer reflect the shipped STATUS surface
  - do not widen into unrelated control-host lifecycle work unless a direct STATUS truth contract depends on it

## Intent Checksum
- Exact user wording / phrases to preserve:
  - "`CO STATUS`"
  - "truth agreement"
  - "visual coverage"
  - "legacy monitor cleanup"
  - "Tokens: in/out/total"
  - "aggregate runtime"
  - "rate-limit summary source selection"
  - "`reset xxxs` countdown"
  - "real screenshots captured on this device"
- Protected terms / exact artifact and surface names:
  - `CO STATUS`
  - `co-status --format json`
  - `/ui/data.json`
  - `/api/v1/state`
  - `operatorDashboardPresenter.ts`
  - `controlStatusDashboard.ts`
  - `controlRuntime.ts`
  - the legacy selected-run presenter seam later removed by `CO-88`
  - `ControlStatusDashboard.test.ts`
  - `ControlServer.test.ts`
  - `UiDataController.test.ts`
- Nearby wrong interpretations to reject:
  - only add more screenshots without tightening the STATUS JSON contract
  - trust `control-host --format json` readiness output as the machine-readable STATUS surface
  - accept time-relative runtime/reset drift without an explicit comparison contract
  - treat stale selected-run naming or helper remnants as harmless even when they obscure the current dashboard truth path
  - split newly discovered in-scope STATUS truth gaps into several tiny tickets instead of landing one hardening pass

## Parity / Alignment Matrix
- Current truth:
  - the interactive terminal dashboard and `/ui/data.json` already share the operator-dashboard dataset, and `/api/v1/state` exposes overlapping counts/totals/rate-limit/polling truth from the same compatibility runtime
  - `co-status --format json` still presents a machine-readable readiness contract rather than a machine-readable STATUS snapshot
  - field/state coverage already exists in several focused tests, but it is not collected into one explicit operator-facing coverage matrix and inline screenshot proof is incomplete
  - older selected-run presenter names and test names remain in the repo even though the shipped STATUS/UI dataset now comes from the operator-dashboard presenter
- Reference truth:
  - one operator-facing STATUS contract should make it obvious which terminal, JSON, and HTTP read surfaces are authoritative and how time-relative values are compared
  - every rendered field/state should map to either automated coverage or manual proof
  - screenshot proof should show the real terminal view on this device for the required representative states
- Target truth / intended delta:
  - `co-status --format json` becomes the explicit machine-readable STATUS snapshot, aligned with the shared operator-dashboard dataset and compared against the same authoritative read model as the terminal
  - a coverage matrix documents each rendered field/state, the authoritative source, the automated coverage, and the required manual proof
  - any stale STATUS-era naming or duplicate truth helpers kept only by history are narrowed or cleaned up when the change stays bounded
- Explicitly out-of-scope differences:
  - redesigning the terminal layout or browser UI beyond what truthfulness and testability require
  - expanding mutating control behavior, host ownership, or unrelated telemetry collection
  - turning `control-host --format json` into anything other than launch/readiness output

## Not Done If
- `co-status --format json` still does not represent a machine-readable STATUS snapshot.
- The coverage matrix does not account for every currently rendered `CO STATUS` section or state.
- Tokens, runtime, rate limits, polling health, retry rows, or reset countdown behavior remain ambiguous or untested.
- Required screenshots are not embedded inline in Linear from this device.
- Legacy STATUS or selected-run naming/truth seams that still confuse authority are left unexplained and unreviewed.

## Goals
- Define one explicit machine-readable STATUS snapshot contract for `co-status --format json`.
- Document and validate field-by-field agreement between the terminal dashboard and the authoritative read-side STATUS data.
- Add a complete STATUS coverage matrix and real inline screenshot proof.
- Narrow or remove stale legacy STATUS naming or duplicate truth paths when the cleanup is small and directly reduces drift.

## Non-Goals
- Reworking the broader product design of STATUS.
- Replacing the read-side HTTP/UI surfaces with a new architecture.
- Reopening unrelated provider-control, transport, or cloud orchestration lanes.
- Treating screenshots as optional when the issue explicitly requires them.

## Stakeholders
- Product: CO operators relying on `CO STATUS` as the terminal truth surface.
- Engineering: control-host, observability, and provider-worker maintainers reviewing read-side contract clarity.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - shared STATUS fields match across interactive terminal, `co-status --format json`, and the authoritative HTTP/read-model surfaces
  - coverage matrix rows are complete for the current shipped surface
  - representative state screenshots are visible inline in Linear
  - legacy/stale STATUS naming is reduced where it materially obscures current authority
- Guardrails / Error Budgets:
  - keep the lane bounded to status truth, coverage, proof, and adjacent cleanup
  - preserve `control-host --format json` launch-readiness behavior
  - prefer reuse of the existing operator-dashboard dataset and runtime projection over inventing a second status data path

## User Experience
- Personas: CO operator monitoring active work from a terminal; reviewer validating the real terminal surface and the machine-readable STATUS contract.
- User Journeys:
  - operator runs interactive `co-status` and sees the live terminal dashboard
  - reviewer or automation runs `co-status --format json` and receives the current STATUS snapshot instead of only launch metadata
  - operator or reviewer checks the issue workpad and sees real terminal screenshots for the required representative states

## Technical Considerations
- Architectural Notes:
  - the current operator-dashboard dataset already exists in `operatorDashboardPresenter.ts`, `/ui/data.json`, and the terminal renderer
  - `/api/v1/state` still matters as the authoritative compatibility/read-model comparison source for overlapping STATUS fields
  - the minimal hardening move is to reuse the existing operator-dashboard dataset for the new STATUS JSON contract instead of inventing another status payload
  - small legacy cleanup is justified if it reduces ambiguity around the current STATUS truth path, for example stale selected-run presenter naming or tests that no longer describe the shipped STATUS surface accurately
- Dependencies / Integrations:
  - `bin/codex-orchestrator.ts`
  - `orchestrator/src/cli/coStatusAttachCliShell.ts`
  - `orchestrator/src/cli/control/operatorDashboardPresenter.ts`
  - `orchestrator/src/cli/control/controlStatusDashboard.ts`
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - `orchestrator/src/cli/control/uiDataController.ts`
  - `orchestrator/src/cli/control/observabilitySurface.ts`

## Open Questions
- If any deeper legacy cleanup would require broad controller/presenter deletion beyond status truth or naming clarity, stop and file a follow-up instead of widening this lane.

## Approvals
- Product: self-approved from the Linear issue scope and acceptance criteria.
- Engineering: pending docs-review child stream and implementation validation.
- Design: N/A.
