# ACTION_PLAN - RLM Orchestrator Validation

## Added by Bootstrap (refresh as needed)

## Summary
- Goal: Deliver deterministic RLM validation across unit, integration, and evaluation layers.
- Scope: Fixtures, stubs, tests, and evaluation scenarios; no architecture refactors.
- Assumptions: Symbolic RLM + delegation already supported; offline tests acceptable.

## Milestones & Sequencing
1) Docs-first setup: PRD + TECH_SPEC + ACTION_PLAN + checklist + registry updates.
2) Fixtures + unit/integration tests: deterministic contexts, stubbed agent/planner, loop tests.
3) Evaluation scenarios + benchmarks: context-scale + OOLONG + OOLONG-Pairs fixtures, harness scenarios, accuracy curves, fallback length matching + repeatability hashes for determinism.

## Dependencies
- Vitest orchestrator suite (`npm run test:orchestrator`).
- Evaluation harness (`npm run eval:test`).
- Deterministic stub injection for agent/planner.

## Validation
- Checks / tests: `npm run test:orchestrator`, `npm run eval:test`.
- Rollback plan: revert added fixtures/tests and restore baseline thresholds.

## Risks & Mitigations
- Missing stub hook -> add minimal test-only injection path.
- Scale benchmarks too slow -> gate on nightly or reduce fixture sizes.
- OOLONG dataset too large -> stream/limit rows per length; cache small samples.
- OOLONG dataset license/version drift -> pin dataset revision in fixture config and document download source.

## Approvals
- Reviewer:
- Date:
