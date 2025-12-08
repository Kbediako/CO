# Technical Spec — Dead Code Pruning & Evidence (Task 0801)

## Objective
Remove unused code paths and heavy static artifacts while guaranteeing no regressions in CLI, SDK, or pipelines. Capture manifest evidence before deletion.

## Architecture & Plan
- **Discovery Baseline:** Verified via `knip --include files/exports` and manual inspection. Findings are considered dead when `rg` shows zero imports/usages in code/tests.
- **Remediation Strategy:**
  - Delete unused exports/helpers and reroute any required consumers before removal; if a helper becomes needed, add a focused test that locks in usage.
  - For archives/static assets, either (a) move to `.runs/0801-dead-code-pruning/archive/<timestamp>/` with README pointer or (b) document explicit keepers with rationale (e.g., vendor snapshot).
  - Keep a manifest per change batch in `.runs/0801-dead-code-pruning/cli/<run-id>/manifest.json`; run `node scripts/spec-guard.mjs --dry-run` before review.
- **Testing:** Minimum gates: `npm run lint`, `npm run test`; run `npm run build` if orchestrator/package code changes. Record outcomes in manifest summary.

## Deletion Candidates (by area)
- **CLI (orchestrator/src):**
  - `cli/run/environment.ts`: `ensureDirectories`, `taskRunsDir`, `legacyRunsDir`, `localCompatibilityDir` unused.
  - `cli/run/manifest.ts`: `computeHeartbeatState`, `guardrailCommandPresent`, `guardrailRecommendation`.
  - `cli/services/execRuntime.ts`: `getCliSessionManager` unused.
- **Learning:** `learning/harvester.ts` (`recordStalledSnapshot`), `learning/manifest.ts` (`recordLearningApproval`) unused.
- **SDK:** `packages/sdk-node/src/orchestrator.ts` (`deriveRetryOptions`); `packages/sdk-node/src/index.ts` exported but unconsumed in code/tests.
- **Aggregators:** `orchestrator/src/{index.ts,cli/index.ts,credentials/index.ts,persistence/index.ts,sync/index.ts}` not imported anywhere.
- **Design/System:** `packages/design-system/src/components/hi-fi/sample-dashboard/index.ts` orphaned.
- **Evaluation Harness:** `evaluation/harness/run-all.ts`, `driver/AgentDriver.ts`, `scripts/pr-generator.ts`, `scripts/tfgrpo-runner.ts` unused.
- **Mirror Server:** `packages/obys-library/server.js` only manual usage; no code references.
- **Patterns Registry:** `patterns/{index.ts,codemods/index.ts,linters/index.ts}` unused.
- **Static Archives:** `packages/{abetkaua,des-obys,eminente,obys-library}/public/**`, `archives/hi-fi-tests/**` not read by code/tests; mark keep/remove decision.

## Risks & Mitigations
- **Risk:** Hidden runtime/CLI usage via dynamic imports.
  - **Mitigation:** Search for filename/symbol strings in configs and scripts; keep a rollback note in manifest summary.
- **Risk:** Downstream docs/examples rely on SDK helper.
  - **Mitigation:** If removal breaks docs, swap to inline example or keep helper behind `@deprecated` tag with test.
- **Risk:** Deleting archives needed for audits.
  - **Mitigation:** Move to `.runs/0801-dead-code-pruning/archive/` with README pointer and manifest entry instead of hard delete.

## Acceptance Criteria
- All listed candidates either removed or explicitly justified in README/manifest.
- CI gates (`npm run lint`, `npm run test`) green; spec guard passes.
- Manifest records: task id `0801-dead-code-pruning`, run id, tests executed, keep/remove decisions, and archive pointers.

## Evidence
- Primary manifest: `.runs/0801-dead-code-pruning/cli/<run-id>/manifest.json`
- Metrics/state: `.runs/0801-dead-code-pruning/metrics.json`, `out/0801-dead-code-pruning/state.json`
