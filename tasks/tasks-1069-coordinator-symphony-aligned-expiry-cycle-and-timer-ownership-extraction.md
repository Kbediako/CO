# Task Checklist - 1069-coordinator-symphony-aligned-expiry-cycle-and-timer-ownership-extraction

- MCP Task ID: `1069-coordinator-symphony-aligned-expiry-cycle-and-timer-ownership-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-expiry-cycle-and-timer-ownership-extraction.md`
- TECH_SPEC: `tasks/specs/1069-coordinator-symphony-aligned-expiry-cycle-and-timer-ownership-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-expiry-cycle-and-timer-ownership-extraction.md`

> This lane continues the Symphony-alignment mainline by extracting the remaining expiry/background ownership cluster from `controlServer.ts` into a dedicated lifecycle owner.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-expiry-cycle-and-timer-ownership-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-expiry-cycle-and-timer-ownership-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-expiry-cycle-and-timer-ownership-extraction.md`, `tasks/specs/1069-coordinator-symphony-aligned-expiry-cycle-and-timer-ownership-extraction.md`, `tasks/tasks-1069-coordinator-symphony-aligned-expiry-cycle-and-timer-ownership-extraction.md`, `.agent/task/1069-coordinator-symphony-aligned-expiry-cycle-and-timer-ownership-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1069-expiry-cycle-and-timer-ownership-extraction-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated or local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1069-coordinator-symphony-aligned-expiry-cycle-and-timer-ownership-extraction.md`, `docs/findings/1069-expiry-cycle-and-timer-ownership-extraction-deliberation.md`, `out/1069-coordinator-symphony-aligned-expiry-cycle-and-timer-ownership-extraction/manual/20260308T135437Z-docs-first/04-scout.md`.
- [x] docs-review approval/override captured for registered `1069`. Evidence: `out/1069-coordinator-symphony-aligned-expiry-cycle-and-timer-ownership-extraction/manual/20260308T135437Z-docs-first/00-summary.md`, `out/1069-coordinator-symphony-aligned-expiry-cycle-and-timer-ownership-extraction/manual/20260308T135437Z-docs-first/05-docs-review.json`, `out/1069-coordinator-symphony-aligned-expiry-cycle-and-timer-ownership-extraction/manual/20260308T135437Z-docs-first/05-docs-review-override.md`.

## Expiry Cycle Extraction

- [ ] Raw timer plus question/confirmation expiry sweep logic moved out of `controlServer.ts` into a dedicated lifecycle owner under `orchestrator/src/cli/control/`. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/src/cli/control/`.
- [ ] The extracted lifecycle owner exposes a narrow explicit seam and prevents overlapping sweeps. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/tests/ControlServer.test.ts`.
- [ ] Expiry-triggered event emission, question child-resolution reuse, and runtime publish behavior remain intact after extraction. Evidence: `orchestrator/src/cli/control/`, `orchestrator/tests/ControlServer.test.ts`.

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1069-coordinator-symphony-aligned-expiry-cycle-and-timer-ownership-extraction/manual/<timestamp>-closeout/01-delegation-guard.log`.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1069-coordinator-symphony-aligned-expiry-cycle-and-timer-ownership-extraction/manual/<timestamp>-closeout/02-spec-guard.log`.
- [ ] `npm run build`. Evidence: `out/1069-coordinator-symphony-aligned-expiry-cycle-and-timer-ownership-extraction/manual/<timestamp>-closeout/03-build.log`.
- [ ] `npm run lint`. Evidence: `out/1069-coordinator-symphony-aligned-expiry-cycle-and-timer-ownership-extraction/manual/<timestamp>-closeout/04-lint.log`.
- [ ] `npm run test`. Evidence: `out/1069-coordinator-symphony-aligned-expiry-cycle-and-timer-ownership-extraction/manual/<timestamp>-closeout/05-test.log`.
- [ ] `npm run docs:check`. Evidence: `out/1069-coordinator-symphony-aligned-expiry-cycle-and-timer-ownership-extraction/manual/<timestamp>-closeout/06-docs-check.log`.
- [ ] `npm run docs:freshness`. Evidence: `out/1069-coordinator-symphony-aligned-expiry-cycle-and-timer-ownership-extraction/manual/<timestamp>-closeout/07-docs-freshness.log`.
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1069-coordinator-symphony-aligned-expiry-cycle-and-timer-ownership-extraction/manual/<timestamp>-closeout/08-diff-budget.log`.
- [ ] `npm run review`. Evidence: `out/1069-coordinator-symphony-aligned-expiry-cycle-and-timer-ownership-extraction/manual/<timestamp>-closeout/09-review.log`.
- [ ] `npm run pack:smoke`. Evidence: `out/1069-coordinator-symphony-aligned-expiry-cycle-and-timer-ownership-extraction/manual/<timestamp>-closeout/10-pack-smoke.log`.
- [ ] Manual/mock expiry-cycle runtime evidence captured. Evidence: `out/1069-coordinator-symphony-aligned-expiry-cycle-and-timer-ownership-extraction/manual/<timestamp>-closeout/11-manual-expiry-cycle-check.json`.
- [ ] Elegance review completed. Evidence: `out/1069-coordinator-symphony-aligned-expiry-cycle-and-timer-ownership-extraction/manual/<timestamp>-closeout/12-elegance-review.md`.
