# PRD - Terminal Workspace Cleanup Hook and Attached-PR Auto-Close

## Added by Bootstrap 2026-03-27

## Traceability
- Linear issue: `CO-5` / `964ca955-cf9b-4d1b-887b-4d3bb49069d8`
- Linear URL: https://linear.app/asabeko/issue/CO-5/co-add-workflow-cleanup-hook-and-attached-pr-auto-close-on-terminal

## Summary
- Problem Statement: CO still lacks the Symphony-style `before_remove` cleanup seam for terminal provider workspaces. Today the control host releases terminal claims and deletes the provider worktree directly, so it cannot close a still-open attached PR for the workspace branch before removal, and unexpected cleanup failures can bubble out of the release path.
- Desired Outcome: Add a metadata-driven terminal cleanup hook for provider workspace removal that can inspect the workspace branch, close the attached open GitHub PR for that branch when configured, and surface failures without making terminal cleanup fatal to the control host.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): Finish Linear issue `CO-5` by matching the bounded Symphony cleanup contract in CO’s real terminal workspace-removal seam instead of widening into generic PR automation.
- Success criteria / acceptance:
  - terminal workspace cleanup runs a configurable hook before `git worktree remove`
  - when the current Linear issue has an attached GitHub PR whose head branch matches the workspace branch and the PR is still open, CO closes it with a concise machine-generated reason
  - cleanup failures are logged and surfaced but do not crash refresh/rehydrate release handling
  - focused tests cover no attached PR, already-closed PR, successful close, and close-hook failure
- Constraints / non-goals:
  - keep scope metadata-driven and bounded to terminal workspace removal for `provider-linear-worker`
  - do not widen this lane into general GitHub workflow automation, merge automation, or non-terminal workspace behavior
  - delegation is explicitly overridden in this worker run because subagent spawning is unavailable in-session

## Goals
- Match the Symphony `before_remove` seam with a CO-local terminal cleanup hook before workspace removal.
- Restrict PR closing to GitHub PRs already attached to the Linear issue and matching the workspace branch.
- Keep cleanup failures non-fatal while making them visible in machine-readable control-host state.
- Cover the cleanup contract with focused regression tests.

## Non-Goals
- Auto-opening, auto-linking, or otherwise managing GitHub PRs outside the terminal cleanup hook.
- Changing provider review-state, merge-state, or rework workflow behavior.
- Replacing generic workspace deletion with a new workflow engine or shell-hook runtime.

## Stakeholders
- Product: CO operator / provider-worker owner
- Engineering: Codex
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - terminal released workspaces invoke the configured cleanup hook before deletion
  - matching attached open PRs close automatically during terminal cleanup
  - cleanup failures do not abort control-host refresh or rehydrate flows
- Guardrails / Error Budgets:
  - only attached GitHub PR URLs for the same issue are eligible for closure
  - only PRs whose head branch matches the current workspace branch are eligible
  - cleanup remains bounded to `provider-linear-worker` terminal workspace removal metadata

## User Experience
- Personas: CO operator monitoring provider claim cleanup; reviewer expecting Symphony parity
- User Journeys:
  - a provider issue reaches a terminal state, the control host runs terminal cleanup, and the stale attached open PR for that workspace branch closes before the workspace disappears
  - a terminal cleanup run finds no matching attached PR or finds one already closed, so cleanup simply proceeds
  - GitHub or Linear cleanup inspection fails, the error is logged/surfaced, and the control host still finishes terminal workspace cleanup without crashing

## Technical Considerations
- Architectural Notes:
  - Symphony baseline: `SPEC.md`, `elixir/README.md`, `elixir/WORKFLOW.md`, and `elixir/lib/mix/tasks/workspace.before_remove.ex`
  - actual CO seam: terminal provider claim release in `orchestrator/src/cli/control/providerIssueHandoff.ts` plus workspace deletion in `orchestrator/src/cli/run/workspacePath.ts`
  - configuration surface: repo-local `codex.orchestrator.json` for the `provider-linear-worker` pipeline, with effective-state handling already owned by `orchestrator/src/cli/control/providerWorkflowConfigStore.ts`
  - issue attachment lookup surface: `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
- Dependencies / Integrations:
  - `gh` CLI for PR inspection/closure
  - Linear GraphQL helpers already used by the provider workflow facade
  - control-host observability surface for surfacing cleanup failures

## Open Questions
- Whether cleanup-failure surfacing should live under `provider_workflow` or a neighboring control-host payload; choose the smallest existing machine-readable surface that stays truthful and testable.

## Approvals
- Product: Self-approved from Linear scope + Symphony parity requirement
- Engineering: Pending docs-review + implementation validation
- Design: N/A
