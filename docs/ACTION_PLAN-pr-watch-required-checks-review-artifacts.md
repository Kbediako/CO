# ACTION_PLAN - PR Watch Required-Checks Gate + Review Artifacts Guide (0967)

## Phase 1 - Docs-first scaffold
1. Add PRD + TECH_SPEC + ACTION_PLAN + task checklists.
2. Register task/spec in `tasks/index.json` and `docs/TASKS.md`.
3. Update docs freshness registry entries.
4. Capture delegation scout + docs-review manifests.

## Phase 2 - Implementation
1. Update `scripts/lib/pr-watch-merge.js` to use required-check snapshots for gating.
2. Add `docs/guides/review-artifacts.md` and wire discoverability links.
3. Ensure no config disables CodeRabbit.

## Phase 3 - Validation and handoff
1. Run full guardrail chain (delegation/spec guard, build/lint/test/docs, diff-budget, review).
2. Capture implementation-gate manifest evidence.
3. Run a standalone elegance pass and record outcomes.
