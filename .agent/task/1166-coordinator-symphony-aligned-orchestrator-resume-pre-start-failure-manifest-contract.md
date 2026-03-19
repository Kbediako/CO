# Task Checklist - 1166-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract

- MCP Task ID: `1166-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract`
- Primary PRD: `docs/PRD-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract.md`
- TECH_SPEC: `tasks/specs/1166-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract.md`

> This lane follows the completed `1165` reassessment. The next truthful implementation move is a narrow `resume()` pre-start failure contract, not a broader shared lifecycle helper.

## Foundation

- [x] Docs-first artifacts created (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + .agent mirror). Evidence: `docs/PRD-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract.md`, `docs/TECH_SPEC-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract.md`, `docs/ACTION_PLAN-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract.md`, `tasks/specs/1166-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract.md`, `tasks/tasks-1166-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract.md`, `.agent/task/1166-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract.md`
- [x] Deliberation/findings captured for the resume pre-start failure contract. Evidence: `docs/findings/1166-orchestrator-resume-pre-start-failure-manifest-contract-deliberation.md`

## Shared Registry + Review Handoff

- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`
- [x] Local read-only review approval captured in the spec/checklist notes. Evidence: `tasks/specs/1166-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract.md`, `docs/findings/1166-orchestrator-resume-pre-start-failure-manifest-contract-deliberation.md`
- [x] docs-review approval captured for registered `1166`. Evidence: `.runs/1166-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract/cli/2026-03-13T23-06-07-093Z-e859731a/manifest.json`

## Implementation

- [x] `resume()` persists a hard failed manifest state when pre-start lifecycle startup fails. Evidence: `orchestrator/src/cli/orchestrator.ts`, `out/1166-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract/manual/20260313T225226Z-closeout/00-summary.md`
- [x] The failure contract uses an explicit status-detail marker for this boundary. Evidence: `orchestrator/src/cli/orchestrator.ts`, `tests/cli-orchestrator.spec.ts`
- [x] The original startup error is rethrown unchanged. Evidence: `tests/cli-orchestrator.spec.ts`, `out/1166-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract/manual/20260313T225226Z-closeout/05b-targeted-tests-post-elegance.log`
- [x] A public CLI resume regression proves the persisted manifest no longer remains falsely `in_progress`. Evidence: `tests/cli-orchestrator.spec.ts`, `out/1166-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract/manual/20260313T225226Z-closeout/11-manual-mock-usage.md`

## Validation + Closeout

- [x] `node scripts/delegation-guard.mjs` Evidence: `out/1166-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract/manual/20260313T225226Z-closeout/01-delegation-guard.log`
- [x] `node scripts/spec-guard.mjs --dry-run` Evidence: `out/1166-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract/manual/20260313T225226Z-closeout/02-spec-guard.log`
- [x] `npm run build` Evidence: `out/1166-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract/manual/20260313T225226Z-closeout/03-build.log`, `out/1166-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract/manual/20260313T225226Z-closeout/03b-build-post-elegance.log`
- [x] `npm run lint` Evidence: `out/1166-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract/manual/20260313T225226Z-closeout/04-lint.log`, `out/1166-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract/manual/20260313T225226Z-closeout/04b-lint-post-elegance.log`
- [x] `npm run test` Evidence: `out/1166-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract/manual/20260313T225226Z-closeout/05-test.log`, `out/1166-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract/manual/20260313T225226Z-closeout/05b-targeted-tests-post-elegance.log`
- [x] `npm run docs:check` Evidence: `out/1166-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract/manual/20260313T225226Z-closeout/06-docs-check.log`
- [x] `npm run docs:freshness` Evidence: `out/1166-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract/manual/20260313T225226Z-closeout/07-docs-freshness.log`
- [x] `node scripts/diff-budget.mjs` Evidence: `out/1166-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract/manual/20260313T225226Z-closeout/08-diff-budget.log`
- [x] `npm run review` Evidence: `out/1166-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract/manual/20260313T225226Z-closeout/09-review.log`, `out/1166-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract/manual/20260313T225226Z-closeout/13-override-notes.md`
- [x] `npm run pack:smoke` Evidence: `out/1166-coordinator-symphony-aligned-orchestrator-resume-pre-start-failure-manifest-contract/manual/20260313T225226Z-closeout/10-pack-smoke.log`
