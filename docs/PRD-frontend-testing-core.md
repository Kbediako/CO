# PRD - Frontend Testing as Core Orchestrator Capability (Task 0915)

## Summary
- Problem Statement: Frontend testing is a core user-facing capability, but it is currently framed as a devtools-only review gate and depends on external MCP skills without a clear, supported pipeline for end users.
- Desired Outcome: Provide a first-class frontend testing surface (pipeline/CLI + docs) that keeps DevTools MCP off by default and enables it only when a top-level agent explicitly runs frontend testing, with clear readiness checks and failure messaging.

## Goals
- Add a documented, user-facing frontend testing pipeline/command that produces standard manifests.
- Keep DevTools MCP disabled unless explicitly requested (frontend testing run with devtools enabled).
- Extend `codex-orchestrator doctor` to report DevTools readiness (skill presence) and actionable setup steps (expected skill path + Codex config hint); it does not validate MCP connectivity.
- Preserve safety defaults (no stdout protocol pollution, no writes to `node_modules`, no background network calls).

## Non-Goals
- Shipping Chrome DevTools, browser binaries, or MCP skills inside the npm package.
- Enabling DevTools by default for non-frontend runs.
- Introducing unrelated testing frameworks outside the existing DevTools/MCP approach.

## Stakeholders
- Product: Agent platform
- Engineering: Orchestrator maintainers
- Design: Frontend QA consumers

## Metrics & Guardrails
- Primary Success Metrics:
  - `codex-orchestrator start frontend-testing` runs with DevTools disabled by default; devtools state is explicit via `CODEX_REVIEW_DEVTOOLS=1` or `frontend-test --devtools`.
  - `CODEX_REVIEW_DEVTOOLS=1 codex-orchestrator start frontend-testing` enables DevTools MCP and completes without stdout protocol violations.
  - `codex-orchestrator doctor` reports DevTools readiness with actionable steps when missing.
- Guardrails / Error Budgets:
  - DevTools MCP remains opt-in only.
  - MCP protocol output stays on stdout only; logs go to stderr only.
  - No writes to `node_modules` or package root.

## User Experience
- Personas:
  - Codex operators running frontend QA for user projects.
  - CI operators requiring deterministic frontend testing evidence.
- User Journeys:
  - Run `npx codex-orchestrator start frontend-testing --format json` for non-DevTools checks.
  - Run `CODEX_REVIEW_DEVTOOLS=1 npx codex-orchestrator start frontend-testing --format json` to enable DevTools MCP for browser-based tests.
  - Run `codex-orchestrator frontend-test` (add `--devtools` when browser automation is required).
  - Run `codex-orchestrator doctor --format json` to confirm DevTools readiness.

## Technical Considerations
- DevTools MCP/skills live outside this repo and must stay optional.
- Enablement must be explicit (env flag or CLI flag) to keep default behavior unchanged.
- Existing DevTools review behavior must remain intact; frontend testing should follow the same opt-in model via `CODEX_REVIEW_DEVTOOLS=1`.

## Documentation & Evidence
- Tech Spec: `docs/TECH_SPEC-frontend-testing-core.md`
- Action Plan: `docs/ACTION_PLAN-frontend-testing-core.md`
- Task checklist: `tasks/tasks-0915-frontend-testing-core.md`
- Mini-spec: `tasks/specs/0915-frontend-testing-core.md`
- Run Manifest (docs review): `.runs/0915-frontend-testing-core/cli/2025-12-29T02-03-32-483Z-e2d52977/manifest.json`
- Run Manifest (implementation gate): `.runs/0915-frontend-testing-core/cli/2025-12-29T05-23-35-362Z-7d4eaa4b/manifest.json`
- Metrics / State Snapshots: `.runs/0915-frontend-testing-core/metrics.json`, `out/0915-frontend-testing-core/state.json`

## Decisions
- DevTools MCP stays off by default; enable only via explicit frontend testing runs.

## Open Questions
- What is the minimum DevTools skill bundle required for a devtools-enabled frontend testing run?

## Approvals
- Product: approved (2025-12-29)
- Engineering: approved (2025-12-29)
- Design: N/A
