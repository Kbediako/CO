# Task Checklist - 1163-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-guard-and-planning-shell-extraction

- MCP Task ID: `1163-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-guard-and-planning-shell-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-guard-and-planning-shell-extraction.md`
- TECH_SPEC: `tasks/specs/1163-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-guard-and-planning-shell-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-guard-and-planning-shell-extraction.md`

> This lane follows the completed `1162` task-manager registration extraction. The next bounded Symphony-aligned move is to extract the remaining guard-and-planning cluster still inline in `performRunLifecycle(...)` after the explicit privacy reset, without reopening registration, execution, completion, or public lifecycle ownership.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-guard-and-planning-shell-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-guard-and-planning-shell-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-guard-and-planning-shell-extraction.md`, `tasks/specs/1163-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-guard-and-planning-shell-extraction.md`, `tasks/tasks-1163-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-guard-and-planning-shell-extraction.md`, `.agent/task/1163-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-guard-and-planning-shell-extraction.md`
- [x] Deliberation/findings captured for the guard-and-planning seam. Evidence: `docs/findings/1163-orchestrator-perform-run-lifecycle-guard-and-planning-shell-extraction-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1163-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-guard-and-planning-shell-extraction.md`, `docs/findings/1163-orchestrator-perform-run-lifecycle-guard-and-planning-shell-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1163`. Evidence: `out/1163-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-guard-and-planning-shell-extraction/manual/20260313T175000Z-docs-first/00-summary.md`, `out/1163-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-guard-and-planning-shell-extraction/manual/20260313T175000Z-docs-first/05-docs-review-override.md`, `out/1163-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-guard-and-planning-shell-extraction/manual/20260313T175000Z-docs-first/04-manual-tasks-archive-1061.md`, `.runs/1163-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-guard-and-planning-shell-extraction/cli/2026-03-13T17-44-48-672Z-17704d52/manifest.json`

## Guard-and-Planning Shell Extraction

- [ ] One bounded helper owns the guard-and-planning shell in `performRunLifecycle(...)`.
- [ ] `performRunLifecycle(...)` delegates that seam without changing registration, execution, completion, or public lifecycle authority.
- [ ] Focused regressions preserve ordering, input forwarding, and guard-failure short-circuit behavior.

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`
- [ ] `node scripts/spec-guard.mjs --dry-run`
- [ ] `npm run build`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run docs:check`
- [ ] `npm run docs:freshness`
- [ ] `node scripts/diff-budget.mjs`
- [ ] `npm run review`
- [ ] `npm run pack:smoke`
- [ ] Manual/mock guard-and-planning evidence captured.
- [ ] Elegance review completed.
