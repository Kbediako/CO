# Task Checklist - 1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction

- MCP Task ID: `1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction.md`
- TECH_SPEC: `tasks/specs/1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction.md`

> This lane extracts the remaining UI session admission helper assembly from `controlServer.ts` into the existing UI-session controller boundary, or a tiny adjacent controller-owned helper, so the file keeps request-entry orchestration responsibility without carrying `/auth/session` wiring, loopback helper ownership, and local allowed-host normalization inline.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction.md`, `tasks/specs/1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction.md`, `tasks/tasks-1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction.md`, `.agent/task/1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1091-control-server-ui-session-admission-helper-extraction-deliberation.md`, `out/1090-coordinator-symphony-aligned-control-server-public-route-and-ui-asset-helper-extraction/manual/20260309T135121Z-closeout/14-next-slice-note.md`, `out/1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction/manual/20260309T141055Z-docs-first/04-scout-summary.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction.md`, `docs/findings/1091-control-server-ui-session-admission-helper-extraction-deliberation.md`.
- [x] docs-review approval/override captured for registered `1091`. Evidence: `out/1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction/manual/20260309T141055Z-docs-first/00-summary.md`, `out/1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction/manual/20260309T141055Z-docs-first/05-docs-review-override.md`.

## UI Session Admission Helper Extraction

- [ ] Shared UI session admission helpers extracted behind one bounded module.
- [ ] `controlServer.ts` delegates `/auth/session` handling through the extracted helper without changing branch ordering.
- [ ] `/auth/session` behavior remains unchanged after extraction.

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
- [ ] Manual/mock UI session admission helper evidence captured.
- [ ] Elegance review completed.
