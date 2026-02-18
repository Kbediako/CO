# Task Checklist - Advanced Capability Autopilot + Usage Signal Hardening (0971)

- MCP Task ID: `0971-advanced-capability-autopilot`
- Primary PRD: `docs/PRD-advanced-capability-autopilot.md`
- TECH_SPEC: `tasks/specs/0971-advanced-capability-autopilot.md`
- ACTION_PLAN: `docs/ACTION_PLAN-advanced-capability-autopilot.md`
- Summary of scope: implement approved 5-point advanced capability usage hardening with additive, low-friction defaults.

> Set `MCP_RUNNER_TASK_ID=0971-advanced-capability-autopilot` for orchestrator commands. Guardrails required: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `npm run review`. Mirror with `docs/TASKS.md` and `.agent/task/0971-advanced-capability-autopilot.md`. Flip `[ ]` to `[x]` only with evidence.

## Checklist

### Foundation
- [x] Task scaffolding + mirrors registered. - Evidence: `tasks/tasks-0971-advanced-capability-autopilot.md`, `.agent/task/0971-advanced-capability-autopilot.md`, `tasks/index.json`, `docs/TASKS.md`.
- [x] PRD + TECH_SPEC + ACTION_PLAN drafted. - Evidence: `docs/PRD-advanced-capability-autopilot.md`, `tasks/specs/0971-advanced-capability-autopilot.md`, `docs/ACTION_PLAN-advanced-capability-autopilot.md`, `docs/TECH_SPEC-advanced-capability-autopilot.md`.
- [x] Delegation scout run captured (`<task-id>-<stream>` manifest). - Evidence: `.runs/0971-advanced-capability-autopilot-scout/cli/2026-02-17T14-22-06-933Z-7b9c89a7/manifest.json`.
- [x] Docs-review manifest captured (pre-implementation). - Evidence: `.runs/0971-advanced-capability-autopilot/cli/2026-02-17T14-24-29-462Z-9cad68be/manifest.json`.
- [x] Standalone pre-implementation review approval captured. - Evidence: `out/0971-advanced-capability-autopilot/manual/pre-implementation-standalone-review.log`.

### Implementation
- [x] `advanced-mode=auto` semantics and status/reason surfacing are implemented. - Evidence: `orchestrator/src/cli/utils/advancedAutopilot.ts`, `orchestrator/src/cli/orchestrator.ts`, `orchestrator/tests/AdvancedAutopilot.test.ts`.
- [x] Non-trivial pipelines inject bounded non-blocking scout evidence stage. - Evidence: `orchestrator/src/cli/orchestrator.ts`, `orchestrator/src/cli/utils/advancedAutopilot.ts`, `orchestrator/tests/AdvancedAutopilot.test.ts`.
- [x] Structured cloud fallback reason is captured in manifests/output. - Evidence: `orchestrator/src/cli/orchestrator.ts`, `orchestrator/src/cli/run/manifest.ts`, `orchestrator/src/cli/services/runSummaryWriter.ts`, `bin/codex-orchestrator.ts`, `packages/shared/manifest/types.ts`, `schemas/manifest.json`, `orchestrator/tests/RunSummaryWriter.test.ts`.
- [x] RLM auto symbolic activation is tightened to large-context-only signals. - Evidence: `orchestrator/src/cli/rlmRunner.ts`, `orchestrator/tests/RlmRunnerMode.test.ts`, `docs/guides/rlm-recursion-v2.md`, `README.md`.
- [x] `doctor --usage` and run-summary include additive KPI surfacing. - Evidence: `orchestrator/src/cli/doctorUsage.ts`, `orchestrator/src/cli/services/runSummaryWriter.ts`, `orchestrator/src/types.ts`, `orchestrator/tests/DoctorUsage.test.ts`, `orchestrator/tests/RunSummaryWriter.test.ts`.
- [x] Regression tests updated for new behavior. - Evidence: `orchestrator/tests/AdvancedAutopilot.test.ts`, `orchestrator/tests/RlmRunnerMode.test.ts`, `orchestrator/tests/RunSummaryWriter.test.ts`, `orchestrator/tests/DoctorUsage.test.ts`.

### Validation and handoff
- [x] Required quality gates passed (build/lint/test/docs/review + diff budget). - Evidence: `.runs/0971-advanced-capability-autopilot/cli/2026-02-17T15-05-09-688Z-fd231b23/manifest.json`, `out/0971-advanced-capability-autopilot/manual/post-implementation-standalone-review.log`.
- [x] Implementation-gate manifest captured. - Evidence: `.runs/0971-advanced-capability-autopilot/cli/2026-02-17T15-05-09-688Z-fd231b23/manifest.json`.
- [x] Standalone post-implementation elegance review completed. - Evidence: `out/0971-advanced-capability-autopilot/manual/post-implementation-standalone-review.log`, `out/0971-advanced-capability-autopilot/manual/post-implementation-elegance-review.log`.
