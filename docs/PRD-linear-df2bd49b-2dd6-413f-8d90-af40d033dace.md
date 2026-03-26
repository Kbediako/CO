# PRD - CO Tighten Symphony-style Linear Workpad Structure and Milestone Refresh Contract

## Added by Bootstrap 2026-03-26

## Traceability
- Linear issue: `CO-21` / `df2bd49b-2dd6-413f-8d90-af40d033dace`
- Linear URL: https://linear.app/asabeko/issue/CO-21/co-tighten-symphony-style-linear-workpad-structure-and-milestone

## Summary
- Problem Statement: current CO already owns the core Symphony-style Linear lifecycle pieces: one persistent workpad comment, review-handoff state aliases, PR attachment, `Rework`, and `Merging`. The remaining gap is narrower and more operator-facing. The helper surface still validates only the `## Codex Workpad` marker, and the worker prompt plus repo-local `linear` skill only require coarse refresh points. That leaves body shape and refresh timing too free-form, so workpads can vary by lane or phase rather than acting as a stable progress surface.
- Desired Outcome: CO's Linear workpad contract becomes strict enough to preserve one durable human-readable progress surface with canonical sections, milestone-driven refreshes, mirrored ticket-provided validation requirements when present, and same-comment final closeout rather than extra summary comments.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): complete Linear issue `CO-21` by tightening CO's Symphony-style Linear workpad contract in the current workspace, with docs-first evidence, focused runtime enforcement, and tests that prove the workpad stays truthful from bootstrap through review and terminal closeout.
- Success criteria / acceptance:
  - worker prompt plus repo-local `linear` skill explicitly define the stronger workpad structure and refresh timing
  - runtime/helper validation rejects malformed workpad bodies instead of allowing marker-only drift
  - ticket-provided `Validation`, `Test Plan`, or `Testing` requirements are mirrored into the workpad contract when present
  - focused provider/runtime tests cover bootstrap creation, milestone refresh, and final or review-handoff refresh expectations
  - resulting workpads remain truthful across bootstrap, active implementation, review handoff, merge, and terminal closeout without extra summary comments
- Constraints / non-goals:
  - keep PR attachment behavior separate from the workpad body unless upstream evidence says otherwise
  - do not change Linear state semantics or the existing `Human Review` / `In Review` alias handling
  - avoid a cosmetic markdown clone of Symphony; match the operational contract instead
  - delegation must be recorded as an explicit override in this worker run because spawned subagents are unavailable in-session

## Goals
- Define a canonical workpad body contract beyond the marker-only rule.
- Require stable core sections for environment/workspace stamp, plan, acceptance criteria, validation, and notes.
- Tighten refresh timing so the same workpad is updated after meaningful milestones and immediately before review or merge handoff.
- Preserve one active workpad comment and same-workpad closeout semantics across the full lifecycle.
- Prove the contract with focused helper/runtime tests rather than docs alone.

## Non-Goals
- Replacing attachment-based PR linkage with workpad-only PR reporting.
- Changing the team's workflow state names or provider claim semantics.
- Rewriting the broader Linear helper stack beyond the workpad contract seams needed for this issue.

## Stakeholders
- Product: CO operator managing Linear-backed provider-worker runs
- Engineering: Codex
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - malformed or under-structured workpads fail closed at the helper/runtime boundary
  - provider-worker instructions and repo-local skill guidance both describe the same stable body contract and milestone refresh expectations
  - workpad updates stay in the single active comment across bootstrap, active work, review handoff, merge, and closeout
- Guardrails / Error Budgets:
  - keep the patch bounded to workpad contract enforcement, worker prompt text, skill guidance, docs, and focused tests
  - preserve the existing PR attachment contract and workflow state behavior
  - stop coding once the issue reaches the live review-handoff state

## User Experience
- Personas: operator or reviewer using Linear comments as the authoritative progress surface for unattended CO work
- User Journeys:
  - operator opens a ticket mid-flight and sees the same core workpad structure regardless of whether the issue is in bootstrap, implementation, or handoff
  - operator reads a workpad after a milestone and sees plan, acceptance criteria, validation, and notes updated without hunting through extra summary comments
  - reviewer reaches review handoff or merge closeout and can trust the final status to be in the same workpad comment

## Technical Considerations
- Architectural Notes:
  - workpad writes flow through `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
  - provider-worker task instructions are assembled in `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - repo-local lifecycle guidance lives in `skills/linear/SKILL.md`
  - focused tests already exist in `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`, `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`, and `orchestrator/tests/LinearCliShell.test.ts`
- Dependencies / Integrations:
  - `/Users/kbediako/Code/symphony/SPEC.md`
  - `/Users/kbediako/Code/symphony/elixir/WORKFLOW.md`
  - `/Users/kbediako/Code/symphony/elixir/README.md`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/workflow.ex`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/tracker.ex`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/linear/adapter.ex`

## Open Questions
- Resolved in implementation: the smaller correct first contract is a non-empty canonical section, not a single fenced-line stamp format. This keeps the operator-facing shape stable without overfitting one markdown rendering style.

## Approvals
- Product: Self-approved from Linear issue scope and acceptance criteria
- Engineering: Docs-review complete; implementation validation pending
- Design: N/A

## Manifest Evidence
- Docs-review manifest: `.runs/linear-df2bd49b-2dd6-413f-8d90-af40d033dace/cli/2026-03-26T02-33-46-297Z-0fc2e709/manifest.json`.
- Upstream audit references: `/Users/kbediako/Code/symphony/SPEC.md`, `/Users/kbediako/Code/symphony/elixir/WORKFLOW.md`, `/Users/kbediako/Code/symphony/elixir/README.md`, `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/workflow.ex`, `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/tracker.ex`, `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/linear/adapter.ex`.
