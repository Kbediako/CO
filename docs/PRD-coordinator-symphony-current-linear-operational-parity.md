# PRD - Coordinator Symphony Current Linear Operational Parity

## Added by Bootstrap 2026-03-22

## Summary
- Problem Statement: live CO monitoring on March 22, 2026 showed a succeeded `CO-1` child run while the Linear issue itself remained `In Progress`. The earlier `1310` truthfulness rebaseline was still correct about the base Symphony SPEC: tracker writes are not a required orchestrator-owned contract. But the current Symphony Elixir repo has moved beyond that minimal scheduler boundary operationally. Its `WORKFLOW.md`, `README.md`, `linear_graphql` dynamic tool, repo-local `linear` skill, and live E2E test expect the unattended coding agent to mutate Linear directly: keep one persistent workpad comment current, move tickets through `Todo -> In Progress -> Human Review -> Merging -> Done`, attach PR metadata, and verify the issue reaches the expected handoff state. The live CO team now proves an operational nuance on top of that baseline: it exposes `In Review` instead of `Human Review`, so CO must honor the team's real review-state name while preserving the Symphony workflow contract. CO today still implements a read-only Linear provider lifecycle: webhook/poll intake, local claim/retry/reconcile state, and local child-run continuation, but no worker-visible Linear mutation surface and no Symphony-style workflow contract for ticket updates.
- Desired Outcome: open a truthful docs-first implementation lane that aligns CO with current Symphony operational Linear behavior across the full ticket lifecycle, while preserving the base scheduler boundary. The implementation target is not a generic orchestrator-owned "flip to Done on success" shortcut; it is worker-owned Linear workflow parity backed by explicit tooling, prompts, lifecycle rules, and live proof.
- Current Outcome Target: this lane now proceeds through implementation. The chosen architecture is a worker-owned Linear helper surface plus provider workflow-state parity, not generic run-finalization write-back. Remote Linear issue context remains the durable source of truth for workpad continuity; CO persists the narrow workflow/read proof needed for auditing and live validation, including helper-operation attempt/outcome auditability in `provider-linear-worker-proof.json`. Live proof for this lane must run through the `provider-linear-worker` pipeline, not `diagnostics`, so the worker mutation path is exercised end to end. The current branch already contains the worker-visible Linear CLI/facade, workflow-state classifier, prompt/workpad contract, provider handoff handling, and helper-operation proof trail; the remaining closeout work is clean validation, live proof, PR feedback, and merge.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): re-open the Symphony parity plan because current CO behavior is still not aligned with the actual Symphony Elixir implementation. Specifically, CO should auto-update Linear in the way Symphony currently does, and the next step should be a docs-first, across-the-board plan created with delegated audits against the real Elixir code rather than assumptions.
- Success criteria / acceptance:
  - the new lane distinguishes base Symphony SPEC parity from current Symphony Elixir operational parity
  - the plan states plainly that current Symphony write-back is agent-owned via workflow/tooling, not generic orchestrator post-processing
  - the plan identifies the concrete missing CO surfaces: Linear mutation capability, worker workflow prompt contract, workpad/status/PR handoff behavior, and provider lifecycle alignment for those states
  - the plan records the live-team `In Review` alias truthfully instead of pretending `Human Review` is universal
  - the implementation uses a narrow worker-visible Linear helper surface rather than bolting provider writes into generic completion
  - task registration, mirrors, and docs freshness are updated for the new lane
  - docs-review is run for the new planning packet before any runtime implementation work
- Constraints / non-goals:
  - do not pretend that `1310` was wrong about the base SPEC; it was correct for the narrower orchestrator-core question
- do not collapse the design into a single hard-coded `succeeded -> Done` rule without matching the actual Symphony workflow
  - do not redo provider setup, Telegram, Tailscale, Funnel, or secrets as part of this planning turn

## Goals
- Re-state the parity target truthfully as "current Symphony operational Linear parity" rather than only "base scheduler parity".
- Plan the missing CO capabilities required to match the current Symphony Elixir workflow:
  - worker-visible Linear mutation capability
  - explicit workflow prompt/status contract
  - persistent workpad comment ownership
  - PR attachment/review/handoff state handling
  - provider lifecycle behavior that understands those handoff states
- Capture the live-team review-state nuance explicitly: current CO live proof must treat `In Review` as the team's review handoff alias for Symphony's `Human Review`.
- Keep scheduler authority and provider reconciliation boundaries explicit so new ticket-mutation capability does not turn into generic uncontrolled write-back.
- Leave the repo with a registered, review-backed implementation that can be validated locally and against live Linear.

## Non-Goals
- Claiming the Symphony base SPEC now mandates orchestrator-owned tracker writes.
- Re-opening unrelated parity slices that are already landed and not relevant to Linear operational behavior.
- Replacing the existing provider intake/read-model stack with a new architecture before a narrower implementation plan is approved.

## Stakeholders
- Product: CO operator
- Engineering: Codex
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - the docs packet explicitly captures the current Symphony Elixir Linear workflow contract and CO's current mismatch
  - the planned implementation boundary is worker-owned Linear mutation parity, not an unscoped orchestrator write-back shortcut
  - the task registry, checklist, `.agent` mirror, and docs freshness registry are all synchronized for the new lane
  - docs-review passes for the new packet
- Guardrails / Error Budgets:
  - do not overcorrect from the user-observed symptom into a false claim that Symphony uses orchestrator-owned completion write-back
  - do not under-scope the problem to one post-run state flip when the Elixir workflow also includes workpad comments, PR linkage, review states, and merge flow
  - keep provider execution authority and reconciliation logic separate from worker-issued ticket mutations

## User Experience
- Personas:
  - CO operator who wants `CO-1`-style runs to update Linear the way current Symphony does
  - follow-on implementer who needs a truthful map of what changed between the base SPEC and the current Elixir operational model
- User Journeys:
  - the operator can read the new packet and see why a succeeded local child run is not enough for current Symphony-style parity
  - the implementer can follow the milestone plan to add Linear workflow/tool parity without reopening already-settled scheduler truths
  - reviewers can verify that future implementation work targets the real operational delta rather than a speculative shortcut

## Technical Considerations
- Architectural Notes:
  - current Symphony has a two-layer truth:
    - the base `SPEC.md` still treats tracker writes as optional and agent-owned
    - the current Elixir workflow/README/live E2E operationalize that optionality into a concrete unattended agent contract using `linear_graphql` or the repo-local `linear` skill
  - CO currently matches the read-side/provider-host portion of that design but stops before the agent-facing Linear workflow layer
  - the parity gap is therefore broader than "no completion write-back": CO lacks the mutation tool surface, the workflow prompt, the status map, the persistent workpad contract, and the provider-side understanding of those handoff states
  - the chosen implementation sits adjacent to the provider worker/runtime path rather than generic run-finalization, because Symphony's own operational behavior keeps ticket mutation in the agent workflow
  - the worker-visible mutation surface is a structured CO Linear helper CLI/facade backed by the existing GraphQL auth/timeout seam, not a generic orchestrator callback
  - workpad continuity is remote-first: the helper discovers and updates the existing `## Codex Workpad` comment from Linear issue context instead of introducing a new local source of truth
  - live validation must use the control-host's `provider-linear-worker` pipeline so the helper/prompt/write path is the one under test
- Dependencies / Integrations:
  - `/Users/kbediako/Code/symphony/SPEC.md`
  - `/Users/kbediako/Code/symphony/elixir/README.md`
  - `/Users/kbediako/Code/symphony/elixir/WORKFLOW.md`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/codex/dynamic_tool.ex`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/tracker.ex`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/linear/adapter.ex`
  - `/Users/kbediako/Code/symphony/elixir/test/symphony_elixir/live_e2e_test.exs`
  - `/Users/kbediako/Code/symphony/.codex/skills/linear/SKILL.md`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/control/linearDispatchSource.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/providerIntakeState.ts`
  - `orchestrator/src/cli/controlHostCliShell.ts`
  - `orchestrator/src/cli/services/orchestratorExecutionLifecycle.ts`
  - `orchestrator/src/cli/services/orchestratorRunLifecycleCompletion.ts`

## Open Questions
- Beyond the immediate `Human Review`/`In Review` parity alias, should CO support explicit configurable mapping onto arbitrary target-team workflow names?
- Should the first slice stop at the proven `Human Review`/`In Review` handoff alias, or immediately add explicit mapping for teams whose Linear workflow names differ more broadly?
- What minimum mutation set is required for "across the board" parity in CO:
  - state transitions only,
  - state transitions plus workpad comment ownership,
  - or the full comment/attachment/PR/review flow from the current Symphony workflow?

## Approvals
- Product: Self-approved for an implementation lane that re-opens current Symphony operational alignment truthfully and preserves the worker-owned mutation boundary.
- Engineering: Self-approved on 2026-03-22 against the current Symphony SPEC, current Symphony Elixir workflow/tooling, and current CO provider-worker boundary.
- Design: N/A
