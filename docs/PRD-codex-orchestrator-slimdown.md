# PRD — Codex Orchestrator Simplification & Build Slimdown (Task 0707)

## Summary
- Problem Statement: The orchestrator ships with duplicated manifest schemas, unused agent SDK dependencies, an overly broad build/test surface, and heavy design-only dependencies that inflate install/build times. The exec runner is a monolith, and lint/test pipelines force slow full-rebuilds. These issues slow CI, complicate maintenance, and require unnecessary setup for non-design users.
- Desired Outcome: Establish a single manifest schema source of truth, trim unused deps, split core vs. heavy build scopes, make design tooling optional/lazy, reduce lint/test churn, and modularize the exec runner—without manual steps or behavior regressions.

## Goals
- Single-source CLI manifest schema (JSON canonical) with generated TS types + runtime validation; remove duplicate hand-rolled schema code.
- Remove unused agent SDK deps and shrink default install footprint.
- Introduce a core-only build config/script; keep adapters/evaluation/design builds optional.
- Make design-only heavy deps (Playwright/pixelmatch/pngjs/cheerio) optional/lazy-loaded with clear runtime guidance.
- Reduce lint churn by building patterns rules only when missing/outdated.
- Modularize exec runner for readability while preserving TFGRPO/learning flows.
- Scope default tests to core orchestrator; add targeted suites for adapters/evaluation.

## CI / Test Coverage Policy
- Default PR lane (core): run `npm run build`, `npm run lint`, `npm run test` (core suites).
- Full-matrix PR lane triggered by a `full-matrix` label or adapters/evaluation/design/patterns path changes: run `npm run build:all`, `npm run lint`, `npm run test`, `npm run test:adapters`, `npm run test:evaluation`, and `npm run eval:test` when fixtures + optional design deps are installed.
- Release/RC pipelines: always run the full matrix; no scheduled daily/nightly jobs.
- Local expectation: run the core surface before opening/updating a PR; run the full matrix locally when touching adapters/evaluation/design/patterns or prepping a release after `npm run setup:design-tools && npx playwright install` and ensuring fixtures are present; note if the full matrix could not be run locally.

## Non-Goals
- Changing learning/TFGRPO logic or telemetry semantics.
- Altering design pipeline outputs beyond dependency loading/guardrails.
- Adding new external services or runtime features.

## Stakeholders
- Product: Platform Enablement (TBD)
- Engineering: Orchestrator Reliability (TBD)
- Design: N/A (CLI/runtime scope)

## Metrics & Guardrails
- Build time: core build faster vs. current `npm run build` baseline (target ≥20% reduction).
- Install footprint: dependency count reduced (removal of agent SDKs; design deps optional).
- Lint latency: `npm run lint` skips patterns rebuild when dist present.
- Schema drift: zero divergence between manifest JSON and generated TS validator/types.
- Guardrails: learning/TFGRPO triggers and design pipelines must behave identically when enabled; design flows emit actionable guidance if optional deps missing.

## User Experience
- Personas: CLI users running orchestrator pipelines; automation agents; reviewers reading manifests; designers running design toolchains when needed.
- Journeys: Default install/build/test do not fetch browsers or build design assets; manifests validate against a single schema; lint/test loops are fast; design commands clearly instruct how to install optional tooling if invoked.

- Unify schema: use `schemas/manifest.json` as canonical; generate TS types with `json-schema-to-typescript` (including `packages/shared/manifest/types.ts` and shared consumers) and runtime validation with AJV; remove `orchestrator/src/cli/telemetry/schema.ts` duplication; update tests to use the generated validator.
- Dep cleanup: drop `@modelcontextprotocol/sdk`, `@openai/agents*` from deps/lockfile.
- Build split: add `tsconfig.build.json` (core-only); make `npm run build` core-only and add `npm run build:all` for the full matrix.
- Design deps optional: move Playwright/pixelmatch/pngjs/cheerio to dev/optional deps; lazy/dynamic imports (or guarded requires) across design toolkits *and* mirror entrypoints (`scripts/mirror-*.mjs`); emit runtime guidance to run `npm run setup:design-tools` + `npx playwright install` when needed, or clearly mark commands unsupported without optional deps.
- Lint guard: update `eslint-plugin-patterns/index.cjs` to build-if-missing `dist/patterns/linters/index.js`; avoid rebuild when present.
- Exec modularization: split `orchestrator/src/cli/exec/command.ts` into bootstrap, stage runner, tfgrpo/learning hooks, telemetry/notifications, persistence modules without behavior change.
- Test scoping: add scripts `test:orchestrator`, `test:adapters`, `test:evaluation`; default `npm test` runs core suites.

## Out of Scope
- Changing approvals/runner UX or adding new pipelines.
- Redesigning design tooling UX beyond dependency gating.

## Technical Considerations
- Preserve TFGRPO/learning hooks (persistExperienceRecords, mergeTfgrpoManifest) during modularization.
- Ensure generated schema covers design_* and toolRuns/control-plane fields from `packages/shared/manifest/types.ts`; regenerate shared types from the canonical JSON and update consumers.
- Lazy-load/guard design deps with clear errors across all entrypoints, including mirror scripts (`scripts/mirror-*.mjs`), and maintain existing setup hints in `scripts/setup-design-tools.ts`.
- Keep AGENTS guardrails: non-interactive commands; manifests logged under `.runs/0707-orchestrator-slimdown/cli/<run-id>/manifest.json` when runs begin.

## Documentation & Evidence
- Run Manifest Link: `.runs/0707-orchestrator-slimdown/cli/2025-12-01T09-37-11-576Z-1a60ebea/manifest.json`.
- Metrics / State Snapshots: _(pending — `.runs/0707-orchestrator-slimdown/metrics.json`, `out/0707-orchestrator-slimdown/state.json`)._

## Checklist
- [x] Capture first diagnostics manifest path under `.runs/0707-orchestrator-slimdown/cli/2025-12-01T09-37-11-576Z-1a60ebea/manifest.json`.
- [ ] Update metrics/state snapshots for Task 0707.
- [ ] Implement schema unification (JSON canonical + generated types/validator).
- [ ] Remove unused agent SDK deps from `package.json`/lockfile.
- [ ] Add core build config/script; document optional full builds.
- [ ] Make design deps optional with lazy loads and runtime guidance.
- [ ] Add lint build-if-missing guard for patterns.
- [ ] Modularize exec runner without behavior change.
- [ ] Add scoped test scripts and update docs.

## Open Questions
- Any consumers of the removed agent SDKs that need shims to avoid breaking offline tooling?

## Approvals
- Product: _(pending)_
- Engineering: _(pending)_
- Design: N/A
