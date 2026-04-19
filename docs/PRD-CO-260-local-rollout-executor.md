# PRD - CO-260 bounded unattended local_rollout executor

## Added by Docs Child Lane 2026-04-19

## Traceability
- Linear issue: `CO-260` / `c9e99e2c-bc48-48f1-a8ca-4bd2a9289be2`
- Linear URL: https://linear.app/asabeko/issue/CO-260
- Source anchor: `ctx:sha256:ecb20eb8e16ad47e418cdc8fe938edf8bb0d43a7f803cc128ea57992cb228951#chunk:c000001`
- Source payload path: `../../.runs/linear-c9e99e2c-bc48-48f1-a8ca-4bd2a9289be2/cli/2026-04-19T07-38-16-390Z-fff356f8/memory/source-0/source.txt`
- Source note: source payload is present in the parent workspace and preserves the CO-260 issue prompt, current workflow state, and worker-run constraints.

## Summary
- Problem Statement: `operator-autopilot` can surface and lifecycle-manage post-merge `local_rollout` pending actions, but executing the local rollout still depends on a human operator. That leaves a gap after authoritative merge closeout: safe local follow-up work is visible and clearable, yet there is no bounded unattended executor that can run only repo-declared rollout actions, record machine-readable attempts, survive control-host continuity, and fail closed when the local environment is unsafe.
- Desired Outcome: add a bounded unattended `local_rollout` executor that runs through `operator-autopilot` / `control-host` continuity after authoritative merged-closeout truth, executes only repo-tracked allowlisted actions with explicit enablement and deploy-class opt-in, records every attempt, and resolves the pending `local_rollout` lifecycle only after successful action completion.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): automate the safe, local, post-merge rollout follow-up that is already represented as `local_rollout` operator-autopilot work, without turning CO into a generic hook runner or production deploy system.
- Success criteria / acceptance:
  - repo-tracked rollout action contract defines action ids, deterministic ordering, enablement, host support, and deploy-class opt-in.
  - executor only runs for unresolved `local_rollout` pending actions backed by authoritative merged-closeout truth.
  - action execution reuses existing source-fresh CO runner resolution instead of stale `dist` or ad hoc shell paths.
  - shared-root sync remains the responsibility of deterministic merge closeout and is not reimplemented as a rollout action.
  - each attempted action records action id, preflight result, start timestamp, end timestamp, terminal state `succeeded|skipped|failed`, and durable reason text.
  - unsafe preflights and audit persistence failures fail closed for dirty repo, wrong branch, missing binary, unsupported host, ambiguous target, missing config, undeclared action id, and terminal audit write failure.
  - a successful unattended rollout resolves the pending `local_rollout` lifecycle; skipped or failed attempts remain operator-visible with durable reason text.
  - focused tests cover success, preflight skip, command failure, restart/rehydrate persistence, and undeclared action refusal.
- Constraints / non-goals:
  - no Codex lifecycle hook replacement.
  - no generic arbitrary shell automation.
  - no implicit unattended production deploys.
  - no rewrite of `operator-autopilot` backlog promotion, review handoff, or deterministic merge closeout.
  - child lane owns docs only; parent owns implementation, validation, Linear/workpad state, PR lifecycle, and merge.

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `bounded unattended local_rollout executor`
  - `allowlisted post-merge local_rollout actions`
  - `operator-autopilot/control-host continuity`
  - `repo-tracked executable action contract`
  - `deploy-class opt-in`
  - `authoritative merged-closeout truth gate`
  - `shared-root sync remains merge closeout`
  - `source-fresh execution remains source-authoritative runner path`
- Protected terms / exact artifact and surface names:
  - `operator-autopilot`
  - `control-host`
  - `local_rollout`
  - `ProviderOperatorAutopilotPendingActionRecord`
  - `pending_actions`
  - `action_instance_id`
  - `provider-operator-autopilot.jsonl`
  - `provider-operator-autopilot-lifecycle.json`
  - `providerOperatorAutopilot.ts`
  - `providerOperatorAutopilotLifecycle.ts`
  - `coStatusOperatorAutopilotCliShell.ts`
  - `providerMergeCloseout.ts`
  - `providerIssueHandoff.ts`
  - `codex.orchestrator.json`
  - `CODEX_ORCHESTRATOR_PACKAGE_ROOT`
- Nearby wrong interpretations to reject:
  - "run every pending lifecycle action through a shell hook."
  - "replace merge closeout shared-root reconciliation with rollout actions."
  - "treat any local command failure as a completed rollout because it was attempted."
  - "production deployment is safe because the action is post-merge."
  - "a `local_rollout` action can run without current merged-closeout proof."
  - "the executor should clear `local_rollout` even when preflight skipped or failed."

## Parity / Alignment Matrix
- Current truth:
  - `operator-autopilot` can emit `local_rollout` pending actions from merged closeout truth.
  - `provider-operator-autopilot-lifecycle.json` records acknowledged, cleared, and dismissed operator decisions.
  - `co-status operator-autopilot local-rollout <acknowledge|clear|dismiss>` gives a manual lifecycle path.
  - post-merge shared-root reconciliation already belongs to deterministic merge closeout.
  - source checkouts have an existing source-authoritative runner contract for fresh execution.
  - there is no unattended executor for allowlisted `local_rollout` actions.
- Reference truth:
  - low-risk local rollout follow-up can run unattended only when the repo explicitly declares the action and deploy class.
  - execution authority should come from merge-closeout truth plus unresolved `local_rollout` identity, not from ambient timers or arbitrary hooks.
  - every attempt should be auditable without reading a chat transcript.
- Target truth / intended delta:
  - `operator-autopilot` can evaluate unresolved `local_rollout` actions and run configured allowlisted local rollout actions through control-host continuity.
  - the action contract is repo-tracked, deterministic, and fail-closed.
  - successful action completion resolves the same `local_rollout` lifecycle identity.
  - failed or skipped execution preserves operator-visible pending work and exact reason text.
- Explicitly out-of-scope differences:
  - replacing Codex lifecycle hooks.
  - generic shell-command automation.
  - implicit production deploys or any production deploy class without explicit opt-in.
  - new shared-root sync policy.
  - broad workflow redesign.

## Not Done If
- A `local_rollout` can execute without an unresolved pending action and current merged-closeout truth.
- Action definitions are ambient shell strings instead of allowlisted repo-tracked action ids.
- The executor silently runs on dirty repo state, wrong branch, unsupported host, missing binary, ambiguous target, missing config, or undeclared action id.
- Shared-root sync is moved out of deterministic merge closeout into this executor.
- Source-checkout execution can drift to stale `dist` without the existing source-authoritative runner warning/fallback contract.
- Failed or skipped actions clear the pending `local_rollout` lifecycle.
- Attempt audit lacks preflight result, timestamps, terminal state, action id, or durable reason text.

## Goals
- Define a bounded unattended executor contract for post-merge `local_rollout` actions.
- Keep execution authority tied to `operator-autopilot`, `control-host`, and authoritative merged-closeout truth.
- Require explicit deploy-class opt-in and deterministic action ordering.
- Record machine-readable attempts for every action.
- Resolve pending `local_rollout` lifecycle only on success.

## Non-Goals
- Replacing Codex lifecycle hooks or provider-worker lifecycle management.
- Allowing generic arbitrary shell scripts.
- Running implicit production deploys.
- Reworking deterministic merge closeout, shared-root reconciliation, backlog promotion, or review-handoff policy.
- Mutating Linear state directly from this child lane or from skipped/failed rollout attempts.

## Stakeholders
- Product: CO operators who need post-merge local rollout follow-up to proceed safely without babysitting a chat turn.
- Engineering: control-host, operator-autopilot, merge-closeout, source-runner, and observability maintainers.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - eligible unresolved `local_rollout` actions execute successfully under control-host continuity without manual command entry.
  - successful attempts resolve the matching pending lifecycle identity.
  - failed and skipped attempts remain visible with exact reason text.
  - attempt records are machine-readable and sufficient for parent closeout evidence.
- Guardrails / Error Budgets:
  - fail closed on unsafe preflight reasons.
  - default deploy class must be local-only unless a repo-tracked explicit opt-in says otherwise.
  - no action may run unless its id is declared and enabled in the repo contract.
  - do not consume Linear/GitHub request budget beyond the existing truth gates needed to confirm merged-closeout eligibility.

## User Experience
- Personas:
  - operator returning after merge who wants local follow-up to be complete or explicitly pending with reason.
  - reviewer auditing why unattended local rollout did or did not run.
  - maintainer adding a new local rollout action to the repo allowlist.
- User Journeys:
  - merge closeout produces a `local_rollout` pending action; control-host evaluates the repo contract; preflight passes; actions run in configured order; lifecycle is resolved as successful.
  - preflight sees a dirty repo or wrong branch; executor records `skipped` with the exact unsafe reason and leaves the pending action operator-visible.
  - an action command fails; executor records `failed` with timestamps and exit detail, stops follow-on actions for that pending action, and leaves it pending for operator resolution.
  - control-host restarts after an action starts; rehydrate reads the persisted started or terminal record, does not duplicate the action blindly, and preserves failed/skipped/interrupted reason text.

## Technical Considerations
- Architectural Notes:
  - extend the `operator_autopilot.post_merge_rollout` contract in repo-tracked config with an executor section or equivalent registry that declares enabled action ids, order, supported hosts, deploy class, and source-authoritative execution target.
  - execute only action ids that resolve through a checked-in allowlist/registry; do not evaluate arbitrary shell text.
  - use `ProviderOperatorAutopilotPendingActionRecord.action_instance_id` as the rollout identity boundary.
  - gate execution on current merged-closeout truth from existing provider-intake / merge-closeout surfaces.
  - use existing source-aware runner resolution for any CO-owned executable path.
  - append attempt records before and after execution so restart/rehydrate can classify in-flight, succeeded, skipped, and failed attempts.
- Dependencies / Integrations:
  - `orchestrator/src/cli/control/providerOperatorAutopilot.ts`
  - `orchestrator/src/cli/control/providerOperatorAutopilotLifecycle.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/providerMergeCloseout.ts`
  - `orchestrator/src/cli/control/observabilityReadModel.ts`
  - `orchestrator/src/cli/utils/packageProgramResolver.ts`
  - `codex.orchestrator.json`

## Open Questions
- What exact repo-tracked action ids should be enabled in the first implementation slice?
- Should success resolve the lifecycle with a new executor source distinct from `co-status`, or reuse the lifecycle store with an additive `source` enum?
- Should action attempts live in `provider-operator-autopilot.jsonl`, a sibling `local-rollout-attempts.jsonl`, or both for read-model projection?

## Approvals
- Product: pending parent lane issue/workpad confirmation.
- Engineering: pending parent lane docs-review and implementation.
- Design: N/A.
