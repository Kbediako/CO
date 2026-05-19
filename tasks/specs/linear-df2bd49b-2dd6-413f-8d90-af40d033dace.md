---
id: 20260326-linear-df2bd49b-2dd6-413f-8d90-af40d033dace
title: CO Tighten Symphony-style Linear Workpad Structure and Milestone Refresh Contract
status: in_progress
owner: Codex
created: 2026-03-26
last_review: 2026-05-19
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-df2bd49b-2dd6-413f-8d90-af40d033dace.md
related_action_plan: docs/ACTION_PLAN-linear-df2bd49b-2dd6-413f-8d90-af40d033dace.md
related_tasks:
  - tasks/tasks-linear-df2bd49b-2dd6-413f-8d90-af40d033dace.md
review_notes:
  - 2026-03-26: Opened from Linear issue `CO-21` after confirming the live team workflow state is `Ready`, transitioning it to `In Progress`, and creating the bootstrap workpad comment in the same issue.
  - 2026-03-26: Symphony audit across `SPEC.md`, `elixir/WORKFLOW.md`, `elixir/README.md`, `elixir/lib/symphony_elixir/workflow.ex`, `elixir/lib/symphony_elixir/tracker.ex`, and `elixir/lib/symphony_elixir/linear/adapter.ex` confirmed the remaining CO gap is not state semantics or PR linkage; it is the missing repo-level workpad body and milestone-refresh contract.
  - 2026-03-26: Current CO already supports one persistent workpad comment, review alias handling, PR attachment, `Rework`, and `Merging`; the open gap is that helper enforcement is still marker-only and prompt/skill guidance is still too free-form about refresh timing.
  - 2026-03-26: This lane intentionally keeps PR attachment separate from workpad-body changes unless the upstream audit proves otherwise.
  - 2026-03-26: Delegation is explicitly overridden for this worker run because spawn_agent is unavailable without explicit user authorization in-session.
  - 2026-03-26: docs-review approved the packet before implementation via `.runs/linear-df2bd49b-2dd6-413f-8d90-af40d033dace/cli/2026-03-26T02-33-46-297Z-0fc2e709/manifest.json`.
  - 2026-04-26: CO-378 current-main freshness pass reviewed this stale CO-21 packet/mirror cohort and refreshed the metadata only; the workpad contract implementation scope and historical validation notes remain unchanged.
---

# Technical Specification

## Context

The current CO Linear workflow already uses one active workpad comment and same-issue lifecycle handling, but it still leaves the operator-facing workpad contract under-specified. The helper accepts any comment body that contains `## Codex Workpad`, and the worker prompt plus repo-local `linear` skill only call for refreshing the workpad before new work or handoff. Symphony's current operational guidance is stricter: one persistent workpad remains the human-readable source of truth, it is refreshed after meaningful milestones, ticket-authored validation requirements are copied in as required checklist items, and terminal closeout stays in the same comment.

## Requirements

1. Enforce a stronger workpad body contract in the helper surface beyond the marker-only rule.
2. Require stable core sections in order: environment/workspace stamp, plan, acceptance criteria, validation, and notes.
3. Require the five canonical sections to contain non-empty operator-visible progress content instead of empty placeholders.
4. When the ticket description includes `Validation`, `Test Plan`, or `Testing` sections, require those requirements to be mirrored into the workpad acceptance/validation content in a detectable normalized form.
5. Update the provider-worker prompt so the required workpad structure and milestone-driven refresh timing are explicit.
6. Update the repo-local `linear` skill so it matches the stricter structure and refresh contract, including same-workpad final closeout and no extra summary comments.
7. Add focused regressions covering bootstrap workpad creation, milestone refresh updates, and final or review-handoff refresh expectations.
8. Keep the issue active until a PR is attached and the team review handoff is ready.

## Current Truth

- `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts` currently rejects only missing workpad bodies or bodies missing the `## Codex Workpad` marker.
- `orchestrator/src/cli/providerLinearWorkerRunner.ts` and `skills/linear/SKILL.md` both mention a single active workpad and review-handoff refreshes, but neither defines a stable section shape or explicit milestone-driven refresh cadence.
- Symphony `SPEC.md` keeps ticket writes agent-owned, while `elixir/WORKFLOW.md` and `elixir/README.md` operationalize one persistent workpad comment, milestone updates, mirrored validation requirements, and same-comment closeout.
- `elixir/lib/symphony_elixir/tracker.ex` and `elixir/lib/symphony_elixir/linear/adapter.ex` confirm that tracker writes are explicit comment/state mutations at the agent boundary rather than implicit orchestrator summaries.
- This worker run cannot use spawned subagents, so delegation guard must be satisfied with an explicit override rather than synthetic delegation evidence.

## Validation Plan

- docs-review before implementation with explicit delegation override
- focused regressions in `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`, `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`, and any needed CLI-shell coverage
- required repo validation floor after implementation
- PR attachment to Linear before transition to `In Review`

## Manifest Evidence

- Docs-review manifest: `.runs/linear-df2bd49b-2dd6-413f-8d90-af40d033dace/cli/2026-03-26T02-33-46-297Z-0fc2e709/manifest.json`.
- Upstream audit references: `/Users/kbediako/Code/symphony/SPEC.md`, `/Users/kbediako/Code/symphony/elixir/WORKFLOW.md`, `/Users/kbediako/Code/symphony/elixir/README.md`, `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/workflow.ex`, `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/tracker.ex`, `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/linear/adapter.ex`.
