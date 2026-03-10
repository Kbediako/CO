# Task Checklist - 1103-coordinator-symphony-aligned-control-request-controller-shell-extraction

- MCP Task ID: `1103-coordinator-symphony-aligned-control-request-controller-shell-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-request-controller-shell-extraction.md`
- TECH_SPEC: `tasks/specs/1103-coordinator-symphony-aligned-control-request-controller-shell-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-request-controller-shell-extraction.md`

> This lane follows `1102` by extracting only the remaining inline request-controller shell from `handleRequest()` without reopening pre-dispatch, route sequencing, or deeper control-surface helpers.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-request-controller-shell-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-request-controller-shell-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-request-controller-shell-extraction.md`, `tasks/specs/1103-coordinator-symphony-aligned-control-request-controller-shell-extraction.md`, `tasks/tasks-1103-coordinator-symphony-aligned-control-request-controller-shell-extraction.md`, `.agent/task/1103-coordinator-symphony-aligned-control-request-controller-shell-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1103-control-request-controller-shell-extraction-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1103-coordinator-symphony-aligned-control-request-controller-shell-extraction.md`, `docs/findings/1103-control-request-controller-shell-extraction-deliberation.md`.
- [ ] docs-review approval/override captured for registered `1103`.

## Control Request Controller Shell

- [ ] `controlServer.ts` delegates the remaining inline request-controller shell through one dedicated helper.
- [ ] The helper owns only null fallthrough and route-dispatch handoff.
- [ ] Focused regression coverage proves the new request-controller seam without reopening pre-dispatch or route-dispatch logic.

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
- [ ] Manual request-controller evidence captured.
- [ ] Elegance review completed.
