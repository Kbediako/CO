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
- [ ] docs-review approval/override captured for registered `1082`. Evidence: `out/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction/manual/<timestamp>-docs-first/00-summary.md`, `out/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction/manual/<timestamp>-docs-first/05-docs-review-override.md`.

## Bootstrap Assembly Extraction

- [ ] Bootstrap collaborator assembly extracted behind one bounded helper. Evidence: extracted control-local helper, focused bootstrap tests.
- [ ] `ControlServer.start()` delegates expiry lifecycle plus Telegram bridge bootstrap assembly while preserving bind/listen and top-level start handling. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `out/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction/manual/<timestamp>-closeout/11-manual-bootstrap-assembly-check.json`.
- [ ] Collaborator wiring, closures, and bootstrap sequencing remain intact under focused regressions. Evidence: focused bootstrap/server tests, `out/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction/manual/<timestamp>-closeout/05b-targeted-tests.log`.

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction/manual/<timestamp>-closeout/01-delegation-guard.log`, `.runs/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction-guard/cli/<timestamp>/manifest.json`.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction/manual/<timestamp>-closeout/02-spec-guard.log`.
- [ ] `npm run build`. Evidence: `out/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction/manual/<timestamp>-closeout/03-build.log`.
- [ ] `npm run lint`. Evidence: `out/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction/manual/<timestamp>-closeout/04-lint.log`.
- [ ] `npm run test`. Evidence: `out/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction/manual/<timestamp>-closeout/05-test.log`, `out/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction/manual/<timestamp>-closeout/05b-targeted-tests.log`.
- [ ] `npm run docs:check`. Evidence: `out/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction/manual/<timestamp>-closeout/06-docs-check.log`.
- [ ] `npm run docs:freshness`. Evidence: `out/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction/manual/<timestamp>-closeout/07-docs-freshness.log`.
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction/manual/<timestamp>-closeout/08-diff-budget.log`.
- [ ] `npm run review`. Evidence: `out/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction/manual/<timestamp>-closeout/09-review.log`.
- [ ] `npm run pack:smoke`. Evidence: `out/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction/manual/<timestamp>-closeout/10-pack-smoke.log`.
- [ ] Manual/mock bootstrap assembly evidence captured. Evidence: `out/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction/manual/<timestamp>-closeout/11-manual-bootstrap-assembly-check.json`.
- [ ] Elegance review completed. Evidence: `out/1082-coordinator-symphony-aligned-control-bootstrap-assembly-extraction/manual/<timestamp>-closeout/12-elegance-review.md`.
