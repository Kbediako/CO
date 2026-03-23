# TECH_SPEC - Coordinator Symphony End-to-End Operational Parity Remediation

## Added by Bootstrap 2026-03-23

## Summary
- Objective: extend CO from the landed `1318` worker-visible Linear helper substrate to full current Symphony end-to-end operational parity, including review feedback handling, merge handoff, final done-state completion, live workflow-state sufficiency, and read-model truthfulness.
- Scope: current Symphony `SPEC.md` requirements, optional `SPEC.md` extensions actually exercised by the current Elixir repo, live-team Linear workflow-state sufficiency, CO runtime/provider/read-model gaps, docs-first registration, and the first implementation sequence needed to close those gaps.
- Constraints:
  - preserve the worker-owned tracker mutation model
  - preserve provider execution-authority and delegation-guard boundaries
  - do not claim parity until code plus live proof demonstrate end-to-end lifecycle ownership

## Technical Requirements
- Functional requirements:
  - keep the current worker-visible Linear helper surface and align the worker/provider lifecycle with the current Symphony runtime boundary: explicit review handoff at `In Review` or `Human Review`, active re-entry through `Rework` and `Merging`, and final `Done`
  - align active execution eligibility to the explicit named active workflow states from current Symphony `WORKFLOW.md` instead of treating arbitrary non-terminal `state_type: started` states as active
  - treat the live CO `Ready` state as the `Todo` equivalent for queue pickup and blocker-aware suppression, so unattended dispatch can still auto-start queued work on the current team workflow
  - implement autonomous PR feedback sweeps and actionable-comment resolution loops before review handoff is considered complete
  - implement merge-handshake behavior equivalent to Symphony's `Merging` / `land` phase and final transition to `Done`
  - keep a single active `## Codex Workpad` comment current across retries and merge handoff, while matching current Symphony `Rework` reset semantics by removing the old workpad and starting a fresh one for each rework attempt
  - implement exact `Rework` reset semantics from current Symphony by closing the prior PR, removing the old workpad, and restarting from a fresh branch instead of continuing the same PR/workpad
  - make `/api/v1/dispatch` internally consistent when no tracked issue or recommendation exists
  - reconcile provider-intake/advisory/read surfaces cleanly when issue completion happens through the new lifecycle
  - keep assignee-stop/reassignment behavior in 1319 scope
  - treat live CO team workflow-state sufficiency as resolved once `Rework` and `Merging` exist alongside `In Review`, with `Ready` handled as the `Todo` queue alias
- Non-functional requirements (performance, reliability, security):
  - preserve current poll/reconcile performance and slot budgeting
  - fail closed on malformed or unavailable tracker/read data
  - keep live Linear mutations scoped to the configured workspace/team/project
  - ensure parity changes are independently testable and live-proofable without broad setup churn
- Interfaces / contracts:
  - base `SPEC.md` scheduler contract remains intact
  - `linear_graphql`-equivalent worker mutation behavior remains an optional extension in spec terms but required for current operational parity
  - review/merge/done lifecycle semantics must be explicit in worker prompts, provider state classification, and read-model shaping

## Architecture & Data
- Architecture / design adjustments:
  - expand the provider worker lifecycle from "active coding only" to "active lifecycle ownership", with distinct handling for:
    - implementation-active states
    - review waiting/observation states
    - review feedback / rework states
    - merge-in-progress states
    - terminal completed/canceled states
  - separate review/merge ownership from the existing dispatch/recommendation read path so `/api/v1/dispatch` remains advisory-only and internally consistent
  - preserve the worker-owned mutation seam via `codex-orchestrator linear ...` and avoid generic orchestrator-owned tracker writes
  - if workflow-state creation is needed, treat it as a one-time live team configuration sync with explicit verification artifacts
- Data model changes / migrations:
  - provider-intake claims may need richer lifecycle reasons for review wait, feedback-required re-entry, merge-in-progress, and terminal closeout
  - provider worker proof/read surfaces may need explicit review/merge lifecycle markers beyond `issue_inactive`
  - dispatch traceability shaping should stop falling back to stale selected-run identifiers when recommendation/tracked issue is absent
  - workflow-state eligibility helpers should be grounded in the named active-state set (`Todo`, `In Progress`, `Rework`, `Merging`) rather than the broader Linear `started` type
  - the worker-visible Linear helper surface needs a bounded workpad-removal operation so `Rework` can retire the old `## Codex Workpad` comment before creating a new one
- External dependencies / integrations:
  - current Symphony source of truth at `/Users/kbediako/Code/symphony` (`HEAD = a164593aacb3db4d6808adc5a87173d906726406`)
  - current live Linear workspace/team/project configured through `CO_LINEAR_*` environment variables and the existing `codex-orchestrator linear` helper

## Current Audit Baseline
- Required by current `SPEC.md`:
  - candidate selection, retry/backoff, reconciliation, startup cleanup, tracker reads, optional observability/read surfaces, optional SSH cap, optional HTTP server/read-only control
  - tracker writes remain agent-owned optional capability rather than required orchestrator API
- Optional in `SPEC.md` but operationalized in current Symphony:
  - `linear_graphql` tool extension
  - worker-owned tracker comments/state transitions/PR metadata
  - human-readable/operator-visible status surfaces
  - optional HTTP server and dashboard
- Current Elixir operational behavior beyond the narrow scheduler baseline:
  - `WORKFLOW.md` requires one persistent workpad comment, PR feedback sweep, `Human Review`, `Merging`, `Rework`, `Done`, an explicit `active_states` list, and a `land` merge loop
  - `README.md` tells adopters that `Rework`, `Human Review`, and `Merging` are non-standard Linear statuses that may need to be added in team workflow settings
  - `tracker.ex` and the Linear adapter expose comment/state writes
  - live E2E requires comment creation and final issue completion through `linear_graphql`
- Broader Elixir/runtime behaviors audited for 1319:
  - assignee-aware routing and stop-on-reassignment
  - startup terminal-workspace cleanup via `before_remove`
  - attached-PR cleanup when a terminal workspace is removed
  - workflow-file reload with last-known-good fallback
  - richer dashboard/API status surfaces
  - follow-up issue creation using `Backlog`, `related`, and `blockedBy`
- Current CO gaps after `1318` / `286`:
  - already-landed parity-critical behavior:
    - worker-visible Linear mutation substrate is present (`issue-context`, `upsert-workpad`, `transition`, `attach-pr`)
    - per-issue worktree confinement is present for provider-launched runs
    - blocker-aware `Todo` suppression is present in `providerLinearWorkflowStates.ts`
    - optional HTTP/read surfaces are already present (`/api/v1/state`, `/api/v1/refresh`, `/api/v1/dispatch`)
  - partially-landed behavior:
    - merge ownership and PR attachment continuity are now provider-owned through the repo-local workflow contract
    - proof/read surfaces now distinguish review handoff from generic inactivity and surface same-assignee review handoffs truthfully in the intake summary
  - fresh dispatch/claim selection is now assignee-aware for viewer-owned or unassigned issues
  - provider worker prompt now points at repo-local `linear` and `land` skills for rework and merge behavior
  - active execution eligibility is still broader than current Symphony because CO falls back to any non-review `state_type: started` state instead of the explicit named active-state set
  - live CO still lacks an explicit queue alias for `Ready`, so queued issues do not yet map cleanly to Symphony's `Todo` pickup behavior
  - current repo-local `Rework` contract still diverges from Symphony by reusing the same PR/workpad instead of closing the PR, removing the workpad, and restarting from a fresh branch
  - no automated follow-up issue creation path
  - no workflow cleanup hook / attached-PR auto-close path
  - no workflow-file hot reload or last-known-good fallback seam
  - stale `/api/v1/dispatch` traceability fallback is fixed
  - live CO team workflow-state gap is now resolved for the core review/merge lifecycle: `In Review` remains the review alias and `Rework` plus `Merging` were added on 2026-03-23; no further live state addition is required if `Ready` is routed as the `Todo` equivalent
  - Phoenix LiveView-specific dashboard presentation is not a CO parity requirement as long as the operator-visible read surfaces remain truthful

## Scope Boundary
- 1319 core implementation:
  - review handoff boundary truthfulness plus `Rework` and `Merging` re-entry
  - explicit active-state-name eligibility parity with current Symphony workflow config
  - live `Ready` queue alias handling for Symphony `Todo` pickup semantics
  - PR feedback sweep / rework re-entry
  - exact `Rework` reset semantics for PR/workpad lifecycle
  - merge loop and final `Done` transition
  - lifecycle-proof/read-model truthfulness
  - assignee-stop/reassignment handling
- Explicit follow-on parity slices after 1319 core:
  - workflow cleanup hook / attached-PR auto-close
  - follow-up issue creation using `Backlog`, `related`, and `blockedBy`
  - workflow-file hot reload / last-known-good fallback

## Validation Plan
- Tests / checks:
  - docs lane: `docs-review`, `npm run docs:check`, `npm run docs:freshness`
  - implementation lane: full validation floor plus `npm run pack:smoke` if downstream-facing control/CLI surfaces change
  - add focused tests for named active-state eligibility, `Ready` queue alias handling, review handoff truthfulness, feedback-triggered re-entry, rework reset/workpad removal, merge-state handling, done-state reconciliation, assignee-gated fresh claim/dispatch selection, and dispatch traceability truthfulness
- Rollout verification:
  - live issue-context capture proving the final CO team workflow-state map
  - live Linear retest that shows one issue progressing through review feedback/merge/done without manual lifecycle rescue
  - live `/api/v1/dispatch` capture showing no stale issue leakage after no issue remains dispatchable
- Monitoring / alerts:
  - provider worker proof end reasons should distinguish review wait, feedback re-entry, merge loop, done completion, and real failures
  - provider-intake/advisory/read surfaces should converge on the same issue identity and lifecycle reason

## Open Questions
- Whether CO should mirror Symphony's `land` skill semantics under a new local skill/surface or reuse existing repo PR automation with strict lifecycle boundaries.
- Whether CO should later add an explicit review watcher/resume seam beyond Symphony's current runtime boundary, while keeping the current parity claim truthful to the existing Elixir implementation.

## Approvals
- Reviewer: Pending `1319` docs-review.
- Date: 2026-03-23
