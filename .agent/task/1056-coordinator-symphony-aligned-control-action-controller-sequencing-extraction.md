# Task Checklist - 1056-coordinator-symphony-aligned-control-action-controller-sequencing-extraction

- MCP Task ID: `1056-coordinator-symphony-aligned-control-action-controller-sequencing-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-action-controller-sequencing-extraction.md`
- TECH_SPEC: `tasks/specs/1056-coordinator-symphony-aligned-control-action-controller-sequencing-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-action-controller-sequencing-extraction.md`

> This lane extracts the remaining `/control/action` controller sequencing shell into a dedicated helper, centralizing replay, confirmation-resolution, and execution handoff decisions while leaving request normalization, final mutation authority, persistence, publish, audit emission, and raw HTTP writes in `controlServer.ts`.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-action-controller-sequencing-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-action-controller-sequencing-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-action-controller-sequencing-extraction.md`, `tasks/specs/1056-coordinator-symphony-aligned-control-action-controller-sequencing-extraction.md`, `tasks/tasks-1056-coordinator-symphony-aligned-control-action-controller-sequencing-extraction.md`, `.agent/task/1056-coordinator-symphony-aligned-control-action-controller-sequencing-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1056-control-action-controller-sequencing-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated or local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1056-coordinator-symphony-aligned-control-action-controller-sequencing-extraction.md`, `docs/findings/1056-control-action-controller-sequencing-deliberation.md`.
- [x] docs-review approval/override captured for registered `1056`. Evidence: `out/1056-coordinator-symphony-aligned-control-action-controller-sequencing-extraction/manual/20260308T014345Z-docs-first/05-docs-review-override.md`, `.runs/1056-coordinator-symphony-aligned-control-action-controller-sequencing-extraction/cli/2026-03-08T01-50-28-176Z-6280e27a/manifest.json`, `.runs/1056-coordinator-symphony-aligned-control-action-controller-sequencing-extraction/cli/2026-03-08T01-50-28-176Z-6280e27a/review/output.log`.

## Control Action Controller Sequencing Extraction

- [x] Replay short-circuit, confirmation-required, confirmation-resolution, and execute/finalize handoff decisions are extracted into a dedicated helper under `orchestrator/src/cli/control/`. Evidence: `orchestrator/src/cli/control/controlActionControllerSequencing.ts`, `orchestrator/tests/ControlActionControllerSequencing.test.ts`.
- [x] `controlServer.ts` still owns request reading/normalization, final mutation authority, actual persistence/publish side effects, audit emission, and raw HTTP writes. Evidence: `orchestrator/src/cli/control/controlServer.ts`.
- [x] Post-confirmation transport mutation re-validation remains explicit and unchanged. Evidence: `orchestrator/src/cli/control/controlActionControllerSequencing.ts`, `orchestrator/tests/ControlActionControllerSequencing.test.ts`, `orchestrator/tests/ControlServer.test.ts`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1056-coordinator-symphony-aligned-control-action-controller-sequencing-extraction/manual/20260308T020057Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1056-coordinator-symphony-aligned-control-action-controller-sequencing-extraction/manual/20260308T020057Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1056-coordinator-symphony-aligned-control-action-controller-sequencing-extraction/manual/20260308T020057Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1056-coordinator-symphony-aligned-control-action-controller-sequencing-extraction/manual/20260308T020057Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1056-coordinator-symphony-aligned-control-action-controller-sequencing-extraction/manual/20260308T020057Z-closeout/05-test.log`.
- [x] `npm run docs:check`. Evidence: `out/1056-coordinator-symphony-aligned-control-action-controller-sequencing-extraction/manual/20260308T020057Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1056-coordinator-symphony-aligned-control-action-controller-sequencing-extraction/manual/20260308T020057Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1056-coordinator-symphony-aligned-control-action-controller-sequencing-extraction/manual/20260308T020057Z-closeout/08-diff-budget.log`.
- [x] `npm run review`. Evidence: `out/1056-coordinator-symphony-aligned-control-action-controller-sequencing-extraction/manual/20260308T020057Z-closeout/09-review.log`, `out/1056-coordinator-symphony-aligned-control-action-controller-sequencing-extraction/manual/20260308T020057Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke` executed explicitly and passed, even though no downstream-facing CLI/package/skills/review-wrapper paths changed. Evidence: `out/1056-coordinator-symphony-aligned-control-action-controller-sequencing-extraction/manual/20260308T020057Z-closeout/10-pack-smoke.log`.
- [x] Manual mock sequencing artifact captured. Evidence: `out/1056-coordinator-symphony-aligned-control-action-controller-sequencing-extraction/manual/20260308T020057Z-closeout/11-manual-control-action-controller-sequencing.json`.
- [x] Elegance review completed. Evidence: `out/1056-coordinator-symphony-aligned-control-action-controller-sequencing-extraction/manual/20260308T020057Z-closeout/12-elegance-review.md`.
