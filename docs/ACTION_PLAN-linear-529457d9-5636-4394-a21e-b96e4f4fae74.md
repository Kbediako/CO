# ACTION_PLAN - CO: Recover truthful intake and claim reattach after missing control-host manifest and expired shared-budget cooldown

## Added by Bootstrap 2026-04-04

## Summary
- Goal: land one bounded provider recovery fix so missing control-host manifests and expired shared-budget cooldown pressure do not break truthful intake, claim reattach, or post-cooldown reclaim.
- Scope: docs-first packet, audited docs-review child stream, provider/control-host audit, bounded recovery implementation, focused regressions, required validation, and review-handoff preparation.
- Assumptions:
  - `ProviderLinearWorkerRunner` owns the worker-side refresh request
  - `providerIssueHandoff` owns rehydrate truth and reclaim behavior
  - shared cooldown suppression is mediated through `linearBudgetState` and tracked-issue resolution

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `control-host/manifest.json`, `provider-intake-state.json`, `linear_budget_shared_cooldown`, truthful rehydrate, and the rejection of “just restart the host manually.”
- Not done if:
  - missing control-host manifests still abort refresh recovery
  - cooldown expiry can leave local intake frozen until manual host replacement
  - stale or dead runs still rehydrate as active claims
- Pre-implementation issue-quality review: approved as one bounded provider recovery truth lane across refresh discovery, cooldown recovery, and truthful rehydrate or reclaim; narrow logging-only fixes and broad lifecycle redesign are both rejected.

## Milestones & Sequencing
- [x] Register the `linear-529457d9-5636-4394-a21e-b96e4f4fae74` docs packet, task mirrors, task registry, freshness registry, and single Linear workpad. Evidence: `docs/PRD-linear-529457d9-5636-4394-a21e-b96e4f4fae74.md`, `docs/TECH_SPEC-linear-529457d9-5636-4394-a21e-b96e4f4fae74.md`, `docs/ACTION_PLAN-linear-529457d9-5636-4394-a21e-b96e4f4fae74.md`, `tasks/specs/linear-529457d9-5636-4394-a21e-b96e4f4fae74.md`, `tasks/tasks-linear-529457d9-5636-4394-a21e-b96e4f4fae74.md`, `.agent/task/linear-529457d9-5636-4394-a21e-b96e4f4fae74.md`, `out/linear-529457d9-5636-4394-a21e-b96e4f4fae74/workpad.md`.
- [x] Run the audited `docs-review` child stream and fold any findings back into the packet before implementation. Evidence: `.runs/linear-529457d9-5636-4394-a21e-b96e4f4fae74-co-81-docs-review/cli/2026-04-04T10-56-31-670Z-bcb3a7ce/manifest.json`.
- [x] Audit the provider-worker refresh path, shared cooldown suppression path, and startup rehydrate path to confirm the smallest truthful recovery seam. Evidence: `.agent/task/linear-529457d9-5636-4394-a21e-b96e4f4fae74.md`.
- [x] Implement the bounded recovery fix plus focused regressions for missing-manifest refresh, cooldown recovery, and truthful rehydrate or reclaim. Evidence: `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`, `orchestrator/tests/ControlServerPublicLifecycle.test.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] Run the required validation floor, standalone review, and elegance pass; then refresh the workpad for PR and review handoff. Evidence: Linear workpad comment `03494882-710a-4562-8a60-0c31afafd9cb`, `/Users/kbediako/Code/CO/.runs/linear-529457d9-5636-4394-a21e-b96e4f4fae74/cli/2026-04-04T10-48-16-430Z-77d06e12/review/telemetry.json`.
- [ ] Resolve actionable PR feedback, keep `pr ready-review` clean, and move the issue to `In Review` only after required checks settle green. Evidence: pending.

## Dependencies
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `orchestrator/src/cli/control/linearBudgetState.ts`
- `orchestrator/src/cli/control/linearDispatchSource.ts`
- provider/control-host tests under `orchestrator/tests/`

## Validation
- [x] `MCP_RUNNER_TASK_ID=linear-529457d9-5636-4394-a21e-b96e4f4fae74 node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-81-docs-review --format json`. Evidence: `.runs/linear-529457d9-5636-4394-a21e-b96e4f4fae74-co-81-docs-review/cli/2026-04-04T10-56-31-670Z-bcb3a7ce/manifest.json`.
- [x] Focused provider/control-host regressions for missing-manifest refresh, cooldown recovery, restart or rehydrate truth, and post-cooldown reclaim. Evidence: `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`, `orchestrator/tests/ControlServerPublicLifecycle.test.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] `MCP_RUNNER_TASK_ID=linear-529457d9-5636-4394-a21e-b96e4f4fae74 node scripts/delegation-guard.mjs`. Evidence: Linear workpad comment `03494882-710a-4562-8a60-0c31afafd9cb`.
- [x] `MCP_RUNNER_TASK_ID=linear-529457d9-5636-4394-a21e-b96e4f4fae74 node scripts/spec-guard.mjs --dry-run`. Evidence: Linear workpad comment `03494882-710a-4562-8a60-0c31afafd9cb`.
- [x] `MCP_RUNNER_TASK_ID=linear-529457d9-5636-4394-a21e-b96e4f4fae74 npm run build`. Evidence: Linear workpad comment `03494882-710a-4562-8a60-0c31afafd9cb`.
- [x] `MCP_RUNNER_TASK_ID=linear-529457d9-5636-4394-a21e-b96e4f4fae74 npm run lint`. Evidence: Linear workpad comment `03494882-710a-4562-8a60-0c31afafd9cb`.
- [x] `MCP_RUNNER_TASK_ID=linear-529457d9-5636-4394-a21e-b96e4f4fae74 CI=1 npm run test`. Evidence: Linear workpad comment `03494882-710a-4562-8a60-0c31afafd9cb`.
- [x] `MCP_RUNNER_TASK_ID=linear-529457d9-5636-4394-a21e-b96e4f4fae74 npm run docs:check`. Evidence: Linear workpad comment `03494882-710a-4562-8a60-0c31afafd9cb`.
- [x] `MCP_RUNNER_TASK_ID=linear-529457d9-5636-4394-a21e-b96e4f4fae74 npm run docs:freshness`. Evidence: Linear workpad comment `03494882-710a-4562-8a60-0c31afafd9cb`.
- [x] `MCP_RUNNER_TASK_ID=linear-529457d9-5636-4394-a21e-b96e4f4fae74 node scripts/diff-budget.mjs`. Evidence: Linear workpad comment `03494882-710a-4562-8a60-0c31afafd9cb`.
- [x] `MCP_RUNNER_TASK_ID=linear-529457d9-5636-4394-a21e-b96e4f4fae74 FORCE_CODEX_REVIEW=1 npm run review`. Evidence: `/Users/kbediako/Code/CO/.runs/linear-529457d9-5636-4394-a21e-b96e4f4fae74/cli/2026-04-04T10-48-16-430Z-77d06e12/review/telemetry.json`, Linear workpad comment `03494882-710a-4562-8a60-0c31afafd9cb`.
- [x] `MCP_RUNNER_TASK_ID=linear-529457d9-5636-4394-a21e-b96e4f4fae74 npm run pack:smoke`. Evidence: Linear workpad comment `03494882-710a-4562-8a60-0c31afafd9cb`.
- Rollback plan:
  - if durable refresh discovery cannot be made trustworthy within the bounded lane, keep the existing fail-closed endpoint validation and file a follow-up with concrete evidence
  - if rehydrate truth requires a broader lifecycle redesign, keep the smallest safe truth correction and split the wider change into a follow-up issue

## Risks & Mitigations
- Risk: the stale cooldown freeze is caused by more than a missing refresh request.
  - Mitigation: audit the shared budget read or refresh path before coding and keep the spec open to one bounded recovery fix across both seams.
- Risk: refresh fallback could weaken endpoint trust boundaries.
  - Mitigation: preserve allowed-bind-host, auth-token, and root-boundary validation even when discovery becomes more flexible.
- Risk: stale non-terminal runs still look live under restart conditions.
  - Mitigation: add targeted regressions around rehydrate classification and reclaim behavior rather than relying on narrative closeout.

## Approvals
- Reviewer: `codex-orchestrator docs-review` child stream succeeded at `.runs/linear-529457d9-5636-4394-a21e-b96e4f4fae74-co-81-docs-review/cli/2026-04-04T10-56-31-670Z-bcb3a7ce/manifest.json`
- Date: 2026-04-04
