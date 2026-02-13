# Task Checklist - Cloud Execution Canary CI Coverage (0958)

- MCP Task ID: `0958-cloud-canary-ci`
- Primary PRD: `docs/PRD-cloud-canary-ci.md`
- TECH_SPEC: `tasks/specs/0958-cloud-canary-ci.md`
- ACTION_PLAN: `docs/ACTION_PLAN-cloud-canary-ci.md`
- Summary of scope: Add CI canary coverage for cloud execution mode with manifest assertions and actionable diagnostics.

> Set `MCP_RUNNER_TASK_ID=0958-cloud-canary-ci` for orchestrator commands. Guardrails required: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `npm run review`. Mirror with `docs/TASKS.md` and `.agent/task/0958-cloud-canary-ci.md`. Flip `[ ]` to `[x]` only with evidence (manifest or log when required; standalone review approvals can cite spec/task notes).

## Checklist

### Foundation
- [x] Task scaffolding + mirrors registered - Evidence: `docs/TASKS.md`, `tasks/index.json`, `tasks/tasks-0958-cloud-canary-ci.md`, `.agent/task/0958-cloud-canary-ci.md`.
- [x] PRD + TECH_SPEC + ACTION_PLAN drafted - Evidence: `docs/PRD-cloud-canary-ci.md`, `tasks/specs/0958-cloud-canary-ci.md`, `docs/ACTION_PLAN-cloud-canary-ci.md`, `docs/TECH_SPEC-cloud-canary-ci.md`.
- [x] Planning scout captured - Evidence: `.runs/0958-cloud-canary-ci-scout/cli/2026-02-13T12-05-36-992Z-d291cfe9/manifest.json`.
- [x] Standalone review approval captured (pre-implementation) - Evidence: `tasks/specs/0958-cloud-canary-ci.md`.
- [x] Delegation subagent run captured - Evidence: `.runs/0958-cloud-canary-ci-scout/cli/2026-02-13T12-05-36-992Z-d291cfe9/manifest.json`.

### Implementation
- [x] Add cloud canary CI path for orchestrator cloud-mode execution - Evidence: `scripts/cloud-canary-ci.mjs`, `.github/workflows/cloud-canary.yml`, `package.json`.
- [x] Add manifest/run-summary assertion coverage for cloud lifecycle evidence - Evidence: `scripts/cloud-canary-ci.mjs`, `orchestrator/tests/RunSummaryWriter.test.ts`.
- [x] Add failure taxonomy + operator diagnostics for credential/endpoint issues - Evidence: `orchestrator/src/cli/adapters/cloudFailureDiagnostics.ts`, `orchestrator/src/cli/adapters/CommandTester.ts`, `orchestrator/src/cli/adapters/CommandReviewer.ts`, `orchestrator/tests/CloudFailureDiagnostics.test.ts`, `orchestrator/tests/CloudModeAdapters.test.ts`.

### Validation and handoff
- [x] Docs-review manifest captured - Evidence: `.runs/0958-cloud-canary-ci/cli/2026-02-13T12-07-32-909Z-8cf7dbba/manifest.json`.
- [x] Implementation-gate review captured - Evidence: `.runs/0958-cloud-canary-ci/cli/2026-02-13T13-09-22-859Z-a9289881/manifest.json`.
- [x] Cloud canary execution verified with branch pinning - Evidence: `.runs/0958-cloud-canary-ci-local8/cli/2026-02-13T12-32-10-598Z-8519cfd2/manifest.json`, `.runs/0958-cloud-canary-ci-local8/cli/2026-02-13T12-32-10-598Z-8519cfd2/cloud/commands.ndjson`.

## Relevant Files
- `docs/PRD-cloud-canary-ci.md`
- `tasks/specs/0958-cloud-canary-ci.md`
- `docs/TECH_SPEC-cloud-canary-ci.md`
- `docs/ACTION_PLAN-cloud-canary-ci.md`
- `tasks/tasks-0958-cloud-canary-ci.md`
- `.agent/task/0958-cloud-canary-ci.md`
