# Task Archive — 2025

- Generated: 2025-12-31T05:02:31.778Z
- Source: docs/TASKS.md on main
- Policy: docs/tasks-archive-policy.json
# Task List Snapshot — Refactor Plan Implementation Docs (0920)

- Update - Phase 2/3 consolidation complete; docs-review manifest captured at `.runs/0920-refactor-plan-implementation/cli/2025-12-30T23-18-24-223Z-413557d2/manifest.json`; implementation-gate manifest captured at `.runs/0920-refactor-plan-implementation/cli/2025-12-30T23-23-30-858Z-95cd6736/manifest.json`.

<!-- docs-sync:begin 0920-refactor-plan-implementation -->
## Checklist Mirror
Mirror status with `tasks/tasks-0920-refactor-plan-implementation.md` and `.agent/task/0920-refactor-plan-implementation.md`. Keep `[ ]` until evidence is recorded.

### Foundation
- [x] PRD drafted and mirrored in `docs/` - Evidence: `tasks/0920-prd-refactor-plan-implementation.md`, `docs/PRD-refactor-plan-implementation.md`.
- [x] Tech spec drafted - Evidence: `docs/TECH_SPEC-refactor-plan-implementation.md`.
- [x] Action plan drafted - Evidence: `docs/ACTION_PLAN-refactor-plan-implementation.md`.
- [x] Mini-spec stub created - Evidence: `tasks/specs/0920-refactor-plan-implementation.md`.
- [x] Docs-review manifest captured (pre-implementation) - Evidence: `.runs/0920-refactor-plan-implementation/cli/2025-12-30T22-03-29-881Z-82e0a68d/manifest.json`, `.runs/0920-refactor-plan-implementation/cli/2025-12-30T23-18-24-223Z-413557d2/manifest.json`.
- [x] Mirrors updated in `docs/TASKS.md` and `.agent/task/0920-refactor-plan-implementation.md` - Evidence: this PR.

### Phase 1: Quick wins
- [x] Pipeline DRY consolidation implemented - Evidence: `codex.orchestrator.json`, `orchestrator/src/cli/config/userConfig.ts`, `orchestrator/tests/UserConfigStageSets.test.ts`.
- [x] Checklist mirror automation hardened for legacy docs blocks - Evidence: `scripts/docs-hygiene.ts`, `tests/docs-hygiene.spec.ts`.
- [x] Legacy wrapper consolidation aligned on shared CLI resolver - Evidence: `scripts/lib/orchestrator-cli.sh`, `scripts/mcp-runner-start.sh`, `scripts/mcp-runner-poll.sh`, `scripts/run-mcp-diagnostics.sh`.

### Phase 2: Structural consolidation
- [x] Orchestrator package boundary plan - Evidence: `packages/orchestrator/src/index.ts`, `orchestrator/src/cli/services/execRuntime.ts`, `orchestrator/src/cli/services/commandRunner.ts`, `orchestrator/src/privacy/guard.ts`.
- [x] Shared package reduction plan - Evidence: `packages/orchestrator/src/exec/stdio.ts`, `packages/shared/streams/stdio.ts`, `packages/orchestrator/src/exec/unified-exec.ts`.

### Phase 3: Optional modularization
- [x] Optional module extraction plan - Evidence: `orchestrator/src/cli/exec/learning.ts`.
- [x] Compatibility shim plan - Evidence: `packages/shared/streams/stdio.ts`.

### Validation + handoff
- [x] Implementation-gate manifest captured (post-implementation) - Evidence: `.runs/0920-refactor-plan-implementation/cli/2025-12-30T22-52-59-791Z-dd3e243a/manifest.json`, `.runs/0920-refactor-plan-implementation/cli/2025-12-30T23-23-30-858Z-95cd6736/manifest.json`.

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
<!-- docs-sync:end 0920-refactor-plan-implementation -->
