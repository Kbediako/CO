---
id: 20260319-1304-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix
title: Coordinator Live Linear Tracked-Issue By-Id Query String Contract Fix
relates_to: docs/PRD-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix.md
risk: high
owners:
  - Codex
last_review: 2026-03-19
---

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: Correct the exact Linear tracked-issue-by-id GraphQL query contract from `$issueId: ID!` to `$issueId: String!`, keep the surrounding tracked-issue lookup semantics unchanged, and rerun the live autonomous intake path against `CO-1` and `CO-2`.
- Scope:
  - docs-first registration for the new live bug lane
  - one bounded patch in `linearDispatchSource.ts`
  - focused regression coverage in `LinearDispatchSource.test.ts`
  - rebuild, restart the persistent `control-host`, and rerun live autonomous intake
- Constraints:
  - do not revisit credentials, webhook secret, public ingress, or Telegram setup
  - do not widen provider-authoritative mutations or restart semantics beyond this lookup fix

## Technical Requirements
- Functional requirements:
  - `buildLinearIssueByIdQuery(issueId)` must declare `$issueId: String!`
  - the GraphQL field must remain `issue(id: $issueId)` with the existing selection set
  - `resolveLiveLinearTrackedIssueById(...)` must preserve its current success, scope-mismatch, and not-found behavior after the query contract fix
  - live autonomous intake rerun must attempt to confirm provider claims and child run handoff for the real started issues, and if a new downstream blocker appears after the query fix it must be reported exactly instead of being folded into this contract bug
- Non-functional requirements (performance, reliability, security):
  - preserve fail-closed behavior for malformed or unavailable provider responses
  - keep the diff narrow and directly traceable to the live contract mismatch
  - avoid any secret printing or provider reconfiguration churn during validation
- Interfaces / contracts:
  - Linear GraphQL contract: `issue(id: String!)`
  - local regression contract: the test must assert the query declaration includes `String!`, not just the field usage
  - live validation contract: persistent `control-host` restart plus ledger/child-run evidence

## Architecture & Data
- Architecture / design adjustments:
  - no architecture change; this is a contract correction inside the existing provider lookup helper
  - the persistent host, provider-intake ledger, and handoff services from `1303` remain the same downstream consumers
- Data model changes / migrations:
  - none
- External dependencies / integrations:
  - Linear GraphQL API
  - existing provider env and webhook setup, already verified live

## Validation Plan
- Tests / checks:
  - focused `LinearDispatchSource` regression covering the exact query declaration
  - required repo validation floor after implementation
  - host restart and live intake rerun against `CO-1` and `CO-2`
- Rollout verification:
  - confirm the restarted host accepts the existing provider env
  - confirm provider-intake ledger claims are written after live started-issue intake, or capture the next exact blocker if lookup succeeds but claim/handoff still fails
  - confirm child run manifests appear with `start` or `resume` handoff rather than provider lookup failure whenever no new downstream blocker intervenes
- Monitoring / alerts:
  - watch `provider-intake-state.json`, host log, and new child manifests during the rerun

## Open Questions
- Whether both already-started issues will arrive as separate accepted events quickly enough to validate both `start` and `resume`, or whether the rerun will first prove only the lookup unblock and first claim path.

## Approvals
- Reviewer: Approved via docs-review manifest `.runs/1304-coordinator-live-linear-tracked-issue-by-id-query-string-contract-fix/cli/2026-03-19T11-27-28-598Z-d4b0023c/manifest.json`
- Date: 2026-03-19
