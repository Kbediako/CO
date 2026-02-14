# Task Checklist - Experience Prompt Injection + Delegation Skill Harmonization (0959)

- MCP Task ID: `0959-experience-prompt-injection-delegation-skill-harmonization`
- Primary PRD: `docs/PRD-experience-prompt-injection-and-delegation-skill-harmonization.md`
- TECH_SPEC: `tasks/specs/0959-experience-prompt-injection-delegation-skill-harmonization.md`
- ACTION_PLAN: `docs/ACTION_PLAN-experience-prompt-injection-and-delegation-skill-harmonization.md`
- Summary of scope: Inject prompt-pack experiences into cloud prompt execution and harmonize shipped delegation skills toward `delegation-usage` as canonical.

> Set `MCP_RUNNER_TASK_ID=0959-experience-prompt-injection-delegation-skill-harmonization` for orchestrator commands. Guardrails required: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `npm run review`. Mirror with `docs/TASKS.md` and `.agent/task/0959-experience-prompt-injection-delegation-skill-harmonization.md`. Flip `[ ]` to `[x]` only with evidence (manifest or log when required; standalone review approvals can cite spec/task notes).

## Checklist

### Foundation
- [x] Task scaffolding + mirrors registered - Evidence: `tasks/tasks-0959-experience-prompt-injection-delegation-skill-harmonization.md`, `.agent/task/0959-experience-prompt-injection-delegation-skill-harmonization.md`, `tasks/index.json`, `docs/TASKS.md`.
- [x] PRD + TECH_SPEC + ACTION_PLAN drafted - Evidence: `docs/PRD-experience-prompt-injection-and-delegation-skill-harmonization.md`, `tasks/specs/0959-experience-prompt-injection-delegation-skill-harmonization.md`, `docs/ACTION_PLAN-experience-prompt-injection-and-delegation-skill-harmonization.md`, `docs/TECH_SPEC-experience-prompt-injection-and-delegation-skill-harmonization.md`.
- [x] Planning scout captured - Evidence: `.runs/0959-experience-prompt-injection-delegation-skill-harmonization-scout/cli/2026-02-14T03-17-20-574Z-02f71ef8/manifest.json`.
- [x] Standalone review approval captured (pre-implementation) - Evidence: `tasks/specs/0959-experience-prompt-injection-delegation-skill-harmonization.md`.
- [x] Delegation subagent run captured - Evidence: `.runs/0959-experience-prompt-injection-delegation-skill-harmonization-scout/cli/2026-02-14T03-17-20-574Z-02f71ef8/manifest.json`.

### Implementation
- [x] Inject selected experience snippets into cloud execution prompt builder - Evidence: `orchestrator/src/cli/orchestrator.ts`.
- [x] Add/adjust tests for cloud prompt behavior and fallback - Evidence: `orchestrator/tests/CloudPrompt.test.ts`.
- [x] Harmonize bundled delegation skills/docs (`delegation-usage` canonical, `delegate-early` compatibility alias) - Evidence: `skills/delegation-usage/SKILL.md`, `skills/delegation-usage/DELEGATION_GUIDE.md`, `skills/delegate-early/SKILL.md`, `README.md`.
- [x] Register 0959 docs/spec artifacts in docs freshness registry - Evidence: `docs/docs-freshness-registry.json`.

### Validation and handoff
- [x] Required quality gates passed (build/lint/test/docs/review + diff budget) - Evidence: `.runs/0959-experience-prompt-injection-delegation-skill-harmonization/cli/2026-02-14T03-21-12-811Z-a6b02bbb/manifest.json`.
- [x] Docs-review manifest captured - Evidence: `.runs/0959-experience-prompt-injection-delegation-skill-harmonization/cli/2026-02-14T03-20-41-027Z-c35101dd/manifest.json`.
- [x] Implementation-gate manifest captured - Evidence: `.runs/0959-experience-prompt-injection-delegation-skill-harmonization/cli/2026-02-14T03-21-12-811Z-a6b02bbb/manifest.json`.
- [ ] Open PR and address bot feedback.
- [ ] Merge after green checks + review stability window.

## Relevant Files
- `orchestrator/src/cli/orchestrator.ts`
- `orchestrator/tests/*.test.ts`
- `skills/delegation-usage/SKILL.md`
- `skills/delegation-usage/DELEGATION_GUIDE.md`
- `skills/delegate-early/SKILL.md`
- `README.md`
