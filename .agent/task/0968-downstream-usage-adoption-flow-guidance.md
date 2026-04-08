# Task Checklist - Downstream Usage Adoption + Guardrail Flow + Setup Guidance (0968)

- MCP Task ID: `0968-downstream-usage-adoption-flow-guidance`
- Primary PRD: `docs/PRD-downstream-usage-adoption-flow-guidance.md`
- TECH_SPEC: `tasks/specs/0968-downstream-usage-adoption-flow-guidance.md`
- ACTION_PLAN: `docs/ACTION_PLAN-downstream-usage-adoption-flow-guidance.md`
- Summary of scope: increase downstream usage of guardrail/delegation-first workflows via post-exec nudges, a low-friction `flow` command, and setup-time policy guidance.

> Set `MCP_RUNNER_TASK_ID=0968-downstream-usage-adoption-flow-guidance` for orchestrator commands. Guardrails required: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `npm run review`. Mirror with `docs/TASKS.md` and `.agent/task/0968-downstream-usage-adoption-flow-guidance.md`. Flip `[ ]` to `[x]` only with evidence.

## Checklist

### Foundation
- [x] Task scaffolding + mirrors registered. - Evidence: `tasks/tasks-0968-downstream-usage-adoption-flow-guidance.md`, `.agent/task/0968-downstream-usage-adoption-flow-guidance.md`, `tasks/index.json`, `docs/TASKS.md`.
- [x] PRD + TECH_SPEC + ACTION_PLAN drafted. - Evidence: `docs/PRD-downstream-usage-adoption-flow-guidance.md`, `tasks/specs/0968-downstream-usage-adoption-flow-guidance.md`, `docs/ACTION_PLAN-downstream-usage-adoption-flow-guidance.md`, `docs/TECH_SPEC-downstream-usage-adoption-flow-guidance.md`.
- [x] Delegation scout run captured (`<task-id>-<stream>` manifest). - Evidence: `.runs/0968-downstream-usage-adoption-flow-guidance-scout/cli/2026-02-16T22-21-15-558Z-d70de1a6/manifest.json`.
- [x] Docs-review manifest captured (pre-implementation). - Evidence: `.runs/0968-downstream-usage-adoption-flow-guidance/cli/2026-02-16T22-22-31-075Z-594dfd65/manifest.json`.
- [x] Standalone pre-implementation review approval captured. - Evidence: `out/0968-downstream-usage-adoption-flow-guidance/manual/pre-implementation-standalone-review.log`.

### Implementation
- [x] Post-`exec` usage recommendation nudge is emitted in text mode when guidance applies. - Evidence: `bin/codex-orchestrator.ts`, `tests/cli-command-surface.spec.ts`.
- [x] `flow` command runs `docs-review` then `implementation-gate` with existing run UI/output contracts. - Evidence: `bin/codex-orchestrator.ts`, `tests/cli-command-surface.spec.ts`, `README.md`, `docs/README.md`.
- [x] Setup summary includes policy/skills guidance references for downstream users. - Evidence: `bin/codex-orchestrator.ts`, `tests/cli-command-surface.spec.ts`.
- [x] Follow-up: scoped flow targets now accept scoped aliases without cross-pipeline matches. - Evidence: `bin/codex-orchestrator.ts`, `tests/cli-command-surface.spec.ts`.
- [x] Follow-up: PR monitor blocks auto-merge when head-commit bot inline feedback is unacknowledged. - Evidence: `scripts/lib/pr-watch-merge.js`, `tests/pr-watch-merge.spec.ts`, `.agent/SOPs/review-loop.md`.

### Validation and handoff
- [x] Required quality gates passed (build/lint/test/docs/review + diff budget). - Evidence: `.runs/0968-downstream-usage-adoption-flow-guidance/cli/2026-02-16T23-19-01-131Z-ec3b6038/manifest.json`.
- [x] Implementation-gate manifest captured. - Evidence: `.runs/0968-downstream-usage-adoption-flow-guidance/cli/2026-02-16T23-19-01-131Z-ec3b6038/manifest.json`.
- [x] Standalone post-implementation elegance review completed. - Evidence: `out/0968-downstream-usage-adoption-flow-guidance/manual/post-implementation-standalone-review.log`.
- [x] Manual E2E run captured in CO + downstream usage snapshot updated. - Evidence: `out/0968-downstream-usage-adoption-flow-guidance/manual/e2e-validation.log`, `out/0968-downstream-usage-adoption-flow-guidance/manual/downstream-usage-validation.log`, `out/0968-downstream-usage-adoption-flow-guidance/manual/exec-interactive.log`.
