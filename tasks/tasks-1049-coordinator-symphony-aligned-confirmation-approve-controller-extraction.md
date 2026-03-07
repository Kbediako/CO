# Task Checklist - 1049-coordinator-symphony-aligned-confirmation-approve-controller-extraction

- MCP Task ID: `1049-coordinator-symphony-aligned-confirmation-approve-controller-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-confirmation-approve-controller-extraction.md`
- TECH_SPEC: `tasks/specs/1049-coordinator-symphony-aligned-confirmation-approve-controller-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-confirmation-approve-controller-extraction.md`

> This lane extracts the inline `/confirmations/approve` route into a dedicated controller helper while preserving approval behavior, actor normalization, the `ui.cancel` fast-path, persistence order, runtime publication, response contracts, and leaving broader control policy in `controlServer.ts`.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-confirmation-approve-controller-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-confirmation-approve-controller-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-confirmation-approve-controller-extraction.md`, `tasks/specs/1049-coordinator-symphony-aligned-confirmation-approve-controller-extraction.md`, `tasks/tasks-1049-coordinator-symphony-aligned-confirmation-approve-controller-extraction.md`, `.agent/task/1049-coordinator-symphony-aligned-confirmation-approve-controller-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1049-confirmation-approve-controller-extraction-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated or local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1049-coordinator-symphony-aligned-confirmation-approve-controller-extraction.md`, `docs/findings/1049-confirmation-approve-controller-extraction-deliberation.md`.
- [x] docs-review approval/override captured for registered `1049`. Evidence: `.runs/1049/cli/2026-03-07T12-20-13-297Z-b0e839fc/manifest.json`, `out/1049-coordinator-symphony-aligned-confirmation-approve-controller-extraction/manual/20260307T121716Z-docs-first/05-docs-review-override.md`.

## Confirmation Approve Controller Extraction

- [ ] `/confirmations/approve` route handling is extracted into a dedicated controller module. Evidence: `orchestrator/src/cli/control/`, `orchestrator/src/cli/control/controlServer.ts`.
- [ ] Request-id parsing, actor defaulting, approval persistence, `ui.cancel` fast-path behavior, `confirmation_resolved` emission, control mutation, runtime publication, and response shaping move with the new controller without changing contracts. Evidence: `orchestrator/src/cli/control/`, `orchestrator/tests/ControlServer.test.ts`.
- [ ] Confirmation approve behavior and response contract remain unchanged after extraction. Evidence: `orchestrator/src/cli/control/`, `orchestrator/tests/ControlServer.test.ts`.
- [ ] Route ordering, auth/runner-only gating, shared runtime/event hooks, `/control/action`, and non-approval routes remain in `controlServer.ts`. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/tests/ControlServer.test.ts`.

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1049-coordinator-symphony-aligned-confirmation-approve-controller-extraction/manual/<timestamp>-closeout/01-delegation-guard.log`.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1049-coordinator-symphony-aligned-confirmation-approve-controller-extraction/manual/<timestamp>-closeout/02-spec-guard.log`.
- [ ] `npm run build`. Evidence: `out/1049-coordinator-symphony-aligned-confirmation-approve-controller-extraction/manual/<timestamp>-closeout/03-build.log`.
- [ ] `npm run lint`. Evidence: `out/1049-coordinator-symphony-aligned-confirmation-approve-controller-extraction/manual/<timestamp>-closeout/04-lint.log`.
- [ ] `npm run test`. Evidence: `out/1049-coordinator-symphony-aligned-confirmation-approve-controller-extraction/manual/<timestamp>-closeout/05-test.log`.
- [ ] `npm run docs:check`. Evidence: `out/1049-coordinator-symphony-aligned-confirmation-approve-controller-extraction/manual/<timestamp>-closeout/06-docs-check.log`.
- [ ] `npm run docs:freshness`. Evidence: `out/1049-coordinator-symphony-aligned-confirmation-approve-controller-extraction/manual/<timestamp>-closeout/07-docs-freshness.log`.
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1049-coordinator-symphony-aligned-confirmation-approve-controller-extraction/manual/<timestamp>-closeout/08-diff-budget.log`, `out/1049-coordinator-symphony-aligned-confirmation-approve-controller-extraction/manual/<timestamp>-closeout/13-override-notes.md`.
- [ ] `npm run review`. Evidence: `out/1049-coordinator-symphony-aligned-confirmation-approve-controller-extraction/manual/<timestamp>-closeout/09-review.log`, `out/1049-coordinator-symphony-aligned-confirmation-approve-controller-extraction/manual/<timestamp>-closeout/13-override-notes.md`.
- [ ] `npm run pack:smoke` when required by touched downstream-facing paths. Evidence: `out/1049-coordinator-symphony-aligned-confirmation-approve-controller-extraction/manual/<timestamp>-closeout/10-pack-smoke.log`.
- [ ] Manual mock confirmation-approve controller artifact captured. Evidence: `out/1049-coordinator-symphony-aligned-confirmation-approve-controller-extraction/manual/<timestamp>-closeout/11-manual-confirmation-approve-controller.json`.
- [ ] Elegance review completed. Evidence: `out/1049-coordinator-symphony-aligned-confirmation-approve-controller-extraction/manual/<timestamp>-closeout/12-elegance-review.md`.
