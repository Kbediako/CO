# Task Checklist - Playwright Context Control + Subagent Guardrails (0969)

- MCP Task ID: `0969-playwright-context-subagent-guardrails`
- Primary PRD: `docs/PRD-playwright-context-subagent-guardrails.md`
- TECH_SPEC: `tasks/specs/0969-playwright-context-subagent-guardrails.md`
- ACTION_PLAN: `docs/ACTION_PLAN-playwright-context-subagent-guardrails.md`
- Summary of scope: reduce context blowups from Playwright-heavy workflows by standardizing subagent execution, default-off MCP posture, and summary-only evidence handoff.

> Set `MCP_RUNNER_TASK_ID=0969-playwright-context-subagent-guardrails` for orchestrator commands. Guardrails required: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `npm run review`. Mirror with `docs/TASKS.md` and `.agent/task/0969-playwright-context-subagent-guardrails.md`. Flip `[ ]` to `[x]` only with evidence.

## Checklist

### Foundation
- [x] Task scaffolding + mirrors registered. - Evidence: `tasks/tasks-0969-playwright-context-subagent-guardrails.md`, `.agent/task/0969-playwright-context-subagent-guardrails.md`, `tasks/index.json`, `docs/TASKS.md`.
- [x] PRD + TECH_SPEC + ACTION_PLAN drafted. - Evidence: `docs/PRD-playwright-context-subagent-guardrails.md`, `tasks/specs/0969-playwright-context-subagent-guardrails.md`, `docs/ACTION_PLAN-playwright-context-subagent-guardrails.md`, `docs/TECH_SPEC-playwright-context-subagent-guardrails.md`.
- [x] Delegation scout run captured (`<task-id>-<stream>` manifest). - Evidence: `.runs/0969-playwright-context-subagent-guardrails-scout/cli/2026-02-17T08-02-32-648Z-40d986bd/manifest.json`.
- [x] Docs-review manifest captured (pre-implementation). - Evidence: `.runs/0969-playwright-context-subagent-guardrails/cli/2026-02-17T08-04-54-215Z-f2f60ef0/manifest.json`.
- [x] Standalone pre-implementation review approval captured. - Evidence: `out/0969-playwright-context-subagent-guardrails/manual/pre-implementation-standalone-review.log`.

### Implementation
- [x] Shipped docs/skills codify Playwright-heavy workstream routing to dedicated subagents and summary-only parent handoff. - Evidence: `docs/AGENTS.md`, `docs/guides/collab-vs-mcp.md`, `skills/collab-subagents-first/SKILL.md`, `skills/delegation-usage/SKILL.md`, `skills/delegation-usage/DELEGATION_GUIDE.md`.
- [x] Global/local Playwright skill wrapper and guidance updated for current MCP CLI entrypoint and low-noise usage pattern. - Evidence: `/Users/kbediako/.codex/skills/playwright/SKILL.md`, `/Users/kbediako/.codex/skills/playwright/references/workflows.md`, `/Users/kbediako/.codex/skills/playwright/references/cli.md`, `/Users/kbediako/.codex/skills/playwright/scripts/playwright_cli.sh`, `/Users/kbediako/.codex/config.toml`.
- [x] Global frontend testing/review skills updated to route high-output browser capture through bounded subagent streams. - Evidence: `/Users/kbediako/.codex/skills/frontend-testing/SKILL.md`, `/Users/kbediako/.codex/skills/frontend-design-review/SKILL.md`, `/Users/kbediako/.codex/skills/develop-web-game/SKILL.md`.

### Validation and handoff
- [x] Required quality gates passed (build/lint/test/docs/review + diff budget). - Evidence: `.runs/0969-playwright-context-subagent-guardrails/cli/2026-02-17T08-17-00-403Z-7d994ee6/manifest.json`.
- [x] Implementation-gate manifest captured. - Evidence: `.runs/0969-playwright-context-subagent-guardrails/cli/2026-02-17T08-17-00-403Z-7d994ee6/manifest.json`.
- [x] Standalone post-implementation elegance review completed. - Evidence: `out/0969-playwright-context-subagent-guardrails/manual/post-implementation-standalone-review.log`.
- [x] Manual Playwright workflow validation captured (old wrapper failure reproduced, new wrapper + low-noise pattern confirmed). - Evidence: `out/0969-playwright-context-subagent-guardrails/manual/playwright-wrapper-validation.log`.
