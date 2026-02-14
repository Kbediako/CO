# Task Checklist - Delegation Skills Optimization + Patch Release (0960)

- MCP Task ID: `0960-delegation-skills-optimization-patch-release`
- Primary PRD: `docs/PRD-delegation-skills-optimization-patch-release.md`
- TECH_SPEC: `tasks/specs/0960-delegation-skills-optimization-patch-release.md`
- ACTION_PLAN: `docs/ACTION_PLAN-delegation-skills-optimization-patch-release.md`
- Summary of scope: Optimize and validate shipped delegation skills (`delegation-usage` canonical + `delegate-early` alias) and ship patch release metadata.

> Set `MCP_RUNNER_TASK_ID=0960-delegation-skills-optimization-patch-release` for orchestrator commands. Guardrails required: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, `npm run review`. Mirror with `docs/TASKS.md` and `.agent/task/0960-delegation-skills-optimization-patch-release.md`. Flip `[ ]` to `[x]` only with evidence (manifest or log when required; standalone review approvals can cite spec/task notes).

## Checklist

### Foundation
- [x] Task scaffolding + mirrors registered - Evidence: `tasks/tasks-0960-delegation-skills-optimization-patch-release.md`, `.agent/task/0960-delegation-skills-optimization-patch-release.md`, `tasks/index.json`, `docs/TASKS.md`.
- [x] PRD + TECH_SPEC + ACTION_PLAN drafted - Evidence: `docs/PRD-delegation-skills-optimization-patch-release.md`, `tasks/specs/0960-delegation-skills-optimization-patch-release.md`, `docs/ACTION_PLAN-delegation-skills-optimization-patch-release.md`, `docs/TECH_SPEC-delegation-skills-optimization-patch-release.md`.
- [x] Planning scout captured - Evidence: `.runs/0960-delegation-skills-optimization-patch-release-scout/cli/2026-02-14T04-19-55-140Z-4a1c33a9/manifest.json`.
- [x] Standalone review approval captured (pre-implementation) - Evidence: `.runs/0960-delegation-skills-optimization-patch-release/cli/2026-02-14T04-21-56-223Z-3864b232/manifest.json`, `tasks/specs/0960-delegation-skills-optimization-patch-release.md`.
- [x] Delegation subagent run captured - Evidence: `.runs/0960-delegation-skills-optimization-patch-release-scout/cli/2026-02-14T04-19-55-140Z-4a1c33a9/manifest.json`.

### Implementation
- [x] Expand skill-install tests for canonical (`delegation-usage`) + alias (`delegate-early`) behavior - Evidence: `orchestrator/tests/SkillsInstall.test.ts`.
- [x] Run manual skill install smoke and record evidence - Evidence: `out/0960-delegation-skills-optimization-patch-release/manual/skills-install-smoke.log`, `out/0960-delegation-skills-optimization-patch-release/manual/delegation-usage-assertions.log`, `out/0960-delegation-skills-optimization-patch-release/manual/delegate-early-assertions.log`.
- [x] Capture explicit skill validation logs (targeted unit test + package audit) - Evidence: `out/0960-delegation-skills-optimization-patch-release/manual/skills-install-vitest.log`, `out/0960-delegation-skills-optimization-patch-release/manual/skills-pack-audit.log`.
- [x] Bump patch version metadata for downstream release - Evidence: `package.json`, `package-lock.json`.

### Validation and handoff
- [x] Required quality gates passed (build/lint/test/docs/review + diff budget) - Evidence: `.runs/0960-delegation-skills-optimization-patch-release/cli/2026-02-14T04-24-11-249Z-38fdc882/manifest.json`.
- [x] Docs-review manifest captured - Evidence: `.runs/0960-delegation-skills-optimization-patch-release/cli/2026-02-14T04-21-56-223Z-3864b232/manifest.json`.
- [x] Implementation-gate manifest captured - Evidence: `.runs/0960-delegation-skills-optimization-patch-release/cli/2026-02-14T04-24-11-249Z-38fdc882/manifest.json`.
- [ ] Open PR and address bot feedback.
- [ ] Merge after green checks + review stability window.

## Relevant Files
- `orchestrator/tests/SkillsInstall.test.ts`
- `orchestrator/src/cli/skills.ts`
- `skills/delegation-usage/SKILL.md`
- `skills/delegate-early/SKILL.md`
- `package.json`
- `package-lock.json`
