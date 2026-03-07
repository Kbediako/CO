# Task Checklist - 1053-coordinator-symphony-aligned-control-action-cancel-confirmation-resolution-extraction

- MCP Task ID: `1053-coordinator-symphony-aligned-control-action-cancel-confirmation-resolution-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-action-cancel-confirmation-resolution-extraction.md`
- TECH_SPEC: `tasks/specs/1053-coordinator-symphony-aligned-control-action-cancel-confirmation-resolution-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-action-cancel-confirmation-resolution-extraction.md`

> This lane extracts the cancel-only confirmation-resolution branch from `/control/action` into a dedicated helper module while preserving confirmation sequencing, confirmed-scope override behavior, and leaving transport preflight/replay plus final mutation/publish/audit authority in `controlServer.ts`.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-action-cancel-confirmation-resolution-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-action-cancel-confirmation-resolution-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-action-cancel-confirmation-resolution-extraction.md`, `tasks/specs/1053-coordinator-symphony-aligned-control-action-cancel-confirmation-resolution-extraction.md`, `tasks/tasks-1053-coordinator-symphony-aligned-control-action-cancel-confirmation-resolution-extraction.md`, `.agent/task/1053-coordinator-symphony-aligned-control-action-cancel-confirmation-resolution-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1053-control-action-cancel-confirmation-resolution-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated or local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1053-coordinator-symphony-aligned-control-action-cancel-confirmation-resolution-extraction.md`, `docs/findings/1053-control-action-cancel-confirmation-resolution-deliberation.md`.
- [ ] docs-review approval/override captured for registered `1053`. Evidence: `out/1053-coordinator-symphony-aligned-control-action-cancel-confirmation-resolution-extraction/manual/<pending>/05-docs-review-override.md`.

## Cancel Confirmation Resolution Extraction

- [ ] `/control/action` cancel confirmation resolution is extracted into a dedicated helper module under `orchestrator/src/cli/control/`. Evidence: `orchestrator/src/cli/control/`, `orchestrator/src/cli/control/controlServer.ts`.
- [ ] Confirmation nonce validation, canonical id rebinding, confirmation persistence/event emission, confirmed transport-scope resolution, and mismatch traceability shaping move with the new helper without changing contracts. Evidence: `orchestrator/src/cli/control/`, `orchestrator/tests/`, `orchestrator/tests/ControlServer.test.ts`.
- [ ] `/control/action` confirmation-invalid, confirmation-scope-mismatch, confirmed-scope binding, and nonce-reuse behavior remain unchanged after extraction. Evidence: `orchestrator/src/cli/control/`, `orchestrator/tests/`, `orchestrator/tests/ControlServer.test.ts`, `out/1053-coordinator-symphony-aligned-control-action-cancel-confirmation-resolution-extraction/manual/<pending>/11-manual-control-action-cancel-confirmation.json`.
- [ ] Route ordering, raw HTTP writes, shared transport preflight/replay flow, nonce consumption, final control mutation, runtime publish, and audit emission remain in `controlServer.ts`. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/tests/ControlServer.test.ts`, `out/1053-coordinator-symphony-aligned-control-action-cancel-confirmation-resolution-extraction/manual/<pending>/00-summary.md`.

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1053-coordinator-symphony-aligned-control-action-cancel-confirmation-resolution-extraction/manual/<pending>/01-delegation-guard.log`.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1053-coordinator-symphony-aligned-control-action-cancel-confirmation-resolution-extraction/manual/<pending>/02-spec-guard.log`.
- [ ] `npm run build`. Evidence: `out/1053-coordinator-symphony-aligned-control-action-cancel-confirmation-resolution-extraction/manual/<pending>/03-build.log`.
- [ ] `npm run lint`. Evidence: `out/1053-coordinator-symphony-aligned-control-action-cancel-confirmation-resolution-extraction/manual/<pending>/04-lint.log`.
- [ ] `npm run test`. Evidence: `out/1053-coordinator-symphony-aligned-control-action-cancel-confirmation-resolution-extraction/manual/<pending>/05-test.log`.
- [ ] `npm run docs:check`. Evidence: `out/1053-coordinator-symphony-aligned-control-action-cancel-confirmation-resolution-extraction/manual/<pending>/06-docs-check.log`.
- [ ] `npm run docs:freshness`. Evidence: `out/1053-coordinator-symphony-aligned-control-action-cancel-confirmation-resolution-extraction/manual/<pending>/07-docs-freshness.log`.
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1053-coordinator-symphony-aligned-control-action-cancel-confirmation-resolution-extraction/manual/<pending>/08-diff-budget.log`, `out/1053-coordinator-symphony-aligned-control-action-cancel-confirmation-resolution-extraction/manual/<pending>/13-override-notes.md`.
- [ ] `npm run review`. Evidence: `out/1053-coordinator-symphony-aligned-control-action-cancel-confirmation-resolution-extraction/manual/<pending>/09-review.log`, `out/1053-coordinator-symphony-aligned-control-action-cancel-confirmation-resolution-extraction/manual/<pending>/13-override-notes.md`.
- [ ] `npm run pack:smoke` not required because no downstream-facing CLI/package/skills/review-wrapper paths changed. Evidence: `out/1053-coordinator-symphony-aligned-control-action-cancel-confirmation-resolution-extraction/manual/<pending>/13-override-notes.md`.
- [ ] Manual mock cancel-confirmation artifact captured. Evidence: `out/1053-coordinator-symphony-aligned-control-action-cancel-confirmation-resolution-extraction/manual/<pending>/11-manual-control-action-cancel-confirmation.json`.
- [ ] Elegance review completed. Evidence: `out/1053-coordinator-symphony-aligned-control-action-cancel-confirmation-resolution-extraction/manual/<pending>/12-elegance-review.md`.
