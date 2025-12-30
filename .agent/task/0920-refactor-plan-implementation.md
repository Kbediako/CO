# Task Checklist - Refactor Plan Implementation (0920)

> Set `MCP_RUNNER_TASK_ID=0920-refactor-plan-implementation` for orchestrator commands. Mirror with `tasks/tasks-0920-refactor-plan-implementation.md` and `docs/TASKS.md`. Flip `[ ]` to `[x]` only with manifest evidence.

## Checklist

### Foundation
- [x] PRD drafted and mirrored in `docs/` - Evidence: `tasks/0920-prd-refactor-plan-implementation.md`, `docs/PRD-refactor-plan-implementation.md`.
- [x] Tech spec drafted - Evidence: `docs/TECH_SPEC-refactor-plan-implementation.md`.
- [x] Action plan drafted - Evidence: `docs/ACTION_PLAN-refactor-plan-implementation.md`.
- [x] Mini-spec stub created - Evidence: `tasks/specs/0920-refactor-plan-implementation.md`.
- [x] Docs-review manifest captured (pre-implementation) - Evidence: `.runs/0920-refactor-plan-implementation/cli/2025-12-30T22-03-29-881Z-82e0a68d/manifest.json`.
- [x] Mirrors updated in `docs/TASKS.md` and `.agent/task/0920-refactor-plan-implementation.md` - Evidence: this PR.

### Phase 1: Quick wins
- [ ] Pipeline DRY consolidation planned + scoped - Evidence: tech spec update.
- [ ] Checklist mirror automation plan + acceptance criteria - Evidence: tech spec update.
- [ ] Legacy wrapper consolidation plan - Evidence: tech spec update.

### Phase 2: Structural consolidation
- [ ] Orchestrator package boundary plan - Evidence: tech spec update.
- [ ] Shared package reduction plan - Evidence: tech spec update.

### Phase 3: Optional modularization
- [ ] Optional module extraction plan - Evidence: tech spec update.
- [ ] Compatibility shim plan - Evidence: tech spec update.

### Validation + handoff
- [ ] Implementation-gate manifest captured (post-implementation) - Evidence: `.runs/0920-refactor-plan-implementation/cli/<run-id>/manifest.json`.

## Relevant Files
- `docs/REFRACTOR_PLAN.md`
- `docs/PRD-refactor-plan-implementation.md`
- `docs/TECH_SPEC-refactor-plan-implementation.md`
- `docs/ACTION_PLAN-refactor-plan-implementation.md`
- `tasks/specs/0920-refactor-plan-implementation.md`

## Subagent Evidence
- 0920-refactor-plan-implementation-docs-verify - `.runs/0920-refactor-plan-implementation-docs-verify/cli/2025-12-30T22-02-59-928Z-ff1875b4/manifest.json`.
