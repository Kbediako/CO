# Slimdown Audit Findings (0101-slimdown-audit)

## Evidence-backed findings
- Legacy MCP runner wrappers duplicate orchestrator CLI behavior.
  - Files: scripts/mcp-runner-start.sh, scripts/mcp-runner-poll.sh, scripts/run-mcp-diagnostics.sh, scripts/run-local-mcp.sh, scripts/agents_mcp_runner.mjs.
  - CLI equivalents live in `bin/codex-orchestrator.ts` and `orchestrator/src/cli/mcp.ts`.
  - The duplication is already called out as legacy in `docs/REFRACTOR_PLAN.md`.
- Duplicate atomic JSON write helpers exist in multiple places.
  - Canonical helper: `orchestrator/src/cli/utils/fs.ts` (and `orchestrator/src/utils/atomicWrite.ts`).
  - Duplicates: scripts/mcp-runner-migrate.js, scripts/mcp-runner-metrics.js, `scripts/status-ui-build.mjs`, `packages/shared/design-artifacts/writer.ts`.
- Task/run ID sanitization diverges across modules.
  - Canonical helpers: `orchestrator/src/persistence/sanitizeTaskId.ts` and `orchestrator/src/persistence/sanitizeRunId.ts`.
  - Local regex versions: `packages/shared/design-artifacts/writer.ts`.
  - Lowercasing without validation: scripts/mcp-runner-metrics.js and scripts/mcp-runner-migrate.js.
- Environment path resolution is repeated with inconsistent env var names.
  - `scripts/status-ui-build.mjs`, scripts/mcp-runner-metrics.js, scripts/mcp-runner-migrate.js resolve `CODEX_ORCHESTRATOR_ROOT` + `.runs`/`out`.
  - `scripts/design/pipeline/context.ts` and `scripts/design/purgeExpired.ts` use `CODEX_ORCHESTRATOR_REPO_ROOT` instead of `CODEX_ORCHESTRATOR_ROOT`; `orchestrator/src/cli/services/commandRunner.ts` also exports `CODEX_ORCHESTRATOR_REPO_ROOT` into subprocesses.
- Pipelines are duplicated with only env toggles changed.
  - `implementation-gate` vs `implementation-gate-devtools` and `frontend-testing` vs `frontend-testing-devtools` (now consolidated via aliases + `CODEX_REVIEW_DEVTOOLS=1`).
- Pipeline definitions also exist in code for fallback behavior.
  - `orchestrator/src/cli/pipelines/index.ts` defines `fallbackDiagnosticsPipeline`, which overlaps the `diagnostics` pipeline in `codex.orchestrator.json`.
- Legacy migration and metrics scripts overlap with newer CLI behavior.
  - scripts/mcp-runner-migrate.js writes compat pointers similar to `orchestrator/src/cli/run/manifest.ts`.
  - scripts/mcp-runner-metrics.js produces `metrics-summary.json`, while the orchestrator already aggregates metrics in `orchestrator/src/cli/metrics/metricsAggregator.ts`.
- Optional harnesses may be unused or redundant.
  - scripts/manual-orchestrator-run.ts and scripts/run-parallel-goals.ts duplicate orchestrator pipeline execution.
- Archive automation workflows duplicate step logic.
  - Files: .github/workflows/tasks-archive-automation.yml and .github/workflows/implementation-docs-archive-automation.yml share the same checkout/setup/run/diff/PR flow.
- CLI HUD/output handling is repeated across multiple commands.
  - `bin/codex-orchestrator.ts` repeats the interactive gate + run output formatting in start/resume/frontend-test.
- Documentation tooling repeats the same helper logic across multiple scripts.
  - `collectMarkdownFiles` appears in `scripts/docs-hygiene.ts`, `scripts/docs-freshness.mjs`, and `scripts/implementation-docs-archive.mjs`.
  - `normalizeTaskKey` is duplicated in `scripts/delegation-guard.mjs`, `scripts/tasks-archive.mjs`, and `scripts/implementation-docs-archive.mjs`.
  - `parseDate`/`computeAgeInDays` appear in both `scripts/docs-freshness.mjs` and `scripts/implementation-docs-archive.mjs`.
  - `toPosix` variants appear in `scripts/docs-hygiene.ts`, `scripts/docs-freshness.mjs`, and `scripts/implementation-docs-archive.mjs`.
- Pack scripts duplicate the same npm pack parsing logic.
  - `scripts/pack-audit.mjs` and `scripts/pack-smoke.mjs` both implement identical `runPack` helpers.
- One-line wrapper scripts still exist.
  - `scripts/codex-devtools.sh` only forwards `codex -c 'mcp_servers.chrome-devtools.enabled=true' ...`.
- Mirror tooling repeats CLI arg parsing and config validation.
  - `scripts/mirror-site.mjs` and `scripts/mirror-check.mjs` both parse `mirror.config.json` and normalize routes/allowlists; `mirror-serve.mjs` and `mirror-style-fingerprint.mjs` reimplement the same `parseArgs` loop.
- Optional dependency loading is duplicated.
  - `scripts/design/pipeline/optionalDeps.ts` and `scripts/mirror-optional-deps.mjs` both resolve/load Playwright + Cheerio with similar error handling.
- Shared optional-deps/permit helpers should ship in `dist/` so design pipeline stages can import them post-build.
- Compliance permit parsing is duplicated.
  - `scripts/design/pipeline/toolkit/common.ts` and `scripts/mirror-site.mjs` both read `compliance/permit.json` to validate allowed sources.
- `.runs` manifest discovery is duplicated across tooling glue.
  - `scripts/status-ui-build.mjs`, `scripts/run-review.ts`, and `scripts/delegation-guard.mjs` all scan `.runs` directories with slightly different heuristics.
- CLI arg parsing helpers are duplicated across guardrail + docs scripts.
  - `scripts/spec-guard.mjs`, `scripts/delegation-guard.mjs`, `scripts/diff-budget.mjs`, `scripts/docs-freshness.mjs`, `scripts/tasks-archive.mjs`, and `scripts/implementation-docs-archive.mjs` each implement bespoke `parseArgs`.
- Design pipeline stages are duplicated across pipelines.
  - `codex.orchestrator.json` repeats shared stages between `design-reference` and `hi-fi-design-toolkit`; `diagnostics` and `diagnostics-with-eval` also repeat guardrail blocks.
- Adapter command scaffolding is duplicated across `adapters/*/build-test-configs.ts`.
- Slugify helpers are duplicated across design pipeline and orchestrator.
  - `scripts/design/pipeline/extract.ts`, `scripts/design/pipeline/toolkit/common.ts`, and `orchestrator/src/cli/utils/strings.ts` each implement similar slugification logic.

## Quick wins (low risk)
- Remove redundant CLI/MCP wrapper scripts and document the single preferred CLI entrypoint.
- Drop scripts/manual-orchestrator-run.ts if no active usage remains.
- Retire scripts/mcp-runner-migrate.js and scripts/mcp-runner-metrics.js once their outputs are verified as unused.
- Remove the `scripts/codex-devtools.sh` wrapper after updating the one doc reference.
- Consolidate the shared `runPack` helper used by pack-audit + pack-smoke.
- Extract a shared CLI arg parser used by guardrails/docs/mirror/status scripts.
- Centralize mirror config parsing/validation and optional dependency loading (low-risk utility extraction).

## Usage signals (still referenced)
- Legacy MCP wrapper scripts were referenced as compatibility shims in `.agent/readme.md`, `.agent/system/services.md`, `.runs/README.md`, and `docs/REFRACTOR_PLAN.md`, plus listed in `tasks/tasks-0914-npm-companion-package.md` (Phase 1 updates remove these references).
- scripts/run-local-mcp.sh was referenced in `docs/PRD-npm-companion-package.md` and `tasks/tasks-0914-npm-companion-package.md` (Phase 1 updates switch to CLI-only guidance).
- scripts/mcp-runner-metrics.js and scripts/mcp-runner-migrate.js are still documented in `.runs/README.md` even though no runtime imports exist.
- `.runs/local-mcp` exists with many entries; spot checks show `manifest.json` symlinks pointing at `.runs/<task>/cli/<run-id>/manifest.json`, indicating compatibility pointers already exist for legacy runs (2026-01-01 local scan).
- No `metrics-summary.json` files or `migrations/*.log` entries found under `.runs/` (2026-01-01 local scan), suggesting the legacy metrics/migration scripts are not currently producing artifacts.
- Repo scan (2026-01-01) shows no references to scripts/mcp-runner-migrate.js / scripts/mcp-runner-metrics.js in CI/workflows or package scripts; remaining mentions are in docs and the scripts themselves.
- `scripts/status-ui-build.mjs` is referenced by `scripts/status-ui-serve.mjs` and `docs/TECH_SPEC-orchestrator-status-ui.md` (do not remove; only consolidate helpers).
- scripts/run-parallel-goals.ts appeared only in `package.json` (`parallel:goals`) with no doc references.
- DevTools pipeline IDs (`implementation-gate-devtools`, `frontend-testing-devtools`) were referenced widely (README, `.agent` SOPs, PRDs/TECH_SPECs for frontend testing/devtools readiness). High-impact references include: `README.md`, `.agent/SOPs/review-loop.md`, `.agent/AGENTS.md`, `docs/AGENTS.md`, `docs/PRD-frontend-testing-core.md`, `docs/TECH_SPEC-frontend-testing-core.md`, `docs/PRD-devtools-readiness-orchestrator-usage.md`, `docs/TECH_SPEC-devtools-readiness-orchestrator-usage.md`, `docs/ACTION_PLAN-frontend-testing-core.md`, `.agent/task/0912-review-loop-devtools-gate.md`, and `.agent/task/0915-frontend-testing-core.md`.
- `scripts/codex-devtools.sh` is referenced in `docs/TECH_SPEC-frontend-testing-core.md` only.
- `scripts/pack-audit.mjs` and `scripts/pack-smoke.mjs` are invoked via `npm run pack:audit` / `npm run pack:smoke` in `package.json`.

## Deeper refactors (moderate risk)
- Consolidate atomic write and ID sanitization helpers across scripts and packages.
- Standardize repo/run/out path resolution and env variable names.
- Remove devtools pipeline duplicates and rely on an env flag or CLI switch.
- Evaluate whether scripts/run-parallel-goals.ts is still required; remove if unused.
- Consolidate archive automation workflows into a shared base.
- Deduplicate HUD/output logic in the CLI entrypoint.
- Consolidate doc tooling helpers and remove duplicate implementations in docs scripts.
- Deduplicate `npm pack` helper logic across pack scripts.
- Remove one-line wrapper scripts and keep canonical CLI invocations.
- Consolidate `.runs` manifest discovery used by status UI, review tooling, and delegation guard.
- Consolidate mirror/design optional dependency + permit parsing utilities.
- Reduce pipeline duplication via shared stage sets (design pipelines + diagnostics-with-eval).
- Extract shared adapter command defaults to reduce duplication across language adapters.
- Reuse a single slugify helper across design pipeline and orchestrator tooling.

## Suggested removals (ranked)
1) Legacy MCP wrappers: scripts/mcp-runner-start.sh, scripts/mcp-runner-poll.sh, scripts/run-mcp-diagnostics.sh, scripts/agents_mcp_runner.mjs.
2) Manual harness: scripts/manual-orchestrator-run.ts.
3) Legacy migration/metrics scripts: scripts/mcp-runner-migrate.js, scripts/mcp-runner-metrics.js.
4) Devtools pipeline duplicates in `codex.orchestrator.json` (keep one pipeline, toggle via env).
5) Optional parallel goals harness: scripts/run-parallel-goals.ts and `parallel:goals` npm script (if unused).
6) Archive automation workflow duplication via a reusable base workflow.
7) Doc tooling helper duplication in docs-freshness/docs-hygiene/tasks-archive/implementation-docs-archive scripts.
8) Pack script helper duplication (`pack-audit` + `pack-smoke`).
9) `scripts/codex-devtools.sh` wrapper script (replace with direct `codex -c ...`).
10) Shared CLI arg parsing + `.runs` discovery helpers (guardrails/status/review).
11) Mirror config/permit + optional dependency helper consolidation.
12) Design/diagnostics pipeline stage-set reuse.
13) Adapter command defaults builder (reduce `build-test-configs` duplication).
14) Shared slugify helper across design pipeline + orchestrator.
