# ACTION_PLAN - CO Tighten Symphony-style Linear Workpad Structure and Milestone Refresh Contract

## Added by Bootstrap (refresh as needed)

## Traceability
- Linear issue: `CO-21` / `df2bd49b-2dd6-413f-8d90-af40d033dace`
- Linear URL: https://linear.app/asabeko/issue/CO-21/co-tighten-symphony-style-linear-workpad-structure-and-milestone

## Summary
- Goal: finish Linear issue `CO-21` by tightening the workpad body and refresh contract so CO's single persistent Linear workpad behaves closer to the current Symphony operational pattern.
- Scope: docs-first packet, bootstrap workpad, pre-implementation docs-review, bounded helper/prompt/skill changes, focused tests, required validation, PR prep, and review handoff.
- Assumptions:
  - the live team review handoff state is `In Review`
  - CO already has the broader lifecycle substrate (`Ready` alias handling, PR attachment, `Rework`, `Merging`), so this lane should stay focused on the workpad body and refresh contract
  - subagent spawning remains unavailable in-session, so delegation must be explicitly overridden

## Milestones & Sequencing
1) Register the docs-first packet for `linear-df2bd49b-2dd6-413f-8d90-af40d033dace`, update `tasks/index.json`, update `docs/TASKS.md`, mirror the checklist, and create the bootstrap `## Codex Workpad` comment.
2) Run docs-review with an explicit delegation override before touching implementation code.
3) Tighten the Linear helper workpad validation contract so marker-only or under-structured bodies fail closed and ticket-provided validation/test-plan requirements are mirrored when present.
4) Tighten the provider-worker prompt and repo-local `linear` skill so the required section structure and milestone refresh timing are explicit.
5) Add focused regressions covering bootstrap creation, milestone refresh, and final/review-handoff refresh expectations.
6) Run the required validation sequence, refresh the docs packet and workpad with final evidence, prepare the PR, and stop coding at the live review-handoff state.

## Dependencies
- `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `skills/linear/SKILL.md`
- `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`
- `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
- `orchestrator/tests/LinearCliShell.test.ts`
- `/Users/kbediako/Code/symphony/SPEC.md`
- `/Users/kbediako/Code/symphony/elixir/WORKFLOW.md`
- `/Users/kbediako/Code/symphony/elixir/README.md`

## Validation
- Checks / tests:
  - `DELEGATION_GUARD_OVERRIDE_REASON="Provider worker run could not delegate because spawn_agent is unavailable without explicit user authorization in this session." node dist/bin/codex-orchestrator.js start docs-review --format json --no-interactive --task linear-df2bd49b-2dd6-413f-8d90-af40d033dace`
  - `DELEGATION_GUARD_OVERRIDE_REASON="Provider worker run could not delegate because spawn_agent is unavailable without explicit user authorization in this session." node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
  - `npm run pack:smoke`
- Rollback plan:
  - revert the stricter workpad-body enforcement if it blocks truthful existing flows outside the new contract
  - keep the issue active until the workpad contract or blocker is clearly reflected in the same workpad comment

## Risks & Mitigations
- Risk: helper-side validation becomes too brittle and rejects truthful workpads that meet the operator need.
  - Mitigation: keep the contract narrow to the five core sections plus normalized checklist/mirrored-validation expectations.
- Risk: worker prompt and skill guidance diverge from helper enforcement.
  - Mitigation: patch both in the same lane and add prompt-focused tests alongside helper tests.
- Risk: the mirrored-validation check overfits one markdown shape.
  - Mitigation: normalize extracted ticket requirements and workpad checklist content instead of requiring exact formatting.

## Approvals
- Reviewer: Docs-review complete; implementation validation pending
- Date: 2026-03-26

## Manifest Evidence
- Docs-review manifest: `.runs/linear-df2bd49b-2dd6-413f-8d90-af40d033dace/cli/2026-03-26T02-33-46-297Z-0fc2e709/manifest.json`.
- Upstream audit references: `/Users/kbediako/Code/symphony/SPEC.md`, `/Users/kbediako/Code/symphony/elixir/WORKFLOW.md`, `/Users/kbediako/Code/symphony/elixir/README.md`, `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/workflow.ex`, `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/tracker.ex`, `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/linear/adapter.ex`.
