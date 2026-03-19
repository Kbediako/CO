# Task Checklist - 1083-coordinator-symphony-aligned-control-server-startup-shell-extraction

- MCP Task ID: `1083-coordinator-symphony-aligned-control-server-startup-shell-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-server-startup-shell-extraction.md`
- TECH_SPEC: `tasks/specs/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-startup-shell-extraction.md`

> This lane extracts the remaining startup shell from `ControlServer.start()` so the server method keeps top-level composition and ready-instance return while bind/listen, base URL derivation, final bootstrap start, and close-on-failure behavior move behind one bounded helper.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-server-startup-shell-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-server-startup-shell-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-server-startup-shell-extraction.md`, `tasks/specs/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction.md`, `tasks/tasks-1083-coordinator-symphony-aligned-control-server-startup-shell-extraction.md`, `.agent/task/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1083-control-server-startup-shell-extraction-deliberation.md`, `out/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction/manual/20260309T074214Z-closeout/14-next-slice-note.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction.md`, `docs/findings/1083-control-server-startup-shell-extraction-deliberation.md`.
- [x] docs-review approval/override captured for registered `1083`. Evidence: `out/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction/manual/20260309T075850Z-docs-first/00-summary.md`, `out/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction/manual/20260309T075850Z-docs-first/05-docs-review-override.md`.

## Startup Shell Extraction

- [x] Startup shell extracted behind one bounded helper. Evidence: `orchestrator/src/cli/control/controlServerStartupSequence.ts`, `orchestrator/tests/ControlServerStartupSequence.test.ts`, `out/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction/manual/20260309T095023Z-closeout/00-summary.md`.
- [x] `ControlServer.start()` delegates bind/listen plus final bootstrap start while preserving startup ordering and failure cleanup. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `out/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction/manual/20260309T095023Z-closeout/11-manual-startup-shell-check.json`.
- [x] Startup success and close-on-failure behavior remain intact under focused regressions. Evidence: `orchestrator/tests/ControlServer.test.ts`, `orchestrator/tests/ControlServerStartupSequence.test.ts`, `out/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction/manual/20260309T095023Z-closeout/05b-targeted-tests.log`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction/manual/20260309T095023Z-closeout/01-delegation-guard.log`, `.runs/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction-scout/cli/2026-03-09T09-48-38-634Z-66ca07d4/manifest.json`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction/manual/20260309T095023Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction/manual/20260309T095023Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction/manual/20260309T095023Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction/manual/20260309T095023Z-closeout/05-test.log`, `out/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction/manual/20260309T095023Z-closeout/05b-targeted-tests.log`.
- [x] `npm run docs:check`. Evidence: `out/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction/manual/20260309T095023Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction/manual/20260309T095023Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction/manual/20260309T095023Z-closeout/08-diff-budget.log`.
- [x] `npm run review`. Evidence: `out/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction/manual/20260309T095023Z-closeout/09-review.log`, `out/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction/manual/20260309T095023Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke`. Evidence: `out/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction/manual/20260309T095023Z-closeout/10-pack-smoke.log`.
- [x] Manual/mock startup-shell evidence captured. Evidence: `out/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction/manual/20260309T095023Z-closeout/11-manual-startup-shell-check.json`.
- [x] Elegance review completed. Evidence: `out/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction/manual/20260309T095023Z-closeout/12-elegance-review.md`.
