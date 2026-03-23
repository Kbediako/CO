# Task Checklist - 1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery

- MCP Task ID: `1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery`
- Primary PRD: `docs/PRD-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery.md`
- TECH_SPEC: `tasks/specs/1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery.md`

## Docs-first
- [x] PRD drafted for the live unassigned active-claim alignment lane. Evidence: `docs/PRD-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery.md`.
- [x] TECH_SPEC drafted for the same lane. Evidence: `tasks/specs/1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery.md`, `docs/TECH_SPEC-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery.md`.
- [x] ACTION_PLAN drafted for the same lane. Evidence: `docs/ACTION_PLAN-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery.md`.
- [x] `tasks/index.json` registers the `1321` TECH_SPEC entry. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the `1321` snapshot. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery.md`. Evidence: `.agent/task/1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery.md`.
- [x] docs-review approved the `1321` packet for implementation. Evidence: `.runs/1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery/cli/2026-03-23T10-29-46-034Z-08278ec8/manifest.json`.

## Investigation
- [x] Live persisted intake, live issue-context, and authenticated `/api/v1/dispatch` all rechecked before code changes. Evidence: `.runs/local-mcp/cli/control-host/provider-intake-state.json`, `.runs/local-mcp/cli/control-host/control_endpoint.json`, `.runs/local-mcp/cli/control-host/control_auth.json`, `node dist/bin/codex-orchestrator.js linear issue-context --issue-id 902af7c9-9c23-4805-a652-5280723334d7 --format json`.
- [x] Current code-path audit identified the existing-claim ownership mismatch and the released-claim refresh recovery seam. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/src/cli/control/linearDispatchSource.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] Current Symphony operational contract rechecked for `Merging` as an active merge loop. Evidence: `/Users/kbediako/Code/symphony/elixir/WORKFLOW.md`.

## Implementation
- [x] Align existing active-claim eligibility so unassigned active issues do not release as `provider_issue_released:assignee_changed`. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `out/1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery/manual/20260323T105803Z-validation-and-live-proof.md`.
- [x] Add the smallest refresh recovery seam so already-released misclassified claims can reopen without a newer `updated_at`. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `out/1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery/manual/20260323T105803Z-validation-and-live-proof.md`.
- [x] Add focused regressions for active unassigned claims, refresh handling, and equal-timestamp released recovery while preserving explicit foreign-assignee release behavior. Evidence: `orchestrator/tests/ProviderIssueHandoff.test.ts`, `out/1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery/manual/20260323T105803Z-validation-and-live-proof.md`.

## Validation
- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery/manual/20260323T105803Z-validation-and-live-proof.md`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery/manual/20260323T105803Z-validation-and-live-proof.md`.
- [x] `npm run build`. Evidence: `out/1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery/manual/20260323T105803Z-validation-and-live-proof.md`.
- [x] `npm run lint`. Evidence: `out/1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery/manual/20260323T105803Z-validation-and-live-proof.md`.
- [x] `npm run test`. Evidence: `out/1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery/manual/20260323T105803Z-validation-and-live-proof.md` (includes the truthful local Vitest teardown-hang caveat).
- [x] `npm run docs:check`. Evidence: `out/1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery/manual/20260323T105803Z-validation-and-live-proof.md`.
- [x] `npm run docs:freshness`. Evidence: `out/1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery/manual/20260323T105803Z-validation-and-live-proof.md`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery/manual/20260323T105803Z-validation-and-live-proof.md`.
- [x] `npm run review`. Evidence: `.runs/1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery/cli/2026-03-23T10-29-46-034Z-08278ec8/review/prompt.txt`, `out/1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery/manual/20260323T105803Z-validation-and-live-proof.md`.
- [x] `npm run pack:smoke` if required by touched downstream-facing surfaces. Evidence: not required for this lane; see `out/1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery/manual/20260323T105803Z-validation-and-live-proof.md`.
- [x] Live control-host retest proves `CO-3` reclaims from `Merging` without another operator flip. Evidence: `.runs/linear-902af7c9-9c23-4805-a652-5280723334d7/cli/2026-03-23T10-51-47-708Z-411eb683/manifest.json`, `.runs/linear-902af7c9-9c23-4805-a652-5280723334d7/cli/2026-03-23T10-51-47-708Z-411eb683/provider-linear-worker-proof.json`, `out/1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery/manual/20260323T105803Z-validation-and-live-proof.md`.

## Delivery
- [ ] Open PR for `1321`, handle feedback, and wait for required checks to reach terminal green.
- [ ] Merge, return local repo to clean `main`, and record final closeout evidence.
