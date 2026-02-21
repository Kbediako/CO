# Task Checklist - Context Alignment Checker (Option 2) (0976)

- MCP Task ID: `0976-context-alignment-checker-option2`
- Primary PRD: `docs/PRD-context-alignment-checker-option2.md`
- TECH_SPEC: `tasks/specs/0976-context-alignment-checker-option2.md`
- ACTION_PLAN: `docs/ACTION_PLAN-context-alignment-checker-option2.md`
- Research Findings: `docs/findings/0976-context-alignment-research.md`
- Summary of scope: docs-first + simulation-gated implementation of Option 2 context alignment checker (Option 3 backlog only).

> Set `MCP_RUNNER_TASK_ID=0976-context-alignment-checker-option2` for orchestrator commands. Guardrails required: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `npm run review`.

## Checklist

### Foundation and research
- [x] Bootstrap context complete: assumptions, unknowns, risks, decision statement, success criteria, and phased gates documented. - Evidence: `docs/PRD-context-alignment-checker-option2.md`, `docs/ACTION_PLAN-context-alignment-checker-option2.md`.
- [x] Delegated research stream captured and translated into concrete policy choices. - Evidence: research subagent `019c7be7-1ed0-7572-8779-299ef6189cd2`, `docs/findings/0976-context-alignment-research.md`.
- [x] Delegated implementation-seam review stream captured. - Evidence: review subagent `019c7be7-26da-7760-b4bb-0f56583d1739`.

### Docs-first artifacts and gates (pre-implementation)
- [x] Task scaffolding + mirrors + registries registered. - Evidence: `tasks/tasks-0976-context-alignment-checker-option2.md`, `.agent/task/0976-context-alignment-checker-option2.md`, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] PRD + TECH_SPEC + ACTION_PLAN + research findings drafted. - Evidence: `docs/PRD-context-alignment-checker-option2.md`, `tasks/specs/0976-context-alignment-checker-option2.md`, `docs/ACTION_PLAN-context-alignment-checker-option2.md`, `docs/findings/0976-context-alignment-research.md`.
- [x] Docs-review manifest captured before implementation edits. - Evidence: `.runs/0976-context-alignment-checker-option2/cli/2026-02-20T16-56-41-145Z-0c12d285/manifest.json`.
- [x] Docs guards pass. - Evidence: `out/0976-context-alignment-checker-option2/manual/docs-guards-2026-02-20.log`.

### Simulation-first validation (mock environment)
- [x] Isolated dummy simulation workspace created (no production path risk). - Evidence: `out/0976-context-alignment-checker-option2/manual/simulation-setup.md`.
- [x] Scenario suite executed (intent shift, contradictions, risk variance, false-drift traps, 20-turn windows). - Evidence: `out/0976-context-alignment-checker-option2/manual/simulation-results.json`.
- [x] Threshold tuning/retest loop completed until stable. - Evidence: `out/0976-context-alignment-checker-option2/manual/simulation-calibration.md`.
- [x] Simulation gate approved for implementation phase. - Evidence: `out/0976-context-alignment-checker-option2/manual/simulation-gate-decision.md`.

### Implementation (Option 2 only)
- [x] Intent versioning object + major/minor/patch update policy implemented. - Evidence: `orchestrator/src/cli/rlm/alignment.ts`, `orchestrator/tests/RlmAlignment.test.ts`.
- [x] Sentinel + risk-triggered deep-audit loop implemented with weighted scoring rubric and policy bands. - Evidence: `orchestrator/src/cli/rlm/alignment.ts`, `orchestrator/src/cli/rlm/symbolic.ts`, `orchestrator/tests/RlmAlignment.test.ts`, `orchestrator/tests/RlmSymbolicAlignment.test.ts`.
- [x] 20-turn confirmation gate + 3-evaluator consensus thresholds implemented. - Evidence: `orchestrator/src/cli/rlm/alignment.ts`, `orchestrator/tests/RlmAlignment.test.ts`.
- [x] Model routing policy + high-reasoning availability fail-safe implemented. - Evidence: `orchestrator/src/cli/rlmRunner.ts`, `orchestrator/src/cli/rlm/alignment.ts`, `orchestrator/tests/RlmRunnerConfig.test.ts`.
- [x] Manifest-first append-only alignment ledger implemented (idempotency + hash-chain). - Evidence: `orchestrator/src/cli/rlm/alignment.ts`, `orchestrator/tests/RlmAlignment.test.ts`.
- [x] Drift update policy + anti-gaming + anti-oscillation protections implemented. - Evidence: `orchestrator/src/cli/rlm/alignment.ts`, `orchestrator/tests/RlmAlignment.test.ts`.
- [x] Option 3 remains backlog-only (not implemented). - Evidence: `docs/PRD-context-alignment-checker-option2.md`, `tasks/specs/0976-context-alignment-checker-option2.md`, `docs/ACTION_PLAN-context-alignment-checker-option2.md`.

### Validation and handoff
- [x] Required validation chain completed. - Evidence: `out/0976-context-alignment-checker-option2/manual/validation-chain-20260221-051908.log`.
- [x] Standalone review + explicit elegance pass completed. - Evidence: `out/0976-context-alignment-checker-option2/manual/post-implementation-standalone-review-20260221-052144.log`, `out/0976-context-alignment-checker-option2/manual/elegance-pass-20260221-053355.md`.
- [x] Final report delivered with evidence paths, residual risks, rollback recommendation, and Option 3 backlog item. - Evidence: `out/0976-context-alignment-checker-option2/manual/final-report-20260221-053455.md`.
- [x] Post-dogfooding next-step plan documented for device-local multi-codebase usage before broader promotion. - Evidence: `docs/ACTION_PLAN-context-alignment-checker-option2.md`, `tasks/specs/0976-context-alignment-checker-option2.md`.
