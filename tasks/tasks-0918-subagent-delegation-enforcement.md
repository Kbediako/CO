# Task List: Subagent Delegation Enforcement (0918-subagent-delegation-enforcement)

## Context
- Link to PRD: `tasks/0918-prd-subagent-delegation-enforcement.md`
- Summary of scope: enforce subagent delegation with guardrails, pipeline integration, and updated agent guidance.

### Checklist Convention
- Start every task/subtask with `[ ]` and flip it to `[x]` when the acceptance criteria are met, citing the run manifest or log that documents completion.

### Evidence Gates
- [x] Docs-review manifest captured (pre-implementation) - Evidence: `.runs/0918-subagent-delegation-enforcement/cli/2025-12-30T16-39-51-110Z-97be9496/manifest.json`.
- [x] Implementation review manifest captured (post-implementation) - Evidence: `.runs/0918-subagent-delegation-enforcement/cli/2025-12-30T16-53-35-423Z-88c50e5f/manifest.json`.

## Parent Tasks
1. Planning + collateral
   - Draft PRD, tech spec, action plan, and checklist.
     - Files: `tasks/0918-prd-subagent-delegation-enforcement.md`, `docs/PRD-subagent-delegation-enforcement.md`, `docs/TECH_SPEC-subagent-delegation-enforcement.md`, `docs/ACTION_PLAN-subagent-delegation-enforcement.md`, `tasks/tasks-0918-subagent-delegation-enforcement.md`.
     - Commands: N/A.
     - Acceptance: Docs exist and link to each other.
     - [x] Status: Complete - Evidence: this commit.
   - Register the task in mirrors.
     - Files: `tasks/index.json`, `docs/PRD.md`, `docs/TECH_SPEC.md`, `docs/ACTION_PLAN.md`, `docs/TASKS.md`, `.agent/task/0918-subagent-delegation-enforcement.md`.
     - Commands: N/A.
     - Acceptance: New task appears in indexes and mirrors.
     - [x] Status: Complete - Evidence: this commit.

2. Delegation guard implementation
   - Add delegation guard script.
     - Files: `scripts/delegation-guard.mjs`.
     - Commands: `node scripts/delegation-guard.mjs`.
     - Acceptance: Guard validates top-level tasks and reports clear failures when missing subagent evidence.
     - [x] Status: Complete - Evidence: this commit.
   - Integrate delegation guard into pipelines.
     - Files: `codex.orchestrator.json`.
     - Commands: `npx codex-orchestrator start docs-review --format json --no-interactive --task 0918-subagent-delegation-enforcement`.
     - Acceptance: Delegation guard runs before spec-guard in core pipelines.
     - [x] Status: Complete - Evidence: this commit.

3. Policy + template updates
   - Update agent guidance and SOPs to mandate delegation.
     - Files: `AGENTS.md`, `docs/AGENTS.md`, `.agent/AGENTS.md`, `.agent/SOPs/agent-autonomy-defaults.md`, `.agent/SOPs/meta-orchestration.md`.
     - Commands: N/A.
     - Acceptance: Delegation requirements and override rules are explicit.
     - [x] Status: Complete - Evidence: this commit.
   - Update templates to capture subagent evidence.
     - Files: `.agent/task/templates/tasks-template.md`, `.agent/task/templates/subagent-request-template.md`.
     - Commands: N/A.
     - Acceptance: Templates require task ID naming and manifest evidence.
     - [x] Status: Complete - Evidence: this commit.

4. Validation + handoff
   - Run guardrails and capture evidence.
     - Files: `tasks/tasks-0918-subagent-delegation-enforcement.md`, `.agent/task/0918-subagent-delegation-enforcement.md`, `docs/TASKS.md`.
     - Commands: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `node scripts/diff-budget.mjs`, `npm run review`.
     - Acceptance: Implementation gate manifest captured and mirrors updated.
     - [x] Status: Complete - Evidence: `.runs/0918-subagent-delegation-enforcement/cli/2025-12-30T16-53-35-423Z-88c50e5f/manifest.json`.

## Relevant Files
- `scripts/delegation-guard.mjs`
- `codex.orchestrator.json`
- `AGENTS.md`
- `docs/AGENTS.md`
- `.agent/AGENTS.md`
- `.agent/SOPs/agent-autonomy-defaults.md`
- `.agent/SOPs/meta-orchestration.md`

## Notes
- Spec Requirements: update task docs and record PRD approval in `tasks/index.json` when ready.
- Approvals Needed: product + engineering sign-off for enforcement policy.
- Links: `.agent/task/templates/subagent-request-template.md` for subagent prompts.
- Subagent usage (required): `0918-subagent-delegation-enforcement-docs` - `.runs/0918-subagent-delegation-enforcement-docs/cli/2025-12-30T16-38-34-482Z-000d8b75/manifest.json`.
