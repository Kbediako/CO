# ACTION_PLAN - Control-Plane + Guardrail Runner Hardening (0970)

## Phase 1 - Docs-first scaffold
1. Add PRD + TECH_SPEC + ACTION_PLAN + task checklist mirrors.
2. Register task/spec in `tasks/index.json` and `docs/TASKS.md`.
3. Capture delegation scout + docs-review evidence.

## Phase 2 - Implementation
1. Patch request builder optional task field shaping.
2. Patch spec/delegation guard wrappers for repo-local/package-local script fallback.
3. Patch guardrail summary classification to treat explicit skip signals as skipped.
4. Add/refresh tests for each behavior.

## Phase 3 - Validation and handoff
1. Run full guardrail command chain.
2. Run standalone post-implementation review + explicit elegance pass.
3. Update checklist evidence and handoff summary.
