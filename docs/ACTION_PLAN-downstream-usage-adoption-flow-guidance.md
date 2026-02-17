# ACTION_PLAN - Downstream Usage Adoption + Guardrail Flow + Setup Guidance (0968)

## Phase 1 - Docs-first scaffold
1. Add PRD + TECH_SPEC + ACTION_PLAN + task checklists.
2. Register task/spec in `tasks/index.json`, `docs/TASKS.md`, and docs freshness registry.
3. Capture delegation scout + docs-review manifests.

## Phase 2 - Implementation
1. Add post-exec adoption nudge wiring in CLI.
2. Add single-command docs->implementation flow wiring.
3. Add setup policy/skills guidance output wiring.
4. Update command surface docs/tests for discoverability.

## Phase 3 - Validation and handoff
1. Run full guardrail chain (delegation/spec guard, build/lint/test/docs, diff-budget, review).
2. Run standalone review + explicit elegance/minimality pass and apply follow-up reductions.
3. Capture manual E2E in CO and downstream (`tower-defence`) and update checklist evidence.

## Phase 4 - Post-merge hardening follow-up (2026-02-17)
1. Fix scoped flow target matching so `pipeline:<alias>` resolves aliases only inside that pipeline.
2. Harden `pr watch-merge` to block auto-merge when head-commit bot inline comments are not acknowledged in-thread.
3. Add regression tests for flow target matching and PR watch merge gating.
