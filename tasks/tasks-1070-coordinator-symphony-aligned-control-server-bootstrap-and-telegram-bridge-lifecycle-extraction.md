# Task Checklist - 1070-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction

- MCP Task ID: `1070-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction.md`
- TECH_SPEC: `tasks/specs/1070-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction.md`

> This lane continues the Symphony-alignment mainline by extracting the remaining post-bind control-server bootstrap and Telegram bridge lifecycle ownership cluster from `controlServer.ts`.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction.md`, `tasks/specs/1070-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction.md`, `tasks/tasks-1070-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction.md`, `.agent/task/1070-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1070-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1070-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction.md`, `docs/findings/1070-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction-deliberation.md`, `out/1069-coordinator-symphony-aligned-expiry-cycle-and-timer-ownership-extraction/manual/20260308T141237Z-closeout/14-next-slice-note.md`, `out/1070-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction/manual/20260308T143833Z-docs-first/04-scout.md`.
- [x] docs-review approval/override captured for registered `1070`. Evidence: `out/1070-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction/manual/20260308T143833Z-docs-first/00-summary.md`, `out/1070-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction/manual/20260308T143833Z-docs-first/05-docs-review-override.md`.

## Bootstrap + Bridge Lifecycle Extraction

- [x] Auth/endpoint bootstrap ownership moved out of `controlServer.ts` into a dedicated lifecycle owner under `orchestrator/src/cli/control/`. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/src/cli/control/controlServerBootstrapLifecycle.ts`, `out/1070-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction/manual/20260308T145422Z-closeout/00-summary.md`.
- [x] Telegram bridge startup/teardown and runtime subscription wiring moved behind the extracted lifecycle seam without changing behavior. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/src/cli/control/controlServerBootstrapLifecycle.ts`, `orchestrator/tests/ControlServerBootstrapLifecycle.test.ts`, `out/1070-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction/manual/20260308T145422Z-closeout/11-manual-bootstrap-bridge-check.json`.
- [x] Startup failure cleanup and normal close semantics remain intact after extraction. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/tests/ControlServer.test.ts`, `out/1070-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction/manual/20260308T145422Z-closeout/05b-targeted-tests.log`, `out/1070-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction/manual/20260308T145422Z-closeout/12-elegance-review.md`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1070-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction/manual/20260308T145422Z-closeout/01-delegation-guard.log`, `out/1070-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction/manual/20260308T145422Z-closeout/13-override-notes.md`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1070-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction/manual/20260308T145422Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1070-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction/manual/20260308T145422Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1070-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction/manual/20260308T145422Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1070-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction/manual/20260308T145422Z-closeout/05-test.log`, `out/1070-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction/manual/20260308T145422Z-closeout/05b-targeted-tests.log`, `out/1070-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction/manual/20260308T145422Z-closeout/13-override-notes.md`.
- [x] `npm run docs:check`. Evidence: `out/1070-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction/manual/20260308T145422Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1070-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction/manual/20260308T145422Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1070-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction/manual/20260308T145422Z-closeout/08-diff-budget.log`, `out/1070-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction/manual/20260308T145422Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1070-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction/manual/20260308T145422Z-closeout/09-review.log`, `out/1070-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction/manual/20260308T145422Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke`. Evidence: `out/1070-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction/manual/20260308T145422Z-closeout/10-pack-smoke.log`.
- [x] Manual/mock bootstrap-bridge runtime evidence captured. Evidence: `out/1070-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction/manual/20260308T145422Z-closeout/11-manual-bootstrap-bridge-check.json`.
- [x] Elegance review completed. Evidence: `out/1070-coordinator-symphony-aligned-control-server-bootstrap-and-telegram-bridge-lifecycle-extraction/manual/20260308T145422Z-closeout/12-elegance-review.md`.
