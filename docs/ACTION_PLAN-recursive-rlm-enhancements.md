# ACTION_PLAN - Recursive RLM Enhancements (0961)

## Summary
- Goal: Deliver a practical recursive RLM upgrade in two phases: pointer-first subcall propagation and explicit variable handoff (`output_var`/`final_var`).
- Scope: docs-first setup, pointer/runtime changes, variable binding/final resolution, tests, guardrail validation.
- Assumptions: existing symbolic loop remains the base execution model; this is additive.

## Milestones and Sequencing
1) Complete docs-first scaffolding and task mirrors.
2) Implement subcall pointer registry and pointer-aware snippet resolution.
3) Add recursion lineage metadata and planner prompt pointer summaries.
4) Implement variable binding contract (`subcalls[].output_var`, `intent=final.final_var`) with deterministic validation/retry behavior.
5) Add/adjust symbolic tests for pointer chaining, variable binding handoff, and unbound-variable retries.
6) Run guardrails + standalone review and update evidence in task docs.

## Dependencies
- Existing symbolic loop architecture in `orchestrator/src/cli/rlm/symbolic.ts`.
- Existing RLM CLI wiring in `orchestrator/src/cli/rlmRunner.ts`.

## Validation
- Checks / tests:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
- Rollback plan:
  - Revert pointer-specific symbolic changes and keep existing subcall text carry-forward path.

## Risks and Mitigations
- Risk: pointer validation false negatives break valid plans.
  - Mitigation: explicit tests for both `ctx:` and `subcall:` pointer paths; deterministic validation errors.
- Risk: variable contract ambiguity (planner emits both free-form `final_answer` and `final_var` inconsistently).
  - Mitigation: deterministic runtime precedence (`final_var` resolves from binding when provided) and strict unbound-variable retry/fail behavior.
- Risk: planner loses useful context after switching away from raw prior outputs.
  - Mitigation: retain bounded previews and strict prompt truncation fallback.
- Risk: scope creep into a full recursion scheduler rewrite.
  - Mitigation: phase boundaries documented in PRD/TECH_SPEC and checklist.

## Approvals
- Reviewer: Codex (self)
- Date: 2026-02-14
