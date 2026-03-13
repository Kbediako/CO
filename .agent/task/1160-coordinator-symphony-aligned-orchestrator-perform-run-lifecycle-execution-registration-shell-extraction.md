# Task Checklist - 1160-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-registration-shell-extraction

- MCP Task ID: `1160-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-registration-shell-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-registration-shell-extraction.md`
- TECH_SPEC: `tasks/specs/1160-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-registration-shell-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-registration-shell-extraction.md`

> This lane follows the completed `1159` execution-routing shell extraction. The next bounded Symphony-aligned move is to extract the execution-registration cluster still inline in `performRunLifecycle(...)` without reopening control-plane, scheduler, or public lifecycle entrypoints.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-registration-shell-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-registration-shell-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-registration-shell-extraction.md`, `tasks/specs/1160-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-registration-shell-extraction.md`, `tasks/tasks-1160-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-registration-shell-extraction.md`, `.agent/task/1160-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-registration-shell-extraction.md`
- [x] Deliberation/findings captured for the execution-registration seam. Evidence: `docs/findings/1160-orchestrator-perform-run-lifecycle-execution-registration-shell-extraction-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1160-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-registration-shell-extraction.md`, `docs/findings/1160-orchestrator-perform-run-lifecycle-execution-registration-shell-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1160`. Evidence: `out/1160-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-registration-shell-extraction/manual/20260313T150927Z-docs-first/00-summary.md`, `out/1160-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-registration-shell-extraction/manual/20260313T150927Z-docs-first/05-docs-review-override.md`, `.runs/1160-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-registration-shell-extraction/cli/2026-03-13T15-12-37-454Z-a8491291/manifest.json`

## Execution-Registration Shell Extraction

- [x] One bounded helper/service owns the execution-registration cluster in `performRunLifecycle(...)`.
- [x] `performRunLifecycle(...)` delegates that seam without changing control-plane, scheduler, or public lifecycle authority.
- [x] Focused lifecycle/registration regressions preserve dedupe behavior, routed executor forwarding, and latest-result continuity.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`
- [x] `node scripts/spec-guard.mjs --dry-run`
- [x] `npm run build`
- [x] `npm run lint`
- [x] `npm run test`
- [x] `npm run docs:check`
- [x] `npm run docs:freshness`
- [x] `node scripts/diff-budget.mjs`
- [x] `npm run review`
- [x] `npm run pack:smoke`
- [x] Manual/mock execution-registration evidence captured.
- [x] Elegance review completed.
