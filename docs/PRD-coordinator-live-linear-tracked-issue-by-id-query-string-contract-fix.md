# PRD - Coordinator Live Linear Tracked-Issue By-Id Query String Contract Fix

## Added by Bootstrap 2025-10-16

## Summary
- Problem Statement: Live autonomous provider intake now reaches the Linear tracked-issue lookup path, but the exact issue-by-id GraphQL query declares `$issueId: ID!` even though Linear's `issue(id: ...)` field expects `String!`. That contract mismatch fails the provider lookup with `dispatch_source_provider_request_failed` before the accepted started issue can be claimed or handed off into a child CO run.
- Desired Outcome: Register a bounded follow-up lane that corrects the Linear query variable type, locks the query shape with focused regression coverage, rebuilds and restarts the persistent `control-host`, then reruns live autonomous intake for `CO-1` and `CO-2` until the provider-intake ledger and child-run handoff confirm the fix or a new downstream blocker is identified exactly.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): Treat the live Linear `issue(id: String!)` mismatch as the next docs-first follow-up lane, fix it surgically, prove it cannot regress with focused test coverage, restart the persistent host, and rerun the real autonomous intake path against already-started `CO-1` and `CO-2`.
- Success criteria / acceptance:
  - new docs-first bug lane exists for this live contract bug
  - `buildLinearIssueByIdQuery(...)` declares `$issueId: String!`
  - focused regression fails if the variable declaration drifts back to `ID!`
  - surrounding Linear scope-validation and tracked-issue normalization behavior remains unchanged
  - `control-host` is rebuilt/restarted on the current provider env
  - live intake rerun either produces provider-intake claims plus child `start` or `resume` handoff for `CO-1` / `CO-2`, or records the next exact downstream blocker after the query fix
- Constraints / non-goals:
  - do not spend time on Telegram, Linear credentials, webhook secret, or public ingress
  - keep the fix bounded to the tracked-issue query contract and its direct regression coverage
  - preserve CO execution authority and the existing 1303 handoff contract

## Goals
- Restore the live provider lookup path by aligning the exact Linear query variable type with the upstream GraphQL contract.
- Add focused regression coverage around the query declaration so future refactors cannot silently reintroduce the mismatch.
- Rebuild, restart, and rerun the live autonomy path against the real started issues already in Linear.

## Non-Goals
- Changing provider intake semantics, claim policy, replay policy, or restart ownership.
- Reworking Telegram behavior or spend time revalidating provider setup that is already known-good.
- Widening Linear mutations beyond the existing live rerun needed to confirm the fix.

## Stakeholders
- Product: CO operator
- Engineering: Codex
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - live `resolveLiveLinearTrackedIssueById(...)` no longer fails on the issue-id contract
  - `provider-intake-state.json` records accepted claims for the live started issues, or the rerun identifies the next exact blocker after lookup succeeds
  - mapped child runs appear as deterministic `start` or `resume` handoffs rather than provider lookup failure whenever no new downstream blocker intervenes
- Guardrails / Error Budgets:
  - keep the code diff narrow and test-backed
  - do not regress the surrounding Linear scope-validation or tracked-issue normalization behavior
  - stop and report if the live rerun exposes a different downstream blocker after the query fix

## User Experience
- Personas: CO operator validating live autonomous intake
- User Journeys:
  - operator sees a live provider failure caused by the query contract
  - follow-up lane patches that contract without reopening unrelated provider setup
  - operator reruns real started issues and sees ledger claims plus child run handoff

## Technical Considerations
- Architectural Notes:
  - the bug is isolated to `orchestrator/src/cli/control/linearDispatchSource.ts` inside `buildLinearIssueByIdQuery(...)`
  - the intended live validation path remains the persistent `codex-orchestrator control-host` plus Linear webhook-driven intake from `CO-1` and `CO-2`
- Dependencies / Integrations:
  - Linear GraphQL `issue(id: String!)`
  - persistent `control-host` tmux session `co-control-host`
  - existing provider-intake ledger and child-run handoff infrastructure from `1303`

## Open Questions
- If the query contract fix succeeds, does the next live blocker sit in provider claim state transition, child discovery, or run launch?

## Approvals
- Product: Self-approved from live operator directive
- Engineering: Approved via docs-review manifest `.runs/1304-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix/cli/2026-03-19T11-27-28-598Z-d4b0023c/manifest.json`
- Design: N/A
