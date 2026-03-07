# Task Checklist - 1052-coordinator-symphony-aligned-control-action-outcome-shaping-extraction

- MCP Task ID: `1052-coordinator-symphony-aligned-control-action-outcome-shaping-extraction`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-control-action-outcome-shaping-extraction.md`
- TECH_SPEC: `tasks/specs/1052-coordinator-symphony-aligned-control-action-outcome-shaping-extraction.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-control-action-outcome-shaping-extraction.md`

> This lane extracts the post-preflight `/control/action` confirmation-versus-apply outcome shaping into a dedicated helper module while preserving confirmation-required and replay payload contracts and leaving nonce consumption plus mutation/publish/audit authority in `controlServer.ts`.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-control-action-outcome-shaping-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-control-action-outcome-shaping-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-control-action-outcome-shaping-extraction.md`, `tasks/specs/1052-coordinator-symphony-aligned-control-action-outcome-shaping-extraction.md`, `tasks/tasks-1052-coordinator-symphony-aligned-control-action-outcome-shaping-extraction.md`, `.agent/task/1052-coordinator-symphony-aligned-control-action-outcome-shaping-extraction.md`.
- [x] Deliberation/findings captured for the queued slice. Evidence: `docs/findings/1052-control-action-outcome-shaping-deliberation.md`.

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Delegated or local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1052-coordinator-symphony-aligned-control-action-outcome-shaping-extraction.md`, `docs/findings/1052-control-action-outcome-shaping-deliberation.md`.
- [x] docs-review approval/override captured for registered `1052`. Evidence: `out/1052-coordinator-symphony-aligned-control-action-outcome-shaping-extraction/manual/20260307T143831Z-docs-first/05-docs-review-override.md`.

## Control Action Outcome Shaping Extraction

- [ ] `/control/action` post-preflight outcome shaping is extracted into a dedicated helper module under `orchestrator/src/cli/control/`. Evidence: `orchestrator/src/cli/control/`, `orchestrator/src/cli/control/controlServer.ts`.
- [ ] Confirmation-required/confirmation-invalid response mapping, replay-versus-apply payload shaping, and canonical post-mutation traceability derivation move with the new helper without changing contracts. Evidence: `orchestrator/src/cli/control/`, `orchestrator/tests/`, `orchestrator/tests/ControlServer.test.ts`.
- [ ] `/control/action` confirmation-required, confirmation-invalid, replay, and applied transport payload behavior remain unchanged after extraction. Evidence: `orchestrator/src/cli/control/`, `orchestrator/tests/`, `orchestrator/tests/ControlServer.test.ts`, `out/1052-coordinator-symphony-aligned-control-action-outcome-shaping-extraction/manual/<pending>/11-manual-control-action-outcome.json`.
- [ ] Route ordering, auth/runner-only gating, confirmation persistence, nonce consumption, final control mutation, runtime publish, and audit emission remain in `controlServer.ts`. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/tests/ControlServer.test.ts`, `out/1052-coordinator-symphony-aligned-control-action-outcome-shaping-extraction/manual/<pending>/00-summary.md`.

## Validation + Closeout

- [ ] `node scripts/delegation-guard.mjs`. Evidence: `out/1052-coordinator-symphony-aligned-control-action-outcome-shaping-extraction/manual/<pending>/01-delegation-guard.log`.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1052-coordinator-symphony-aligned-control-action-outcome-shaping-extraction/manual/<pending>/02-spec-guard.log`.
- [ ] `npm run build`. Evidence: `out/1052-coordinator-symphony-aligned-control-action-outcome-shaping-extraction/manual/<pending>/03-build.log`.
- [ ] `npm run lint`. Evidence: `out/1052-coordinator-symphony-aligned-control-action-outcome-shaping-extraction/manual/<pending>/04-lint.log`.
- [ ] `npm run test`. Evidence: `out/1052-coordinator-symphony-aligned-control-action-outcome-shaping-extraction/manual/<pending>/05-test.log`.
- [ ] `npm run docs:check`. Evidence: `out/1052-coordinator-symphony-aligned-control-action-outcome-shaping-extraction/manual/<pending>/06-docs-check.log`.
- [ ] `npm run docs:freshness`. Evidence: `out/1052-coordinator-symphony-aligned-control-action-outcome-shaping-extraction/manual/<pending>/07-docs-freshness.log`.
- [ ] `node scripts/diff-budget.mjs`. Evidence: `out/1052-coordinator-symphony-aligned-control-action-outcome-shaping-extraction/manual/<pending>/08-diff-budget.log`, `out/1052-coordinator-symphony-aligned-control-action-outcome-shaping-extraction/manual/<pending>/13-override-notes.md`.
- [ ] `npm run review`. Evidence: `out/1052-coordinator-symphony-aligned-control-action-outcome-shaping-extraction/manual/<pending>/09-review.log`, `out/1052-coordinator-symphony-aligned-control-action-outcome-shaping-extraction/manual/<pending>/13-override-notes.md`.
- [ ] `npm run pack:smoke` not required because no downstream-facing CLI/package/skills/review-wrapper paths changed. Evidence: `out/1052-coordinator-symphony-aligned-control-action-outcome-shaping-extraction/manual/<pending>/13-override-notes.md`.
- [ ] Manual mock control-action outcome artifact captured. Evidence: `out/1052-coordinator-symphony-aligned-control-action-outcome-shaping-extraction/manual/<pending>/11-manual-control-action-outcome.json`.
- [ ] Elegance review completed. Evidence: `out/1052-coordinator-symphony-aligned-control-action-outcome-shaping-extraction/manual/<pending>/12-elegance-review.md`.
