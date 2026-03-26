# ACTION_PLAN - Terminal Workspace Cleanup Hook and Attached-PR Auto-Close

## Added by Bootstrap 2026-03-27

## Traceability
- Linear issue: `CO-5` / `964ca955-cf9b-4d1b-887b-4d3bb49069d8`
- Linear URL: https://linear.app/asabeko/issue/CO-5/co-add-workflow-cleanup-hook-and-attached-pr-auto-close-on-terminal

## Summary
- Goal: Finish `CO-5` by adding a metadata-driven terminal cleanup hook on the provider workspace-removal path that can close the matching attached open PR before deletion while keeping failures non-fatal.
- Scope: docs-first packet, docs-review, one bounded config extension for `provider-linear-worker`, one bounded cleanup helper, focused tests, validation, and normal PR/review handoff.
- Assumptions:
  - the correct CO seam is `providerIssueHandoff` plus `workspacePath`, not a generic GitHub automation service
  - the last-known-good provider workflow store is the right place to own effective cleanup config and surfaced cleanup status

## Milestones & Sequencing
1) Register the CO-5 docs-first packet, update `tasks/index.json`, mirror the checklist, refresh `docs/TASKS.md`, and keep the single Linear workpad current.
2) Run docs-review for `linear-964ca955-cf9b-4d1b-887b-4d3bb49069d8` with the explicit delegation override recorded.
3) Extend provider pipeline config typing and `providerWorkflowConfigStore` so terminal cleanup metadata is loaded from the effective `provider-linear-worker` config and surfaced through control-host observability.
4) Implement the provider terminal cleanup helper to inspect the workspace branch, read attached PR URLs from Linear issue context, close matching open PRs with a machine-generated comment, and report non-fatal failures.
5) Wire terminal cleanup into `providerIssueHandoff` before workspace deletion, ensuring cleanup-hook failures do not abort refresh/rehydrate release handling.
6) Add focused regressions for no-PR, already-closed PR, successful close, close-hook failure, and terminal released workspace cleanup integration.
7) Run the required validation floor, refresh docs/workpad evidence, prepare the PR, and stop coding at `In Review`.

## Dependencies
- `codex.orchestrator.json`
- `orchestrator/src/cli/config/userConfig.ts`
- `orchestrator/src/cli/control/providerWorkflowConfigStore.ts`
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
- `orchestrator/src/cli/run/workspacePath.ts`
- `orchestrator/tests/ProviderIssueHandoff.test.ts`
- `orchestrator/tests/ProviderWorkflowConfigStore.test.ts`
- `orchestrator/tests/WorkspacePath.test.ts`

## Validation
- Checks / tests:
  - `DELEGATION_GUARD_OVERRIDE_REASON="subagent spawning unavailable in-session for this provider worker" npx codex-orchestrator start docs-review --format json --no-interactive --task linear-964ca955-cf9b-4d1b-887b-4d3bb49069d8`
  - `DELEGATION_GUARD_OVERRIDE_REASON="subagent spawning unavailable in-session for this provider worker" node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
  - `npm run pack:smoke`
- Rollback plan:
  - remove the pipeline metadata path, terminal cleanup helper, and observability additions if behavior escapes terminal workspace removal
  - keep issue ownership active until validation, PR attachment, and review handoff are all satisfied

## Risks & Mitigations
- Risk: cleanup logic closes an unrelated PR.
  - Mitigation: require both Linear attachment membership and workspace-branch head match before closure.
- Risk: cleanup failures destabilize control-host release handling.
  - Mitigation: catch/log/surface failures and continue workspace cleanup plus claim release.
- Risk: repo-config reload failure hides terminal cleanup metadata.
  - Mitigation: consume cleanup config from the last known good provider workflow snapshot.

## Approvals
- Reviewer: Pending docs-review
- Date: 2026-03-27
