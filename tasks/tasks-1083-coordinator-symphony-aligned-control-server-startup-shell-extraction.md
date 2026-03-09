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
- [ ] docs-review approval/override captured for registered `1083`. Evidence: `out/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction/manual/<timestamp>-docs-first/00-summary.md`, `out/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction/manual/<timestamp>-docs-first/05-docs-review-override.md`.

## Startup Shell Extraction

- [ ] Startup shell extracted behind one bounded helper. Evidence: extracted control-local helper, focused startup tests.
- [ ] `ControlServer.start()` delegates bind/listen plus final bootstrap start while preserving startup ordering and failure cleanup. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `out/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction/manual/<timestamp>-closeout/11-manual-startup-shell-check.json`.
- [ ] Startup success and close-on-failure behavior remain intact under focused regressions. Evidence: focused startup/server tests, `out/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction/manual/<timestamp>-closeout/05b-targeted-tests.log`.

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction/manual/<timestamp>-closeout/01-delegation-guard.log`, `.runs/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction-*/cli/<timestamp>/manifest.json`.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction/manual/<timestamp>-closeout/02-spec-guard.log`.
- [ ] `npm run build`. Evidence: `out/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction/manual/<timestamp>-closeout/03-build.log`.
- [ ] `npm run lint`. Evidence: `out/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction/manual/<timestamp>-closeout/04-lint.log`.
- [ ] `npm run test`. Evidence: `out/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction/manual/<timestamp>-closeout/05-test.log`, `out/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction/manual/<timestamp>-closeout/05b-targeted-tests.log`.
- [ ] `npm run docs:check`. Evidence: `out/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction/manual/<timestamp>-closeout/06-docs-check.log`.
- [ ] `npm run docs:freshness`. Evidence: `out/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction/manual/<timestamp>-closeout/07-docs-freshness.log`.
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction/manual/<timestamp>-closeout/08-diff-budget.log`.
- [ ] `npm run review`. Evidence: `out/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction/manual/<timestamp>-closeout/09-review.log`.
- [ ] `npm run pack:smoke`. Evidence: `out/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction/manual/<timestamp>-closeout/10-pack-smoke.log`.
- [ ] Manual/mock startup-shell evidence captured. Evidence: `out/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction/manual/<timestamp>-closeout/11-manual-startup-shell-check.json`.
- [ ] Elegance review completed. Evidence: `out/1083-coordinator-symphony-aligned-control-server-startup-shell-extraction/manual/<timestamp>-closeout/12-elegance-review.md`.
