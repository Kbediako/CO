# Task Checklist - Multi-Agent Canonical Terminology + Compatibility Alignment (0972)

- MCP Task ID: `0972-multi-agent-canonical-compat-alignment`
- Primary PRD: `docs/PRD-multi-agent-canonical-compat-alignment.md`
- TECH_SPEC: `tasks/specs/0972-multi-agent-canonical-compat-alignment.md`
- ACTION_PLAN: `docs/ACTION_PLAN-multi-agent-canonical-compat-alignment.md`
- Summary of scope: canonicalize `multi_agent` feature-gating language while preserving stable legacy `collab` compatibility surfaces.

> Set `MCP_RUNNER_TASK_ID=0972-multi-agent-canonical-compat-alignment` for orchestrator commands. Guardrails required: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `npm run review`. Mirror with `docs/TASKS.md` and `.agent/task/0972-multi-agent-canonical-compat-alignment.md`. Flip `[ ]` to `[x]` only with evidence.

## Checklist

### Foundation
- [x] Task scaffolding + mirrors registered. - Evidence: `tasks/tasks-0972-multi-agent-canonical-compat-alignment.md`, `.agent/task/0972-multi-agent-canonical-compat-alignment.md`, `tasks/index.json` (note: `docs/TASKS.md` is line-capped and tracked via archive automation).
- [x] PRD + TECH_SPEC + ACTION_PLAN drafted. - Evidence: `docs/PRD-multi-agent-canonical-compat-alignment.md`, `tasks/specs/0972-multi-agent-canonical-compat-alignment.md`, `docs/ACTION_PLAN-multi-agent-canonical-compat-alignment.md`, `docs/TECH_SPEC-multi-agent-canonical-compat-alignment.md`.
- [x] Delegated audit stream captured. - Evidence: collab subagent `explorer_fast` audit in this run (agent id `019c6e54-b24b-7953-bf92-aee940b8c475`).
- [x] Docs-review manifest captured (pre-implementation). - Evidence: `.runs/0972-multi-agent-canonical-compat-alignment/cli/2026-02-18T01-29-00-289Z-19f648b1/manifest.json`.
- [x] Standalone pre-implementation review approval captured. - Evidence: `out/0972-multi-agent-canonical-compat-alignment/manual/pre-implementation-standalone-review.log`.

### Implementation
- [x] Canonical `multi_agent` wording updated in targeted docs/help text with explicit legacy alias caveats. - Evidence: `README.md`, `docs/guides/rlm-recursion-v2.md`, `orchestrator/src/cli/doctor.ts`, `orchestrator/src/cli/doctorUsage.ts`, `bin/codex-orchestrator.ts`.
- [x] Compatibility policy documented: keep stable legacy runtime/schema/interface names in phase-1. - Evidence: `docs/PRD-multi-agent-canonical-compat-alignment.md`, `tasks/specs/0972-multi-agent-canonical-compat-alignment.md`, `docs/TECH_SPEC-multi-agent-canonical-compat-alignment.md`.
- [x] Shipped/global skill guidance remains aligned for non-CO repos. - Evidence: `skills/collab-deliberation/SKILL.md`, `skills/collab-subagents-first/SKILL.md`, `skills/delegation-usage/SKILL.md`, `skills/delegation-usage/DELEGATION_GUIDE.md`, `/Users/kbediako/.codex/AGENTS.md`.
- [x] Canonical role-policy env knobs landed with legacy alias fallback + warnings (`RLM_SYMBOLIC_MULTI_AGENT_ROLE_POLICY`, `RLM_SYMBOLIC_MULTI_AGENT_ALLOW_DEFAULT_ROLE`). - Evidence: `orchestrator/src/cli/rlmRunner.ts`, `orchestrator/tests/RlmRunnerMode.test.ts`, `README.md`, `docs/guides/collab-vs-mcp.md`.

### Validation and handoff
- [x] Targeted tests + docs checks pass. - Evidence: `out/0972-multi-agent-canonical-compat-alignment/manual/validation-delegation-guard.log`, `out/0972-multi-agent-canonical-compat-alignment/manual/validation-spec-guard.log`, `out/0972-multi-agent-canonical-compat-alignment/manual/validation-build.log`, `out/0972-multi-agent-canonical-compat-alignment/manual/validation-lint.log`, `out/0972-multi-agent-canonical-compat-alignment/manual/validation-tests-targeted.log`, `out/0972-multi-agent-canonical-compat-alignment/manual/validation-docs-check.log`, `out/0972-multi-agent-canonical-compat-alignment/manual/validation-docs-freshness.log`, `out/0972-multi-agent-canonical-compat-alignment/manual/validation-diff-budget.log`.
- [x] Post-implementation standalone + elegance review completed. - Evidence: `out/0972-multi-agent-canonical-compat-alignment/manual/post-implementation-standalone-review.log`, `out/0972-multi-agent-canonical-compat-alignment/manual/post-implementation-elegance-review.log`.
- [x] Manual default Codex `--enable multi_agent` proof captured for spawn/wait/close lifecycle and role-tagged spawn prompt. - Evidence: `out/0972-multi-agent-canonical-compat-alignment/manual/manual-codex-multi-agent-agent-type.jsonl`, `out/0972-multi-agent-canonical-compat-alignment/manual/manual-codex-multi-agent-agent-type-worker.jsonl`, `out/0972-multi-agent-canonical-compat-alignment/manual/manual-codex-multi-agent-agent-type-worker-tagged.jsonl`, `out/0972-multi-agent-canonical-compat-alignment/manual/intent-and-manual-multi-agent-proof-2026-02-18.md`.
