# Task Checklist — 0920-refactor-plan-implementation (0920)

> Set `MCP_RUNNER_TASK_ID=0920-refactor-plan-implementation` for orchestrator commands. Mirror status with `tasks/tasks-0920-refactor-plan-implementation.md` and `docs/TASKS.md`. Flip `[ ]` to `[x]` only with manifest evidence (e.g., `.runs/0920-refactor-plan-implementation/cli/<run-id>/manifest.json`).

## Foundation
- [x] PRD drafted and mirrored in `docs/` - Evidence: `tasks/0920-prd-refactor-plan-implementation.md`, `docs/PRD-refactor-plan-implementation.md`.
- [x] Tech spec drafted - Evidence: `docs/TECH_SPEC-refactor-plan-implementation.md`.
- [x] Action plan drafted - Evidence: `docs/ACTION_PLAN-refactor-plan-implementation.md`.
- [x] Mini-spec stub created - Evidence: `tasks/specs/0920-refactor-plan-implementation.md`.
- [x] Docs-review manifest captured (pre-implementation) - Evidence: `.runs/0920-refactor-plan-implementation/cli/2025-12-30T22-03-29-881Z-82e0a68d/manifest.json`.
- [x] Mirrors updated in `docs/TASKS.md` and `.agent/task/0920-refactor-plan-implementation.md` - Evidence: this PR.

## Phase 1: Quick wins
- [x] Pipeline DRY consolidation implemented - Evidence: `codex.orchestrator.json`, `orchestrator/src/cli/config/userConfig.ts`, `orchestrator/tests/UserConfigStageSets.test.ts`.
- [x] Checklist mirror automation hardened for legacy docs blocks - Evidence: `scripts/docs-hygiene.ts`, `tests/docs-hygiene.spec.ts`.
- [x] Legacy wrapper consolidation aligned on shared CLI resolver - Evidence: `scripts/lib/orchestrator-cli.sh`, `scripts/mcp-runner-start.sh`, `scripts/mcp-runner-poll.sh`, `scripts/run-mcp-diagnostics.sh`.

## Phase 2: Structural consolidation
- [ ] Orchestrator package boundary plan - Evidence: tech spec update.
- [ ] Shared package reduction plan - Evidence: tech spec update.

## Phase 3: Optional modularization
- [ ] Optional module extraction plan - Evidence: tech spec update.
- [ ] Compatibility shim plan - Evidence: tech spec update.

## Validation + handoff
- [x] Implementation-gate manifest captured (post-implementation) - Evidence: `.runs/0920-refactor-plan-implementation/cli/2025-12-30T22-52-59-791Z-dd3e243a/manifest.json`.

## Relevant Files
- `docs/REFRACTOR_PLAN.md`
- `docs/PRD-refactor-plan-implementation.md`
- `docs/TECH_SPEC-refactor-plan-implementation.md`
- `docs/ACTION_PLAN-refactor-plan-implementation.md`
- `tasks/specs/0920-refactor-plan-implementation.md`

## Subagent Evidence
- 0920-refactor-plan-implementation-docs-verify - `.runs/0920-refactor-plan-implementation-docs-verify/cli/2025-12-30T22-02-59-928Z-ff1875b4/manifest.json`.
- 0920-refactor-plan-implementation-docs-sync-review - `.runs/0920-refactor-plan-implementation-docs-sync-review/cli/2025-12-30T22-23-08-516Z-87e4d8de/manifest.json`.
- 0920-refactor-plan-implementation-pipeline-review - `.runs/0920-refactor-plan-implementation-pipeline-review/cli/2025-12-30T22-22-35-494Z-895dea10/manifest.json`.
- 0920-refactor-plan-implementation-phase2-review - `.runs/0920-refactor-plan-implementation-phase2-review/cli/2025-12-30T22-34-56-017Z-723875aa/manifest.json`.
- 0920-refactor-plan-implementation-phase3-review - `.runs/0920-refactor-plan-implementation-phase3-review/cli/2025-12-30T22-36-11-454Z-94ac6869/manifest.json`.
