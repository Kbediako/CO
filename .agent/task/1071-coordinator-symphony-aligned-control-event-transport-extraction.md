# Task Checklist - 1071-coordinator-symphony-aligned-control-event-transport-extraction

- MCP Task ID: `1071-coordinator-symphony-aligned-control-event-transport-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-event-transport-extraction.md`
- TECH_SPEC: `tasks/specs/1071-coordinator-symphony-aligned-control-event-transport-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-event-transport-extraction.md`

> This lane continues the Symphony-alignment mainline by extracting the remaining control-event transport cluster from `controlServer.ts`.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-event-transport-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-event-transport-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-event-transport-extraction.md`, `tasks/specs/1071-coordinator-symphony-aligned-control-event-transport-extraction.md`, `tasks/tasks-1071-coordinator-symphony-aligned-control-event-transport-extraction.md`, `.agent/task/1071-coordinator-symphony-aligned-control-event-transport-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1071-control-event-transport-extraction-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1071-coordinator-symphony-aligned-control-event-transport-extraction.md`, `docs/findings/1071-control-event-transport-extraction-deliberation.md`, `out/1070-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction/manual/20260308T145422Z-closeout/14-next-slice-note.md`.
- [x] docs-review approval/override captured for registered `1071`. Evidence: `out/1071-coordinator-symphony-aligned-control-event-transport-extraction/manual/20260308T151343Z-docs-first/05-docs-review-override.md`.

## Control Event Transport Extraction

- [x] Control-event append plus shared SSE/runtime fan-out ownership moved out of `controlServer.ts` into a dedicated transport owner under `orchestrator/src/cli/control/`. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/src/cli/control/controlEventTransport.ts`.
- [x] The extracted transport preserves SSE framing, dead-client pruning, and runtime publish-on-broadcast semantics. Evidence: `orchestrator/src/cli/control/controlEventTransport.ts`, `orchestrator/tests/ControlEventTransport.test.ts`, `out/1071-coordinator-symphony-aligned-control-event-transport-extraction/manual/20260308T152650Z-closeout/11-manual-control-event-transport-check.json`.
- [x] Request/route behavior remains intact after the transport extraction. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/tests/ControlServer.test.ts`, `out/1071-coordinator-symphony-aligned-control-event-transport-extraction/manual/20260308T152650Z-closeout/05b-targeted-tests.log`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1071-coordinator-symphony-aligned-control-event-transport-extraction/manual/20260308T152650Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1071-coordinator-symphony-aligned-control-event-transport-extraction/manual/20260308T152650Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1071-coordinator-symphony-aligned-control-event-transport-extraction/manual/20260308T152650Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1071-coordinator-symphony-aligned-control-event-transport-extraction/manual/20260308T152650Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1071-coordinator-symphony-aligned-control-event-transport-extraction/manual/20260308T152650Z-closeout/05-test.log`, `out/1071-coordinator-symphony-aligned-control-event-transport-extraction/manual/20260308T152650Z-closeout/05b-targeted-tests.log`, `out/1071-coordinator-symphony-aligned-control-event-transport-extraction/manual/20260308T152650Z-closeout/13-override-notes.md`.
- [x] `npm run docs:check`. Evidence: `out/1071-coordinator-symphony-aligned-control-event-transport-extraction/manual/20260308T152650Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1071-coordinator-symphony-aligned-control-event-transport-extraction/manual/20260308T152650Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1071-coordinator-symphony-aligned-control-event-transport-extraction/manual/20260308T152650Z-closeout/08-diff-budget.log`, `out/1071-coordinator-symphony-aligned-control-event-transport-extraction/manual/20260308T152650Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1071-coordinator-symphony-aligned-control-event-transport-extraction/manual/20260308T152650Z-closeout/09-review.log`, `out/1071-coordinator-symphony-aligned-control-event-transport-extraction/manual/20260308T152650Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke`. Evidence: `out/1071-coordinator-symphony-aligned-control-event-transport-extraction/manual/20260308T152650Z-closeout/10-pack-smoke.log`.
- [x] Manual/mock event-transport runtime evidence captured. Evidence: `out/1071-coordinator-symphony-aligned-control-event-transport-extraction/manual/20260308T152650Z-closeout/11-manual-control-event-transport-check.json`.
- [x] Elegance review completed. Evidence: `out/1071-coordinator-symphony-aligned-control-event-transport-extraction/manual/20260308T152650Z-closeout/12-elegance-review.md`.
