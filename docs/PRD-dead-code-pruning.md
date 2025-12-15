# PRD — Dead Code Pruning & Evidence (Task 0801)

## Summary
- Problem Statement: The codebase contains unused entrypoints, helpers, and archived assets that bloat maintenance surface and obscure ownership (e.g., orphaned CLI helpers, unused SDK retry helper, unreferenced design sample, unused evaluation harness scripts, large static archives).
- Desired Outcome: Catalog and remove verified-dead code paths while preserving any intentionally archived artifacts with clear references, and document evidence before code removal.

## Goals
- Produce a vetted inventory of dead code (file + symbol level) with rationale and approval-ready references.
- Land a minimal remediation plan (delete or archive) that avoids breaking active pipelines/CLIs/SDKs.
- Record evidence in manifests under `.runs/0801-dead-code-pruning/cli/<run-id>/manifest.json` and mirror in `out/0801-dead-code-pruning/state.json`.

## Non-Goals
- Refactors that alter behavior beyond deleting unused code.
- Large dependency graph changes or design-system migrations.
- Purging archives without a backup pointer in `/archives` or `.runs/**` manifests.

## Scope & Candidates
- CLI helper exports: `orchestrator/src/cli/run/environment.ts` (dir helpers), `orchestrator/src/cli/run/manifest.ts` (heartbeat/guardrail helpers), `orchestrator/src/cli/services/execRuntime.ts` (session manager getter).
- Learning helpers: `orchestrator/src/learning/harvester.ts` (`recordStalledSnapshot`), `orchestrator/src/learning/manifest.ts` (`recordLearningApproval`).
- SDK: `packages/sdk-node/src/orchestrator.ts` (`deriveRetryOptions`), `packages/sdk-node/src/index.ts (removed)` entrypoint (unused beyond docs).
- Aggregator entrypoints: `orchestrator/src/index.ts (removed)`, `orchestrator/src/cli/index.ts (removed)`, `orchestrator/src/credentials/index.ts (removed)`, `orchestrator/src/persistence/index.ts (removed)`, `orchestrator/src/sync/index.ts (removed)` (no imports).
- Design/system samples: `packages/design-system/src/components/hi-fi/sample-dashboard/index.ts (removed)` (orphan).
- Evaluation harness scripts: `evaluation/harness/{run-all.ts,driver/AgentDriver.ts,scripts/pr-generator.ts,scripts/tfgrpo-runner.ts}` (not invoked).
- Mirror server wrapper: `packages/obys-library/server.js (removed)` (manual-only).
- Patterns registries: `patterns/{index.ts,codemods/index.ts,linters/index.ts}` (unused).
- Static archives: `packages/{abetkaua,des-obys,eminente,obys-library}/public/**` and `archives/hi-fi-tests/**` (keep or move behind README pointer).

## Stakeholders
- Product/Infra: Platform Enablement (Alex Rivera)
- Engineering: Orchestrator Reliability (Jamie Chen)
- Review: Repo Maintainers (Orchestrator + Design Toolkit)

## Success Metrics & Guardrails
- Zero regressions in CI lanes (`npm run build`, `npm run lint`, `npm run test`) after removals.
- Size reduction: ≥5% drop in tracked bundle/output tree (node_modules excluded) or explicit justification for retained archives.
- Manifest evidence: `.runs/0801-dead-code-pruning/cli/<run-id>/manifest.json` with spec-guard (`node scripts/spec-guard.mjs --dry-run`) passing.

## User Experience
- Developers: leaner imports and reduced cognitive load; no missing exports or runtime failures.
- Reviewers: clear before/after inventory plus manifest links.

## Approvals
- Product/Infra: _(pending)_
- Engineering: _(pending)_
- Review: _(pending)_

## Evidence & Manifests
- Latest diagnostics/guardrails: `.runs/0801-dead-code-pruning/cli/2025-12-09T03-51-52-584Z-93e9a77f/manifest.json` (spec-guard now green after refreshing last_review).
- Metrics/state snapshots: `out/0801-dead-code-pruning/state.json`, `.runs/0801-dead-code-pruning/metrics.json`.
- Static archive relocation: `.runs/0801-dead-code-pruning/archive/2025-12-08T10-01-24Z/` holds mirrors for `packages/{abetkaua,des-obys,eminente,obys-library}/public` and `archives/hi-fi-tests/`; stub READMEs remain in place.
- Guardrails/tests: `npm run build`, `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`, and `npm run review --manifest .runs/0801-dead-code-pruning/cli/2025-12-09T03-51-52-584Z-93e9a77f/manifest.json`.
