# Slimdown Audit Findings (0101-slimdown-audit)

## Evidence-backed findings
- Legacy MCP runner wrappers duplicate orchestrator CLI behavior.
  - Files: scripts/mcp-runner-start.sh, scripts/mcp-runner-poll.sh, scripts/run-mcp-diagnostics.sh, scripts/run-local-mcp.sh, scripts/agents_mcp_runner.mjs.
  - CLI equivalents live in `bin/codex-orchestrator.ts` and `orchestrator/src/cli/mcp.ts`.
  - The duplication is already called out as legacy in `docs/REFRACTOR_PLAN.md`.
- Duplicate atomic JSON write helpers exist in multiple places.
  - Canonical helper: `orchestrator/src/cli/utils/fs.ts` (and `orchestrator/src/utils/atomicWrite.ts`).
  - Duplicates: `scripts/mcp-runner-migrate.js`, `scripts/mcp-runner-metrics.js`, `scripts/status-ui-build.mjs`, `packages/shared/design-artifacts/writer.ts`.
- Task/run ID sanitization diverges across modules.
  - Canonical helpers: `orchestrator/src/persistence/sanitizeTaskId.ts` and `orchestrator/src/persistence/sanitizeRunId.ts`.
  - Local regex versions: `packages/shared/design-artifacts/writer.ts`.
  - Lowercasing without validation: `scripts/mcp-runner-metrics.js` and `scripts/mcp-runner-migrate.js`.
- Environment path resolution is repeated with inconsistent env var names.
  - `scripts/status-ui-build.mjs`, `scripts/mcp-runner-metrics.js`, `scripts/mcp-runner-migrate.js` resolve `CODEX_ORCHESTRATOR_ROOT` + `.runs`/`out`.
  - `scripts/design/pipeline/context.ts` and `scripts/design/purgeExpired.ts` use `CODEX_ORCHESTRATOR_REPO_ROOT` instead of `CODEX_ORCHESTRATOR_ROOT`; `orchestrator/src/cli/services/commandRunner.ts` also exports `CODEX_ORCHESTRATOR_REPO_ROOT` into subprocesses.
- Pipelines are duplicated with only env toggles changed.
  - `implementation-gate` vs `implementation-gate-devtools` and `frontend-testing` vs `frontend-testing-devtools` in `codex.orchestrator.json`.
- Pipeline definitions also exist in code for fallback behavior.
  - `orchestrator/src/cli/pipelines/index.ts` defines `fallbackDiagnosticsPipeline`, which overlaps the `diagnostics` pipeline in `codex.orchestrator.json`.
- Legacy migration and metrics scripts overlap with newer CLI behavior.
  - `scripts/mcp-runner-migrate.js` writes compat pointers similar to `orchestrator/src/cli/run/manifest.ts`.
  - `scripts/mcp-runner-metrics.js` produces `metrics-summary.json`, while the orchestrator already aggregates metrics in `orchestrator/src/cli/metrics/metricsAggregator.ts`.
- Optional harnesses may be unused or redundant.
  - scripts/manual-orchestrator-run.ts and `scripts/run-parallel-goals.ts` duplicate orchestrator pipeline execution.

## Quick wins (low risk)
- Remove redundant CLI/MCP wrapper scripts and document the single preferred CLI entrypoint.
- Drop scripts/manual-orchestrator-run.ts if no active usage remains.
- Retire `scripts/mcp-runner-migrate.js` and `scripts/mcp-runner-metrics.js` once their outputs are verified as unused.

## Usage signals (still referenced)
- Legacy MCP wrapper scripts were referenced as compatibility shims in `.agent/readme.md`, `.agent/system/services.md`, `.runs/README.md`, and `docs/REFRACTOR_PLAN.md`, plus listed in `tasks/tasks-0914-npm-companion-package.md` (Phase 1 updates remove these references).
- scripts/run-local-mcp.sh was referenced in `docs/PRD-npm-companion-package.md` and `tasks/tasks-0914-npm-companion-package.md` (Phase 1 updates switch to CLI-only guidance).
- `scripts/mcp-runner-metrics.js` and `scripts/mcp-runner-migrate.js` are still documented in `.runs/README.md` even though no runtime imports exist.
- `.runs/local-mcp` exists with many entries; spot checks show `manifest.json` symlinks pointing at `.runs/<task>/cli/<run-id>/manifest.json`, indicating compatibility pointers already exist for legacy runs (2026-01-01 local scan).
- No `metrics-summary.json` files or `migrations/*.log` entries found under `.runs/` (2026-01-01 local scan), suggesting the legacy metrics/migration scripts are not currently producing artifacts.
- Repo scan (2026-01-01) shows no references to `scripts/mcp-runner-migrate.js` / `scripts/mcp-runner-metrics.js` in CI/workflows or package scripts; remaining mentions are in docs and the scripts themselves.
- `scripts/status-ui-build.mjs` is referenced by `scripts/status-ui-serve.mjs` and `docs/TECH_SPEC-orchestrator-status-ui.md` (do not remove; only consolidate helpers).
- `scripts/run-parallel-goals.ts` appears only in `package.json` (`parallel:goals`) with no doc references.
- DevTools pipeline IDs (`implementation-gate-devtools`, `frontend-testing-devtools`) are referenced widely (README, `.agent` SOPs, PRDs/TECH_SPECs for frontend testing/devtools readiness). High-impact references include: `README.md`, `.agent/SOPs/review-loop.md`, `.agent/AGENTS.md`, `docs/AGENTS.md`, `docs/PRD-frontend-testing-core.md`, `docs/TECH_SPEC-frontend-testing-core.md`, `docs/PRD-devtools-readiness-orchestrator-usage.md`, `docs/TECH_SPEC-devtools-readiness-orchestrator-usage.md`, `docs/ACTION_PLAN-frontend-testing-core.md`, `.agent/task/0912-review-loop-devtools-gate.md`, and `.agent/task/0915-frontend-testing-core.md`.

## Deeper refactors (moderate risk)
- Consolidate atomic write and ID sanitization helpers across scripts and packages.
- Standardize repo/run/out path resolution and env variable names.
- Remove devtools pipeline duplicates and rely on an env flag or CLI switch.
- Evaluate whether `scripts/run-parallel-goals.ts` is still required; remove if unused.

## Suggested removals (ranked)
1) Legacy MCP wrappers: scripts/mcp-runner-start.sh, scripts/mcp-runner-poll.sh, scripts/run-mcp-diagnostics.sh, scripts/agents_mcp_runner.mjs.
2) Manual harness: scripts/manual-orchestrator-run.ts.
3) Legacy migration/metrics scripts: `scripts/mcp-runner-migrate.js`, `scripts/mcp-runner-metrics.js`.
4) Devtools pipeline duplicates in `codex.orchestrator.json` (keep one pipeline, toggle via env).
5) Optional parallel goals harness: `scripts/run-parallel-goals.ts` and `parallel:goals` npm script (if unused).
