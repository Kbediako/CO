# Task Checklist - 1045-coordinator-symphony-aligned-delegation-register-controller-extraction

- MCP Task ID: `1045-coordinator-symphony-aligned-delegation-register-controller-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-delegation-register-controller-extraction.md`
- TECH_SPEC: `tasks/specs/1045-coordinator-symphony-aligned-delegation-register-controller-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-delegation-register-controller-extraction.md`

> This lane extracts the inline `/delegation/register` route into a dedicated controller helper while preserving current delegation-token registration behavior, auth ordering, broader control policy, and the harder authority-bearing routes.

## Foundation
- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-delegation-register-controller-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-delegation-register-controller-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-delegation-register-controller-extraction.md`, `tasks/specs/1045-coordinator-symphony-aligned-delegation-register-controller-extraction.md`, `tasks/tasks-1045-coordinator-symphony-aligned-delegation-register-controller-extraction.md`, `.agent/task/1045-coordinator-symphony-aligned-delegation-register-controller-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1045-delegation-register-controller-extraction-deliberation.md`.

## Shared Registry + Review Handoff
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated or local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1045-coordinator-symphony-aligned-delegation-register-controller-extraction.md`, `docs/findings/1045-delegation-register-controller-extraction-deliberation.md`.
- [x] docs-review approval/override captured for registered `1045`. Evidence: `.runs/1045-coordinator-symphony-aligned-delegation-register-controller-extraction/cli/2026-03-07T09-42-34-235Z-1948acfd/manifest.json`, `out/1045-coordinator-symphony-aligned-delegation-register-controller-extraction/manual/20260307T093955Z-docs-first/05-docs-review-override.md`.

## Delegation Register Controller Extraction
- [ ] `/delegation/register` route handling is extracted into a dedicated controller module. Evidence: `orchestrator/src/cli/control/`, `orchestrator/src/cli/control/controlServer.ts`.
- [ ] Delegation-register request parsing, required-field validation, token registration, persistence trigger, and response shaping move with the new controller without changing contracts. Evidence: `orchestrator/src/cli/control/`, `orchestrator/tests/ControlServer.test.ts`.
- [ ] Delegation-register validation behavior and response contract remain unchanged after extraction. Evidence: `orchestrator/src/cli/control/`, `orchestrator/tests/ControlServer.test.ts`.
- [ ] Route ordering, auth/runner-only gating, shared runtime/event hooks, and non-delegation routes remain in `controlServer.ts`. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/tests/ControlServer.test.ts`.

## Validation + Closeout
- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1045-coordinator-symphony-aligned-delegation-register-controller-extraction/manual/<timestamp>-closeout/01-delegation-guard.log`.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1045-coordinator-symphony-aligned-delegation-register-controller-extraction/manual/<timestamp>-closeout/02-spec-guard.log`.
- [ ] `npm run build`. Evidence: `out/1045-coordinator-symphony-aligned-delegation-register-controller-extraction/manual/<timestamp>-closeout/03-build.log`.
- [ ] `npm run lint`. Evidence: `out/1045-coordinator-symphony-aligned-delegation-register-controller-extraction/manual/<timestamp>-closeout/04-lint.log`.
- [ ] `npm run test`. Evidence: `out/1045-coordinator-symphony-aligned-delegation-register-controller-extraction/manual/<timestamp>-closeout/05-test.log`.
- [ ] `npm run docs:check`. Evidence: `out/1045-coordinator-symphony-aligned-delegation-register-controller-extraction/manual/<timestamp>-closeout/06-docs-check.log`.
- [ ] `npm run docs:freshness`. Evidence: `out/1045-coordinator-symphony-aligned-delegation-register-controller-extraction/manual/<timestamp>-closeout/07-docs-freshness.log`.
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1045-coordinator-symphony-aligned-delegation-register-controller-extraction/manual/<timestamp>-closeout/08-diff-budget.log`, `out/1045-coordinator-symphony-aligned-delegation-register-controller-extraction/manual/<timestamp>-closeout/13-override-notes.md`.
- [ ] `npm run review`. Evidence: `out/1045-coordinator-symphony-aligned-delegation-register-controller-extraction/manual/<timestamp>-closeout/09-review.log`, `out/1045-coordinator-symphony-aligned-delegation-register-controller-extraction/manual/<timestamp>-closeout/13-override-notes.md`.
- [ ] `npm run pack:smoke` when required by touched downstream-facing paths. Evidence: `out/1045-coordinator-symphony-aligned-delegation-register-controller-extraction/manual/<timestamp>-closeout/10-pack-smoke.log`.
- [ ] Manual mock delegation-register controller artifact captured. Evidence: `out/1045-coordinator-symphony-aligned-delegation-register-controller-extraction/manual/<timestamp>-closeout/11-manual-delegation-register-controller.json`.
- [ ] Elegance review completed. Evidence: `out/1045-coordinator-symphony-aligned-delegation-register-controller-extraction/manual/<timestamp>-closeout/12-elegance-review.md`.
