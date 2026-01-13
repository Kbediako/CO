# Task Checklist - Delegation Skill Ship (0947)

> Set `MCP_RUNNER_TASK_ID=0947-delegation-skill-ship` for orchestrator commands. Mirror with `docs/TASKS.md` and `.agent/task/0947-delegation-skill-ship.md`. Flip `[ ]` to `[x]` only with manifest evidence.

## Checklist

### Foundation
- [x] Docs-review manifest captured — Evidence: `.runs/0947-delegation-skill-ship/cli/2026-01-13T00-24-47-193Z-742a71c7/manifest.json`.
- [x] Subagent diagnostics captured — Evidence: `.runs/0947-delegation-skill-ship-subagent/cli/2026-01-13T00-22-35-053Z-5d911955/manifest.json`.
- [x] Mirrors updated in `docs/TASKS.md` and `.agent/task/0947-delegation-skill-ship.md` — Evidence: `docs/TASKS.md`, `.agent/task/0947-delegation-skill-ship.md`, `tasks/index.json`, `docs/docs-freshness-registry.json`.

### Implementation
- [x] Ship delegation skill in npm package (include `skills/**` in `package.json` files list) — Evidence: `package.json`.

### Validation + handoff
- [x] Implementation-gate manifest captured — Evidence: `.runs/0947-delegation-skill-ship/cli/2026-01-13T00-35-31-776Z-ca886a3f/manifest.json`.

## Relevant Files
- `package.json`
- `skills/delegation-usage/SKILL.md`
- `skills/delegation-usage/DELEGATION_GUIDE.md`
