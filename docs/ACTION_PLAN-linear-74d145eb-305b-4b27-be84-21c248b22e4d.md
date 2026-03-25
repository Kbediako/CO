# ACTION_PLAN - CO Recalibrate Diff Budget for Stacked Lanes While Keeping Hard PR Scope Guard

## Added by Bootstrap (refresh as needed)

## Traceability
- Linear issue: `CO-15` / `74d145eb-305b-4b27-be84-21c248b22e4d`
- Linear URL: https://linear.app/asabeko/issue/CO-15/co-recalibrate-diff-budget-for-stacked-lanes-while-keeping-hard-pr

## Summary
- Goal: finish Linear issue `CO-15` by recalibrating diff-budget, so local stacked lanes get a truthful hard signal while CI PR scope stays hard-gated.
- Scope: docs-first packet, one persistent Linear workpad, pre-implementation docs-review, bounded diff-budget/workflow/docs changes, focused tests, full validation, PR prep, and review handoff.
- Assumptions:
  - the live team review handoff state is `In Review`
  - local stacked-lane override noise is real and already evidenced by recent `08-diff-budget.log` artifacts
  - subagent spawning remains unavailable in-session, so delegation must be explicitly overridden

## Milestones & Sequencing
1) Register the docs-first packet for `linear-74d145eb-305b-4b27-be84-21c248b22e4d`, update `tasks/index.json`, update `docs/TASKS.md`, create the baseline audit artifact, and create the persistent `## Codex Workpad` comment.
2) Run docs-review with an explicit delegation override for this worker run before touching implementation code.
3) Patch `scripts/diff-budget.mjs` so local auto working-tree mode hard-gates current-head scope, reports broad stacked aggregate scope as advisory, and aligns the default line threshold with the existing review large-scope policy.
4) Update any minimal workflow and operator docs needed to keep the hard PR/base scope contract explicit and auditable.
5) Add focused regressions, run the required validation sequence, refresh the docs packet/workpad, open and attach the PR, and stop coding at the live review handoff state.

## Dependencies
- `scripts/diff-budget.mjs`
- `tests/diff-budget.spec.ts`
- `scripts/run-review.ts`
- `.github/workflows/core-lane.yml`
- `codex.orchestrator.json`
- `docs/standalone-review-guide.md`

## Validation
- Checks / tests:
  - `DELEGATION_GUARD_OVERRIDE_REASON="Provider worker run could not delegate because spawn_agent is unavailable without explicit user authorization in this session." node dist/bin/codex-orchestrator.js start docs-review --format json --no-interactive --task linear-74d145eb-305b-4b27-be84-21c248b22e4d`
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
  - revert the scope-selection change if it weakens explicit base/commit gating or misstates local scope
  - keep the issue active until the fix or blocker is clear and reflected in the workpad

## Risks & Mitigations
- Risk: local auto mode could under-measure a stacked lane and let an oversized current change slip through.
  - Mitigation: keep current-head scope hard-gated and preserve explicit base/commit hard paths for CI and PR usage.
- Risk: aggregate stacked scope could disappear from operator awareness.
  - Mitigation: keep the broader base aggregate in the output as advisory context when it differs from the current-head scope.
- Risk: threshold retuning could silently weaken the existing guard more than intended.
  - Mitigation: only align to the already-documented `1200`-line review policy and keep the file-count guard hard at `25`.

## Approvals
- Reviewer: Pending docs-review
- Date: 2026-03-25

## Manifest Evidence
- Baseline audit: `out/linear-74d145eb-305b-4b27-be84-21c248b22e4d/manual/20260325T070238Z-baseline-audit.md`
