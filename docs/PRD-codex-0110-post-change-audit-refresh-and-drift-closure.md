# PRD - Codex 0.110 Post-Change Audit Refresh + Drift Closure (1007)

## Summary
- Problem Statement: task sequencing and registry state drift emerged after 1004 planning and 1005/1006 execution, so the 0.110 adoption lane needs a post-change audit refresh before 1008 router simplification.
- Desired Outcome: publish complete docs-first artifacts for task 1007, register all mirrors, and capture docs validation evidence for an audit-refresh lane that closes drift and explicitly runs before 1008.
- Scope Status: docs-first scaffolding in progress for 2026-03-05; scope is docs-only.

## User Request Translation
- User intent: create complete docs-first artifacts for `1007-codex-0110-post-change-audit-refresh-and-drift-closure` and wire all registries/mirrors.
- Required outcomes:
  - create PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror for 1007,
  - register 1007 in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`,
  - keep the lane docs-only with no runtime/code edits,
  - capture docs-check evidence under `out/1007-codex-0110-post-change-audit-refresh-and-drift-closure/manual/<timestamp>-docs-first/`,
  - keep explicit sequencing note that 1007 precedes 1008,
  - include `.runs` and `out` manifest/evidence placeholders.

## Goals
- Re-baseline post-change audit intent after 1004/1005/1006 state changes.
- Restore docs/task mirror parity for the 0.110 adoption sequence.
- Make 1007-to-1008 ordering explicit and auditable in all planning artifacts.

## Non-Goals
- No runtime implementation changes in this stream.
- No 1008 AGENTS router simplification execution in this stream.
- No default Codex version policy flip decision in this stream.

## Sequencing Contract
1. `1007` executes post-change audit refresh + drift closure.
2. `1008` AGENTS router simplification is downstream and must start only after 1007 evidence is recorded.

## Risk Controls
- Keep this stream docs-only to avoid mixed-scope drift.
- Require registry + checklist mirror parity before closeout.
- Preserve placeholder links for future docs-review manifest and downstream audit outputs.

## Acceptance Criteria
1. 1007 PRD/TECH_SPEC/ACTION_PLAN/spec/checklist and `.agent` mirror exist and are internally consistent.
2. `tasks/index.json` includes both `items[]` and `specs[]` entries for 1007.
3. `docs/TASKS.md` includes a 1007 snapshot with explicit `1007 -> 1008` sequencing.
4. `docs/docs-freshness-registry.json` includes all new 1007 docs/checklist paths.
5. Required docs checks pass and logs are captured in the 1007 evidence folder.
6. Short standalone elegance review note lists simplifications made.
