# Technical Spec — Codex Orchestrator Slimdown (Task 0707)

## Overview
- Objective: Trim the CLI footprint and tighten the manifest pipeline by single-sourcing schema/types, splitting core vs. heavy build/test surfaces, making design-only dependencies optional, and modularizing exec without altering TFGRPO or learning behavior.
- Scope: manifest generation + validation, dependency cleanup, build/test surface split, optional/lazy design toolchains (including mirror scripts), lint guard for patterns, exec command modularization, and scoped test scripts. Out of scope: changing TFGRPO/learning logic, altering telemetry semantics, or expanding design outputs.
- Evidence handling: when runs begin, export `MCP_RUNNER_TASK_ID=0707-orchestrator-slimdown` and capture manifests under `.runs/0707-orchestrator-slimdown/cli/<run-id>/manifest.json`; mirror metrics to `.runs/0707-orchestrator-slimdown/metrics.json` and state to `out/0707-orchestrator-slimdown/state.json` per AGENTS SOP.

## Workstreams & Plan

### 1) Manifest single-source of truth (schema, types, validation)
- Approach: treat `schemas/manifest.json` as canonical; generate TS types via `json-schema-to-typescript` (e.g., `scripts/generate-manifest-types.mjs`) into `packages/shared/manifest/types.ts` plus any downstream consumers. Add AJV-based runtime validator (e.g., `packages/shared/manifest/validator.ts`) and swap tests to use the generated validator. Delete duplicate hand-rolled schema in `orchestrator/src/cli/telemetry/schema.ts` and wire imports to the generated types.
- Affected files: `schemas/manifest.json`, `scripts/generate-manifest-types.mjs`, `packages/shared/manifest/types.ts`, `packages/shared/manifest/validator.ts` (new), orchestrator manifest/telemetry modules and related tests.
- Steps: (1) add generator script + npm script hook; (2) emit types/validator from schema and update imports; (3) remove duplicate schema file; (4) refresh tests to consume validator + generated types.
- Validation: `npm run build` (ensures generated types compile), `npm run test -- --filter manifest` (vitest targeted), `node scripts/spec-guard.mjs --dry-run` before review.
- Risks/Mitigations: schema drift risk—pin generator output and store in repo; runtime differences—keep validator parity tests against current fixtures; tooling friction—document regeneration in README/tech spec and in npm scripts.

### 2) Dependency cleanup
- Approach: drop `@modelcontextprotocol/sdk` and `@openai/agents*` from `package.json`/lockfile; remove residual imports/usages in orchestrator/adapters/tests; rerun `npm install` to prune lockfile.
- Affected files: `package.json`, `package-lock.json`, any modules referencing the removed packages.
- Steps: (1) remove dependencies + update lock; (2) replace/guard code paths that referenced them; (3) ensure build/test paths do not import removed SDKs.
- Validation: `npm run lint` (catches missing imports), `npm run test -- --filter agents` (sanity for removed usage).
- Risks/Mitigations: inadvertent feature loss—survey usage with `rg` before removal; lock churn—commit minimal diffs by avoiding package upgrades.

### 3) Build surface split
- Approach: introduce `tsconfig.build.json` for core-only compilation (orchestrator + shared); keep existing `tsconfig.json` for editors. Update npm scripts so `npm run build` uses the core config, and add `npm run build:all` to run the full matrix (patterns, adapters, evaluation as needed). Document which artifacts each command produces.
- Affected files: `tsconfig.build.json` (new), `tsconfig.json` (referenced but unchanged semantics), `package.json` scripts, any CI docs invoking build.
- Steps: (1) author core build config; (2) wire scripts (`build`, `build:all`, ensure `build:patterns` remains separate); (3) update docs/readme for command scope.
- Validation: `npm run build` (core), `npm run build:all` when optional pieces present, `npm run lint` to confirm TS path mapping still resolves.
- Risks/Mitigations: missing artifacts in downstream scripts—keep `build:all` callable in review/release workflows; config drift—pin rootPaths/includes in `tsconfig.build.json`.
- CI coverage decision: default PR/feature lane runs the core surface only—`npm run build` (core), `npm run lint`, and `npm run test` (core orchestrator suites). A separate PR “full matrix” lane runs `npm run build:all`, `npm run lint`, `npm run test`, `npm run test:adapters`, `npm run test:evaluation`, and `npm run eval:test` (when fixtures + optional design deps are installed); trigger this lane when adapters/evaluation/design/patterns paths change or the PR is labeled `full-matrix`. Release/RC pipelines always run the full matrix with optional deps installed; no scheduled daily/nightly jobs.
- Local expectation: minimum before opening/updating a PR is the core surface (`npm run build`, `npm run lint`, `npm run test`). Run the full matrix locally when the change touches adapters/evaluation/design/patterns or when preparing a release; install optional deps first (`npm run setup:design-tools && npx playwright install`) and ensure evaluation fixtures are present. If optional deps/fixtures are not available, document that the full matrix could not be run and rely on the CI full-matrix lane to cover it.

### 4) Optional/lazy design dependencies (including mirror scripts)
- Approach: move `playwright`, `pixelmatch`, `pngjs`, `cheerio` to dev/optional deps and guard all imports. Replace direct imports with lazy loaders and clear runtime errors instructing `npm run setup:design-tools && npx playwright install` when invoked. Apply guards across design toolkits and mirror entrypoints (`scripts/mirror-*.mjs`), plus `scripts/setup-design-tools.ts` messaging. Ensure scripts exit gracefully when deps are absent.
- Affected files: `package.json` (deps), `scripts/design/pipeline/**/*.ts`, `scripts/design/pipeline/toolkit/**/*.ts`, `scripts/mirror-*.mjs`, `scripts/setup-design-tools.ts`, any design helper modules that import these deps.
- Steps: (1) relocate deps and add optional load helpers; (2) wrap design/mirror entrypoints with dependency checks; (3) update runtime guidance/errors; (4) adjust docs for setup flow.
- Validation: `npm run lint` (verifies guarded imports compile), `npm run mirror:check` only when optional deps installed; default `npm run test` should pass without installing design deps.
- Risks/Mitigations: missed import guards—use `rg` to enumerate touchpoints; breaking design workflows—gate errors with actionable guidance and add small smoke test that skips when deps missing.

### 5) Lint guard for patterns
- Approach: update `eslint-plugin-patterns/index.cjs` to build `dist/patterns/linters/index.js` only when missing/outdated (timestamp/hash check) instead of unconditional rebuild.
- Affected files: `eslint-plugin-patterns/index.cjs`, `patterns/tsconfig.json` (if paths needed).
- Steps: (1) add existence/staleness check; (2) keep build path consistent; (3) document behavior in README/tech spec.
- Validation: `npm run lint` (should skip rebuild when dist present; rebuild when deleted).
- Risks/Mitigations: stale patterns—include checksum/mtime guard; lint flakiness—fallback to forced build when guard fails.

### 6) Exec command modularization
- Approach: decompose `orchestrator/src/cli/exec/command.ts` into focused modules (bootstrap/context, stage runner, telemetry/notifications, TFGRPO/learning, manifest persistence) without changing behavior. Preserve TFGRPO/learning integration and event serialization; keep exports stable for callers.
- Affected files: `orchestrator/src/cli/exec/command.ts` (refactored), new helper modules under `orchestrator/src/cli/exec/` (e.g., `context.ts`, `runner.ts`, `finalize.ts`, `tfgrpoArtifacts.ts`), related tests/mocks.
- Steps: (1) identify logical groupings and extract pure helpers; (2) maintain shared types and logging semantics; (3) refresh tests to cover split modules; (4) ensure existing exports remain intact.
- Validation: `npm run test -- --filter exec`, `npm run lint` for import cycles, optional `npm run build` to confirm types.
- Risks/Mitigations: behavior drift—add golden-path test snapshots for TFGRPO/learning hooks; refactor in small commits to aid review.

### 7) Test scoping scripts
- Approach: add `test:orchestrator`, `test:adapters`, `test:evaluation` scripts that invoke `vitest run` with directory filters; keep `npm test` running core suites only. Document which suites require optional deps.
- Affected files: `package.json` scripts, any CI docs referencing tests.
- Steps: (1) add scripts with directory filters; (2) adjust `npm test` target to core; (3) update docs on when to run extended suites.
- Validation: `npm run test` (core), `npm run test:adapters`, `npm run test:evaluation` when optional deps/fixtures available.
- Risks/Mitigations: missing coverage—note in docs which jobs still run full matrix; avoid watch mode to stay non-interactive.

### 8) Simplification pass (F1-F7): duplicated logic and small indirections
- Goal: remove duplicate logic without changing external behavior, performance, or error strings. Use characterization tests to lock behavior before refactors.
- Scope: execution-mode resolution, ID sanitization, lock retry helpers, atomic write helpers, CLI pipeline result wrappers, enforcement-mode parsing, and error formatting.

#### F1) Execution-mode resolution (manager + CLI + planner)
- Approach: add characterization tests for the current behavior across `TaskManager` and CLI paths, then extract a shared helper that preserves the same precedence and string parsing.
- Semantics to lock (from current drift): `requires_cloud`/`requiresCloud` flags, `metadata.mode` vs `metadata.executionMode` precedence, string parsing differences (trim + truthy/falsy synonyms vs strict "cloud"/"mcp"), and `task.metadata.execution.parallel` override behavior.
- Affected files: `orchestrator/src/manager.ts`, `orchestrator/src/cli/orchestrator.ts`, `orchestrator/src/cli/adapters/CommandPlanner.ts`, new helper in `orchestrator/src/utils/` (or similar).
- Steps: (1) add tests covering the full matrix of flags/modes/parallel; (2) extract a pure helper that matches current outputs; (3) replace logic in each call site; (4) re-run tests and compare results.
- Validation: `npm run test` (ensure the new characterization tests pass).
- Risks/Mitigations: subtle behavior drift; mitigate by test matrix and explicit precedence comments in helper.

#### F2) ID sanitization (task vs run)
- Approach: extract shared `sanitizeIdentifier(kind, value)` that keeps the same validation order and error strings, then keep thin wrappers for `sanitizeTaskId` and `sanitizeRunId`.
- Affected files: `orchestrator/src/persistence/sanitizeTaskId.ts`, `orchestrator/src/persistence/sanitizeRunId.ts`, new shared helper.
- Steps: (1) add helper; (2) update wrappers; (3) add tests to confirm error messages and validation order are unchanged.
- Validation: `npm run test`.
- Risks/Mitigations: error string changes; keep exact message templates per kind.

#### F3) Lock retry helper (TaskStateStore + ExperienceStore)
- Approach: extract a shared lock acquisition helper that handles retries and backoff; allow custom error factory so existing error classes and messages remain identical.
- Affected files: `orchestrator/src/persistence/TaskStateStore.ts`, `orchestrator/src/persistence/ExperienceStore.ts`, new `orchestrator/src/persistence/lockFile.ts` (or similar).
- Steps: (1) add helper with retry options; (2) refactor both stores to use it; (3) add tests for lock contention and error types.
- Validation: `npm run test`.
- Risks/Mitigations: concurrency behavior changes; keep same backoff config and file open mode (`wx`).

#### F4) Atomic write utilities (Needs Verification)
- Approach: unify `writeJsonAtomic` and `writeAtomicFile` behind a shared implementation with explicit options for `ensureDir`, encoding, and temp naming. Preserve current behavior where directories are or are not created.
- Affected files: `orchestrator/src/cli/utils/fs.ts`, `orchestrator/src/utils/atomicWrite.ts`, new shared helper in `orchestrator/src/utils/`.
- Steps: (1) verify current behavior differences (directory creation, temp file naming); (2) add shared helper with explicit options; (3) update wrappers to match current behavior; (4) add tests for both modes.
- Validation: `npm run test`.
- Risks/Mitigations: silent behavior change when directories are missing; lock this with tests before refactor.

#### F5) CLI pipeline result wrappers
- Approach: replace the dual-purpose accessor and memoized executor with explicit result storage and a single "execute once" closure.
- Affected files: `orchestrator/src/cli/orchestrator.ts`.
- Steps: (1) replace `createResultAccessor` and `createPipelineExecutor` usage with explicit `result` and `executing` variables; (2) remove the helper methods.
- Validation: `npm run test`.
- Risks/Mitigations: ensure execution still happens once; keep the promise memoization.

#### F6) Enforcement-mode parsing (control-plane + privacy guard)
- Approach: extract a shared helper that parses `shadow` vs `enforce` with the same precedence and truthy list; use it in both control-plane and privacy guard.
- Affected files: `orchestrator/src/cli/services/controlPlaneService.ts`, `orchestrator/src/cli/services/execRuntime.ts`, new helper in `orchestrator/src/cli/utils/` or `orchestrator/src/utils/`.
- Steps: (1) add shared helper; (2) replace local parsers; (3) add tests covering env precedence and truthy strings.
- Validation: `npm run test`.
- Risks/Mitigations: env parsing drift; preserve existing truthy list and precedence.

#### F7) Error message formatting (Needs Verification)
- Approach: extract a shared `errorToString` helper and use it in both manager and CLI error formatting without changing prefixes or message text.
- Affected files: `orchestrator/src/manager.ts`, `orchestrator/src/cli/exec/finalization.ts`, new helper in `orchestrator/src/utils/`.
- Steps: (1) verify current CLI error formatting usage; (2) add shared helper; (3) update both call sites; (4) add tests if error strings are asserted.
- Validation: `npm run test`.
- Risks/Mitigations: error string changes; keep exact prefixing and message formatting.

## Evidence & Logging
- Diagnostics/manifest capture: `MCP_RUNNER_TASK_ID=0707-orchestrator-slimdown npx codex-orchestrator start diagnostics --format json` (non-interactive) to create `.runs/0707-orchestrator-slimdown/cli/<run-id>/manifest.json`; mirror metrics to `.runs/0707-orchestrator-slimdown/metrics.json` and summary to `out/0707-orchestrator-slimdown/state.json` when runs exist.
- Pre-review guardrails: `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test` (core), optional `npm run eval:test` if fixtures apply, `npm run review` once manifests exist.

## Open Questions
- Any consumers of the removed agent SDKs that need shims to avoid breaking offline tooling?
- Do any tests or external tools assert exact error string formats for manager or CLI errors?
- Should "parallel always forces cloud" be the intended invariant, even when metadata says "mcp"?
