# Task Checklist - 1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction

- MCP Task ID: `1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-bootstrap-assembly-extraction.md`
- TECH_SPEC: `tasks/specs/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-bootstrap-assembly-extraction.md`

> This lane extracts the remaining bootstrap collaborator assembly from `ControlServer.start()` so the server shell keeps bind/listen plus top-level startup handling while expiry lifecycle and Telegram bridge bootstrap assembly move behind one bounded helper.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-bootstrap-assembly-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-bootstrap-assembly-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-bootstrap-assembly-extraction.md`, `tasks/specs/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction.md`, `tasks/tasks-1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction.md`, `.agent/task/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1082-control-bootstrap-assembly-extraction-deliberation.md`, `out/1081-coordinator-symphony-aligned-telegram-bridge-lifecycle-ownership-extraction/manual/20260309T080435Z-closeout/14-next-slice-note.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction.md`, `docs/findings/1082-control-bootstrap-assembly-extraction-deliberation.md`.
- [x] docs-review approval/override captured for registered `1082`. Evidence: `out/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction/manual/20260309T073213Z-docs-first/00-summary.md`, `out/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction/manual/20260309T073213Z-docs-first/05-docs-review-override.md`.

## Bootstrap Assembly Extraction

- [x] Bootstrap collaborator assembly extracted behind one bounded helper. Evidence: `orchestrator/src/cli/control/controlBootstrapAssembly.ts`, `orchestrator/tests/ControlBootstrapAssembly.test.ts`, `out/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction/manual/20260309T074214Z-closeout/11-manual-bootstrap-assembly-check.json`.
- [x] `ControlServer.start()` delegates expiry lifecycle plus Telegram bridge bootstrap assembly while preserving bind/listen and top-level start handling. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `out/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction/manual/20260309T074214Z-closeout/11-manual-bootstrap-assembly-check.json`.
- [x] Collaborator wiring, closures, and bootstrap sequencing remain intact under focused regressions. Evidence: `orchestrator/tests/ControlBootstrapAssembly.test.ts`, `orchestrator/tests/ControlTelegramBridgeBootstrapLifecycle.test.ts`, `orchestrator/tests/ControlServerBootstrapLifecycle.test.ts`, `orchestrator/tests/ControlTelegramBridgeLifecycle.test.ts`, `out/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction/manual/20260309T074214Z-closeout/05b-targeted-tests.log`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction/manual/20260309T074214Z-closeout/01-delegation-guard.log`, `.runs/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction-scout/cli/2026-03-09T07-46-01-007Z-3683c0a9/manifest.json`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction/manual/20260309T074214Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction/manual/20260309T074214Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction/manual/20260309T074214Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction/manual/20260309T074214Z-closeout/05-test.log`, `out/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction/manual/20260309T074214Z-closeout/05b-targeted-tests.log`.
- [x] `npm run docs:check`. Evidence: `out/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction/manual/20260309T074214Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction/manual/20260309T074214Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction/manual/20260309T074214Z-closeout/08-diff-budget.log`, `out/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction/manual/20260309T074214Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction/manual/20260309T074214Z-closeout/09-review.log`, `out/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction/manual/20260309T074214Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke`. Evidence: `out/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction/manual/20260309T074214Z-closeout/10-pack-smoke.log`.
- [x] Manual/mock bootstrap assembly evidence captured. Evidence: `out/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction/manual/20260309T074214Z-closeout/11-manual-bootstrap-assembly-check.json`.
- [x] Elegance review completed. Evidence: `out/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction/manual/20260309T074214Z-closeout/12-elegance-review.md`.
