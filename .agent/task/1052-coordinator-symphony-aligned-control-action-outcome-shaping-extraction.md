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

- [x] `/control/action` post-preflight outcome shaping is extracted into a dedicated helper module under `orchestrator/src/cli/control/`. Evidence: `orchestrator/src/cli/control/controlActionOutcome.ts`, `orchestrator/src/cli/control/controlServer.ts`.
- [x] Replay-versus-apply payload shaping and canonical post-mutation traceability derivation move with the new helper without changing contracts, while unchanged `confirmation_required` / `confirmation_invalid` route bodies stay on the existing `writeControlError(...)` seam. Evidence: `orchestrator/src/cli/control/controlActionOutcome.ts`, `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/tests/ControlActionOutcome.test.ts`, `orchestrator/tests/ControlServer.test.ts`.
- [x] `/control/action` confirmation-required, confirmation-invalid, replay, and applied transport payload behavior remain unchanged after extraction. Evidence: `orchestrator/src/cli/control/controlActionOutcome.ts`, `orchestrator/tests/ControlActionOutcome.test.ts`, `orchestrator/tests/ControlServer.test.ts`, `out/1052-coordinator-symphony-aligned-control-action-outcome-shaping-extraction/manual/20260307T150557Z-closeout/11-manual-control-action-outcome.json`.
- [x] Route ordering, auth/runner-only gating, confirmation persistence, nonce consumption, final control mutation, runtime publish, and audit emission remain in `controlServer.ts`. Evidence: `orchestrator/src/cli/control/controlServer.ts`, `orchestrator/tests/ControlServer.test.ts`, `out/1052-coordinator-symphony-aligned-control-action-outcome-shaping-extraction/manual/20260307T150557Z-closeout/00-summary.md`.

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1052-coordinator-symphony-aligned-control-action-outcome-shaping-extraction/manual/20260307T150557Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1052-coordinator-symphony-aligned-control-action-outcome-shaping-extraction/manual/20260307T150557Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1052-coordinator-symphony-aligned-control-action-outcome-shaping-extraction/manual/20260307T150557Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1052-coordinator-symphony-aligned-control-action-outcome-shaping-extraction/manual/20260307T150557Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `out/1052-coordinator-symphony-aligned-control-action-outcome-shaping-extraction/manual/20260307T150557Z-closeout/05-test.log`, `out/1052-coordinator-symphony-aligned-control-action-outcome-shaping-extraction/manual/20260307T150557Z-closeout/05b-targeted-tests.log`, `.runs/1052-coordinator-symphony-aligned-control-action-outcome-shaping-extraction-guard/cli/2026-03-07T15-00-44-747Z-fd0a2b62/manifest.json`.
- [x] `npm run docs:check`. Evidence: `out/1052-coordinator-symphony-aligned-control-action-outcome-shaping-extraction/manual/20260307T150557Z-closeout/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/1052-coordinator-symphony-aligned-control-action-outcome-shaping-extraction/manual/20260307T150557Z-closeout/07-docs-freshness.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1052-coordinator-symphony-aligned-control-action-outcome-shaping-extraction/manual/20260307T150557Z-closeout/08-diff-budget.log`, `out/1052-coordinator-symphony-aligned-control-action-outcome-shaping-extraction/manual/20260307T150557Z-closeout/13-override-notes.md`.
- [x] `npm run review`. Evidence: `out/1052-coordinator-symphony-aligned-control-action-outcome-shaping-extraction/manual/20260307T150557Z-closeout/09-review.log`, `out/1052-coordinator-symphony-aligned-control-action-outcome-shaping-extraction/manual/20260307T150557Z-closeout/13-override-notes.md`.
- [x] `npm run pack:smoke` not required because no downstream-facing CLI/package/skills/review-wrapper paths changed. Evidence: `out/1052-coordinator-symphony-aligned-control-action-outcome-shaping-extraction/manual/20260307T150557Z-closeout/13-override-notes.md`.
- [x] Manual mock control-action outcome artifact captured. Evidence: `out/1052-coordinator-symphony-aligned-control-action-outcome-shaping-extraction/manual/20260307T150557Z-closeout/11-manual-control-action-outcome.json`.
- [x] Elegance review completed. Evidence: `out/1052-coordinator-symphony-aligned-control-action-outcome-shaping-extraction/manual/20260307T150557Z-closeout/12-elegance-review.md`.
