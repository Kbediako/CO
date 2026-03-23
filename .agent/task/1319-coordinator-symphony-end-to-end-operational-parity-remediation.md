# Task Checklist - 1319-coordinator-symphony-end-to-end-operational-parity-remediation

- MCP Task ID: `1319-coordinator-symphony-end-to-end-operational-parity-remediation`
- Primary PRD: `docs/PRD-coordinator-symphony-end-to-end-operational-parity-remediation.md`
- TECH_SPEC: `tasks/specs/1319-coordinator-symphony-end-to-end-operational-parity-remediation.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-end-to-end-operational-parity-remediation.md`

## Docs-first
- [x] PRD drafted for the end-to-end Symphony operational parity remediation lane. Evidence: `docs/PRD-coordinator-symphony-end-to-end-operational-parity-remediation.md`.
- [x] TECH_SPEC drafted for the same lane. Evidence: `tasks/specs/1319-coordinator-symphony-end-to-end-operational-parity-remediation.md`, `docs/TECH_SPEC-coordinator-symphony-end-to-end-operational-parity-remediation.md`.
- [x] ACTION_PLAN drafted for the same lane. Evidence: `docs/ACTION_PLAN-coordinator-symphony-end-to-end-operational-parity-remediation.md`.
- [x] `tasks/index.json` registers the `1319` TECH_SPEC entry. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the `1319` snapshot. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/1319-coordinator-symphony-end-to-end-operational-parity-remediation.md`. Evidence: `.agent/task/1319-coordinator-symphony-end-to-end-operational-parity-remediation.md`.
- [x] docs-review recorded for `1319`. Evidence: `.runs/1319-coordinator-symphony-end-to-end-operational-parity-remediation/cli/2026-03-22T22-49-07-295Z-b0f31229/manifest.json`.
- [x] Implementation-docs archive policy reviewed for this active remediation lane; archival remains deferred until implementation closes. Evidence: `docs/implementation-docs-archive-policy.json`.

## Investigation
- [x] Current Symphony repo state reverified against `origin/HEAD`. Evidence: `/Users/kbediako/Code/symphony` at `a164593aacb3db4d6808adc5a87173d906726406`.
- [x] Current Symphony `SPEC.md`, optional extension surface, and current Elixir operational workflow audited separately. Evidence: `/Users/kbediako/Code/symphony/SPEC.md`, `/Users/kbediako/Code/symphony/elixir/README.md`, `/Users/kbediako/Code/symphony/elixir/WORKFLOW.md`, `/Users/kbediako/Code/symphony/.codex/skills/linear/SKILL.md`, `/Users/kbediako/Code/symphony/elixir/test/symphony_elixir/live_e2e_test.exs`.
- [x] Current CO runtime/provider/read-model gaps audited after `1318` and `#286`. Evidence: `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/src/cli/control/providerLinearWorkflowStates.ts`, `orchestrator/src/cli/control/controlRuntime.ts`, `orchestrator/src/cli/control/observabilitySurface.ts`, `orchestrator/src/cli/control/observabilityApiController.ts`, `orchestrator/src/cli/control/selectedRunProjection.ts`.
- [x] Live CO team workflow-state sufficiency checked. Evidence: `out/1318-coordinator-symphony-current-linear-operational-parity/manual/20260322T130632Z-live-provider-linear-worker-proof/10-linear-issue-context-co1.json`, live GraphQL issue/team-state query on 2026-03-23.
- [x] Live CO team workflow updated to add `Rework` and `Merging` while keeping `In Review` as the sole review alias. Evidence: live GraphQL workflowStateCreate verification on 2026-03-23, `node dist/bin/codex-orchestrator.js linear issue-context --issue-id 8c4a8de9-45b2-40ef-b295-bd37a21d1155 --format json` on 2026-03-23.
- [x] Broader Elixir operational behaviors classified instead of assumed missing wholesale. Evidence: `docs/PRD-coordinator-symphony-end-to-end-operational-parity-remediation.md`, `docs/TECH_SPEC-coordinator-symphony-end-to-end-operational-parity-remediation.md`, `orchestrator/src/cli/control/providerLinearWorkflowStates.ts`, `orchestrator/src/cli/control/observabilitySurface.ts`, targeted repo search on 2026-03-23.

## Planning
- [x] Remaining lifecycle gap classified as end-to-end operational ownership, not generic scheduler write-back. Evidence: `docs/PRD-coordinator-symphony-end-to-end-operational-parity-remediation.md`, `docs/TECH_SPEC-coordinator-symphony-end-to-end-operational-parity-remediation.md`.
- [x] Runtime/provider/read-model gaps separated from process/merge-discipline gaps. Evidence: `docs/TECH_SPEC-coordinator-symphony-end-to-end-operational-parity-remediation.md`, `docs/ACTION_PLAN-coordinator-symphony-end-to-end-operational-parity-remediation.md`.
- [x] Historical live workflow-state gap recorded and closed: `In Review` already existed, and `Rework` plus `Merging` were added for 1319. Evidence: `docs/PRD-coordinator-symphony-end-to-end-operational-parity-remediation.md`, `node dist/bin/codex-orchestrator.js linear issue-context --issue-id 856c1318-524f-4db3-8d4a-b357ec51c304 --format json`.
- [x] Decision recorded: add `Rework` and `Merging` now, keep `In Review` as the review alias, and do not add `Human Review`. Evidence: `docs/PRD-coordinator-symphony-end-to-end-operational-parity-remediation.md`, `docs/TECH_SPEC-coordinator-symphony-end-to-end-operational-parity-remediation.md`.
- [x] Decision recorded on which broader Elixir-only behaviors stay in 1319 versus explicit follow-on parity slices. Evidence: `docs/PRD-coordinator-symphony-end-to-end-operational-parity-remediation.md`, `docs/TECH_SPEC-coordinator-symphony-end-to-end-operational-parity-remediation.md`, `docs/ACTION_PLAN-coordinator-symphony-end-to-end-operational-parity-remediation.md`.
- [x] Final in-scope parity audit confirmed the remaining active-state-routing drift: CO still accepted arbitrary non-review `state_type: started` states, while current Symphony uses explicit named `active_states`. Evidence: `/Users/kbediako/Code/symphony/elixir/WORKFLOW.md`, `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/agent_runner.ex`, `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex`, `orchestrator/src/cli/control/providerLinearWorkflowStates.ts`.
- [x] Follow-on parity audit confirmed two narrower remaining deltas: live-team `Ready` still needs explicit `Todo`-equivalent routing, and CO `Rework` still diverges from Symphony by reusing the old PR/workpad instead of resetting. Evidence: `/Users/kbediako/Code/symphony/elixir/WORKFLOW.md`, `/Users/kbediako/Code/symphony/elixir/README.md`, `skills/linear/SKILL.md`, live `issue-context` output on 2026-03-23.

## Validation
- [x] `docs-review` for the `1319` packet. Evidence: `.runs/1319-coordinator-symphony-end-to-end-operational-parity-remediation/cli/2026-03-22T22-49-07-295Z-b0f31229/manifest.json`.
- [x] `npm run docs:check`. Evidence: `.runs/1319-coordinator-symphony-end-to-end-operational-parity-remediation/cli/2026-03-22T22-49-07-295Z-b0f31229/manifest.json`.
- [x] `npm run docs:freshness`. Evidence: `.runs/1319-coordinator-symphony-end-to-end-operational-parity-remediation/cli/2026-03-22T22-49-07-295Z-b0f31229/manifest.json`.
- [x] `node scripts/diff-budget.mjs` if docs packet exceeds budget. Evidence: override accepted on 2026-03-23 with `DIFF_BUDGET_OVERRIDE_REASON="1319 couples the docs-first packet, Symphony/Elixir workflow-state parity, assignee-gated dispatch and handoff fixes, Ready queue aliasing, Rework reset/workpad deletion support, read-model truthfulness cleanup, and the focused regressions needed to prove that contract." node scripts/diff-budget.mjs`.

## Implementation
- [x] Land explicit named active-state routing, live-team `Ready` queue aliasing, and review handoff / feedback / rework / merge / done lifecycle parity. Evidence: `orchestrator/src/cli/control/providerLinearWorkflowStates.ts`, `orchestrator/src/cli/control/linearDispatchSource.ts`, `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `skills/linear/SKILL.md`, focused regressions on 2026-03-23.
- [x] Add exact `Rework` reset semantics, including bounded workpad removal support. Evidence: `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`, `orchestrator/src/cli/control/providerLinearWorkflowAudit.ts`, `orchestrator/src/cli/linearCliShell.ts`, `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`, `orchestrator/tests/LinearCliShell.test.ts`, `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`.
- [x] Fix stale `/api/v1/dispatch` traceability fallback. Evidence: `orchestrator/src/cli/control/controlRuntime.ts`, `orchestrator/src/cli/control/trackerDispatchPilot.ts`, `orchestrator/tests/ControlRuntime.test.ts`, `orchestrator/tests/TrackerDispatchPilot.test.ts`.
- [ ] Validate locally and with one live Linear retest.
- [ ] Open PR, handle feedback, merge, and return to clean `main`.
