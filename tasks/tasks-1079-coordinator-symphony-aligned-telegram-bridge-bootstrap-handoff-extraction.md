# Task Checklist - 1079-coordinator-symphony-aligned-telegram-bridge-bootstrap-handoff-extraction

- MCP Task ID: `1079-coordinator-symphony-aligned-telegram-bridge-bootstrap-handoff-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-telegram-bridge-bootstrap-handoff-extraction.md`
- TECH_SPEC: `tasks/specs/1079-coordinator-symphony-aligned-telegram-bridge-bootstrap-handoff-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-bridge-bootstrap-handoff-extraction.md`

> This lane extracts the remaining Telegram bridge bootstrap handoff so `controlServer.ts` keeps top-level startup ownership while the Telegram bootstrap seam moves behind one bounded helper.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-telegram-bridge-bootstrap-handoff-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-telegram-bridge-bootstrap-handoff-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-bridge-bootstrap-handoff-extraction.md`, `tasks/specs/1079-coordinator-symphony-aligned-telegram-bridge-bootstrap-handoff-extraction.md`, `tasks/tasks-1079-coordinator-symphony-aligned-telegram-bridge-bootstrap-handoff-extraction.md`, `.agent/task/1079-coordinator-symphony-aligned-telegram-bridge-bootstrap-handoff-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1079-telegram-bridge-bootstrap-handoff-extraction-deliberation.md`, `out/1078-coordinator-symphony-aligned-telegram-oversight-read-adapter-factory-extraction/manual/20260309T051949Z-closeout/14-next-slice-note.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1079-coordinator-symphony-aligned-telegram-bridge-bootstrap-handoff-extraction.md`, `docs/findings/1079-telegram-bridge-bootstrap-handoff-extraction-deliberation.md`.
- [x] docs-review approval/override captured for registered `1079`. Evidence: `out/1079-coordinator-symphony-aligned-telegram-bridge-bootstrap-handoff-extraction/manual/20260309T053945Z-docs-first/00-summary.md`, `out/1079-coordinator-symphony-aligned-telegram-bridge-bootstrap-handoff-extraction/manual/20260309T053945Z-docs-first/05-docs-review-override.md`.

## Telegram Bootstrap Handoff

- [ ] Telegram bridge bootstrap handoff extracted behind one bounded helper. Evidence: extracted control-local bootstrap helper, `orchestrator/tests/ControlServerBootstrapLifecycle.test.ts`.
- [ ] `controlServer.ts` delegates Telegram bootstrap handoff assembly to the extracted helper while preserving top-level server startup ownership. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `out/1079-coordinator-symphony-aligned-telegram-bridge-bootstrap-handoff-extraction/manual/<timestamp>-closeout/11-manual-bootstrap-handoff-check.json`.
- [ ] Existing bootstrap metadata persistence, expiry startup ordering, and Telegram bridge subscription behavior remain intact under focused regressions. Evidence: `orchestrator/tests/ControlServerBootstrapLifecycle.test.ts`, `out/1079-coordinator-symphony-aligned-telegram-bridge-bootstrap-handoff-extraction/manual/<timestamp>-closeout/05b-targeted-tests.log`.

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1079-coordinator-symphony-aligned-telegram-bridge-bootstrap-handoff-extraction/manual/<timestamp>-closeout/01-delegation-guard.log`, `.runs/1079-coordinator-symphony-aligned-telegram-bridge-bootstrap-handoff-extraction-guard/cli/<timestamp>/manifest.json`.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1079-coordinator-symphony-aligned-telegram-bridge-bootstrap-handoff-extraction/manual/<timestamp>-closeout/02-spec-guard.log`.
- [ ] `npm run build`. Evidence: `out/1079-coordinator-symphony-aligned-telegram-bridge-bootstrap-handoff-extraction/manual/<timestamp>-closeout/03-build.log`.
- [ ] `npm run lint`. Evidence: `out/1079-coordinator-symphony-aligned-telegram-bridge-bootstrap-handoff-extraction/manual/<timestamp>-closeout/04-lint.log`.
- [ ] `npm run test`. Evidence: `out/1079-coordinator-symphony-aligned-telegram-bridge-bootstrap-handoff-extraction/manual/<timestamp>-closeout/05-test.log`, `out/1079-coordinator-symphony-aligned-telegram-bridge-bootstrap-handoff-extraction/manual/<timestamp>-closeout/05b-targeted-tests.log`.
- [ ] `npm run docs:check`. Evidence: `out/1079-coordinator-symphony-aligned-telegram-bridge-bootstrap-handoff-extraction/manual/<timestamp>-closeout/06-docs-check.log`.
- [ ] `npm run docs:freshness`. Evidence: `out/1079-coordinator-symphony-aligned-telegram-bridge-bootstrap-handoff-extraction/manual/<timestamp>-closeout/07-docs-freshness.log`.
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1079-coordinator-symphony-aligned-telegram-bridge-bootstrap-handoff-extraction/manual/<timestamp>-closeout/08-diff-budget.log`.
- [ ] `npm run review`. Evidence: `out/1079-coordinator-symphony-aligned-telegram-bridge-bootstrap-handoff-extraction/manual/<timestamp>-closeout/09-review.log`.
- [ ] `npm run pack:smoke`. Evidence: `out/1079-coordinator-symphony-aligned-telegram-bridge-bootstrap-handoff-extraction/manual/<timestamp>-closeout/10-pack-smoke.log`.
- [ ] Manual/mock bootstrap handoff evidence captured. Evidence: `out/1079-coordinator-symphony-aligned-telegram-bridge-bootstrap-handoff-extraction/manual/<timestamp>-closeout/11-manual-bootstrap-handoff-check.json`.
- [ ] Elegance review completed. Evidence: `out/1079-coordinator-symphony-aligned-telegram-bridge-bootstrap-handoff-extraction/manual/<timestamp>-closeout/12-elegance-review.md`.
