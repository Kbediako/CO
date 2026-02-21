# Task Checklist - Shipped Feature Adoption Guidance Hardening (0977)

- MCP Task ID: `0977-shipped-feature-adoption-guidance`
- Primary PRD: `docs/PRD-shipped-feature-adoption-guidance.md`
- TECH_SPEC: `tasks/specs/0977-shipped-feature-adoption-guidance.md`
- ACTION_PLAN: `docs/ACTION_PLAN-shipped-feature-adoption-guidance.md`
- Research Findings: `docs/findings/0977-shipped-feature-adoption-guidance-research.md`
- Summary of scope: minimal shipped CO guidance hardening to improve cloud/RLM/flow utilization (help + runtime hints + recommendation hygiene + skills alignment).

> Set `MCP_RUNNER_TASK_ID=0977-shipped-feature-adoption-guidance` for orchestrator commands. Guardrails required: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `npm run review`.

## Checklist

### Foundation and research
- [x] Bootstrap context complete: assumptions, unknowns, risks, decision statement, success criteria, and phased gates documented. - Evidence: `docs/PRD-shipped-feature-adoption-guidance.md`, `docs/ACTION_PLAN-shipped-feature-adoption-guidance.md`.
- [x] Delegated research stream captured and translated into design choices. - Evidence: subagent `019c7e47-5554-7e81-9199-e79db5921878`, `docs/findings/0977-shipped-feature-adoption-guidance-research.md`.
- [x] Delegated review stream captured for regression/test-risk controls. - Evidence: subagent `019c7e47-5aad-7471-b730-64575a612ebb`, `docs/findings/0977-shipped-feature-adoption-guidance-research.md`.

### Docs-first artifacts and gates (pre-implementation)
- [x] Task scaffolding + mirrors + registries registered. - Evidence: `tasks/tasks-0977-shipped-feature-adoption-guidance.md`, `.agent/task/0977-shipped-feature-adoption-guidance.md`, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] PRD + TECH_SPEC + ACTION_PLAN + findings drafted. - Evidence: `docs/PRD-shipped-feature-adoption-guidance.md`, `tasks/specs/0977-shipped-feature-adoption-guidance.md`, `docs/ACTION_PLAN-shipped-feature-adoption-guidance.md`, `docs/findings/0977-shipped-feature-adoption-guidance-research.md`.
- [x] Delegation scout manifest captured (`<task-id>-<stream>`). - Evidence: `.runs/0977-shipped-feature-adoption-guidance-scout/cli/2026-02-21T03-48-42-821Z-ba2762ec/manifest.json`.
- [x] Docs-review manifest captured before implementation edits. - Evidence: `.runs/0977-shipped-feature-adoption-guidance/cli/2026-02-21T03-51-42-317Z-f42bf666/manifest.json`.
- [x] Docs guards pass. - Evidence: `out/0977-shipped-feature-adoption-guidance/manual/docs-guards-2026-02-21.log`.

### Simulation-first validation (mock environment)
- [x] Isolated dummy simulation workspace created (no production path risk). - Evidence: `out/0977-shipped-feature-adoption-guidance/manual/simulation-setup.md`.
- [x] Scenario suite executed (low/mid/high adoption, JSON safety, noise checks). - Evidence: `out/0977-shipped-feature-adoption-guidance/manual/simulation-results.json`.
- [x] Threshold tuning/retest completed until stable. - Evidence: `out/0977-shipped-feature-adoption-guidance/manual/simulation-calibration.md`.
- [x] Simulation gate approved for implementation phase. - Evidence: `out/0977-shipped-feature-adoption-guidance/manual/simulation-gate-decision.md`.

### Implementation
- [x] Help quickstart guidance shipped in root/start/flow help output. - Evidence: `bin/codex-orchestrator.ts`, `tests/cli-command-surface.spec.ts`.
- [x] Runtime hint emission extended to text-mode `start`/`flow` with JSON-safe gating. - Evidence: `bin/codex-orchestrator.ts`, `tests/cli-command-surface.spec.ts`.
- [x] `doctor --usage` cloud recommendation dedupe/hygiene adjustments shipped. - Evidence: `orchestrator/src/cli/doctorUsage.ts`, `orchestrator/tests/DoctorUsage.test.ts`.
- [x] Shipped skills updated with canonical adoption-default guidance snippet. - Evidence: `skills/docs-first/SKILL.md`, `skills/delegation-usage/SKILL.md`, `skills/collab-subagents-first/SKILL.md`.
- [x] Core regression coverage added (root help, unknown-command, JSON contract safety, hint behavior). - Evidence: `tests/cli-command-surface.spec.ts`, `orchestrator/tests/DoctorUsage.test.ts`.

### Validation and handoff
- [x] Required validation chain completed. - Evidence: `out/0977-shipped-feature-adoption-guidance/manual/validation-chain-2026-02-21.log`.
- [x] Standalone review + explicit elegance pass completed. - Evidence: `out/0977-shipped-feature-adoption-guidance/manual/post-implementation-standalone-review.log`, `out/0977-shipped-feature-adoption-guidance/manual/elegance-pass.md`.
- [x] Dogfood next-step guidance documented for cross-codebase CO usage checks on this device. - Evidence: `out/0977-shipped-feature-adoption-guidance/manual/dogfood-usage-audit-2026-02-21.md`, `docs/ACTION_PLAN-shipped-feature-adoption-guidance.md`, `tasks/specs/0977-shipped-feature-adoption-guidance.md`.
- [x] Final report delivered with residual risks and rollout recommendation. - Evidence: `out/0977-shipped-feature-adoption-guidance/manual/final-report.md`.
