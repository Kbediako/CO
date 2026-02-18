# Task Checklist - Cloud + RLM Adoption Reliability + Fallback Contract Hardening (0974)

- MCP Task ID: `0974-cloud-adoption-preflight-reliability`
- Primary PRD: `docs/PRD-cloud-adoption-preflight-reliability.md`
- TECH_SPEC: `tasks/specs/0974-cloud-adoption-preflight-reliability.md`
- ACTION_PLAN: `docs/ACTION_PLAN-cloud-adoption-preflight-reliability.md`
- Summary of scope: implement approved cloud/RLM reliability items (doctor preflight path + adoption hints, safe MCP enablement, resilience knobs, CI fallback contract assertions).

> Set `MCP_RUNNER_TASK_ID=0974-cloud-adoption-preflight-reliability` for orchestrator commands. Guardrails required: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `npm run review`. Mirror with `docs/TASKS.md` and `.agent/task/0974-cloud-adoption-preflight-reliability.md`. Flip `[ ]` to `[x]` only with evidence.

## Checklist

### Foundation
- [x] Task scaffolding + mirrors registered. - Evidence: `tasks/tasks-0974-cloud-adoption-preflight-reliability.md`, `.agent/task/0974-cloud-adoption-preflight-reliability.md`, `tasks/index.json` (note: `docs/TASKS.md` is line-capped and tracked via archive automation).
- [x] PRD + TECH_SPEC + ACTION_PLAN drafted. - Evidence: `docs/PRD-cloud-adoption-preflight-reliability.md`, `tasks/specs/0974-cloud-adoption-preflight-reliability.md`, `docs/ACTION_PLAN-cloud-adoption-preflight-reliability.md`, `docs/TECH_SPEC-cloud-adoption-preflight-reliability.md`.
- [x] Delegated audit stream captured. - Evidence: collab subagent `explorer_fast` evidence (agent id `019c704c-a5f2-7d70-8fc6-0a30d43d6013`).
- [x] Docs-review manifest captured (pre-implementation). - Evidence: `.runs/0974-cloud-adoption-preflight-reliability/cli/2026-02-18T10-37-33-980Z-72b397bb/manifest.json`.
- [x] Delegation guard subagent-manifest stream captured (`<task-id>-<stream>`). - Evidence: `.runs/0974-cloud-adoption-preflight-reliability-scout/cli/2026-02-18T10-34-24-363Z-10dbacbb/manifest.json`.
- [x] Standalone pre-implementation review approval captured. - Evidence: `out/0974-cloud-adoption-preflight-reliability/manual/pre-implementation-standalone-review.log`.

### Implementation
- [x] First-class doctor cloud preflight path implemented (text + JSON). - Evidence: `bin/codex-orchestrator.ts`, `orchestrator/src/cli/doctor.ts`, `orchestrator/tests/Doctor.test.ts`.
- [x] Doctor usage emits low-adoption cloud/RLM hints. - Evidence: `orchestrator/src/cli/doctorUsage.ts`, `orchestrator/tests/DoctorUsage.test.ts`.
- [x] Low-friction MCP enable path implemented with unsupported-field guardrails + secret-redacted display output. - Evidence: `orchestrator/src/cli/mcpEnable.ts`, `bin/codex-orchestrator.ts`, `orchestrator/tests/McpEnable.test.ts`, `tests/cli-command-surface.spec.ts`.
- [x] Cloud status retry resilience knobs added with safe bounds. - Evidence: `orchestrator/src/cli/orchestrator.ts`, `orchestrator/src/cloud/CodexCloudTaskExecutor.ts`, `orchestrator/tests/CodexCloudTaskExecutor.test.ts`.
- [x] Cloud canary script/workflow validates fallback contract explicitly. - Evidence: `scripts/cloud-canary-ci.mjs`, `.github/workflows/cloud-canary.yml`, `out/0974-cloud-adoption-preflight-reliability/manual/manual-cloud-canary-fallback.log`.
- [x] Docs/help updates reflect new cloud preflight and canary behavior. - Evidence: `README.md`, `docs/guides/cloud-mode-preflight.md`, `docs/TECH_SPEC-cloud-adoption-preflight-reliability.md`.

### Validation and handoff
- [x] Targeted tests + docs checks pass. - Evidence: `out/0974-cloud-adoption-preflight-reliability/manual/post-fix-validation-summary.md` (plus `orchestrator/tests/McpEnable.test.ts` and `orchestrator/tests/DoctorUsage.test.ts` updates).
- [x] Fresh-repo friction smoke checks captured (cross-repo setup/adoption). - Evidence: `out/0974-cloud-adoption-preflight-reliability/manual/dummy-repo-friction-smoke-2026-02-18.md`.
- [x] Manual CLI/cloud canary fallback checks captured. - Evidence: `out/0974-cloud-adoption-preflight-reliability/manual/manual-doctor-cloud-preflight-delegated.json`, `out/0974-cloud-adoption-preflight-reliability/manual/manual-cloud-canary-fallback.log`.
- [x] Post-implementation standalone + elegance review completed. - Evidence: `.runs/0974-cloud-adoption-preflight-reliability/cli/2026-02-18T10-37-33-980Z-72b397bb/review/output.log`, `out/0974-cloud-adoption-preflight-reliability/manual/elegance-pass-2026-02-18.md`.
