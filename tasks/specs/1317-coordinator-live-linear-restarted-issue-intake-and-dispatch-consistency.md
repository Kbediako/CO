---
id: 20260322-1317-coordinator-live-linear-restarted-issue-intake-and-dispatch-consistency
title: Coordinator Live Linear Restarted-Issue Intake and Dispatch Consistency
status: in_progress
owner: Codex
created: 2026-03-22
last_review: 2026-03-22
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-coordinator-live-linear-restarted-issue-intake-and-dispatch-consistency.md
related_action_plan: docs/ACTION_PLAN-coordinator-live-linear-restarted-issue-intake-and-dispatch-consistency.md
related_tasks:
  - tasks/tasks-1317-coordinator-live-linear-restarted-issue-intake-and-dispatch-consistency.md
review_notes:
  - 2026-03-22: Opened as the first truthful post-PR-283 live Linear follow-up lane. The handoff reported a real parity symptom on `CO-1`: persisted intake state lagged a restarted issue while `/api/v1/dispatch` leaked `CO-2` in `recommendation` and `traceability`.
  - 2026-03-22: Parent recheck on current `main` at `2026-03-22T04:05:10.980Z` no longer reproduces the mismatch. `linear-advisory-state.json` tracks `CO-1` in `In Progress`, `provider-intake-state.json` rehydrates `CO-1` as `running` with run `2026-03-22T04-01-03-150Z-d6d1d049`, and `/api/v1/dispatch` returns `CO-1` consistently for `tracked_issue`, `recommendation.issue_identifier`, and `traceability.issue_identifier`.
  - 2026-03-22: Code-path audit confirmed a latent dispatch-shaping bug even though the current live runtime had already converged. `evaluateTrackerDispatchPilotAsync()` could keep `recommendation.issue_identifier` on the stale selected-run default instead of the live tracked issue, and `createControlRuntimeSnapshot().readDispatchEvaluation()` could propagate that stale identifier to outward traceability. The current live persisted-intake replay symptom is not reproduced.
  - 2026-03-22: `docs-review` succeeded at `.runs/1317-coordinator-live-linear-restarted-issue-intake-and-dispatch-consistency/cli/2026-03-22T04-14-00-475Z-008b6375/manifest.json`; implementation remains bounded to the stale dispatch fallback path only.
  - 2026-03-22: After the patch and full validation floor, the local control host was restarted on rebuilt `dist/`. The restarted host rehydrated `CO-1` into fresh run `2026-03-22T04-46-30-471Z-ba4c6122`, `/api/v1/dispatch` stayed internally consistent on `http://127.0.0.1:63303`, and no final operator Linear flip was needed.
---

# Technical Specification

## Context

The reported live parity symptom cut across two surfaces: persisted provider-intake state and `/api/v1/dispatch`. The starting claim was that `CO-1` returned to `In Progress`, a fresh webhook was accepted, but persisted intake state remained stuck on the earlier `Triage` update while dispatch metadata leaked `CO-2`. Current live recheck on merged `main` no longer shows that mismatch. This lane exists to determine whether there is still a latent repo-side bug on current code or whether the merged code plus live rehydration already resolved it.

## Requirements

1. Confirm the current live state from persisted advisory/intake files plus an authenticated `/api/v1/dispatch` query before changing code.
2. Audit the code paths that shape `tracked_issue`, `recommendation.issue_identifier`, and `traceability.issue_identifier` so any divergence is tied to specific functions.
3. Determine whether the earlier symptom is:
   - a same-issue continuation or replay bug in persisted intake state,
   - a separate stale dispatch-response shaping bug,
   - or one underlying projection/rehydration bug causing both.
4. If a current code bug remains, implement only the smallest fix needed inside existing provider-intake and execution-authority boundaries.
5. Do not widen the provider feature set, weaken delegation guard, or redo setup.
6. After any code fix, rerun validation and one clean live `CO-1` retest before claiming closure.
7. If the current merged code already resolves the issue, stop with a truthful no-op result instead of forcing a patch.

## Current Truth

- Reported handoff symptom:
  - `CO-1` returned `In Progress -> Triage -> In Progress`
  - a fresh webhook event for `CO-1` was reportedly accepted
  - persisted intake state was said to remain `issue_state: Triage`, `issue_state_type: unstarted`, `state: ignored`, `reason: provider_issue_state_not_started`
  - `/api/v1/dispatch` reportedly showed `tracked_issue = CO-1` but `recommendation.issue_identifier = CO-2` and `traceability.issue_identifier = CO-2`
- Current parent recheck on `main`:
  - `.runs/local-mcp/cli/control-host/linear-advisory-state.json` now records accepted delivery `2200cb9a-11dc-4d00-a63d-5150777829f4` for `CO-1`, with `tracked_issue.state = In Progress`
  - `.runs/local-mcp/cli/control-host/provider-intake-state.json` now shows `CO-1` as `running` with reason `provider_issue_rehydrated_active_run` and run `2026-03-22T04-01-03-150Z-d6d1d049`
  - authenticated `/api/v1/dispatch` at `2026-03-22T04:05:10.980Z` returns `CO-1` consistently for `recommendation.issue_identifier`, `traceability.issue_identifier`, and `recommendation.tracked_issue.identifier`
  - the fresh `CO-1` run manifest exists at `.runs/linear-8c4a8de9-45b2-40ef-b295-bd37a21d1155/cli/2026-03-22T04-01-03-150Z-d6d1d049/manifest.json`
- Current classification after the code-path audit:
  - persisted-intake replay for `CO-1` is not currently reproduced on merged `main`
  - a latent stale dispatch-response shaping bug did remain in current code
  - the bug surface is limited to dispatch identifier fallback, not provider-intake claim authority
- Exact fix surface:
  - `orchestrator/src/cli/control/trackerDispatchPilot.ts`: `evaluateTrackerDispatchPilotAsync()` must prefer `liveResolution.tracked_issue.identifier` over `defaultIssueIdentifier`
  - `orchestrator/src/cli/control/controlRuntime.ts`: `createControlRuntimeSnapshot().readDispatchEvaluation()` must report the live tracked issue identifier first when shaping the outward dispatch response

## Validation Plan

- Docs-first registration plus docs-review before implementation.
- Read-only audit streams:
  - live evidence/contract audit against persisted files and `/api/v1/dispatch`
  - dispatch response-shaping code-path audit
- If code changes are required:
  - targeted regressions for the stale projection/dispatch path
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
  - `npm run pack:smoke` if downstream-facing `/api/v1/dispatch`, selected-run, or control/UI shaping paths are touched
- Live verification:
  - rediscover endpoint from `control_endpoint.json`
  - query authenticated `/api/v1/dispatch`
  - prove that persisted intake, same-issue handoff state, and dispatch identifiers agree for `CO-1`
