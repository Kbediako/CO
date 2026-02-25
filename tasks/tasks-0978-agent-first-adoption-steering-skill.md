# Task Checklist - Agent-First Adoption Steering Skill (0978)

- MCP Task ID: `0978-agent-first-adoption-steering-skill`
- Primary PRD: `docs/PRD-agent-first-adoption-steering-skill.md`
- TECH_SPEC: `tasks/specs/0978-agent-first-adoption-steering-skill.md`
- ACTION_PLAN: `docs/ACTION_PLAN-agent-first-adoption-steering-skill.md`
- Summary of scope: decide and document autonomy-first advanced-capability steering policy, then draft a downstream-shippable bundled skill and validate with tailored standalone/elegance reviews.

> Set `MCP_RUNNER_TASK_ID=0978-agent-first-adoption-steering-skill` for orchestrator commands. Guardrails required: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `npm run review`.

## Checklist

### Foundation and deliberation
- [x] Decision recorded for run-only vs time-only vs hybrid controls (hybrid selected). - Evidence: `docs/PRD-agent-first-adoption-steering-skill.md`, `tasks/specs/0978-agent-first-adoption-steering-skill.md`.
- [x] Deliberation streams captured for autonomy and throughput failure modes. - Evidence: subagents `019c92c8-095d-7e30-b9cc-31581c7d1649`, `019c92c8-0eb9-7f23-a74f-9f22e8f7337f`, `019c92bf-1657-76d1-8286-b2fd3613d6f6`, `019c92bf-1b68-7461-be91-74d31cc4c3cb`.

### Docs-first artifacts and gates
- [x] Task scaffolding + mirrors + registries registered. - Evidence: `tasks/tasks-0978-agent-first-adoption-steering-skill.md`, `.agent/task/0978-agent-first-adoption-steering-skill.md`, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] PRD + TECH_SPEC + ACTION_PLAN drafted. - Evidence: `docs/PRD-agent-first-adoption-steering-skill.md`, `tasks/specs/0978-agent-first-adoption-steering-skill.md`, `docs/ACTION_PLAN-agent-first-adoption-steering-skill.md`, `docs/TECH_SPEC-agent-first-adoption-steering-skill.md`.
- [x] Docs-review manifest captured (pre-implementation). - Evidence: `.runs/0978-agent-first-adoption-steering-skill/cli/2026-02-25T03-48-09-988Z-0e0cd9c1/manifest.json`.

### Skill drafting and validation
- [x] Bundled skill drafted with autonomy-first hybrid control policy. - Evidence: `skills/agent-first-adoption-steering/SKILL.md`.
- [x] README bundled skills list updated. - Evidence: `README.md`.
- [x] Tailored standalone review completed and logged. - Evidence: `out/0978-agent-first-adoption-steering-skill/manual/post-implementation-standalone-review.log`.
- [x] Tailored elegance review completed and logged. - Evidence: `out/0978-agent-first-adoption-steering-skill/manual/post-implementation-elegance-review.log`.
