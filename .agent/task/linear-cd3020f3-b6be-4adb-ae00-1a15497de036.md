# Task Checklist - linear-cd3020f3-b6be-4adb-ae00-1a15497de036

- Linear Issue: `CO-55` / `cd3020f3-b6be-4adb-ae00-1a15497de036`
- MCP Task ID: `linear-cd3020f3-b6be-4adb-ae00-1a15497de036`
- Primary PRD: `docs/PRD-linear-cd3020f3-b6be-4adb-ae00-1a15497de036.md`
- TECH_SPEC: `tasks/specs/linear-cd3020f3-b6be-4adb-ae00-1a15497de036.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-cd3020f3-b6be-4adb-ae00-1a15497de036.md`

## Docs-First
- [x] PRD drafted for the `CO-55` inspectability and launch-ergonomics lane. Evidence: `docs/PRD-linear-cd3020f3-b6be-4adb-ae00-1a15497de036.md`.
- [x] TECH_SPEC drafted with the bounded interaction contract, snapshot/export plan, and launch-surface scope. Evidence: `tasks/specs/linear-cd3020f3-b6be-4adb-ae00-1a15497de036.md`, `docs/TECH_SPEC-linear-cd3020f3-b6be-4adb-ae00-1a15497de036.md`.
- [x] ACTION_PLAN drafted for docs-review, interaction implementation, proof capture, and handoff. Evidence: `docs/ACTION_PLAN-linear-cd3020f3-b6be-4adb-ae00-1a15497de036.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new lane snapshot. Evidence: `docs/TASKS.md`.
- [x] `docs/docs-freshness-registry.json` updated for the new docs/task artifacts. Evidence: `docs/docs-freshness-registry.json`.
- [x] Checklist mirrored to `.agent/task/linear-cd3020f3-b6be-4adb-ae00-1a15497de036.md`. Evidence: `.agent/task/linear-cd3020f3-b6be-4adb-ae00-1a15497de036.md`.
- [x] Standalone pre-implementation self-review captured in the spec review notes. Evidence: `tasks/specs/linear-cd3020f3-b6be-4adb-ae00-1a15497de036.md`.
- [x] docs-review approval captured for `linear-cd3020f3-b6be-4adb-ae00-1a15497de036`. Evidence: `.runs/linear-cd3020f3-b6be-4adb-ae00-1a15497de036-docs-review/cli/2026-03-31T08-32-40-711Z-9badba58/manifest.json`.

## Implementation
- [ ] Add dashboard controls for pause/resume, compact inspect, and snapshot export. Evidence: pending implementation.
- [ ] Suppress timer-triggered and runtime-triggered redraw while the dashboard is frozen. Evidence: pending implementation.
- [ ] Provide a supported compact inspect path for shorter terminal heights. Evidence: pending implementation.
- [ ] Add a dedicated `co-status` launch surface, with any repo-local alias kept additive only if it stays cheap. Evidence: pending implementation.
- [ ] Document the new operator controls and easier launch path. Evidence: pending implementation.

## Validation
- [ ] Capture screenshot proof showing `CO STATUS` in normal live mode. Evidence: pending.
- [ ] Capture screenshot proof showing the paused/frozen inspect state with redraw suppression visible in operator use. Evidence: pending.
- [ ] Capture screenshot proof of the constrained-height inspect path. Evidence: pending.
- [ ] Capture proof of the snapshot/export inspection path itself. Evidence: pending.
- [ ] Capture proof of the simple launch surface. Evidence: pending.
- [ ] `node scripts/delegation-guard.mjs`. Evidence: pending.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: pending.
- [ ] `npm run build`. Evidence: pending.
- [ ] `npm run lint`. Evidence: pending.
- [ ] `npm run test`. Evidence: pending.
- [ ] `npm run docs:check`. Evidence: pending.
- [ ] `npm run docs:freshness`. Evidence: pending.
- [ ] `node scripts/diff-budget.mjs`. Evidence: pending.
- [ ] `FORCE_CODEX_REVIEW=1 npm run review`. Evidence: pending.
- [ ] `npm run pack:smoke`. Evidence: pending.

## Handoff
- [x] Exactly one persistent `## Codex Workpad` comment is kept current on the Linear issue. Evidence: Linear comment `acede6bd-bf0d-4c97-91c9-6f25b0bb64cb`.
- [ ] PR attached to the Linear issue before review-state transition. Evidence: pending.
- [ ] Latest `origin/main` merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks green and actionable review feedback handled or explicitly pushed back before review-state transition. Evidence: pending.
- [ ] Issue moved to the actual team review state (`In Review`) only after coding stops. Evidence: pending.
