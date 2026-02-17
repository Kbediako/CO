# Task Checklist - Control-Plane + Guardrail Runner Hardening (0970)

- MCP Task ID: `0970-control-plane-guardrail-runner-hardening`
- Primary PRD: `docs/PRD-control-plane-guardrail-runner-hardening.md`
- TECH_SPEC: `tasks/specs/0970-control-plane-guardrail-runner-hardening.md`
- ACTION_PLAN: `docs/ACTION_PLAN-control-plane-guardrail-runner-hardening.md`
- Summary of scope: harden control-plane request shaping, guard wrapper script resolution, and guardrail skip reporting without changing strict-policy decisions.

> Set `MCP_RUNNER_TASK_ID=0970-control-plane-guardrail-runner-hardening` for orchestrator commands. Guardrails required: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `npm run review`. Mirror with `docs/TASKS.md` and `.agent/task/0970-control-plane-guardrail-runner-hardening.md`. Flip `[ ]` to `[x]` only with evidence.

## Checklist

### Foundation
- [x] Task scaffolding + mirrors registered. - Evidence: `tasks/tasks-0970-control-plane-guardrail-runner-hardening.md`, `.agent/task/0970-control-plane-guardrail-runner-hardening.md`, `tasks/index.json`, `docs/TASKS.md`.
- [x] PRD + TECH_SPEC + ACTION_PLAN drafted. - Evidence: `docs/PRD-control-plane-guardrail-runner-hardening.md`, `tasks/specs/0970-control-plane-guardrail-runner-hardening.md`, `docs/ACTION_PLAN-control-plane-guardrail-runner-hardening.md`, `docs/TECH_SPEC-control-plane-guardrail-runner-hardening.md`.
- [x] Delegation scout run captured (`<task-id>-<stream>` manifest). - Evidence: `.runs/0970-control-plane-guardrail-runner-hardening-scout2/cli/2026-02-17T10-05-46-246Z-fdb3d18e/manifest.json`.
- [x] Docs-review manifest captured (pre-implementation). - Evidence: `.runs/0970-control-plane-guardrail-runner-hardening/cli/2026-02-17T10-08-20-572Z-6531161e/manifest.json`.
- [x] Standalone pre-implementation review approval captured. - Evidence: `out/0970-control-plane-guardrail-runner-hardening/manual/pre-implementation-standalone-review.log`.

### Implementation
- [x] `buildRunRequestV2` omits undefined optional task fields. - Evidence: `orchestrator/src/control-plane/request-builder.ts`, `orchestrator/tests/ControlPlaneValidator.test.ts`.
- [x] `specGuardRunner` and `delegationGuardRunner` execute repo-local or package-local guard scripts when available. - Evidence: `orchestrator/src/cli/utils/specGuardRunner.ts`, `orchestrator/src/cli/utils/delegationGuardRunner.ts`, `orchestrator/tests/SpecGuardRunner.test.ts`, `orchestrator/tests/DelegationGuardRunner.test.ts`.
- [x] Guardrail summary status treats explicit skipped guard runs as skipped (not succeeded). - Evidence: `orchestrator/src/cli/run/manifest.ts`, `orchestrator/tests/Manifest.test.ts`.
- [x] Regression tests added/updated for request shaping + guard wrappers + guardrail summary behavior. - Evidence: `orchestrator/tests/ControlPlaneValidator.test.ts`, `orchestrator/tests/DelegationGuardRunner.test.ts`, `orchestrator/tests/SpecGuardRunner.test.ts`, `orchestrator/tests/Manifest.test.ts`.

### Validation and handoff
- [x] Required quality gates passed (build/lint/test/docs/review + diff budget). - Evidence: `.runs/0970-control-plane-guardrail-runner-hardening/cli/2026-02-17T10-20-29-821Z-f3f8bd5d/manifest.json`.
- [x] Implementation-gate manifest captured. - Evidence: `.runs/0970-control-plane-guardrail-runner-hardening/cli/2026-02-17T10-20-29-821Z-f3f8bd5d/manifest.json`.
- [x] Standalone post-implementation elegance review completed. - Evidence: `out/0970-control-plane-guardrail-runner-hardening/manual/post-implementation-elegance-review.log`, `out/0970-control-plane-guardrail-runner-hardening/manual/post-implementation-standalone-review.log`.
