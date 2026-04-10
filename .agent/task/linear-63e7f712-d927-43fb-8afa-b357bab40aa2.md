# Task Checklist - linear-63e7f712-d927-43fb-8afa-b357bab40aa2

- Linear Issue: `CO-123` / `63e7f712-d927-43fb-8afa-b357bab40aa2`
- MCP Task ID: `linear-63e7f712-d927-43fb-8afa-b357bab40aa2`
- Primary PRD: `docs/PRD-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`
- TECH_SPEC: `tasks/specs/linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`

## Pre-Implementation Reviews
- [x] Review approval recorded before implementation started. Evidence: `docs/PRD-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md` (`Pre-Implementation Review Notes`), `tasks/specs/linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md` (`review_notes`).
- [x] Issue-quality review recorded before implementation started. Evidence: `docs/PRD-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md` (`Pre-Implementation Review Notes`), `tasks/specs/linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md` (`review_notes`).

## Docs
- [x] Docs packet created and mirrored in `docs/`, `tasks/`, `.agent/`, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`. Evidence: `docs/PRD-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`, `docs/TECH_SPEC-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`, `docs/ACTION_PLAN-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`, `tasks/specs/linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`, `tasks/tasks-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`, `.agent/task/linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`.
- [x] The refreshed `r3` docs-review rerun reached a terminal state and the truthful manual fallback is recorded for this packet. Evidence: `.runs/linear-63e7f712-d927-43fb-8afa-b357bab40aa2-docs-review/cli/2026-04-10T15-54-09-224Z-cab1c2ab/manifest.json`, `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/20260410T160253Z-review-closeout.json`.
- [x] Exactly one persistent Linear workpad comment is current. Evidence: `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/workpad.md`, `https://linear.app/asabeko/issue/CO-123/co-harden-hot-suite-dist-freshness-heuristics-for-transitive#comment-b4cd691e`.

## Implementation
- [x] The CLI hot-suite freshness heuristic invalidates `dist` when relevant transitive command-surface dependencies change, not just when `bin/codex-orchestrator.ts` changes. Evidence: `tests/helpers/distFreshness.ts`, `tests/cli-command-surface.spec.ts`.
- [x] The review hot-suite freshness heuristic invalidates `dist` when relevant transitive runtime dependencies change, not just when `scripts/run-review.ts` or `scripts/lib/**` changes. Evidence: `tests/helpers/distFreshness.ts`, `tests/run-review.spec.ts`.
- [x] Focused tests prove the new tracked roots reject stale `dist` while unrelated sibling changes still keep the fast built-entry path available. Evidence: `tests/cli-command-surface.spec.ts`, `tests/run-review.spec.ts`, `npx vitest run tests/cli-command-surface.spec.ts tests/run-review.spec.ts`.
- [x] The implementation records the chosen dependency-root contract and shared-helper decision in the packet and workpad. Evidence: `docs/PRD-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`, `docs/TECH_SPEC-linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`, `tasks/specs/linear-63e7f712-d927-43fb-8afa-b357bab40aa2.md`, `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/workpad.md`.

## Validation
- [x] Add targeted tests for the expanded freshness roots in both hot suites. Evidence: `tests/cli-command-surface.spec.ts`, `tests/run-review.spec.ts`.
- [x] Re-run the focused hot-suite commands that cover the freshness logic. Evidence: `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/20260411T014544Z-validation-closeout.json` (`focused_hot_suites`).
- [x] Confirm the bounded subprocess smoke matrix still prefers `dist` for unrelated-file changes and still rejects stale `dist` for the newly tracked dependency roots. Evidence: `tests/cli-command-surface.spec.ts`, `tests/run-review.spec.ts`, `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/20260411T014544Z-validation-closeout.json` (`focused_hot_suites`).
- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/20260411T014544Z-validation-closeout.json` (`repo_floor.delegation_guard`).
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/20260411T014544Z-validation-closeout.json` (`repo_floor.spec_guard`).
- [x] `npm run build`. Evidence: `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/20260411T014544Z-validation-closeout.json` (`repo_floor.build`).
- [x] `npm run lint`. Evidence: `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/20260411T014544Z-validation-closeout.json` (`repo_floor.lint`).
- [x] `npm run test`. Evidence: `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/20260411T014544Z-validation-closeout.json` (`repo_floor.test`).
- [x] `npm run docs:check`. Evidence: `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/20260411T014544Z-validation-closeout.json` (`repo_floor.docs_check`).
- [x] `npm run docs:freshness`. Evidence: `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/20260411T014544Z-validation-closeout.json` (`repo_floor.docs_freshness`).
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/20260411T014544Z-validation-closeout.json` (`repo_floor.diff_budget`, `status=override-applied`, `1635/1200` lines).
- [x] Standalone review rerun is recorded truthfully for the final post-doc-refresh packet, with manual fallback after the wrapper hit the classified boundary again. Evidence: `.runs/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/cli/2026-04-10T09-55-25-068Z-984357be/review/telemetry.json`, `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/20260410T160253Z-review-closeout.json`.
- [x] Explicit elegance pass recorded for the final post-doc-refresh packet. Evidence: `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/20260410T160253Z-review-closeout.json`.
- [x] `npm run pack:smoke` is not required for the surviving final diff. Evidence: `out/linear-63e7f712-d927-43fb-8afa-b357bab40aa2/manual/20260411T014544Z-validation-closeout.json` (`repo_floor.diff_budget.override_reason`; final diff still touches only tests plus required docs mirrors).

## Handoff
- [ ] Replacement PR opened and attached to the issue.
- [ ] Latest `origin/main` still merged into the branch immediately before review-state transition.
- [ ] PR checks green and `pr ready-review` drain clean before review-state transition.
- [ ] Unresolved actionable review threads: `0` (or explicit waiver plus evidence recorded here before handoff).
- [ ] Issue moved to `Human Review` or `In Review`.
