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
- [x] Add frontend testing pipelines (`frontend-testing`, `frontend-testing-devtools`).
- [x] Add frontend testing CLI entrypoint.

### DevTools Enablement (Packaged)
- [x] Move devtools helper logic into runtime modules shipped in the npm package.

### Doctor Readiness
- [x] Extend `codex-orchestrator doctor` with DevTools readiness checks (covered by `npm run test` / `orchestrator/tests/Doctor.test.ts` in the implementation-gate manifest).

### Documentation
- [x] Update README and agent docs with frontend testing commands and enablement rules.

### Tests
- [x] Add tests for devtools default-off / explicit-on behavior.

### Guardrails & Handoff (post-implementation)
- [x] `node scripts/spec-guard.mjs --dry-run` passes - Evidence: `.runs/0915-frontend-testing-core/cli/2025-12-29T05-23-35-362Z-7d4eaa4b/manifest.json`.
- [x] `npm run build` passes - Evidence: `.runs/0915-frontend-testing-core/cli/2025-12-29T05-23-35-362Z-7d4eaa4b/manifest.json`.
- [x] `npm run lint` passes - Evidence: `.runs/0915-frontend-testing-core/cli/2025-12-29T05-23-35-362Z-7d4eaa4b/manifest.json`.
- [x] `npm run test` passes - Evidence: `.runs/0915-frontend-testing-core/cli/2025-12-29T05-23-35-362Z-7d4eaa4b/manifest.json`.
- [x] `npm run docs:check` passes - Evidence: `.runs/0915-frontend-testing-core/cli/2025-12-29T05-23-35-362Z-7d4eaa4b/manifest.json`.
- [x] `node scripts/diff-budget.mjs` passes - Evidence: `.runs/0915-frontend-testing-core/cli/2025-12-29T05-23-35-362Z-7d4eaa4b/manifest.json`.
- [x] `npm run review` captured with NOTES - Evidence: `.runs/0915-frontend-testing-core/cli/2025-12-29T05-23-35-362Z-7d4eaa4b/manifest.json`.
