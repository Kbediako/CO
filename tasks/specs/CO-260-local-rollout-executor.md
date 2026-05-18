---
id: linear-c9e99e2c-bc48-48f1-a8ca-4bd2a9289be2
title: CO-260 bounded unattended local_rollout executor
status: in_progress
relates_to: docs/PRD-CO-260-local-rollout-executor.md
risk: high
owners:
  - Codex
last_review: 2026-05-18
review_notes:
  - 2026-05-18: CO-522 active-spec audit found 1 unchecked task checklist item, so this spec remains active and was reviewed for current lifecycle ownership rather than archived. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-local-classification.json`.
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/CO-260-local-rollout-executor.md`
- PRD: `docs/PRD-CO-260-local-rollout-executor.md`
- ACTION_PLAN: `docs/ACTION_PLAN-CO-260-local-rollout-executor.md`

## Traceability
- Linear issue: `CO-260` / `c9e99e2c-bc48-48f1-a8ca-4bd2a9289be2`
- Linear URL: https://linear.app/asabeko/issue/CO-260
- Source anchor: `ctx:sha256:ecb20eb8e16ad47e418cdc8fe938edf8bb0d43a7f803cc128ea57992cb228951#chunk:c000001`
- Parent source manifest: `.runs/linear-c9e99e2c-bc48-48f1-a8ca-4bd2a9289be2/cli/2026-04-19T07-38-16-390Z-fff356f8/manifest.json`
- Source note: source payload is present in the parent workspace and preserves the CO-260 issue prompt, current workflow state, and worker-run constraints.

## Summary
- Objective: add a bounded unattended executor for allowlisted post-merge `local_rollout` actions under `operator-autopilot` / `control-host` continuity.
- Scope:
  - repo-tracked executable action contract for `local_rollout`
  - authoritative merged-closeout truth gate before execution
  - action preflight and execution attempt audit
  - success-only lifecycle resolution for pending `local_rollout`
  - focused tests for success, preflight skip, command failure, restart/rehydrate persistence, and undeclared action refusal
- Constraints:
  - no implementation or test edits in this child lane
  - no Codex lifecycle hook replacement
  - no generic arbitrary shell automation
  - no implicit unattended production deploys
  - preserve existing merge closeout, shared-root sync, and source-authoritative execution seams

## Issue-Shaping Contract
- User-request translation carried forward: CO-260 is the execution follow-on to `operator-autopilot` `local_rollout` lifecycle work. It should safely run only explicitly declared local rollout actions after merge closeout proves the issue is eligible, then record proof and resolve lifecycle only when those actions succeed.
- Protected terms / exact artifact and surface names:
  - `bounded unattended local_rollout executor`
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
  - `providerIssueHandoff.ts`
  - `providerMergeCloseout.ts`
  - `observabilityReadModel.ts`
  - `codex.orchestrator.json`
  - `CODEX_ORCHESTRATOR_PACKAGE_ROOT`
- Nearby wrong interpretations to reject:
  - "CO-260 should replace Codex lifecycle hooks."
  - "CO-260 is a generic shell hook runner."
  - "CO-260 can run production deploys by default because the PR already merged."
  - "Shared-root sync belongs in the rollout executor."
  - "Attempting a local rollout is enough to clear the pending lifecycle."
  - "Any configured command string is an allowlist."
- Explicit non-goals carried forward:
  - no Codex lifecycle hook replacement
  - no generic arbitrary shell automation
  - no implicit unattended production deploys
  - no shared-root sync redesign
  - no backlog-promotion, review-handoff, or merge-closeout policy rewrite

## Parity / Alignment Matrix
- Current truth:
  - `operator-autopilot` generates `local_rollout` pending actions from merged closeout truth when post-merge rollout is enabled.
  - Manual lifecycle commands can acknowledge, clear, or dismiss a pending `local_rollout`.
  - Shared-root reconciliation is already owned by deterministic merge closeout.
  - Source checkouts already have a source-authoritative execution path that avoids stale `dist` when available.
  - No unattended executor consumes the pending `local_rollout` action and runs allowlisted local follow-up.
- Reference truth:
  - local rollout execution should be repo-declared, deterministic, and auditable.
  - merged-closeout truth should be the only authority for post-merge execution eligibility.
  - local execution must fail closed on unsafe host/worktree/config state.
  - success should resolve the same `local_rollout` lifecycle identity; failure and skip should preserve operator visibility.
- Target truth / intended delta:
  - a control-host cycle can find unresolved `local_rollout` work, prove merged-closeout eligibility, evaluate a repo allowlist, run actions in order, record attempts, and resolve lifecycle only after success.
  - unsafe conditions become `skipped` with durable reason text, not silent no-ops.
  - command failure becomes `failed` with durable reason text and does not clear the pending action.
  - restart/rehydrate reads persisted attempt records and avoids duplicate or lost execution truth.
- Explicitly out-of-scope differences:
  - arbitrary hook execution
  - implicit production deployment
  - detached rollout service or separate scheduler
  - moving merge closeout shared-root sync out of `providerMergeCloseout.ts`

## Readiness Gate
- Not done if:
  - action ids, ordering, enablement, host support, and deploy class are not repo-tracked.
  - undeclared action ids can execute.
  - action execution is authorized by config alone without current merged-closeout truth.
  - preflight does not fail closed for dirty repo, wrong branch, missing binary, unsupported host, ambiguous target, missing config, or undeclared action.
  - attempt records omit action id, preflight result, start/end timestamps, terminal state, or reason text.
  - success does not resolve pending `local_rollout`, or failure/skip clears it.
  - source checkout execution can use stale `dist` silently instead of existing source-authoritative resolution.
- Pre-implementation issue-quality review evidence:
  - The lane is narrower than CO-206 lifecycle work: lifecycle state exists, but unattended execution of allowlisted actions does not.
  - The lane is narrower than merge closeout: shared-root sync remains owned by deterministic merge closeout.
  - The lane is narrower than a lifecycle hook system: only repo-declared `local_rollout` action ids are eligible.
- Safeguard ownership split:
  - child lane owns only the declared docs packet and `tasks/index.json` registration.
  - parent lane owns source implementation, focused tests, validation, Linear/workpad state, PR, and merge.

## Technical Requirements
- Functional requirements:
  1. Add a repo-tracked `local_rollout` executor contract under `operator_autopilot.post_merge_rollout` or an equivalent repo-owned config surface.
  2. The contract must identify each executable action by stable `id`, deterministic `order`, `enabled` state, supported host/platform, and explicit deploy class.
  3. Only action ids present in a checked-in allowlist/registry may execute; the config must not be treated as arbitrary shell text.
  4. The default deploy class must be local-only. Any non-local or production-like deploy class must require explicit repo-tracked opt-in and remain disabled unless parent implementation proves the safety contract.
  5. The executor must select work by unresolved `ProviderOperatorAutopilotPendingActionRecord` with `kind: 'local_rollout'` and a stable `action_instance_id`.
  6. Before execution, the executor must revalidate authoritative merged-closeout truth from existing provider-intake / merge-closeout surfaces.
  7. Shared-root sync must remain in `providerMergeCloseout.ts` and must not be duplicated as an executor action.
  8. CO-owned executable paths must use the existing source-authoritative runner contract, honoring `CODEX_ORCHESTRATOR_PACKAGE_ROOT` and source-checkout resolution rather than hardwiring stale `dist`.
  9. Preflight must classify unsafe conditions as `skipped` with durable machine-readable reason text, including dirty repo, wrong branch, missing binary, unsupported host, ambiguous target, missing config, and undeclared action.
  10. Each action attempt must record record kind, action id, pending `action_instance_id`, issue identity, preflight result, started_at, ended_at, terminal state `succeeded|skipped|failed`, exit detail where relevant, and reason text.
  11. Actions must run in deterministic order. A failed action should stop later actions for the same pending action unless the action contract explicitly declares a safe independent continuation rule.
  12. On all configured actions succeeding for the pending action, the executor must resolve the matching `local_rollout` lifecycle as completed/cleared through an auditable source.
  13. A lifecycle clear must not be recorded until the succeeded terminal execution attempt is durably written.
  14. On skipped, failed, interrupted, or audit-persistence-failed attempts, the executor must leave the pending action unresolved and project the reason through operator-facing read-model output.
  15. Restart/rehydrate must load previous attempt records so an in-flight or completed action is not duplicated and failure/skip reason text is not lost; a transient lifecycle clear persistence failure must retry against the earlier successful terminal execution attempt.
- Non-functional requirements:
  - fail closed on ambiguity.
  - keep execution bounded and non-interactive.
  - keep audit append-only or equivalently reconstructable from immutable attempt records.
  - avoid additional Linear/GitHub request burn beyond existing truth gates.
  - preserve local operator safety over convenience.
- Interfaces / contracts:
  - repo config: `codex.orchestrator.json` `operator_autopilot.post_merge_rollout` or equivalent
  - pending action: `ProviderOperatorAutopilotPendingActionRecord`
  - lifecycle store: `provider-operator-autopilot-lifecycle.json`
  - audit output: `provider-operator-autopilot.jsonl` plus an executor attempt log or equivalent read-model source
  - source runner: source-authoritative package program resolution around `CODEX_ORCHESTRATOR_PACKAGE_ROOT`
  - read model: `observabilityReadModel.ts` operator-autopilot projection

## Architecture & Data
- Architecture / design adjustments:
  - Add a small executor module near `providerOperatorAutopilot.ts` rather than burying command execution in `providerIssueHandoff.ts`.
  - Add a checked-in action registry that maps action id to a bounded executor implementation or constrained argv builder.
  - Keep repo config responsible for enabling, ordering, host support, and deploy-class opt-in; keep executable meaning in code or a schema-validated registry, not free-form shell.
  - Reuse existing lifecycle resolution by extending lifecycle record source or by writing a sibling executor-success record that the lifecycle resolver treats as cleared.
  - Project latest attempt state with pending/resolved actions so operators can see `succeeded`, `skipped`, or `failed` without reading raw JSONL.
- Data model changes / migrations:
  - Add attempt records with at least:
    - `record_kind` (`started` or `terminal`)
    - `action_instance_id`
    - `action_id`
    - `issue_id`
    - `issue_identifier`
    - `preflight_status`
    - `preflight_reason`
    - `started_at`
    - `ended_at`
    - `terminal_state`
    - `exit_code`
    - `reason`
  - Persist a `started` marker before launching a side-effecting command. Treat a marker with no later terminal record as fail-closed `execution_interrupted` evidence during rehydrate so the next cycle does not blindly duplicate the action.
  - Add or extend lifecycle source values if executor success writes to `provider-operator-autopilot-lifecycle.json`.
  - No destructive migration of existing lifecycle or merge-closeout records.
- External dependencies / integrations:
  - local filesystem/worktree state
  - repo-owned executable/action registry
  - existing CO source-aware runner utilities
  - no new production deployment integration without separate explicit scope

## Validation Plan
- Child-lane checks:
  - parse `tasks/index.json`
  - grep protected CO-260 terms across the three packet files
  - `git diff --check` for the declared docs/index scope
- Parent focused tests:
  - success: a current merged-closeout `local_rollout` pending action runs enabled allowlisted actions in order, records succeeded attempts, and resolves lifecycle.
  - preflight skip: dirty repo, wrong branch, missing binary, unsupported host, ambiguous target, missing config, and undeclared action each produce `skipped` with durable reason and leave pending action unresolved.
  - command failure: failing action records `failed`, includes timestamps and exit detail, stops follow-on actions unless explicitly safe, and leaves pending action unresolved.
  - terminal audit persistence failure: a command success without a durable terminal attempt does not clear lifecycle and remains pending with `execution_audit_failed`.
  - lifecycle persistence retry: a transient lifecycle clear failure does not hide the prior successful terminal attempt and retries clear on the next cycle.
  - restart/rehydrate persistence: persisted attempts prevent duplicate success, preserve failed/skipped/interrupted reason text, and recover cleanly after control-host restart.
  - undeclared action refusal: config referencing an unknown action id fails closed before execution.
  - seam preservation: shared-root sync remains in merge closeout and source-fresh execution uses source-authoritative runner resolution.
- Rollout verification:
  - parent seeds a merged closeout that generates a `local_rollout` pending action.
  - parent enables one local-only action id in repo config.
  - parent observes attempt audit and read-model projection before and after control-host restart.
  - parent confirms success clears/resolves pending action while skip/fail remains visible.
- Monitoring / alerts:
  - use attempt records, `provider-operator-autopilot.jsonl`, `provider-operator-autopilot-lifecycle.json`, and control-host read-model output as evidence.

## Open Questions
- What action ids are in the initial allowlist?
- Should executor success append directly to `provider-operator-autopilot-lifecycle.json` or write a separate success record consumed by lifecycle projection?
- Should production-like deploy classes be completely impossible in CO-260 and left to a later issue, even with explicit opt-in?

## Approvals
- Reviewer: pending parent docs-review / implementation.
- Date: pending.
