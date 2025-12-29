# Technical Spec - Frontend Testing as Core Orchestrator Capability (Task 0915)

## Overview
- Objective: Promote frontend testing to a first-class orchestrator capability with explicit DevTools enablement rules (off by default; on only for frontend testing runs).
- In Scope:
  - A documented frontend testing pipeline/CLI entrypoint with explicit devtools toggles.
  - DevTools enablement logic shipped in the npm package (no reliance on repo-only scripts).
  - `codex-orchestrator doctor` readiness checks for DevTools MCP/skills and browser tooling.
  - Docs updates that explain default-off behavior and explicit enablement.
- Out of Scope:
  - Bundling DevTools or browser binaries inside the package.
  - Changing the existing design pipelines or review gate behavior unrelated to frontend testing.
  - Background telemetry or auto-enabling DevTools.

## Architecture & Design
### Current State
- DevTools support exists only in the review gate (`implementation-gate-devtools`) and uses `CODEX_REVIEW_DEVTOOLS=1`.
- The repo contains a devtools helper script (`scripts/codex-devtools.sh`), but `scripts/` is not shipped in the npm package.
- `doctor` checks optional deps (Playwright-class), but does not validate DevTools MCP/skill availability.
- Users do not have a dedicated, documented frontend testing pipeline.

### Proposed Changes
#### Frontend testing pipeline + entrypoint
- Add a frontend testing pipeline in `codex.orchestrator.json`:
  - `frontend-testing`: default pipeline with DevTools disabled.
  - `frontend-testing` explicitly sets `CODEX_REVIEW_DEVTOOLS=0` to avoid inheriting a global devtools override.
  - Both frontend-testing pipelines set `CODEX_NON_INTERACTIVE=1` to prevent Codex prompts in automation.
  - `frontend-testing-devtools`: devtools-enabled variant that sets `CODEX_REVIEW_DEVTOOLS=1` (or equivalent flag).
- Add a CLI shortcut (`codex-orchestrator frontend-test`) that selects the pipeline and supports `--devtools`.
- `--devtools` maps to `CODEX_REVIEW_DEVTOOLS=1` (or a dedicated frontend-testing flag) for the run.
- Devtools state is inferred by pipeline id/run context; no manifest schema change required.
- Pipeline stage runs `node dist/orchestrator/src/cli/frontendTestingRunner.js`, which shells out to `codex exec` using a prompt from `CODEX_FRONTEND_TEST_PROMPT` or `CODEX_FRONTEND_TEST_PROMPT_PATH`.

#### DevTools enablement logic (packaged)
- Move the devtools invocation logic into a runtime module under `orchestrator/src/cli/**` so it compiles into `dist/**`.
- Ensure the packaged CLI can enable DevTools without relying on `scripts/`.
- Keep DevTools MCP off unless the frontend testing pipeline or CLI flag explicitly enables it.
- Use a shared helper (`orchestrator/src/cli/utils/devtools.ts`) in both the frontend testing runner and review handoff to apply the config override.

#### Doctor readiness checks
- Extend `codex-orchestrator doctor` to:
  - Detect the DevTools MCP/skill availability (e.g., `chrome-devtools`).
  - Emit actionable setup steps (expected skill path + `codex` CLI configuration example).
  - Report Playwright-class optional deps when needed for browser flows.
  - Note: readiness is a filesystem/skill presence check, not a live MCP handshake.
- Return structured JSON (`--format json`) with a `devtools` readiness section.

#### Documentation updates
- Update README and agent docs with frontend testing commands and DevTools enablement rules.
- Document the default-off behavior and the explicit enablement path (`frontend-testing-devtools` or `--devtools`).

### Data Persistence / State Impact
- No manifest schema changes required; devtools state is inferred from pipeline id and run context.
- Output files continue to live under `.runs/<task-id>/` or configured run roots.

### External Dependencies
- Codex CLI with MCP support.
- DevTools MCP/skills (external to repo) for browser-based testing.
- Optional Playwright-class dependencies (already optional peers).

## Operational Considerations
- Failure Modes:
  - DevTools pipeline invoked without required MCP skills.
  - DevTools logs pollute stdout if not routed correctly.
  - Packaged CLI cannot locate devtools helper if still in `scripts/`.
- Observability & Telemetry:
  - Logs to stderr; MCP protocol output to stdout only.
  - `doctor` produces JSON status for automation.
- Security / Privacy:
  - DevTools stays opt-in; no background network calls.
  - No writes into `node_modules`.
- Performance Targets:
  - Frontend testing pipeline adds minimal overhead when devtools is disabled.

## Testing Strategy
- Unit / Integration:
  - DevTools enablement logic tests (default-off, explicit-on).
  - `doctor` output includes devtools readiness and install guidance.
  - Pipeline tests verify `frontend-testing` pins `CODEX_REVIEW_DEVTOOLS=0` + `CODEX_NON_INTERACTIVE=1`, while `frontend-testing-devtools` sets `CODEX_REVIEW_DEVTOOLS=1` + `CODEX_NON_INTERACTIVE=1`.
- Tooling / Automation:
  - Add CLI smoke test for `frontend-testing` in non-devtools mode (no external deps required).
  - Optional CI path for `frontend-testing-devtools` when DevTools skill is available.
  - No live frontend-testing pipeline run is required for this change; unit/CLI tests cover behavior without external Codex/DevTools dependencies.
- Rollback Plan:
  - Revert new pipeline and CLI entrypoint; keep `implementation-gate-devtools` unchanged.

## Documentation & Evidence
- Linked PRD: `docs/PRD-frontend-testing-core.md`
- Run Manifest (docs review): `.runs/0915-frontend-testing-core/cli/2025-12-29T02-03-32-483Z-e2d52977/manifest.json`
- Run Manifest (implementation gate): `.runs/0915-frontend-testing-core/cli/2025-12-29T05-23-35-362Z-7d4eaa4b/manifest.json`
- Metrics / State Snapshots: `.runs/0915-frontend-testing-core/metrics.json`, `out/0915-frontend-testing-core/state.json`

## Open Questions
- Do we require a hard failure when devtools are missing, or allow a non-devtools fallback run?

## Approvals
- Engineering: approved (2025-12-29)
- Reviewer: approved (2025-12-29)
