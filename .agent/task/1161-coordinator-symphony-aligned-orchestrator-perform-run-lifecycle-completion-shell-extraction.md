# Task Checklist - 1161-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-completion-shell-extraction

- MCP Task ID: `1161-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-completion-shell-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-completion-shell-extraction.md`
- TECH_SPEC: `tasks/specs/1161-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-completion-shell-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-completion-shell-extraction.md`

> This lane follows the completed `1160` execution-registration shell extraction. The next bounded Symphony-aligned move is to extract the post-execution completion cluster still inline in `performRunLifecycle(...)` without reopening control-plane guard execution, scheduler-plan creation, or public lifecycle entrypoints.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-completion-shell-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-completion-shell-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-completion-shell-extraction.md`, `tasks/specs/1161-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-completion-shell-extraction.md`, `tasks/tasks-1161-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-completion-shell-extraction.md`, `.agent/task/1161-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-completion-shell-extraction.md`
- [x] Deliberation/findings captured for the completion seam. Evidence: `docs/findings/1161-orchestrator-perform-run-lifecycle-completion-shell-extraction-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1161-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-completion-shell-extraction.md`, `docs/findings/1161-orchestrator-perform-run-lifecycle-completion-shell-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1161`. Evidence: `out/1161-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-completion-shell-extraction/manual/20260313T160315Z-docs-first/00-summary.md`, `out/1161-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-completion-shell-extraction/manual/20260313T160315Z-docs-first/05-docs-review-override.md`, `out/1161-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-completion-shell-extraction/manual/20260313T160315Z-docs-first/04-manual-tasks-archive-0962.md`, `.runs/1161-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-completion-shell-extraction/cli/2026-03-13T16-11-30-143Z-ed2b11de/manifest.json`

## Completion Shell Extraction

- [ ] One bounded helper/service owns the post-execution completion cluster in `performRunLifecycle(...)`.
- [ ] `performRunLifecycle(...)` delegates that seam without changing upstream lifecycle authority.
- [ ] Focused completion regressions preserve finalize/apply ordering, persistence continuity, and completion payload continuity.

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
- [ ] Manual/mock completion evidence captured.
- [ ] Elegance review completed.
