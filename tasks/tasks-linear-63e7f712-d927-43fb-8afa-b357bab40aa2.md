# Task Checklist - linear-63e7f712-d927-43fb-8afa-b357bab40aa2

- Linear Issue: `CO-123` / `63e7f712-d927-43fb-8afa-b357bab40aa2`
- MCP Task ID: `linear-63e7f712-d927-43fb-8afa-b357bab40aa2`
- Primary PRD: `docs/PRD-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`
- TECH_SPEC: `tasks/specs/linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`

## Docs
- [x] Docs packet created and mirrored in `docs/`, `tasks/`, `.agent/`, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`. Evidence: `docs/PRD-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`, `docs/TECH_SPEC-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`, `docs/ACTION_PLAN-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`, `tasks/specs/linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`, `tasks/tasks-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`, `.agent/task/linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`.
- [x] docs-review approval captured for the rework packet. Evidence: `.runs/linear-63e7f712-d927-43fb-8afa-b357bab40aa2-co-123-docs-review/cli/2026-04-10T07-11-11-313Z-8de3743e/manifest.json`.
- [x] Exactly one persistent Linear workpad comment is current. Evidence: `https://linear.app/asabeko/issue/CO-123/co-harden-hot-suite-dist-freshness-heuristics-for-transitive#comment-b6d7da7a`.

## Implementation
- [x] The CLI hot-suite freshness heuristic invalidates `dist` when relevant transitive command-surface dependencies change, not just when `bin/codex-orchestrator.ts` changes. Evidence: `tests/helpers/distFreshness.ts`, `tests/cli-command-surface.spec.ts`.
- [x] The review hot-suite freshness heuristic invalidates `dist` when relevant transitive runtime dependencies change, not just when `scripts/run-review.ts` or `scripts/lib/**` changes. Evidence: `tests/helpers/distFreshness.ts`, `tests/run-review.spec.ts`.
- [x] Focused tests prove the new tracked roots reject stale `dist` while unrelated sibling changes still keep the fast built-entry path available. Evidence: `tests/cli-command-surface.spec.ts`, `tests/run-review.spec.ts`, `npx vitest run tests/cli-command-surface.spec.ts tests/run-review.spec.ts`.
- [x] The implementation records the chosen dependency-root contract and shared-helper decision in the packet and workpad. Evidence: `docs/PRD-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`, `docs/TECH_SPEC-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`, `tasks/specs/linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`, `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/workpad.md`.

## Validation
- [x] Add targeted tests for the expanded freshness roots in both hot suites. Evidence: `tests/cli-command-surface.spec.ts`, `tests/run-review.spec.ts`.
- [x] Re-run the focused hot-suite commands that cover the freshness logic. Evidence: `npx vitest run tests/cli-command-surface.spec.ts tests/run-review.spec.ts` (`262` tests passed).
- [x] Confirm the bounded subprocess smoke matrix still prefers `dist` for unrelated-file changes and still rejects stale `dist` for the newly tracked dependency roots. Evidence: focused stale-vs-unrelated cases in `tests/cli-command-surface.spec.ts` and `tests/run-review.spec.ts`, plus `npx vitest run tests/cli-command-surface.spec.ts tests/run-review.spec.ts`.
- [x] `node scripts/delegation-guard.mjs`. Evidence: completed successfully after docs-review and implementation validation.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: completed successfully on the synced `origin/main` baseline.
- [x] `npm run build`. Evidence: completed successfully.
- [x] `npm run lint`. Evidence: completed successfully.
- [x] `npm run test`. Evidence: completed successfully (`3322` tests passed).
- [x] `npm run docs:check`. Evidence: completed successfully.
- [x] `npm run docs:freshness`. Evidence: completed successfully (`3488` docs, `3491` registry entries).
- [x] `node scripts/diff-budget.mjs`. Evidence: completed successfully (`files=10/25`, `lines=1147/1200`, `+1054/-93`).
- [x] Standalone review recorded. Evidence: `../../.runs/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/cli/2026-04-10T06-49-36-719Z-253d7dad/review/telemetry.json` (`status: succeeded`, `review_outcome: clean-success`, `termination_boundary: null`).
- [x] Explicit elegance pass recorded. Evidence: bounded manual pass confirmed the smallest correct design remains one shared test-local helper with no broader product/runtime extraction.
- [x] `npm run pack:smoke` because the final diff still touches downstream-facing CLI/review-wrapper surfaces. Evidence: completed successfully.

## Handoff
- [ ] PR attached to the issue.
- [x] Latest `origin/main` merged into the branch before review-state transition. Evidence: branch fast-forwarded to `origin/main` commit `8b64f436f801a616d770af0011867811f9491a93` before final validation.
- [ ] PR checks green and `pr ready-review` drain clean before review-state transition.
- [ ] Unresolved actionable review threads: `0` (or explicit waiver plus evidence recorded here before handoff).
- [ ] Issue moved to `Human Review` or `In Review`.
