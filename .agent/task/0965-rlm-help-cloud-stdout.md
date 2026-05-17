# Task Checklist - RLM Help + Cloud Fallback Stdout (0965)

- MCP Task ID: `0965-rlm-help-cloud-stdout`
- Primary PRD: `docs/PRD-rlm-help-cloud-stdout.md`
- TECH_SPEC: `tasks/specs/0965-rlm-help-cloud-stdout.md`
- ACTION_PLAN: `docs/ACTION_PLAN-rlm-help-cloud-stdout.md`
- Summary of scope: fix `rlm --help` to never start a run, surface cloud preflight fallback reasons in `start` stdout/JSON, and add support docs for initiatives (1)–(3).

> Set `MCP_RUNNER_TASK_ID=0965-rlm-help-cloud-stdout` for orchestrator commands. Guardrails required: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `npm run review`. Mirror with `docs/TASKS.md` and `.agent/task/0965-rlm-help-cloud-stdout.md`. Flip `[ ]` to `[x]` only with evidence.

## Checklist

### Foundation
- [x] Task scaffolding + mirrors registered. - Evidence: `tasks/tasks-0965-rlm-help-cloud-stdout.md`, `.agent/task/0965-rlm-help-cloud-stdout.md`, `tasks/index.json`, `docs/TASKS.md`.
- [x] PRD + TECH_SPEC + ACTION_PLAN drafted. - Evidence: `docs/PRD-rlm-help-cloud-stdout.md`, `tasks/specs/0965-rlm-help-cloud-stdout.md`, `docs/ACTION_PLAN-rlm-help-cloud-stdout.md`, `docs/TECH_SPEC-rlm-help-cloud-stdout.md`.
- [x] Delegation scout run captured (`<task-id>-<stream>` manifest). - Evidence: `.runs/0965-rlm-help-cloud-stdout-scout/cli/2026-02-16T00-03-00-324Z-eada8d96/manifest.json`.
- [x] Docs-review manifest captured (pre-implementation). - Evidence: `.runs/0965-rlm-help-cloud-stdout/cli/2026-02-16T00-32-57-606Z-2f80fb71/manifest.json`.
- [x] Standalone pre-implementation review captured. - Evidence: `.runs/0965-rlm-help-cloud-stdout/cli/2026-02-16T00-32-57-606Z-2f80fb71/manifest.json` (review stage prompt/handoff).

### Implementation
- [x] `rlm --help` path prints help and exits without starting a run. - Evidence: `bin/codex-orchestrator.ts`, `tests/cli-command-surface.spec.ts`.
- [x] `start` output surfaces `manifest.summary` (cloud preflight fallback reason visible). - Evidence: `bin/codex-orchestrator.ts`, `orchestrator/src/cli/orchestrator.ts`.
- [x] Doctor cloud guidance mentions fallback semantics. - Evidence: `orchestrator/src/cli/doctor.ts`.
- [x] Support docs added/updated for all three initiatives. - Evidence:
  - (1) `rlm --help` UX: `docs/PRD-rlm-help-cloud-stdout.md`
  - (2) RLM recursion v2 usage: `docs/guides/rlm-recursion-v2.md` (built on shipped task 0961)
  - (3) Cloud preflight + fallback: `docs/guides/cloud-mode-preflight.md`

### Validation and handoff
- [x] Required quality gates passed (build/lint/test/docs/review + diff budget). - Evidence: `.runs/0965-rlm-help-cloud-stdout/cli/2026-02-16T00-29-52-337Z-458760fe/manifest.json`.
- [x] Manual E2E validation captured. - Evidence: `out/0965-rlm-help-cloud-stdout/manual/e2e-validation.log`.
- [x] Standalone post-implementation elegance review completed. - Evidence: `out/0965-rlm-help-cloud-stdout/manual/post-implementation-standalone-review.log`.
