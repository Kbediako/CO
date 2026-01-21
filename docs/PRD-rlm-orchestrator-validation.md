# PRD - RLM Orchestrator Validation

## Added by Bootstrap 2026-01-20

## Summary
- Problem Statement: Codex Orchestrator RLM lacks a dedicated, deterministic test plan that validates correctness, determinism, and scalability across iterative and symbolic modes, including long-context aggregation workloads (OOLONG + OOLONG-Pairs).
- Desired Outcome: A documented and automated test matrix (unit, integration, evaluation) with deterministic fixtures, clear pass/fail criteria, offline-first execution, and OOLONG-derived evaluation curves for baseline vs RLM.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): Adapt OOLONG + OOLONG-Pairs style evaluation to Codex Orchestrator, using deterministic fixtures and symbolic RLM execution to measure correctness vs context length (baseline vs RLM).
- Success criteria / acceptance: PRD + TECH_SPEC + ACTION_PLAN + task checklist updated; test matrix covers unit/integration/eval with OOLONG-based scenarios; accuracy curves up to 1,000,000 context length; standalone reviews recorded.
- Constraints / non-goals: No model-quality evaluation; avoid live API calls in CI; symbolic RLM + delegation assumed available; keep repo lean (no large datasets committed).

## Goals
- Validate iterative and symbolic RLM loops for correctness and determinism.
- Provide deterministic fixtures for context, plans, and expected artifacts.
- Establish scalable evaluation scenarios (small/medium/large contexts) with bounded runtime.
- Ensure validator gating, state snapshots, and artifact emission are consistent.
- Replicate OOLONG and OOLONG-Pairs evaluation patterns to stress long-context aggregation and pairwise reasoning.

## Non-Goals
- Compare model quality across providers.
- Require networked model calls in CI.
- Redesign core RLM architecture or routing.

## Stakeholders
- Product: Orchestrator owner.
- Engineering: RLM runner + evaluation harness maintainers.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics: 100% pass for unit/integration/eval suites; stable state hash across repeated runs; artifacts emitted per plan; accuracy curves vs context length for OOLONG (label aggregation) and OOLONG-Pairs (pairwise constraints).
- Guardrails / Error Budgets: zero flaky tests; bounded runtime per scenario; offline-only execution.
- Measurement note: OOLONG context length uses dataset token counts; synthetic context-scale uses character/byte lengths.

## User Experience
- Personas: Orchestrator engineers, release QA, CI maintainers.
- User Journeys: run `npm run test:orchestrator` and `npm run eval:test` to validate RLM behavior.

## Technical Considerations
- Reuse RLM repo patterns: persistence and multi-turn tests, parsing/final-answer validation, mock LM behavior.
- Stubbed RLM agent/planner for deterministic outputs; evaluation harness for scenario execution.
- Fixtures should live under `orchestrator/tests/fixtures/` and `evaluation/fixtures/`.
- OOLONG data remains external; fixtures include small local samples plus HF download helper.
- OOLONG evaluation should support fallback length matching (looser tolerance when no exact rows) and repeatability hashes to confirm determinism from cached/offline runs.

## Open Questions
- Should large-scale benchmarks run on PRs or nightly?
- What runtime regression threshold is acceptable (e.g., 20%)?
- What is the preferred injection mechanism for stubbed agent/planner?
- Which OOLONG task groups (counting/user/timeline) should be required in CI?
- What baseline context window should be used to simulate non-RLM truncation?

## Approvals
- Product:
- Engineering:
- Design:
