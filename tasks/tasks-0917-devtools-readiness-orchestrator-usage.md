# Task List - DevTools Readiness + Orchestrator Usage Discipline (0917-devtools-readiness-orchestrator-usage)

## Context
- Link to PRD: `tasks/0917-prd-devtools-readiness-orchestrator-usage.md` (canonical), `docs/PRD-devtools-readiness-orchestrator-usage.md` (mirror).
- Summary of scope: Add DevTools readiness + setup guidance for npm users and standardize top-level orchestrator use of pipelines + subagents.

### Checklist Convention
- Start every task/subtask with `[ ]` and flip it to `[x]` when the acceptance criteria are met, citing the run manifest or log that documents completion.

### Evidence Gates
- [x] Docs-review manifest captured (pre-implementation) - Evidence: `.runs/0917-devtools-readiness-orchestrator-usage/cli/2025-12-29T22-15-44-073Z-e5467cda/manifest.json`.
- [x] Implementation review manifest captured (post-implementation) - Evidence: `.runs/0917-devtools-readiness-orchestrator-usage/cli/2025-12-29T23-17-34-838Z-d96e2cf4/manifest.json`.
- [x] Metrics/state snapshots updated - Evidence: `.runs/0917-devtools-readiness-orchestrator-usage/metrics.json`, `out/0917-devtools-readiness-orchestrator-usage/state.json`.

## Parent Tasks
1. Planning and approvals
   - Subtask 1: Write/update mini-spec and obtain approval.
     - Files: `tasks/specs/0917-devtools-readiness-orchestrator-usage.md`
     - Commands: None (docs only).
     - Acceptance: Mini-spec exists with `last_review` set and approval section completed.
     - [x] Status: Complete — Evidence: `tasks/specs/0917-devtools-readiness-orchestrator-usage.md`.
   - Subtask 2: Record PRD approval in `tasks/index.json` gate metadata.
     - Files: `tasks/index.json`
     - Commands: `npx codex-orchestrator start docs-review --format json --no-interactive --task 0917-devtools-readiness-orchestrator-usage`
     - Acceptance: Gate status updated with manifest path + run id.
     - [x] Status: Complete — Evidence: `tasks/index.json` gate updated with `.runs/0917-devtools-readiness-orchestrator-usage/cli/2025-12-29T22-15-44-073Z-e5467cda/manifest.json`.
2. DevTools readiness improvements
   - Subtask 1: Extend `doctor` to detect DevTools MCP config.
     - Files: `orchestrator/src/cli/doctor.ts`, `orchestrator/src/cli/utils/*`
     - Commands: `npm run test`
     - Acceptance: `doctor` reports missing MCP config with actionable steps and JSON readiness states.
     - [x] Status: Complete — Evidence: `orchestrator/src/cli/doctor.ts`, `orchestrator/src/cli/utils/devtools.ts`, `orchestrator/tests/Doctor.test.ts`.
   - Subtask 2: Add devtools setup helper (explicit confirmation).
     - Files: `bin/codex-orchestrator.ts`, `orchestrator/src/cli/devtoolsSetup.ts`, `README.md`
     - Commands: `npm run test`
     - Acceptance: Setup helper prints exact steps and only writes config when explicitly confirmed.
     - [x] Status: Complete — Evidence: `orchestrator/src/cli/devtoolsSetup.ts`, `bin/codex-orchestrator.ts`, `README.md`.
   - Subtask 3: Add devtools preflight for devtools-enabled pipelines.
     - Files: `orchestrator/src/cli/utils/devtools.ts`, `orchestrator/src/cli/frontendTestingRunner.ts`, `scripts/run-review.ts`
     - Commands: `npm run test`
     - Acceptance: Devtools pipelines fail fast with actionable error when readiness is missing.
     - [x] Status: Complete — Evidence: `orchestrator/src/cli/utils/devtools.ts`, `orchestrator/tests/FrontendTestingRunner.test.ts`.
3. Orchestrator usage discipline
   - Subtask 1: Update SOPs and agent docs with orchestrator-first + subagent delegation requirements.
     - Files: `.agent/SOPs/agent-autonomy-defaults.md`, `.agent/AGENTS.md`, `docs/AGENTS.md`, `AGENTS.md`
     - Commands: None (docs only).
     - Acceptance: SOPs include a clear rubric for when to use orchestrator pipelines and when to spawn subagents.
     - [x] Status: Complete — Evidence: `.agent/SOPs/agent-autonomy-defaults.md`, `.agent/AGENTS.md`, `docs/AGENTS.md`, `AGENTS.md`.
   - Subtask 2: Update task templates if needed for subagent evidence capture.
     - Files: `.agent/task/templates/subagent-request-template.md`, `.agent/task/templates/tasks-template.md`
     - Commands: None (docs only).
     - Acceptance: Templates prompt for subagent usage and evidence linking.
     - [x] Status: Complete — Evidence: `.agent/task/templates/tasks-template.md` (subagent evidence note retained).
4. Validation + tests
   - Subtask 1: Add tests for MCP config detection + setup helper flows.
     - Files: `orchestrator/tests/Doctor.test.ts`, `orchestrator/tests/DevtoolsSetup.test.ts`, `orchestrator/tests/FrontendTestingRunner.test.ts`
     - Commands: `npx vitest run --config vitest.config.core.ts orchestrator/tests/Doctor.test.ts orchestrator/tests/FrontendTestingRunner.test.ts orchestrator/tests/DevtoolsSetup.test.ts`
     - Acceptance: Tests cover missing-config, missing-skill, and setup helper output.
     - [x] Status: Complete — Evidence: vitest run (2025-12-30).
   - Subtask 2: Add/extend devtools preflight tests.
     - Files: `orchestrator/tests/FrontendTestingRunner.test.ts`
     - Commands: `npx vitest run --config vitest.config.core.ts orchestrator/tests/FrontendTestingRunner.test.ts`
     - Acceptance: Devtools preflight failure surfaces actionable error when readiness is missing.
     - [x] Status: Complete — Evidence: vitest run (2025-12-30).
5. Guardrails & handoff (post-implementation)
   - Subtask 1: Run guardrails and capture evidence.
     - Files: `package.json` (scripts)
     - Commands: `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `node scripts/diff-budget.mjs`, `npm run review`
     - Acceptance: All guardrails pass with manifest evidence.
     - [x] Status: Complete — Evidence: `.runs/0917-devtools-readiness-orchestrator-usage/cli/2025-12-29T23-17-34-838Z-d96e2cf4/manifest.json`.

## Relevant Files
- `tasks/0917-prd-devtools-readiness-orchestrator-usage.md`
- `docs/PRD-devtools-readiness-orchestrator-usage.md`
- `docs/TECH_SPEC-devtools-readiness-orchestrator-usage.md`
- `docs/ACTION_PLAN-devtools-readiness-orchestrator-usage.md`
- `tasks/specs/0917-devtools-readiness-orchestrator-usage.md`
- `docs/TASKS.md`
- `.agent/task/0917-devtools-readiness-orchestrator-usage.md`

## Notes
- Spec Requirements: Mini-spec required (cross-module + policy update).
- Approvals Needed: PRD approval, mini-spec approval, docs-review manifest before implementation.
- Links: `docs/PRD-devtools-readiness-orchestrator-usage.md`, `docs/TECH_SPEC-devtools-readiness-orchestrator-usage.md`.
