# Task Checklist — Coordinator Symphony-Aligned Orchestrator Shared Cloud-Preflight Request Contract Extraction (1172)

> Set `MCP_RUNNER_TASK_ID=1172-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction` for orchestrator commands. Mirror status with `tasks/tasks-1172-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction.md` and `docs/TASKS.md`. Flip `[ ]` to `[x]` only with manifest evidence.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction.md`, `tasks/specs/1172-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction.md`, `tasks/tasks-1172-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction.md`, `.agent/task/1172-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction.md`
- [x] Deliberation/findings captured for the shared contract seam. Evidence: `docs/findings/1172-orchestrator-shared-cloud-preflight-request-contract-extraction-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1172-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction.md`, `docs/findings/1172-orchestrator-shared-cloud-preflight-request-contract-extraction-deliberation.md`
- [x] docs-review approval or explicit override captured for registered `1172`. Evidence: `out/1172-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction/manual/20260314T024101Z-docs-first/05-docs-review-override.md`

## Implementation

- [x] Router and doctor share a bounded cloud-preflight request contract. Evidence: `orchestrator/src/cli/utils/cloudPreflight.ts`, `orchestrator/src/cli/services/orchestratorExecutionRouter.ts`, `orchestrator/src/cli/doctor.ts`, `orchestrator/tests/CloudPreflight.test.ts`, `orchestrator/tests/Doctor.test.ts`
- [x] Higher-level router and doctor behavior remains caller-owned. Evidence: `out/1172-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction/manual/20260314T030407Z-closeout/05b-targeted-tests.log`, `out/1172-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction/manual/20260314T030407Z-closeout/09-review.log`

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1172-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction/manual/20260314T030407Z-closeout/01-delegation-guard.log`, `.runs/1172-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction-guard/cli/2026-03-14T02-56-24-904Z-988bd15d/manifest.json`
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1172-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction/manual/20260314T030407Z-closeout/02-spec-guard.log`
- [x] `npm run build`. Evidence: `out/1172-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction/manual/20260314T030407Z-closeout/03-build.log`
- [x] `npm run lint`. Evidence: `out/1172-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction/manual/20260314T030407Z-closeout/04-lint.log`
- [x] `npm run test`. Evidence: `out/1172-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction/manual/20260314T030407Z-closeout/05-test.log` (explicit quiet-tail override after the final visible `tests/cli-orchestrator.spec.ts` suite with no live `vitest` child remaining)
- [x] `npm run docs:check`. Evidence: `out/1172-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction/manual/20260314T030407Z-closeout/06-docs-check.log`
- [x] `npm run docs:freshness`. Evidence: `out/1172-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction/manual/20260314T030407Z-closeout/07-docs-freshness.log`
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1172-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction/manual/20260314T030407Z-closeout/08-diff-budget.log` (stacked-branch override applied)
- [x] `npm run review`. Evidence: `out/1172-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction/manual/20260314T030407Z-closeout/09-review.log`
- [x] `npm run pack:smoke`. Evidence: `out/1172-coordinator-symphony-aligned-orchestrator-shared-cloud-preflight-request-contract-extraction/manual/20260314T030407Z-closeout/10-pack-smoke.log`
