# Task Checklist - 1101-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction

- MCP Task ID: `1101-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction.md`
- TECH_SPEC: `tasks/specs/1101-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction.md`

> This lane follows `1100` by extracting only the remaining inline request-route sequencing shell from `handleRequest()` without reopening deeper helper/controller work.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction.md`, `tasks/specs/1101-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction.md`, `tasks/tasks-1101-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction.md`, `.agent/task/1101-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1101-control-request-route-dispatch-shell-extraction-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1101-coordinator-symphony-aligned-control-request-route-dispatch-shell-extraction.md`, `docs/findings/1101-control-request-route-dispatch-shell-extraction-deliberation.md`.
- [ ] docs-review approval/override captured for registered `1101`.

## Control Request Route Dispatch Shell

- [ ] `controlServer.ts` delegates the remaining request-route branch sequencing through one dedicated dispatcher/helper.
- [ ] Public, UI-session, Linear webhook, and authenticated-route helper ownership stays unchanged.
- [ ] Focused regression coverage proves the new sequencing seam without reopening deeper controller logic.

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
- [ ] Manual request-route dispatch evidence captured.
- [ ] Elegance review completed.
