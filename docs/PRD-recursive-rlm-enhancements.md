# PRD - Recursive RLM Enhancements (0961)

## Summary
- Problem Statement: The symbolic RLM loop can recurse via repeated iterations/subcalls, but subcall outputs are currently passed back as inline text snippets, which creates planner prompt noise and weakens deep recursive composition.
- Desired Outcome: Introduce pointer-first subcall result propagation (`subcall:` references) plus recursion metadata so the planner can chain work through stable references, reduce context bloat, and improve long-horizon accuracy; then add an explicit `FINAL_VAR` contract for variable-based recursive handoff.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): Document and execute a substantial improvement program to better align CO's RLM behavior with recursive, async, variable-style orchestration patterns (like FINAL_VAR-style intermediate returns) while staying practical and shippable.
- Success criteria / acceptance:
  - Docs-first artifacts exist and stay in sync (`PRD`, `TECH_SPEC`, `ACTION_PLAN`, task checklist, mirrors/registry/index).
  - Phase-1 runtime changes support pointer-based subcall output references (instead of planner prompt raw text only).
  - Symbolic planner/subcall flow captures recursion metadata for future deeper decomposition.
  - Tests cover new pointer flow and guard against prompt-growth regressions.
  - Phase-2 runtime changes support explicit variable contract fields (`output_var`, `final_var`) and deterministic resolution of final answers from variable bindings.
- Constraints / non-goals:
  - Keep scope to phased incremental patches (no full architecture rewrite).
  - Preserve existing symbolic loop guardrails and budgets.
  - Avoid introducing heavyweight memory/database infrastructure in this phase.

## Goals
- Add a stable reference namespace for prior subcall outputs and enable planner reuse through references.
- Reduce planner context pressure by replacing large prior-subcall text sections with pointer-oriented summaries.
- Capture recursion lineage metadata to support future multi-depth orchestration improvements.
- Add explicit variable-oriented recursive handoff contract (`FINAL_VAR`) to reduce brittle free-form parsing between recursion levels.
- Keep the implementation backward-compatible and auditable for downstream npm users.

## Non-Goals
- Replacing the current symbolic loop with a brand-new runtime.
- Delivering a full autonomous tree-search scheduler in one patch.
- Shipping model-specific prompting experiments unrelated to runtime contracts.

## Stakeholders
- Product: CO operators running long-horizon autonomous coding workflows.
- Engineering: Orchestrator RLM maintainers and downstream package consumers.

## Metrics & Guardrails
- Primary Success Metrics:
  - Planner prompt bytes remain bounded while prior subcall references remain available for next-step planning.
  - New tests prove subcall-pointer reuse works end-to-end in symbolic mode.
  - No regression in existing symbolic loop tests.
- Guardrails / Error Budgets:
  - Preserve existing budget clamps and validation behavior.
  - Do not increase default runtime risk (timeouts, runaway loops, or unbounded context growth).

## User Experience
- Personas:
  - Agent operators running symbolic/delegated long-context tasks.
  - Maintainers verifying behavior through manifests and deterministic tests.
- User Journeys:
  - Run symbolic RLM on a large context -> subcalls produce artifacts and pointer references -> planner chains through references -> final answer remains concise and grounded.

## Technical Considerations
- Architectural Notes:
  - Extend symbolic subcall flow with a pointer registry (`subcall:<iteration>:<subcall_id>`) that maps to generated artifacts.
  - Teach snippet resolution to read from either context pointers (`ctx:`) or prior subcall pointers (`subcall:`).
  - Add recursion metadata fields (e.g., `parent_pointer`) so decomposition lineage is explicit in state artifacts.
  - Add variable registry semantics (`output_var` on subcalls, `final_var` on final intent) with deterministic fallback/validation behavior.
- Dependencies / Integrations:
  - `orchestrator/src/cli/rlm/symbolic.ts`
  - `orchestrator/src/cli/rlm/types.ts`
  - `orchestrator/src/cli/rlmRunner.ts`
  - `orchestrator/tests/RlmSymbolic.test.ts`

## Open Questions
- Should planner prompts include a small bounded preview of prior subcall outputs by default, or pointer-only references?

## Approvals
- Product: Pending
- Engineering: Pending
- Design: N/A
