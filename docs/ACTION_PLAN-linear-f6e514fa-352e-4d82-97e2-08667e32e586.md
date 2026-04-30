# ACTION_PLAN - CO Standardize Linear Workpad Checkbox Semantics for Acceptance Criteria and Validation

## Added by Bootstrap (refresh as needed)

## Traceability
- Linear issue: `CO-30` / `f6e514fa-352e-4d82-97e2-08667e32e586`
- Linear URL: https://linear.app/asabeko/issue/CO-30/co-standardize-linear-workpad-checkbox-semantics-for-acceptance

## Summary
- Goal: finish Linear issue `CO-30` by requiring checkbox semantics only in the workpad `Acceptance Criteria` and `Validation` sections and aligning worker guidance with that narrower contract.
- Scope: docs-first packet, focused validator update, prompt/skill wording alignment, focused tests, required validation, and truthful handling of the live Linear rate-limit blocker.
- Assumptions:
  - the prompt-supplied current state `Ready` is informative only until a successful live `issue-context` read confirms the state map again
  - `CO-21` already owns the broader workpad structure contract, so this lane should stay focused on section-body checkbox semantics
  - explicit subagent delegation is unavailable in-session, so delegation must be documented via override instead of spawned evidence

## Milestones & Sequencing
1. Register the docs-first packet for `linear-f6e514fa-352e-4d82-97e2-08667e32e586`, update `tasks/index.json`, update `docs/TASKS.md`, mirror the checklist, and record the initial `linear_rate_limited` blocker truthfully.
2. Run docs-review with a delegation override before touching implementation code.
3. Tighten the workpad validator so `Acceptance Criteria` and `Validation` require non-empty checkbox list items, while the other canonical sections remain free-form.
4. Update the provider-worker prompt and repo-local `skills/linear/SKILL.md` wording to match the narrow checkbox rule.
5. Add focused tests for accepted checkbox bodies and rejected plain-bullet/prose-only bodies in the two required sections.
6. Run the required validation floor, then retry live Linear reads once budget resets so state/workpad/PR handoff actions happen only on confirmed live data.

## Dependencies
- `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `skills/linear/SKILL.md`
- `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`
- `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
- `/Users/kbediako/Code/symphony/SPEC.md`
- `/Users/kbediako/Code/symphony/elixir/WORKFLOW.md`

## Validation
- Checks / tests:
  - `DELEGATION_GUARD_OVERRIDE_REASON="Provider worker run could not delegate because spawn_agent is unavailable without explicit user authorization in this session." node dist/bin/codex-orchestrator.js start docs-review --format json --no-interactive --task linear-f6e514fa-352e-4d82-97e2-08667e32e586`
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
  - revert the stricter checkbox enforcement if it rejects truthful in-scope workpads that still satisfy the operator need
  - keep the issue active and avoid review handoff until the workpad contract and live Linear state are both truthful

## Risks & Mitigations
- Risk: section-body enforcement overconstrains workpads beyond what `CO-30` asks for.
  - Mitigation: limit the new rule to `Acceptance Criteria` and `Validation` only.
- Risk: worker prompt or skill wording drifts from runtime validation.
  - Mitigation: patch prompt, skill, and tests in the same lane.
- Risk: live Linear rate limiting blocks truthful state/workpad updates.
  - Mitigation: keep local repo work moving, but record that no transition/workpad mutation was attempted until a live read succeeds.

## Approvals
- Reviewer: Docs-review approved via `/Users/kbediako/Code/CO/.runs/linear-f6e514fa-352e-4d82-97e2-08667e32e586/cli/2026-03-29T02-28-13-540Z-c16c4dc3/manifest.json`
- Date: 2026-03-29

## Freshness Review
- 2026-04-29: CO-409 PR #719 freshness review reread this historical task packet/mirror after the Mar 29 cadence crossed the gate; content remains valid for its original issue scope, so only freshness metadata was refreshed under live docs:freshness:maintain owner CO-409.
