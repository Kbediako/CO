# PRD - Coordinator Symphony End-to-End Operational Parity Remediation

## Added by Bootstrap 2026-03-23

## Summary
- Problem Statement: current CO still fell short of current Symphony operational behavior when `1319` opened. The live `CO-2` path proved that the provider worker opened and attached a PR, then stopped at `In Review`, leaving no repo-local contract for `Rework`, `Merging`, merge completion, or final `Done`; `/api/v1/dispatch` also leaked stale `traceability.issue_identifier` values after no issue remained dispatchable. A fresh audit against the current Symphony repo at `a164593aacb3db4d6808adc5a87173d906726406` showed that the real target was narrower than "generic orchestrator write-back" and broader than "just add a done callback": the base `SPEC.md` still treats tracker writes as optional agent-owned capability, while the current Elixir repo operationalizes that capability into a workflow with one persistent workpad comment, explicit review handoff, `Rework`, `Merging`, `Done`, and the `land` merge loop.
- Desired Outcome: open and execute a truthful docs-first remediation lane that closes the remaining end-to-end operational parity gaps against the current Symphony `SPEC.md`, the current Elixir implementation, and the current repo-local workflow/skill guidance. This includes worker/runtime behavior, Linear workflow-state coverage, PR feedback and merge ownership, observability/read-model truthfulness, and any missing live team workflow statuses needed to support the intended lifecycle.
- Current Outcome Target: this lane now starts as the new authoritative parity packet for implementation. It must preserve the already-correct base scheduler truths from `1310` and the landed provider/helper substrate from `1318`, while extending CO to the actual current Symphony workflow loop. Where Symphony `SPEC.md` marks an item optional but the current Elixir repo operationalizes it, this lane treats the Elixir behavior as the current parity target and records the distinction explicitly.
- Additional Audit Truth: the broadened Elixir audit is narrower than "everything after `1318` is still missing." CO already covered some formerly suspected gaps, including blocker-aware `Todo` suppression and the optional read-only state/refresh surfaces. The concrete `1319` delta was: missing `Rework` / `Merging` live workflow states, missing repo-local workflow and land-skill contract for rework and merge, no assignee-aware fresh dispatch/claim gating, stale `/api/v1/dispatch` traceability fallback, one provider-intake handoff summary edge that still surfaced a same-assignee review handoff as `handoff_failed`, one routing mismatch where CO treated arbitrary non-review `state_type: started` states as active instead of honoring the explicit active-state names that current Symphony configures in `WORKFLOW.md`, one live-team queue mismatch where CO still exposed `Ready` instead of a routed `Todo` equivalent, and one remaining workflow-contract mismatch where CO treated `Rework` as same-PR/same-workpad continuation while current Symphony resets the approach by closing the old PR, removing the old workpad, and restarting from a fresh branch.
- Live Workflow-State Decision: on 2026-03-23 the CO Linear team was updated to add `Rework` and `Merging` as started states. `Human Review` was intentionally not added because the live team already uses `In Review` as the review-handoff alias; keeping both names would create avoidable operator drift instead of closer parity. No further live team status additions are required if `Ready` is handled as the CO queue alias for Symphony `Todo`.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): open a new docs-first remediation that truthfully audits CO against the current Symphony `SPEC.md` including optional items and the current Elixir codebase, identifies anything still missed, and then drives the next end-to-end delivery as the top-level orchestrator. Also determine whether live Linear workflow status items need to be added and do that if safely possible.
- Success criteria / acceptance:
  - the new lane separates base `SPEC.md` requirements, optional `SPEC.md` features that current Symphony actually uses, Elixir-only operational behaviors, and CO-specific divergences
  - the packet explicitly captures the real remaining gaps after `1318`/`286`, including stop-at-review behavior, PR feedback/merge/done ownership, stale dispatch traceability, and any stale intake/advisory bookkeeping
  - active execution eligibility is aligned to the explicit named workflow states that current Symphony configures, with the live CO `Ready` queue state treated as the `Todo` equivalent instead of the broader Linear `state_type: started` bucket
  - the packet states whether live Linear workflow statuses are missing and whether they can be safely added from this session
  - task registration, mirrors, task snapshot, and docs freshness are updated for the new lane
  - docs-review is recorded before runtime/code implementation starts
  - implementation sequencing is broken into the smallest coherent slices instead of another broad parity claim
- Constraints / non-goals:
  - do not re-open already-landed Symphony scheduler slices unless the current audit finds a concrete regression or a previous claim was materially incorrect
  - do not weaken delegation guard, provider boundaries, or auth setup
  - do not silently mutate live Linear workflow configuration without first confirming the exact missing states and that the mutation path is safe

## Goals
- Rebaseline the current parity target truthfully against:
  - current Symphony `SPEC.md`
  - current Symphony Elixir `WORKFLOW.md`, `README.md`, and implementation
  - current CO runtime, provider, and read-model behavior
- Close the remaining end-to-end lifecycle gap:
  - `Todo` or equivalent queued states
  - `In Progress`
  - review handoff boundary (`Human Review` or live-team `In Review`)
  - review-feedback return path through `Rework`
  - merge ownership through `Merging` and the land loop
  - final terminal state (`Done`)
- Keep exactly one active remote workpad comment as the progress source of truth, including replacing the old workpad during a Symphony-style `Rework` reset.
- Add or confirm any missing live Linear workflow states needed for the CO team to support the intended lifecycle.
- Fix the stale dispatch/read-model mismatch so `/api/v1/dispatch` is internally consistent after no issue remains dispatchable.
- Align active execution eligibility to the explicit named workflow states from current Symphony (`Todo`, `In Progress`, `Rework`, `Merging`), with CO's live `Ready` state treated as the `Todo` equivalent instead of accepting arbitrary non-terminal `started` states.
- Tighten PR/merge review discipline so parity closeout claims are based on terminal review state, not partial bot feedback.

## Non-Goals
- Claiming that the Symphony base `SPEC.md` now mandates orchestrator-owned tracker writes.
- Replacing the current worker-owned mutation approach with a generic orchestrator completion hook.
- Reworking Telegram, Tailscale, Funnel, webhook setup, or other external setup paths already known-good.
- Shipping unrelated frontend/dashboard redesigns beyond parity-critical observability truthfulness.

## Stakeholders
- Product: CO operator
- Engineering: Codex
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - the `1319` packet documents all remaining parity gaps with direct evidence from current Symphony and current CO
  - live CO workflow can progress through the Symphony runtime boundary truthfully: review handoff at `In Review` or `Human Review`, active re-entry through `Rework`, merge shepherding in `Merging`, and final `Done`, with no stale identity leakage or misrouted fresh claims
  - `/api/v1/dispatch` no longer leaks stale issue identifiers when no tracked issue or recommendation exists
  - live team workflow states are either fully sufficient for the intended lifecycle or are explicitly brought into parity and recorded
- Guardrails / Error Budgets:
  - preserve the separation between scheduler-owned orchestration and worker-owned tracker mutation
  - do not overstate parity based on docs/prompts alone when code or live evidence disagree
  - keep implementation slices narrow enough to validate and review independently
  - treat live Linear workflow-state mutations as operational changes that require exact evidence and safe verification

## User Experience
- Personas:
  - CO operator expecting Symphony-style unattended issue completion and PR closeout
  - follow-on implementer who needs a truthful map of what is still missing after `1318`
  - reviewer/operator auditing whether a parity claim is backed by real runtime behavior
- User Journeys:
  - a Linear issue enters the active workflow, receives a persistent workpad comment, moves through implementation, review handoff, rework or merge re-entry, and completion with the same repo-local workflow contract that Symphony uses
  - if PR feedback arrives and the issue moves to `Rework`, CO closes the prior PR, removes the old workpad, restarts from a fresh branch, and then works the same issue back to review under a fresh workpad
  - if no issue remains dispatchable, the read-only dispatch surface reports that state consistently without stale issue leakage

## Technical Considerations
- Architectural Notes:
  - base Symphony `SPEC.md` remains scheduler-first and marks tracker writes plus `linear_graphql` as optional extensions
  - current Symphony Elixir operationalizes those optional capabilities through `WORKFLOW.md`, the repo-local `linear` skill, tracker write APIs, and the `land` merge loop; that operational layer is now the real parity target for CO
  - current CO already has the worker-visible Linear mutation substrate (`issue-context`, `upsert-workpad`, `transition`, `attach-pr`) and per-issue worktree confinement, so 1319 should build on that substrate rather than reintroduce it; exact `Rework` parity adds one bounded workpad-removal helper on top
  - current CO has the worker-visible Linear helper substrate from `1318`, and current Symphony runtime truth still keeps review as a handoff boundary rather than a continuously running worker state
  - current CO already includes blocker-aware `Todo` suppression and the optional read-only `/api/v1/state`, `/api/v1/refresh`, and `/api/v1/dispatch` surfaces, so 1319 should not reopen those without a concrete regression
  - current CO proof/read surfaces already expose workpad and run metadata, but later lifecycle phases still collapse into coarse `issue_inactive` / generic claim reasons, which is insufficient for truthful end-to-end operator visibility
  - current CO live team workflow now exposes `In Review` as the review-handoff alias alongside `Rework`, `Merging`, and `Done`, but it still uses `Ready` rather than `Todo` for the queued state
  - current CO still uses a generic `state_type: started` fallback for active execution eligibility, which is broader than current Symphony's explicit `active_states` contract and can pull in unintended started states such as `Blocked`; after removing that fallback, CO still needs an explicit `Ready` -> `Todo` queue alias to keep unattended queue pickup parity
  - current CO keeps follow-up issue creation, workflow cleanup hooks with attached-PR cleanup, and workflow-file hot reload/last-known-good fallback outside 1319 core
  - live session capability is sufficient to read and mutate Linear issue content; live team workflow-state creation appears technically possible through current GraphQL auth, but should only be done with exact scoped mutations and verification
  - dispatch traceability leakage is a separate read-model bug caused by a broader fallback chain than the actual recommendation payload
- Dependencies / Integrations:
  - `/Users/kbediako/Code/symphony/SPEC.md`
  - `/Users/kbediako/Code/symphony/elixir/README.md`
  - `/Users/kbediako/Code/symphony/elixir/WORKFLOW.md`
  - `/Users/kbediako/Code/symphony/.codex/skills/linear/SKILL.md`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/tracker.ex`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/linear/adapter.ex`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex`
  - `/Users/kbediako/Code/symphony/elixir/test/symphony_elixir/live_e2e_test.exs`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/providerLinearWorkflowStates.ts`
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - `orchestrator/src/cli/control/observabilitySurface.ts`
  - `orchestrator/src/cli/control/observabilityApiController.ts`
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
  - `orchestrator/src/cli/linearCliShell.ts`

## Open Questions
- Should CO implement a dedicated merge-loop skill equivalent to Symphony's `land` skill, or adapt the existing PR/merge automation under a different local surface while preserving the same lifecycle semantics?
- 1319 scope boundary for broader Elixir-only behaviors:
  - keep in 1319 core: review handoff boundary truthfulness, PR feedback sweep contract, merge loop, `Done` transition, lifecycle-proof/read-model truthfulness, and assignee-stop/reassignment handling
  - explicit follow-on parity slices after 1319 core: workflow cleanup / attached-PR auto-close, follow-up issue creation, workflow-file hot reload / last-known-good fallback

## Approvals
- Product: Self-approved on 2026-03-23 for a truthful remediation lane covering the remaining end-to-end parity gaps and live Linear workflow-state audit.
- Engineering: Self-approved on 2026-03-23 against current Symphony `SPEC.md`, current Symphony Elixir `WORKFLOW.md`/implementation, current live Linear team workflow evidence, and current CO runtime behavior.
- Design: N/A
