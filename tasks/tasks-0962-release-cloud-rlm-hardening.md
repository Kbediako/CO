# Task Checklist - Release + Cloud + RLM Hardening (0962)

- MCP Task ID: `0962-release-cloud-rlm-hardening`
- Primary PRD: `docs/PRD-release-cloud-rlm-hardening.md`
- TECH_SPEC: `tasks/specs/0962-release-cloud-rlm-hardening.md`
- ACTION_PLAN: `docs/ACTION_PLAN-release-cloud-rlm-hardening.md`
- Summary of scope: Harden release/cloud workflows, tune symbolic deliberation artifacts/tests, remove logger lint debt, and reduce docs/skills workflow friction.

> Set `MCP_RUNNER_TASK_ID=0962-release-cloud-rlm-hardening` for orchestrator commands. Guardrails required: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `npm run review`. Mirror with `docs/TASKS.md` and `.agent/task/0962-release-cloud-rlm-hardening.md`. Flip `[ ]` to `[x]` only with evidence (manifest/log paths).

## Checklist

### Foundation
- [x] Task scaffolding + mirrors registered. - Evidence: `tasks/tasks-0962-release-cloud-rlm-hardening.md`, `.agent/task/0962-release-cloud-rlm-hardening.md`, `tasks/index.json`, `docs/TASKS.md`.
- [x] PRD + TECH_SPEC + ACTION_PLAN drafted. - Evidence: `docs/PRD-release-cloud-rlm-hardening.md`, `tasks/specs/0962-release-cloud-rlm-hardening.md`, `docs/ACTION_PLAN-release-cloud-rlm-hardening.md`, `docs/TECH_SPEC-release-cloud-rlm-hardening.md`.
- [x] Delegation scout run captured (`<task-id>-<stream>` manifest). - Evidence: `.runs/0962-release-cloud-rlm-hardening-scout/cli/2026-02-14T11-43-34-680Z-0f35eefa/manifest.json`.
- [x] Standalone review approval captured (pre-implementation). - Evidence: `out/0962-release-cloud-rlm-hardening/manual/pre-implementation-standalone-review.log`.
- [x] Docs-review manifest captured (pre-implementation). - Evidence: `.runs/0962-release-cloud-rlm-hardening/cli/2026-02-14T11-44-50-558Z-b0ab0330/manifest.json`.

### Implementation
- [x] Harden release workflow tag/manual-dispatch/signing/prerelease handling. - Evidence: `.github/workflows/release.yml`.
- [x] Harden cloud canary CI install + branch preflight behavior. - Evidence: `.github/workflows/cloud-canary.yml`, `scripts/cloud-canary-ci.mjs`.
- [x] Add symbolic deliberation artifact logging gate and reinforce output_var/final_var test coverage. - Evidence: `orchestrator/src/cli/rlm/symbolic.ts`, `orchestrator/tests/RlmSymbolic.test.ts`.
- [x] Replace `rlmRunner` `console.*` usage with shared logger. - Evidence: `orchestrator/src/cli/rlmRunner.ts`.
- [x] Add workflow ergonomics docs for micro-task path + downstream skills release/install. - Evidence: `docs/micro-task-path.md`, `docs/skills-release.md`, `skills/docs-first/SKILL.md`, `skills/standalone-review/SKILL.md`, `skills/delegation-usage/SKILL.md`, `skills/delegation-usage/DELEGATION_GUIDE.md`, `AGENTS.md`, `docs/AGENTS.md`, `docs/standalone-review-guide.md`, `docs/delegation-runner-workflow.md`, `docs/guides/collab-vs-mcp.md`, `docs/release-notes-template-addendum.md`, `.agent/SOPs/release.md`.

### Validation and handoff
- [x] Required quality gates passed (build/lint/test/docs/review + diff budget override). - Evidence: `.runs/0962-release-cloud-rlm-hardening/cli/2026-02-14T12-47-55-237Z-d45ad3bb/manifest.json`.
- [x] Implementation-gate manifest captured. - Evidence: `.runs/0962-release-cloud-rlm-hardening/cli/2026-02-14T12-47-55-237Z-d45ad3bb/manifest.json`.
- [x] Standalone post-implementation elegance review completed (findings resolved in follow-up commits). - Evidence: `out/0962-release-cloud-rlm-hardening/manual/post-implementation-standalone-review.log`.

## Relevant Files
- `.github/workflows/release.yml`
- `.github/workflows/cloud-canary.yml`
- `scripts/cloud-canary-ci.mjs`
- `orchestrator/src/cli/rlm/symbolic.ts`
- `orchestrator/src/cli/rlmRunner.ts`
- `orchestrator/tests/RlmSymbolic.test.ts`
- `docs/PRD-release-cloud-rlm-hardening.md`
- `tasks/specs/0962-release-cloud-rlm-hardening.md`
- `docs/ACTION_PLAN-release-cloud-rlm-hardening.md`
