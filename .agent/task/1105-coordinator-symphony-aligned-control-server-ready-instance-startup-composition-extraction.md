# Task Checklist - 1105-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction

- MCP Task ID: `1105-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction.md`
- TECH_SPEC: `tasks/specs/1105-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction.md`

> This lane follows `1104` by extracting only the remaining ready-instance startup composition from `ControlServer.start()` without reopening seed loading, request-shell binding, bootstrap helper internals, or startup-sequence behavior.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction.md`, `tasks/specs/1105-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction.md`, `tasks/tasks-1105-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction.md`, `.agent/task/1105-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1105-control-server-ready-instance-startup-composition-extraction-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1105-coordinator-symphony-aligned-control-server-ready-instance-startup-composition-extraction.md`, `docs/findings/1105-control-server-ready-instance-startup-composition-extraction-deliberation.md`.
- [ ] docs-review approval/override captured for registered `1105`.

## Control Server Ready-Instance Startup Composition

- [ ] `ControlServer.start()` delegates the remaining ready-instance startup composition through one dedicated helper.
- [ ] The helper owns only ready-instance construction, bootstrap lifecycle attachment, and final startup sequencing over the extracted collaborators.
- [ ] Focused regression coverage proves the new startup composition seam without reopening request-shell or startup-sequence behavior.

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
- [ ] Manual startup-composition evidence captured.
- [ ] Elegance review completed.
