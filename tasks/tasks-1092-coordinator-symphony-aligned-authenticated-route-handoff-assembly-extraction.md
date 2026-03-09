# Task Checklist - 1092-coordinator-symphony-aligned-authenticated-route-handoff-assembly-extraction

- MCP Task ID: `1092-coordinator-symphony-aligned-authenticated-route-handoff-assembly-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-authenticated-route-handoff-assembly-extraction.md`
- TECH_SPEC: `tasks/specs/1092-coordinator-symphony-aligned-authenticated-route-handoff-assembly-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-authenticated-route-handoff-assembly-extraction.md`

> This lane extracts the remaining authenticated-route handoff assembly from `controlServer.ts` into the authenticated-route controller boundary so the file keeps request-entry ordering, authenticated admission, and fallback ownership without carrying the large request-scoped controller context bag inline.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-authenticated-route-handoff-assembly-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-authenticated-route-handoff-assembly-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-authenticated-route-handoff-assembly-extraction.md`, `tasks/specs/1092-coordinator-symphony-aligned-authenticated-route-handoff-assembly-extraction.md`, `tasks/tasks-1092-coordinator-symphony-aligned-authenticated-route-handoff-assembly-extraction.md`, `.agent/task/1092-coordinator-symphony-aligned-authenticated-route-handoff-assembly-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1092-authenticated-route-handoff-assembly-extraction-deliberation.md`, `out/1091-coordinator-symphony-aligned-control-server-ui-session-admission-helper-extraction/manual/20260309T142435Z-closeout/14-next-slice-note.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1092-coordinator-symphony-aligned-authenticated-route-handoff-assembly-extraction.md`, `docs/findings/1092-authenticated-route-handoff-assembly-extraction-deliberation.md`.
- [x] docs-review approval/override captured for registered `1092`. Evidence: `out/1092-coordinator-symphony-aligned-authenticated-route-handoff-assembly-extraction/manual/20260309T145637Z-docs-first/00-summary.md`, `out/1092-coordinator-symphony-aligned-authenticated-route-handoff-assembly-extraction/manual/20260309T145637Z-docs-first/04-scout-summary.md`, `out/1092-coordinator-symphony-aligned-authenticated-route-handoff-assembly-extraction/manual/20260309T145637Z-docs-first/05-docs-review-override.md`.

## Authenticated Route Handoff Assembly Extraction

- [ ] Shared authenticated-route handoff assembly extracted behind one bounded controller-owned seam.
- [ ] `controlServer.ts` delegates authenticated-route handoff construction without changing branch ordering or authority ownership.
- [ ] Authenticated-route behavior remains unchanged after extraction.

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
- [ ] Manual/mock authenticated-route handoff evidence captured.
- [ ] Elegance review completed.
