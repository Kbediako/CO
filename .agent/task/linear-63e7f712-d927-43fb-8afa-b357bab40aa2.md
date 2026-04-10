# Task Checklist - linear-63e7f712-d927-43fb-8afa-b357bab40aa2

- Linear Issue: `CO-123` / `63e7f712-d927-43fb-8afa-b357bab40aa2`
- MCP Task ID: `linear-63e7f712-d927-43fb-8afa-b357bab40aa2`
- Primary PRD: `docs/PRD-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`
- TECH_SPEC: `tasks/specs/linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`

## Docs
- [x] Docs packet created and mirrored in `docs/`, `tasks/`, `.agent/`, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`. Evidence: `docs/PRD-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`, `docs/TECH_SPEC-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`, `docs/ACTION_PLAN-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`, `tasks/specs/linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`, `tasks/tasks-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`, `.agent/task/linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`.
- [x] docs-review approval captured for the rework packet. Evidence: `.runs/linear-63e7f712-d927-43fb-8afa-b357bab40aa2-co-123-docs-review/cli/2026-04-10T07-11-11-313Z-8de3743e/manifest.json`.
- [x] Exactly one persistent Linear workpad comment is current. Evidence: `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/workpad.md`, `https://linear.app/asabeko/issue/CO-123/co-harden-hot-suite-dist-freshness-heuristics-for-transitive`.

## Implementation
- [x] The CLI hot-suite freshness heuristic invalidates `dist` when relevant transitive command-surface dependencies change, not just when `bin/codex-orchestrator.ts` changes. Evidence: `tests/helpers/distFreshness.ts`, `tests/cli-command-surface.spec.ts`.
- [x] The review hot-suite freshness heuristic invalidates `dist` when relevant transitive runtime dependencies change, not just when `scripts/run-review.ts` or `scripts/lib/**` changes. Evidence: `tests/helpers/distFreshness.ts`, `tests/run-review.spec.ts`.
- [x] Focused tests prove the new tracked roots reject stale `dist` while unrelated sibling changes still keep the fast built-entry path available. Evidence: `tests/cli-command-surface.spec.ts`, `tests/run-review.spec.ts`, `npx vitest run tests/cli-command-surface.spec.ts tests/run-review.spec.ts`.
- [x] The implementation records the chosen dependency-root contract and shared-helper decision in the packet and workpad. Evidence: `docs/PRD-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`, `docs/TECH_SPEC-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`, `tasks/specs/linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`, `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/workpad.md`.

## Validation
- [x] Add targeted tests for the expanded freshness roots in both hot suites. Evidence: `tests/cli-command-surface.spec.ts`, `tests/run-review.spec.ts`.
- [x] Re-run the focused hot-suite commands that cover the freshness logic. Evidence: `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/20260410T113724Z-validation-closeout.json` (`validation.focused_hot_suites`, `268` tests passed).
- [x] Confirm the bounded subprocess smoke matrix still prefers `dist` for unrelated-file changes and still rejects stale `dist` for the newly tracked dependency roots. Evidence: `tests/cli-command-surface.spec.ts`, `tests/run-review.spec.ts`, `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/20260410T113724Z-validation-closeout.json` (`validation.focused_hot_suites`).
- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/20260410T113724Z-validation-closeout.json` (`validation.delegation_guard`).
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/20260410T113724Z-validation-closeout.json` (`validation.spec_guard`).
- [x] `npm run build`. Evidence: `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/20260410T113724Z-validation-closeout.json` (`validation.build`).
- [x] `npm run lint`. Evidence: `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/20260410T113724Z-validation-closeout.json` (`validation.lint`).
- [x] `npm run test`. Evidence: `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/20260410T113724Z-validation-closeout.json` (`validation.full_test`, `324` files / `3365` tests passed).
- [x] `npm run docs:check`. Evidence: `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/20260410T113724Z-validation-closeout.json` (`validation.docs_check`).
- [x] `npm run docs:freshness`. Evidence: `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/20260410T113724Z-validation-closeout.json` (`validation.docs_freshness`, `3506` docs / `3509` registry entries).
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/20260410T113724Z-validation-closeout.json` (`validation.diff_budget`, working-tree scope `files=5/25`, `lines=265/1200`, `+246/-19`).
- [x] Standalone review recorded. Evidence: `.runs/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/cli/2026-04-10T09-55-25-068Z-984357be/review/telemetry.json` (`status: failed`, `review_outcome: failed-boundary`, `termination_boundary: command-intent`) plus `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/20260410T113724Z-validation-closeout.json` (`manual_review`) for the required final manual fallback.
- [x] Explicit elegance pass recorded. Evidence: `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/20260410T113724Z-validation-closeout.json` (`elegance_review`).
- [x] `npm run pack:smoke` is not required for the surviving final diff. Evidence: `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/20260410T113724Z-validation-closeout.json` (`validation.pack_smoke_required=false`).

## Handoff
- [x] PR attached to the issue. Evidence: `https://github.com/Kbediako/CO/pull/420`.
- [x] Latest `origin/main` merged into the branch before review-state transition. Evidence: branch fast-forwarded to `origin/main` commit `8b64f436f801a616d770af0011867811f9491a93` before final validation.
- [ ] PR checks green and `pr ready-review` drain clean before review-state transition.
- [ ] Unresolved actionable review threads: `0` (or explicit waiver plus evidence recorded here before handoff).
- [ ] Issue moved to `Human Review` or `In Review`.
