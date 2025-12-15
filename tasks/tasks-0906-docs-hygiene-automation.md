# Task 0906 — Docs Hygiene Automation & Review Handoff Gate

- MCP Task ID: `0906-docs-hygiene-automation`
- Primary PRD: `docs/PRD-docs-hygiene-automation.md`
- Tech Spec: `docs/TECH_SPEC-docs-hygiene-automation.md`
- Action Plan: `docs/ACTION_PLAN-docs-hygiene-automation.md`
- Mini-spec: `tasks/specs/0906-docs-hygiene-automation.md`
- Run Manifest (latest diagnostics/guardrails): `.runs/0906-docs-hygiene-automation/cli/2025-12-15T18-59-39-357Z-15e1362d/manifest.json`.
- Metrics/State: `.runs/0906-docs-hygiene-automation/metrics.json`, `out/0906-docs-hygiene-automation/state.json`.

## Checklist
### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist/mini-spec) — Evidence: this commit.
- [x] Capture diagnostics/guardrails manifest — Evidence: `.runs/0906-docs-hygiene-automation/cli/2025-12-15T18-59-39-357Z-15e1362d/manifest.json`.
- [x] Metrics/state snapshots updated — Evidence: `.runs/0906-docs-hygiene-automation/metrics.json`, `out/0906-docs-hygiene-automation/state.json`.
- [x] Mirrors updated with manifest links (`docs/TASKS.md`, `.agent/task/0906-docs-hygiene-automation.md`, `tasks/index.json`) — Evidence: this commit + `.runs/0906-docs-hygiene-automation/cli/2025-12-15T18-59-39-357Z-15e1362d/manifest.json`.

### Docs hygiene tool
- [ ] Add `docs:check` (deterministic lint for agentic docs) — Files: `scripts/**`, `package.json`, `.github/workflows/core-lane.yml`; Acceptance: CI fails on doc drift.
- [ ] Add `docs:sync` (safe mirror sync for active task only) — Acceptance: updates `.agent/task/<task-id>.md` and `docs/TASKS.md` idempotently.

### Workflow docs (review handoff gate)
- [ ] Require `npm run review` after implementation guardrails in the agent-facing workflow docs — Acceptance: `AGENTS.md`, `.agent/system/conventions.md`, `.ai-dev-tasks/process-task-list.md` all reflect the same sequence.

### Guardrails & handoff
- [x] `node scripts/spec-guard.mjs --dry-run` passes — Evidence: `.runs/0906-docs-hygiene-automation/cli/2025-12-15T18-59-39-357Z-15e1362d/manifest.json`.
- [x] `npm run build` passes — Evidence: `.runs/0906-docs-hygiene-automation/cli/2025-12-15T18-59-39-357Z-15e1362d/manifest.json`.
- [x] `npm run lint` passes — Evidence: `.runs/0906-docs-hygiene-automation/cli/2025-12-15T18-59-39-357Z-15e1362d/manifest.json`.
- [x] `npm run test` passes — Evidence: `.runs/0906-docs-hygiene-automation/cli/2025-12-15T18-59-39-357Z-15e1362d/manifest.json`.
- [ ] `npm run docs:check` passes — Evidence: `.runs/0906-docs-hygiene-automation/cli/<run-id>/manifest.json`.
- [ ] `npm run review` executed with latest manifest path as evidence — Evidence: `.runs/0906-docs-hygiene-automation/cli/<run-id>/manifest.json`.
