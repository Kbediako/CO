---
id: 20260326-linear-df2bd49b-2dd6-413f-8d90-af40d033dace
title: CO Tighten Symphony-style Linear Workpad Structure and Milestone Refresh Contract
relates_to: docs/PRD-linear-df2bd49b-2dd6-413f-8d90-af40d033dace.md
risk: high
owners:
  - Codex
last_review: 2026-04-26
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-df2bd49b-2dd6-413f-8d90-af40d033dace.md`
- PRD: `docs/PRD-linear-df2bd49b-2dd6-413f-8d90-af40d033dace.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-df2bd49b-2dd6-413f-8d90-af40d033dace.md`
- Task checklist: `tasks/tasks-linear-df2bd49b-2dd6-413f-8d90-af40d033dace.md`

## Traceability
- Linear issue: `CO-21` / `df2bd49b-2dd6-413f-8d90-af40d033dace`
- Linear URL: https://linear.app/asabeko/issue/CO-21/co-tighten-symphony-style-linear-workpad-structure-and-milestone

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: tighten CO's Linear workpad contract so the single persistent workpad comment is a stable operator-facing progress surface with canonical sections and milestone-driven refreshes, matching current Symphony operational behavior more closely without changing state semantics or PR attachment behavior.
- Scope:
  - docs-first registration and bootstrap workpad for the current Linear worker issue
  - helper/runtime validation of the workpad body shape beyond the marker-only rule
  - worker prompt and repo-local skill updates for milestone-driven refresh timing
  - focused tests covering bootstrap creation, milestone refresh, and final or review-handoff refresh expectations
- Constraints:
  - keep PR attachment separate from workpad content
  - preserve the live-team `In Review` alias and current `Merging` / `Rework` lifecycle behavior
  - record delegation override explicitly because this worker run cannot spawn subagents

## Technical Requirements
- Functional requirements:
  - `upsert-workpad` must reject workpad bodies that omit any core section or only provide the marker
  - the core sections must exist in a stable order: environment/workspace stamp, plan, acceptance criteria, validation, and notes
  - plan, acceptance-criteria, and validation sections must provide non-empty, truthful progress content; checklist formatting is allowed but not required
  - when the ticket description includes `Validation`, `Test Plan`, or `Testing` sections, those requirements must be mirrored into the workpad acceptance/validation surface in a detectable way
  - provider-worker prompt text and repo-local `skills/linear/SKILL.md` guidance must require refreshes after meaningful milestones and immediately before review or merge handoff
  - final or handoff closeout must stay in the same workpad comment instead of separate completion comments
- Non-functional requirements (performance, reliability, security):
  - keep validation deterministic and local to the Linear helper/runtime boundary
  - preserve exactly one unresolved active workpad comment
  - keep the implementation narrow to workpad contract enforcement plus prompt/skill guidance
- Interfaces / contracts:
  - workpad helper contract: `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
  - provider-worker prompt contract: `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - repo-local workflow guidance: `skills/linear/SKILL.md`
  - helper/runtime tests: `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`, `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`, `orchestrator/tests/LinearCliShell.test.ts`

## Architecture & Data
- Architecture / design adjustments:
  - keep the remote Linear workpad as the durable source of truth, but strengthen the write contract before the helper updates or creates the comment
  - require the first five H3 sections after `## Codex Workpad` to stay in this exact order: `Environment / Workspace Stamp`, `Plan`, `Acceptance Criteria`, `Validation`, `Notes`
  - keep each canonical section non-empty without forcing one exact checklist or stamp markdown rendering
  - make the stricter section structure and refresh timing explicit in both the worker prompt and the repo-local `linear` skill so the operator-facing contract is aligned across runtime surfaces
  - treat ticket-provided validation requirements as required inputs to the workpad contract by extracting normalized `Validation`, `Test Plan`, or `Testing` items from the issue description and requiring them in the workpad `Acceptance Criteria` or `Validation` sections
- Data model changes / migrations:
  - none beyond stricter validation of existing workpad comment bodies
- External dependencies / integrations:
  - current Symphony operational guidance in `SPEC.md`, `elixir/WORKFLOW.md`, and `elixir/README.md`
  - Symphony tracker-write boundary in `elixir/lib/symphony_elixir/tracker.ex` and `elixir/lib/symphony_elixir/linear/adapter.ex`

## Validation Plan
- Tests / checks:
  - docs-review on the new packet before code edits
  - focused workpad contract regressions in the provider Linear helper and provider-worker prompt tests
  - required repo validation floor after implementation
- Rollout verification:
  - prove workpad bootstrap creation rejects marker-only or under-structured bodies
  - prove milestone refreshes reuse the same active workpad comment with the stronger body contract
  - prove final/review-handoff guidance requires a final refresh in the same workpad comment
- Monitoring / alerts:
  - use the single active Linear workpad as the operator-facing status surface
  - use helper test output plus validation logs as the evidence surface

## Open Questions
- Resolved in implementation: use normalized requirement inclusion across the workpad `Acceptance Criteria` and `Validation` sections instead of forcing verbatim markdown reuse.

## Approvals
- Reviewer: Docs-review complete; implementation validation pending
- Date: 2026-03-26

## Manifest Evidence
- Docs-review manifest: `.runs/linear-df2bd49b-2dd6-413f-8d90-af40d033dace/cli/2026-03-26T02-33-46-297Z-0fc2e709/manifest.json`.
- Upstream audit references: `/Users/kbediako/Code/symphony/SPEC.md`, `/Users/kbediako/Code/symphony/elixir/WORKFLOW.md`, `/Users/kbediako/Code/symphony/elixir/README.md`, `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/workflow.ex`, `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/tracker.ex`, `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/linear/adapter.ex`.
