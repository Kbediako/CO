# Task Checklist - linear-63e7f712-d927-43fb-8afa-b357bab40aa2

- Linear Issue: `CO-123` / `63e7f712-d927-43fb-8afa-b357bab40aa2`
- MCP Task ID: `linear-63e7f712-d927-43fb-8afa-b357bab40aa2`
- Primary PRD: `docs/PRD-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`
- TECH_SPEC: `tasks/specs/linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`

## Docs
- [x] Docs packet created and mirrored in `docs/`, `tasks/`, `.agent/`, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`. Evidence: `docs/PRD-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`, `docs/TECH_SPEC-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`, `docs/ACTION_PLAN-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`, `tasks/specs/linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`, `tasks/tasks-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`, `.agent/task/linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`.
- [x] docs-review approval or explicit override captured for the CO-123 packet. Evidence: `.runs/linear-63e7f712-d927-43fb-8afa-b357bab40aa2-co-123-docs-review/cli/2026-04-09T15-19-12-917Z-b0df389b/manifest.json`, `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/20260409T152544Z-docs-first/05-docs-review-override.md`.
- [x] Exactly one persistent Linear workpad comment is current. Evidence: `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/workpad.md`.

## Implementation
- [x] The CLI hot-suite freshness heuristic invalidates `dist` when relevant transitive command-surface dependencies change, not just when `bin/codex-orchestrator.ts` changes. Evidence: `tests/helpers/distFreshness.ts`, `tests/cli-command-surface.spec.ts`.
- [x] The review hot-suite freshness heuristic invalidates `dist` when relevant transitive runtime dependencies change, not just when `scripts/run-review.ts` or `scripts/lib/**` changes. Evidence: `tests/helpers/distFreshness.ts`, `tests/run-review.spec.ts`.
- [x] Focused tests prove the new tracked roots reject stale `dist` while unrelated sibling changes still keep the fast built-entry path available. Evidence: `tests/cli-command-surface.spec.ts`, `tests/run-review.spec.ts`, `npx vitest run tests/cli-command-surface.spec.ts tests/run-review.spec.ts`.
- [x] The implementation records the chosen dependency-root contract and shared-helper decision in the packet and workpad. Evidence: `docs/PRD-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`, `docs/TECH_SPEC-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`, `docs/ACTION_PLAN-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`, `tasks/specs/linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`, `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/workpad.md`.

## Validation
- [x] Add targeted tests for the expanded freshness roots in both hot suites. Evidence: `tests/cli-command-surface.spec.ts`, `tests/run-review.spec.ts`.
- [x] Re-run the focused hot-suite commands that cover the freshness logic. Evidence: `npx vitest run tests/cli-command-surface.spec.ts tests/run-review.spec.ts`.
- [x] Confirm the bounded subprocess smoke matrix still prefers `dist` for unrelated-file changes and still rejects stale `dist` for the newly tracked dependency roots. Evidence: `tests/cli-command-surface.spec.ts`, `tests/run-review.spec.ts`, `npx vitest run tests/cli-command-surface.spec.ts tests/run-review.spec.ts`.
- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/20260409T154507Z-review-fallback.md`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/20260409T154507Z-review-fallback.md`.
- [x] `npm run build`. Evidence: `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/20260409T154507Z-review-fallback.md`.
- [x] `npm run lint`. Evidence: `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/20260409T154507Z-review-fallback.md`.
- [x] `npm run test`. Evidence: `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/20260409T154507Z-review-fallback.md`.
- [x] `npm run docs:check`. Evidence: `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/20260409T154507Z-review-fallback.md`.
- [x] `npm run docs:freshness`. Evidence: `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/20260409T154507Z-review-fallback.md`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/20260409T154507Z-review-fallback.md`.
- [x] Standalone review or truthful manual fallback recorded. Evidence: `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/20260409T154507Z-review-fallback.md`.
- [x] Explicit elegance pass recorded. Evidence: `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/20260409T154507Z-review-fallback.md`.
- [x] `npm run pack:smoke` if the final diff still touches downstream-facing CLI/review-wrapper surfaces. Evidence: `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/20260409T154507Z-review-fallback.md`.

## Handoff
- [ ] PR attached to the issue.
- [ ] Latest `origin/main` merged into the branch before review-state transition.
- [ ] PR checks green and `pr ready-review` drain clean before review-state transition.
- [ ] Unresolved actionable review threads: `0` (or explicit waiver plus evidence recorded here before handoff).
- [ ] Issue moved to `Human Review` or `In Review`.
