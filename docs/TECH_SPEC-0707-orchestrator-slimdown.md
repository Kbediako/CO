# Technical Spec — Codex Orchestrator Slimdown (Task 0707)

## Overview
- Objective: Trim the CLI footprint and tighten the manifest pipeline by single-sourcing schema/types, splitting core vs. heavy build/test surfaces, making design-only dependencies optional, and modularizing exec without altering TFGRPO or learning behavior.
- Scope: manifest generation + validation, dependency cleanup, build/test surface split, optional/lazy design toolchains (including mirror scripts), lint guard for patterns, exec command modularization, and scoped test scripts. Out of scope: changing TFGRPO/learning logic, altering telemetry semantics, or expanding design outputs.
- Evidence handling: when runs begin, export `MCP_RUNNER_TASK_ID=0707-orchestrator-slimdown` and capture manifests under `.runs/0707-orchestrator-slimdown/cli/<run-id>/manifest.json`; mirror metrics to `.runs/0707-orchestrator-slimdown/metrics.json` and state to `out/0707-orchestrator-slimdown/state.json` per AGENTS SOP.

## Workstreams & Plan

### 1) Manifest single-source of truth (schema, types, validation)
- Approach: treat `schemas/manifest.json` as canonical; generate TS types via `json-schema-to-typescript` (e.g., `scripts/generate-manifest-types.ts`) into `packages/shared/manifest/types.ts` plus any downstream consumers. Add AJV-based runtime validator (e.g., `packages/shared/manifest/validator.ts`) and swap tests to use the generated validator. Delete duplicate hand-rolled schema in `orchestrator/src/cli/telemetry/schema.ts` and wire imports to the generated types.
- Affected files: `schemas/manifest.json`, `scripts/generate-manifest-types.ts` (new), `packages/shared/manifest/types.ts`, `packages/shared/manifest/validator.ts` (new), orchestrator manifest/telemetry modules and related tests.
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

## Evidence & Logging
- Diagnostics/manifest capture: `MCP_RUNNER_TASK_ID=0707-orchestrator-slimdown npx codex-orchestrator start diagnostics --format json` (non-interactive) to create `.runs/0707-orchestrator-slimdown/cli/<run-id>/manifest.json`; mirror metrics to `.runs/0707-orchestrator-slimdown/metrics.json` and summary to `out/0707-orchestrator-slimdown/state.json` when runs exist.
- Pre-review guardrails: `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test` (core), optional `npm run eval:test` if fixtures apply, `npm run review` once manifests exist.

## Open Questions
- Any consumers of the removed agent SDKs that need shims to avoid breaking offline tooling?
