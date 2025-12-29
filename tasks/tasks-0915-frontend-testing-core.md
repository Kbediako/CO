# Task 0915 - Frontend Testing as Core Orchestrator Capability

- MCP Task ID: `0915-frontend-testing-core`
- Primary PRD: `docs/PRD-frontend-testing-core.md`
- Tech Spec: `docs/TECH_SPEC-frontend-testing-core.md`
- Action Plan: `docs/ACTION_PLAN-frontend-testing-core.md`
- Mini-spec: `tasks/specs/0915-frontend-testing-core.md`
- Run Manifest (docs review): `.runs/0915-frontend-testing-core/cli/2025-12-29T02-03-32-483Z-e2d52977/manifest.json`
- Run Manifest (implementation gate): `.runs/0915-frontend-testing-core/cli/2025-12-29T05-23-35-362Z-7d4eaa4b/manifest.json`
- Metrics/State: `.runs/0915-frontend-testing-core/metrics.json`, `out/0915-frontend-testing-core/state.json`

## Checklist

### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist/mini-spec) - Evidence: `docs/PRD-frontend-testing-core.md`, `docs/TECH_SPEC-frontend-testing-core.md`, `docs/ACTION_PLAN-frontend-testing-core.md`, `tasks/specs/0915-frontend-testing-core.md`, `tasks/tasks-0915-frontend-testing-core.md`.
- [x] Docs-review manifest captured (pre-implementation) - Evidence: `.runs/0915-frontend-testing-core/cli/2025-12-29T02-03-32-483Z-e2d52977/manifest.json`.
- [x] Metrics/state snapshots updated - Evidence: `.runs/0915-frontend-testing-core/metrics.json`, `out/0915-frontend-testing-core/state.json`.
- [x] Mirrors updated in `docs/TASKS.md`, `.agent/task/0915-frontend-testing-core.md`, and `tasks/index.json` - Evidence: `docs/TASKS.md`, `.agent/task/0915-frontend-testing-core.md`, `tasks/index.json`.
- [x] PRD approval recorded in `tasks/index.json` gate metadata - Evidence: `.runs/0915-frontend-testing-core/cli/2025-12-29T05-23-35-362Z-7d4eaa4b/manifest.json`.

### Frontend Testing Surface
- [x] Add frontend testing pipelines (`frontend-testing`, `frontend-testing-devtools`) - Evidence: `codex.orchestrator.json`, manifest.
  - Files: `codex.orchestrator.json`
  - Acceptance:
    - `frontend-testing` does not enable DevTools by default.
    - `frontend-testing-devtools` sets the devtools env flag (`CODEX_REVIEW_DEVTOOLS=1` or equivalent).
    - Pipeline stages write manifests in `.runs/<task-id>/`.
  - Tests:
    - Add/extend pipeline resolution coverage in `orchestrator/tests/PipelineResolverEnvOverrides.test.ts`.
  - Evidence:
    - `.runs/0915-frontend-testing-core/cli/2025-12-29T05-23-35-362Z-7d4eaa4b/manifest.json`
- [x] Add a frontend testing CLI entrypoint (compiled into `dist/**`).
  - Files: `bin/codex-orchestrator.ts`, `orchestrator/src/cli/**`
  - Acceptance:
    - `codex-orchestrator frontend-test` runs the frontend testing pipeline.
    - `--devtools` explicitly enables DevTools; no implicit enablement.
    - JSON payload emitted to stdout; CLI warnings use stderr (automation should parse the final JSON object if logs precede it).
  - Tests:
    - Add CLI command coverage in `tests/cli-frontend-test.spec.ts`.
  - Evidence:
    - `.runs/0915-frontend-testing-core/cli/2025-12-29T05-23-35-362Z-7d4eaa4b/manifest.json`

### DevTools Enablement (Packaged)
- [x] Move devtools helper logic into runtime modules shipped in the npm package.
  - Files: `orchestrator/src/cli/**`
  - Acceptance:
    - No dependency on `scripts/codex-devtools.sh` in the published package.
    - DevTools enablement does not alter MCP stdout/stderr behavior.
    - DevTools enablement respects explicit pipeline/flag only.
  - Tests:
    - Add `orchestrator/tests/FrontendTestingRunner.test.ts` to cover devtools helper behavior.
  - Evidence:
    - `.runs/0915-frontend-testing-core/cli/2025-12-29T05-23-35-362Z-7d4eaa4b/manifest.json`

### Doctor Readiness
- [x] Extend `codex-orchestrator doctor` with DevTools readiness checks.
  - Files: `orchestrator/src/cli/doctor.ts`, tests
  - Acceptance:
    - Reports missing DevTools MCP/skill with actionable setup steps (expected skill path + Codex config hint).
    - JSON output includes a `devtools` readiness block.
    - No network calls or installs without explicit confirmation.
  - Tests:
    - Extend `orchestrator/tests/Doctor.test.ts` to assert `devtools` JSON output.
  - Evidence:
    - `.runs/0915-frontend-testing-core/cli/2025-12-29T05-23-35-362Z-7d4eaa4b/manifest.json` (`npm run test` covers `orchestrator/tests/Doctor.test.ts`).

### Documentation
- [x] Update README and agent docs with frontend testing commands and enablement rules.
  - Files: `README.md`, `docs/AGENTS.md`, `.agent/AGENTS.md`
  - Acceptance:
    - Default-off behavior is explicit.
    - DevTools-enabled pipeline/flag documented.
    - Frontend testing command examples are included.
  - Evidence:
    - `.runs/0915-frontend-testing-core/cli/2025-12-29T05-23-35-362Z-7d4eaa4b/manifest.json`

### Tests
- [x] Add tests for devtools default-off / explicit-on behavior.
  - Files: `orchestrator/tests/**`, `tests/**`
  - Acceptance:
    - Pipeline tests verify env flag differences.
    - `doctor` tests assert devtools readiness output.
    - CLI command tests cover `--devtools` and default-off behavior.
  - Evidence:
    - `.runs/0915-frontend-testing-core/cli/2025-12-29T05-23-35-362Z-7d4eaa4b/manifest.json`

### Guardrails & Handoff (post-implementation)
- [x] `node scripts/spec-guard.mjs --dry-run` passes - Evidence: `.runs/0915-frontend-testing-core/cli/2025-12-29T05-23-35-362Z-7d4eaa4b/manifest.json`.
- [x] `npm run build` passes - Evidence: `.runs/0915-frontend-testing-core/cli/2025-12-29T05-23-35-362Z-7d4eaa4b/manifest.json`.
- [x] `npm run lint` passes - Evidence: `.runs/0915-frontend-testing-core/cli/2025-12-29T05-23-35-362Z-7d4eaa4b/manifest.json`.
- [x] `npm run test` passes - Evidence: `.runs/0915-frontend-testing-core/cli/2025-12-29T05-23-35-362Z-7d4eaa4b/manifest.json`.
- [x] `npm run docs:check` passes - Evidence: `.runs/0915-frontend-testing-core/cli/2025-12-29T05-23-35-362Z-7d4eaa4b/manifest.json`.
- [x] `node scripts/diff-budget.mjs` passes - Evidence: `.runs/0915-frontend-testing-core/cli/2025-12-29T05-23-35-362Z-7d4eaa4b/manifest.json`.
- [x] `npm run review` captured with NOTES - Evidence: `.runs/0915-frontend-testing-core/cli/2025-12-29T05-23-35-362Z-7d4eaa4b/manifest.json`.
