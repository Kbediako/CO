---
id: 20260322-1317-coordinator-live-linear-restarted-issue-intake-and-dispatch-consistency
title: Coordinator Live Linear Restarted-Issue Intake and Dispatch Consistency
relates_to: docs/PRD-coordinator-live-linear-restarted-issue-intake-and-dispatch-consistency.md
risk: high
owners:
  - Codex
last_review: 2026-03-22
---

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: determine whether the reported post-PR-283 live Linear mismatch still represents a repo-side parity bug on current `main`, and if so land the smallest correct fix. The lane must separate historical handoff evidence from the current live recheck, because the current control host already shows `CO-1` rehydrated and `/api/v1/dispatch` internally consistent.
- Scope: audit persisted intake/advisory state, `/api/v1/dispatch`, and the code paths that shape those surfaces; implement only the smallest fix that still remains on current code. The confirmed current bug class is dispatch response shaping, not a currently reproduced intake replay failure.
- Constraints:
  - preserve provider-intake and execution-authority boundaries
  - do not widen provider features or redo environment setup
  - do not ask for another operator flip until implementation is justified and ready for one final retest
  - if the current merged code already resolves the issue, stop with a no-op closeout

## Current Status - 2026-03-22
- Historical handoff evidence described a real mismatch: accepted `CO-1` update, stale intake state, and `/api/v1/dispatch` leaking `CO-2`.
- Current parent recheck at `2026-03-22T04:05:10.980Z` no longer reproduces the bug:
  - advisory state tracks `CO-1` in `In Progress`
  - provider-intake state rehydrates `CO-1` as `running`
  - fresh `CO-1` run manifest exists at `.runs/linear-8c4a8de9-45b2-40ef-b295-bd37a21d1155/cli/2026-03-22T04-01-03-150Z-d6d1d049/manifest.json`
  - `/api/v1/dispatch` returns `CO-1` consistently for `tracked_issue`, `recommendation.issue_identifier`, and `traceability.issue_identifier`
- The code-path audit still found one active repo-side defect on current code:
  - `evaluateTrackerDispatchPilotAsync()` can emit `recommendation.issue_identifier` from the stale selected-run default instead of the live tracked issue
  - `createControlRuntimeSnapshot().readDispatchEvaluation()` can surface that stale identifier outward through dispatch traceability
- The implementation decision is therefore dispatch-only: patch the stale fallback path, and do not widen into provider-intake replay behavior that current evidence does not reproduce.
- Post-patch live verification on the restarted local host is now green:
  - tmux host restarted on rebuilt `dist/` and came back ready at `http://127.0.0.1:63303`
  - `provider-intake-state.json` rehydrated `CO-1` into fresh run `2026-03-22T04-46-30-471Z-ba4c6122`
  - authenticated `/api/v1/dispatch` stayed internally consistent with `CO-1` for `tracked_issue`, `recommendation.issue_identifier`, and `traceability.issue_identifier`
  - no final operator Linear state flip was required

## Technical Requirements
- Functional requirements:
  - confirm the current live state from persisted files and authenticated dispatch before any code edit
  - identify the exact functions that compute `tracked_issue`, `recommendation`, and `traceability`
  - if a stale dispatch fallback path remains, patch only that path
  - if intake replay/rehydration still drops a same-issue restart on current code, patch only that path
  - if no bug remains on current code, produce a no-op result with evidence
- Non-functional requirements (performance, reliability, security):
  - no setup churn, no live service mutation beyond bounded read-only queries until a fix is justified
  - no weakening of delegation guard or provider-intake authority
  - preserve current live control-host endpoint and auth discovery through existing recorded files
- Interfaces / contracts:
  - `linear-advisory-state.json` remains the persisted tracked-issue surface
  - `provider-intake-state.json` remains the authoritative intake-claim surface
  - `/api/v1/dispatch` must be internally consistent between `tracked_issue`, `recommendation.issue_identifier`, and `traceability.issue_identifier`

## Architecture & Data
- Architecture / design adjustments:
  - the live read model ownership audit showed `/api/v1/dispatch` is shaped through `observabilitySurface.ts`, `controlRuntime.ts`, `trackerDispatchPilot.ts`, and `linearDispatchSource.ts`
  - because the current runtime already converged, the only remaining fix should target the fallback paths that can still generate stale identifiers under a specific timing or selected-run mismatch condition
- Data model changes / migrations:
  - none expected unless a stale projection field requires a narrow correction
- External dependencies / integrations:
  - `.runs/local-mcp/cli/control-host/linear-advisory-state.json`
  - `.runs/local-mcp/cli/control-host/provider-intake-state.json`
  - `.runs/local-mcp/cli/control-host/control_endpoint.json`
  - `.runs/local-mcp/cli/control-host/control_auth.json`
  - `.runs/local-mcp/cli/control-host-tmux.log`
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - `orchestrator/src/cli/control/selectedRunPresenter.ts`
  - `orchestrator/src/cli/control/uiDataController.ts`
  - `orchestrator/src/cli/control/observabilitySurface.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/providerIntakeState.ts`
  - `orchestrator/src/cli/control/linearWebhookController.ts`
  - `orchestrator/src/cli/control/linearDispatchSource.ts`
  - `orchestrator/src/cli/controlHostCliShell.ts`

## Validation Plan
- Tests / checks:
  - `docs-review` succeeded at `.runs/1317-coordinator-live-linear-restarted-issue-intake-and-dispatch-consistency/cli/2026-03-22T04-14-00-475Z-008b6375/manifest.json`
  - if code changes are needed: targeted regressions plus the full validation floor required by the user
- Rollout verification:
  - authenticated `/api/v1/dispatch` must agree with persisted advisory and intake state for `CO-1`
  - if a patch lands, one clean live `CO-1` retest must show no `CO-2` identifier leak and correct same-issue handoff state
- Monitoring / alerts:
  - inspect control-host log and current run manifests for unexpected restart-only convergence or stale fallback reuse

## Open Questions
- Did the current merged code from PR `#283` already eliminate the earlier bug, with the control host only needing to accept and rehydrate the pending event?
- Is there any remaining stale fallback path in dispatch shaping beyond `controlRuntime.ts` and `trackerDispatchPilot.ts` that can still leak a prior issue identifier under timing pressure?

## Approvals
- Standalone pre-implementation review: approved before implementation via `docs-review` manifest `.runs/1317-coordinator-live-linear-restarted-issue-intake-and-dispatch-consistency/cli/2026-03-22T04-14-00-475Z-008b6375/manifest.json`.
- Reviewer: `docs-review` succeeded for `1317` at `.runs/1317-coordinator-live-linear-restarted-issue-intake-and-dispatch-consistency/cli/2026-03-22T04-14-00-475Z-008b6375/manifest.json`.
- Date: 2026-03-22
