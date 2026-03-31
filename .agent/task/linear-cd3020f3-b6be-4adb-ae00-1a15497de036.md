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
- [x] Add dashboard controls for pause/resume, compact inspect, and snapshot export. Evidence: `orchestrator/src/cli/control/controlStatusDashboard.ts`, `orchestrator/tests/ControlStatusDashboard.test.ts`.
- [x] Suppress timer-triggered and runtime-triggered redraw while the dashboard is frozen. Evidence: `orchestrator/src/cli/control/controlStatusDashboard.ts`, `orchestrator/tests/ControlStatusDashboard.test.ts`.
- [x] Provide a supported compact inspect path for shorter terminal heights. Evidence: `orchestrator/src/cli/control/controlStatusDashboard.ts`, `orchestrator/tests/ControlStatusDashboard.test.ts`.
- [x] Add a dedicated `co-status` launch surface, with any repo-local alias kept additive only if it stays cheap. Evidence: `bin/codex-orchestrator.ts`, `orchestrator/tests/CodexOrchestratorCli.test.ts`.
- [x] Document the new operator controls and easier launch path. Evidence: `README.md`, `docs/TASKS.md`.

## Validation
- [x] Capture screenshot proof showing `CO STATUS` in normal live mode. Evidence: `out/linear-cd3020f3-b6be-4adb-ae00-1a15497de036/manual/20260331T091859Z-closeout-proof/01-co-status-live.png`.
- [x] Capture screenshot proof showing the paused/frozen inspect state with redraw suppression visible in operator use. Evidence: `out/linear-cd3020f3-b6be-4adb-ae00-1a15497de036/manual/20260331T091859Z-closeout-proof/02-co-status-paused-frozen.png`.
- [x] Capture screenshot proof of the constrained-height inspect path. Evidence: `out/linear-cd3020f3-b6be-4adb-ae00-1a15497de036/manual/20260331T091859Z-closeout-proof/03-co-status-short-terminal-compact.png`.
- [x] Capture proof of the snapshot/export inspection path itself. Evidence: `out/linear-cd3020f3-b6be-4adb-ae00-1a15497de036/manual/20260331T091859Z-closeout-proof/04-co-status-snapshot-view.png`, `out/linear-cd3020f3-b6be-4adb-ae00-1a15497de036/manual/20260331T091859Z-closeout-proof/run-dir/co-status-snapshots/co-status-20260331T091859Z.txt`.
- [x] Capture proof of the simple launch surface. Evidence: `out/linear-cd3020f3-b6be-4adb-ae00-1a15497de036/manual/20260331T091859Z-closeout-proof/05-co-status-launch-help.png`.
- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/linear-cd3020f3-b6be-4adb-ae00-1a15497de036/manual/20260331T091859Z-closeout-proof/00-validation-summary.md`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/linear-cd3020f3-b6be-4adb-ae00-1a15497de036/manual/20260331T091859Z-closeout-proof/00-validation-summary.md`.
- [x] `npm run build`. Evidence: `out/linear-cd3020f3-b6be-4adb-ae00-1a15497de036/manual/20260331T091859Z-closeout-proof/00-validation-summary.md`.
- [x] `npm run lint`. Evidence: `out/linear-cd3020f3-b6be-4adb-ae00-1a15497de036/manual/20260331T091859Z-closeout-proof/00-validation-summary.md`.
- [x] `npm run test`. Evidence: `out/linear-cd3020f3-b6be-4adb-ae00-1a15497de036/manual/20260331T091859Z-closeout-proof/00-validation-summary.md`.
- [x] `npm run docs:check`. Evidence: `out/linear-cd3020f3-b6be-4adb-ae00-1a15497de036/manual/20260331T091859Z-closeout-proof/00-validation-summary.md`.
- [x] `npm run docs:freshness`. Evidence: `out/linear-cd3020f3-b6be-4adb-ae00-1a15497de036/manual/20260331T091859Z-closeout-proof/00-validation-summary.md`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/linear-cd3020f3-b6be-4adb-ae00-1a15497de036/manual/20260331T091859Z-closeout-proof/00-validation-summary.md`.
- [x] Manifest-backed standalone review wrapper executed, and the fallback was recorded after an explicit boundary failure. Evidence: `.runs/linear-cd3020f3-b6be-4adb-ae00-1a15497de036/cli/2026-03-31T08-12-50-173Z-239443da/review/telemetry.json`, `out/linear-cd3020f3-b6be-4adb-ae00-1a15497de036/manual/20260331T091859Z-closeout-proof/06-manual-review.md`, `out/linear-cd3020f3-b6be-4adb-ae00-1a15497de036/manual/20260331T091859Z-closeout-proof/07-elegance-review.md`.
- [x] `npm run pack:smoke`. Evidence: `out/linear-cd3020f3-b6be-4adb-ae00-1a15497de036/manual/20260331T091859Z-closeout-proof/00-validation-summary.md`.

## Handoff
- [x] Exactly one persistent `## Codex Workpad` comment is kept current on the Linear issue. Evidence: Linear comment `acede6bd-bf0d-4c97-91c9-6f25b0bb64cb`.
- [ ] PR attached to the Linear issue before review-state transition. Evidence: pending.
- [ ] Latest `origin/main` merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks green and actionable review feedback handled or explicitly pushed back before review-state transition. Evidence: pending.
- [ ] Issue moved to the actual team review state (`In Review`) only after coding stops. Evidence: pending.
