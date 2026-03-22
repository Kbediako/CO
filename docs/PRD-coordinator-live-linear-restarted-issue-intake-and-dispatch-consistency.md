# PRD - Coordinator Live Linear Restarted-Issue Intake and Dispatch Consistency

## Added by Bootstrap 2026-03-22

## Summary
- Problem Statement: the post-PR-283 live Linear follow-up reported a parity symptom on March 22, 2026: `/api/v1/dispatch` resolved the live tracked issue as `CO-1` while `recommendation.issue_identifier` and `traceability.issue_identifier` leaked stale `CO-2`. The same report also claimed persisted intake state still reflected the earlier `Triage` update after `CO-1` returned to `In Progress`. Parent recheck on current `main` at `2026-03-22T04:05:10.980Z` no longer reproduces the persisted-intake lag or the mismatched dispatch payload: `linear-advisory-state.json` tracks `CO-1` in `In Progress`, `provider-intake-state.json` shows `CO-1` as `running` with fresh run `2026-03-22T04-01-03-150Z-d6d1d049`, and `/api/v1/dispatch` is internally consistent with `CO-1` in all three fields. The repo-side bug that still remains on current code is narrower: dispatch evaluation can fall back to the stale selected-run issue identifier even when the live Linear advisory has already resolved a different tracked issue.
- Desired Outcome: fix only the stale dispatch identifier fallback, keep provider-intake and execution-authority boundaries unchanged, validate the narrow patch, and prove that the live control surfaces stay internally consistent for `CO-1` without inventing a separate intake replay fix that current evidence does not support.
- Current Outcome Target: after restarting the local control host on rebuilt `dist/`, `CO-1` should remain the live tracked issue across persisted advisory state, persisted intake state, and authenticated `/api/v1/dispatch` without any `CO-2` identifier leakage or required manual state flip.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): open a fresh docs-first lane for the live Linear parity follow-up, confirm the reported bug against the current control-host evidence first, use subagents early, isolate whether the stale intake and stale dispatch identifiers come from one projection bug or two separate bugs, and only patch code if the current repo still needs it.
- Success criteria / acceptance:
  - the lane records the handoff symptom and the current live recheck separately and truthfully
  - the current persisted advisory/intake state and authenticated `/api/v1/dispatch` payload are inspected before any implementation change
  - the code-path audit identifies the exact ownership of `tracked_issue`, `recommendation.issue_identifier`, and `traceability.issue_identifier`
  - the root cause classification is explicit: the currently verified bug is stale dispatch response shaping, not a currently reproduced intake replay failure
  - the smallest correct fix is implemented without widening provider features or weakening delegation guard
  - one clean live `CO-1` retest is run only after a fix is ready, or the no-op result explains why no new flip is needed
- Constraints / non-goals:
  - do not redo Telegram, Linear, Tailscale, webhook, or secret setup
  - do not ask the operator to flip `CO-1` again until a repo-side fix is ready or the no-op result is certain
  - do not weaken provider-intake or execution-authority boundaries
  - do not widen scope into new provider features or unrelated control-host behavior

## Goals
- Reproduce or falsify the reported parity symptom against the current live control-host surfaces before changing code.
- Determine whether the stale intake symptom and stale dispatch identifiers are one underlying projection/rehydration issue or separate bugs.
- Implement the smallest correct fix for the verified stale dispatch identifier fallback.
- Preserve a truthful end state: merged fix plus live retest for the dispatch leak, while explicitly recording that the persisted-intake replay symptom is not currently reproduced on `main`.

## Non-Goals
- Rebuilding provider setup, webhook ingress, Telegram, Tailscale Funnel, or secrets.
- Adding new provider capabilities, tracker write-back behavior, or broader UI features.
- Reopening unrelated parity slices that were already merged through `1316`.

## Stakeholders
- Product: CO operator
- Engineering: Codex
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - current live evidence is captured before any code edit
  - root cause classification is explicit: intake replay, dispatch shaping, or one underlying projection bug
  - no `CO-2` identifier leak remains when `CO-1` is the live tracked issue
  - persisted intake state truthfully reflects the restarted `CO-1` after the final verified flow
- Guardrails / Error Budgets:
  - do not patch based only on historical evidence if the current merged runtime no longer reproduces the bug
  - do not hide a stale-runtime or restart-only explanation by claiming a code fix without proof
  - keep live validation bounded to one clean retest after the implementation decision is made

## User Experience
- Personas:
  - CO operator validating live Linear parity after PR `#283`
  - follow-on implementer or reviewer auditing whether a new repo-side fix was actually required
- User Journeys:
  - the operator can see whether the earlier live mismatch is still present on current `main`
  - if a bug remains, the operator gets one final bounded retest after the fix lands
  - if the current merged code already resolves the issue, the operator gets a no-op verification result instead of another unnecessary flip

## Technical Considerations
- Architectural Notes:
  - the handoff symptom spans both persisted intake state and `/api/v1/dispatch`, so the likely ownership surfaces are `providerIntakeState`, `providerIssueHandoff`, `linearWebhookController`, `linearDispatchSource`, `selectedRunProjection`, `selectedRunPresenter`, `uiDataController`, and `observabilitySurface`
  - current live recheck shows the merged code plus live rehydration already converged for persisted intake: advisory state accepted the `CO-1` delivery at `2026-03-22T04:01:03.255Z`, provider-intake state rehydrated `CO-1` as `running` at `2026-03-22T04:01:04.257Z`, and `/api/v1/dispatch` is internally consistent at `2026-03-22T04:05:10.980Z`
  - the code-path audit found the remaining latent bug in dispatch shaping: `evaluateTrackerDispatchPilotAsync()` could emit `recommendation.issue_identifier` from `defaultIssueIdentifier`, and `createControlRuntimeSnapshot().readDispatchEvaluation()` could surface that stale selected-run issue identifier outward even when `recommendation.tracked_issue.identifier` had already changed
- Dependencies / Integrations:
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

## Open Questions
- Did the earlier operator-observed mismatch happen before the control host had fully rehydrated the restarted `CO-1` run on merged `main`, leaving the stale dispatch fallback as the only remaining repo-side defect?
- Is one final operator flip still necessary, or can the current live `CO-1` state plus the targeted regression coverage close the lane truthfully without another forced transition?

## Approvals
- Product: Self-approved for a bounded audit-plus-fix-if-needed lane that preserves live verification discipline.
- Engineering: Self-approved on 2026-03-22 against the reported handoff evidence and the current `main` recheck.
- Design: N/A
