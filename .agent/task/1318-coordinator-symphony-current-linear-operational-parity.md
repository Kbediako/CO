# Task Checklist - 1318-coordinator-symphony-current-linear-operational-parity

- MCP Task ID: `1318-coordinator-symphony-current-linear-operational-parity`
- Primary PRD: `docs/PRD-coordinator-symphony-current-linear-operational-parity.md`
- TECH_SPEC: `tasks/specs/1318-coordinator-symphony-current-linear-operational-parity.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-current-linear-operational-parity.md`

## Docs-first
- [x] PRD drafted for the current Symphony operational Linear parity lane and updated to the chosen implementation boundary. Evidence: `docs/PRD-coordinator-symphony-current-linear-operational-parity.md`.
- [x] TECH_SPEC drafted for the same lane and updated to the chosen implementation boundary. Evidence: `tasks/specs/1318-coordinator-symphony-current-linear-operational-parity.md`, `docs/TECH_SPEC-coordinator-symphony-current-linear-operational-parity.md`.
- [x] ACTION_PLAN drafted for the same lane and updated to the chosen implementation sequence. Evidence: `docs/ACTION_PLAN-coordinator-symphony-current-linear-operational-parity.md`.
- [x] `tasks/index.json` registers the `1318` TECH_SPEC entry. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the `1318` snapshot. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/1318-coordinator-symphony-current-linear-operational-parity.md`. Evidence: `.agent/task/1318-coordinator-symphony-current-linear-operational-parity.md`.
- [x] docs-review recorded for `1318`. Evidence: `.runs/1318-coordinator-symphony-current-linear-operational-parity/cli/2026-03-22T08-53-40-103Z-9a43d120/manifest.json`.
- [x] Implementation-docs archive policy reviewed for this active planning lane; archival stays deferred until implementation closes. Evidence: `docs/implementation-docs-archive-policy.json`.

## Investigation
- [x] Current Symphony SPEC versus current Symphony Elixir operational behavior audited and separated truthfully. Evidence: `/Users/kbediako/Code/symphony/SPEC.md`, `/Users/kbediako/Code/symphony/elixir/README.md`, `/Users/kbediako/Code/symphony/elixir/WORKFLOW.md`, `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/codex/dynamic_tool.ex`, `/Users/kbediako/Code/symphony/elixir/test/symphony_elixir/live_e2e_test.exs`, `/Users/kbediako/Code/symphony/.codex/skills/linear/SKILL.md`.
- [x] Current CO boundary audited and classified as read-only provider lifecycle rather than current Symphony operational parity. Evidence: `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `orchestrator/src/cli/control/linearDispatchSource.ts`, `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/src/cli/services/orchestratorExecutionLifecycle.ts`, `orchestrator/src/cli/services/orchestratorRunLifecycleCompletion.ts`.
- [x] The new lane records that `1310` remains correct for the narrower orchestrator-core question, while `1318` widens the parity target to current Symphony operational behavior. Evidence: `docs/findings/1310-symphony-full-parity-audit-and-closure-truthfulness-reassessment-deliberation.md`, `docs/PRD-coordinator-symphony-current-linear-operational-parity.md`.

## Planning
- [x] Mutation-surface decision recorded as a worker-owned CO Linear helper CLI/facade backed by the existing GraphQL seam. Evidence: `docs/TECH_SPEC-coordinator-symphony-current-linear-operational-parity.md`.
- [x] Workflow/state-map parity requirements documented (`In Progress`, `Human Review` or live-team `In Review`, `Merging`, `Rework`, `Done`, workpad, PR linkage, review sweep). Evidence: `docs/PRD-coordinator-symphony-current-linear-operational-parity.md`, `docs/TECH_SPEC-coordinator-symphony-current-linear-operational-parity.md`.
- [x] Provider/runtime integration milestones updated from planning-only to implementation sequencing. Evidence: `docs/ACTION_PLAN-coordinator-symphony-current-linear-operational-parity.md`.
- [x] Live-team truth recorded: `CO-1` currently exposes `In Review` instead of `Human Review`, and final parity proof must exercise `provider-linear-worker` rather than `diagnostics`. Evidence: `docs/PRD-coordinator-symphony-current-linear-operational-parity.md`, `docs/TECH_SPEC-coordinator-symphony-current-linear-operational-parity.md`, `docs/ACTION_PLAN-coordinator-symphony-current-linear-operational-parity.md`, `tasks/specs/1318-coordinator-symphony-current-linear-operational-parity.md`.

## Validation
- [x] `docs-review` for the new planning packet. Evidence: `.runs/1318-coordinator-symphony-current-linear-operational-parity/cli/2026-03-22T08-53-40-103Z-9a43d120/manifest.json`.
- [x] `npm run docs:check`. Evidence: `.runs/1318-coordinator-symphony-current-linear-operational-parity/cli/2026-03-22T08-53-40-103Z-9a43d120/manifest.json`.
- [x] `npm run docs:freshness`. Evidence: `.runs/1318-coordinator-symphony-current-linear-operational-parity/cli/2026-03-22T08-53-40-103Z-9a43d120/manifest.json`.

## Implementation
- [x] Implement the worker-visible Linear mutation substrate. Evidence: `orchestrator/src/cli/control/linearGraphqlClient.ts`, `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`, `orchestrator/src/cli/linearCliShell.ts`, `bin/codex-orchestrator.ts`.
- [x] Implement provider worker workflow prompt parity with current Symphony. Evidence: `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`.
- [x] Implement remote-first persistent workpad handling. Evidence: `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`, `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`.
- [x] Implement provider lifecycle handling for non-active handoff states and workflow evidence. Evidence: `orchestrator/src/cli/control/providerLinearWorkflowStates.ts`, `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] Implement provider-worker helper-operation auditability in the proof surface. Evidence: `orchestrator/src/cli/control/providerLinearWorkflowAudit.ts`, `orchestrator/src/cli/linearCliShell.ts`, `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `orchestrator/tests/LinearCliShell.test.ts`, `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`.
- [x] Validate locally and with live Linear proof. Evidence: `out/1318-coordinator-symphony-current-linear-operational-parity/manual/20260322T133000Z-provider-intake-terminal-refresh-proof/10-reconciliation-summary.json`, `out/1318-coordinator-symphony-current-linear-operational-parity/manual/20260322T130632Z-live-provider-linear-worker-proof/12-proof-summary.json`, `.runs/1318-coordinator-symphony-current-linear-operational-parity/cli/2026-03-22T13-25-33-995Z-397e3829/review/prompt.txt`.
- [ ] Open PR, handle feedback, and merge.
