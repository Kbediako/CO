---
id: 20260322-1318-coordinator-symphony-current-linear-operational-parity
title: Coordinator Symphony Current Linear Operational Parity
relates_to: docs/PRD-coordinator-symphony-current-linear-operational-parity.md
risk: high
owners:
  - Codex
last_review: 2026-03-22
---

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: define the implementation boundary needed for CO to match current Symphony Elixir Linear behavior, not just the narrower base-SPEC scheduler contract. The missing parity today is agent-facing Linear workflow/tool capability and its integration into the provider lifecycle.
- Scope: implement worker-visible Linear mutation capability, workflow prompt/state-map parity, persistent workpad comment behavior, PR/review handoff semantics, and the provider/runtime hooks needed to support those states safely.
- Constraints:
  - keep the base `1310` truthfulness result intact: generic orchestrator-owned tracker writes are still not a mandatory base SPEC requirement
  - plan against the current Symphony Elixir operational contract as the target behavior
  - preserve execution-authority boundaries by keeping ticket mutations worker-owned or provider-owned, not bolted into generic run-finalization
  - keep the first implementation slice narrow: no generic completion write-back, no new provider channels, and no unrelated provider features

## Current Status - 2026-03-22
- `1310` and `1311` correctly classified tracker write ownership as aligned for the narrower base-orchestrator question. The current Symphony `SPEC.md` still says ticket writes are typically handled by the coding agent and that `linear_graphql` is optional.
- Current Symphony Elixir operational behavior is richer than that minimal contract:
  - `README.md` instructs downstream adopters to copy `WORKFLOW.md` plus the `linear` skill and notes that the `linear` skill expects the `linear_graphql` tool
  - `WORKFLOW.md` defines a concrete unattended ticket workflow with persistent workpad comment ownership and explicit state transitions through `In Progress`, `Human Review`, `Merging`, `Rework`, and `Done`
  - `live_e2e_test.exs` explicitly requires the agent to use `linear_graphql` to add a comment and move the issue to a completed state
- Live CO verification adds one more concrete constraint: the current Linear team for `CO-1` exposes `In Review` instead of `Human Review`, so exact Symphony naming is not sufficient as a runtime assumption even though it remains the canonical workflow reference.
- Current CO `main` after PR `#284` remains read-side only for Linear:
  - Linear source code performs GraphQL queries only
  - provider intake/handoff owns local claim/retry/reconcile state only
  - provider worker prompt says to "focus on completing the Linear issue" but does not supply Symphony's workflow contract or a ticket-mutation tool surface
  - generic run completion writes manifest/run-summary state locally and does not invoke any provider write-back path
- Current `1318` branch now lands the planned mutation/runtime surfaces:
  - reusable Linear GraphQL client plus worker-facing Linear workflow facade/CLI
  - provider worker prompt contract with single-workpad, PR attachment, and review-handoff instructions
  - shared workflow-state classification that treats `Human Review` and `In Review` as handoff states while keeping `Merging` and `Rework` active
  - provider-linear-worker proof now records helper-operation attempts/outcomes through an env-gated local audit trail summarized into `provider-linear-worker-proof.json`
  - live closeout still pending: clean validation, worker-path proof on `provider-linear-worker`, PR feedback, and merge
- Chosen implementation boundary for `1318`:
  - add a structured worker-visible Linear helper surface exposed through `codex-orchestrator linear ...`
  - back that helper with the existing Linear GraphQL auth/timeout transport seam instead of a new provider bridge
  - add a shared workflow-state classifier so `Human Review` and the proven live-team alias `In Review` are handoff states while `Merging` and `Rework` stay active
  - keep workpad continuity remote-first by discovering and updating the current `## Codex Workpad` comment from Linear issue context
  - leave generic run completion untouched

## Technical Requirements
- Functional requirements:
  - expose a worker-visible Linear mutation surface for provider-run sessions that is operationally equivalent to current Symphony's `linear_graphql`/Linear-skill path
  - expose the minimum structured operations needed by the workflow:
    - get issue context with current state, team states, comments, and existing attachments
    - create or update the persistent `## Codex Workpad` comment
    - transition the issue by resolving the target `stateId` from the current team states
    - attach a GitHub PR with URL fallback
  - define a provider-worker workflow prompt/contract that mirrors the current Symphony lifecycle:
    - `Todo -> In Progress`
    - single persistent workpad comment
    - PR attachment and feedback sweep
    - `Human Review` or the live-team review alias `In Review`, plus `Merging`, `Rework`, and `Done` semantics
    - unattended execution with blocker-only escape hatch
  - continuation turns and new worker runs must update the same remote workpad artifact instead of posting duplicates
  - extend provider lifecycle semantics so non-active handoff states are interpreted correctly:
    - active continuation states stay eligible
    - handoff states release local ownership without pretending the issue is terminal
    - terminal states still stop and clean up as appropriate
  - surface enough ticket-write outcomes in CO observability/read models so operators can audit what the worker changed in Linear
  - define live validation scenarios that prove end-to-end state/comment behavior against real Linear the way current Symphony's live E2E does
- Non-functional requirements (performance, reliability, security):
  - fail closed when Linear mutation auth/tooling is unavailable; do not invent silent best-effort writes
  - preserve provider execution-authority boundaries and claim/reconcile invariants
  - keep mutation capability narrow enough that worker prompts and tests can reason about it deterministically
  - keep the helper non-interactive and machine-readable so it can be used inside unattended provider worker runs and downstream package installs
- Interfaces / contracts:
  - `SPEC.md` remains the base scheduler authority
  - current Symphony Elixir `WORKFLOW.md`, `README.md`, and `live_e2e_test.exs` define the operational parity target
  - CO `1318` implementation uses a provider-owned mutation facade exposed to the worker through a CLI surface

## Architecture & Data
- Architecture / design adjustments:
  - factor the existing Linear GraphQL request/auth/timeout logic into a reusable client and reuse it from both the read-side dispatcher and the new worker helper facade
  - add a new provider-side Linear workflow facade aligned with worker sessions rather than generic run-finalization
  - expose the facade through a narrow CLI shell so the worker prompt can call deterministic commands from inside the repo
  - refactor `providerLinearWorkerRunner.ts` prompt construction to carry the real workflow contract instead of a thin "complete the issue" instruction
  - add shared provider workflow-state rules for current Symphony workflow states, especially `Human Review` as non-active handoff while `Merging` and `Rework` remain active
  - treat `In Review` as the proven live-team handoff alias for `Human Review` in provider/runtime classification and worker instructions
  - use remote Linear issue context as the durable workpad source of truth; local proof captures the latest workflow and write outcomes for auditability
- Data model changes / migrations:
  - add reusable Linear GraphQL response types and workflow issue-context shapes
  - add explicit state classification helpers for current Symphony workflow states
  - add narrow proof or read-model fields only if needed to surface the latest workflow mutation outcomes
- External dependencies / integrations:
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
  - `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
  - `orchestrator/src/cli/linearCliShell.ts`
  - `orchestrator/src/cli/controlHostCliShell.ts`
  - `bin/codex-orchestrator.ts`

## Validation Plan
- Tests / checks:
  - docs-review for the planning packet
  - `npm run docs:check`
  - `npm run docs:freshness`
  - implementation follow-on must run the full validation floor, plus live Linear proof of comment/state transitions
- Rollout verification:
  - future implementation must prove at least one real Linear ticket can be:
    - moved into the correct active state at kickoff
    - updated through the persistent workpad contract
    - moved into the correct handoff/completed state by the worker
    - kept consistent with CO's provider-intake/read surfaces
  - future live proof must distinguish local child-run success from ticket lifecycle completion in Linear
  - future live proof must run through the `provider-linear-worker` pipeline, not `diagnostics`, so the actual worker mutation path is exercised
- Monitoring / alerts:
  - future observability must record ticket-write attempts/outcomes separately from local run completion
  - future provider lifecycle proof should show behavior when a ticket enters `Human Review` or `In Review`, `Merging`, `Rework`, and terminal states

## Open Questions
- Should CO aim for exact current Symphony state names plus the proven `Human Review`/`In Review` alias by default, or explicit project-specific mapping with a Symphony-compatible preset?
- Is the right initial implementation slice:
  - mutation tool surface first,
  - workflow prompt/state-map parity first,
  - or both together because neither is useful alone?
- How much of the current Symphony workpad contract must land in the first implementation slice to count as real operational parity?

## Approvals
- Standalone pre-implementation review: passed `docs-review` for `1318` in `.runs/1318-coordinator-symphony-current-linear-operational-parity/cli/2026-03-22T08-53-40-103Z-9a43d120/manifest.json`.
- Reviewer: docs-review passed for `1318`.
- Date: 2026-03-22
