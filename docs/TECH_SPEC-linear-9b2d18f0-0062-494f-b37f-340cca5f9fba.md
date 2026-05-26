---
id: 20260526-linear-9b2d18f0-0062-494f-b37f-340cca5f9fba
title: CO-582 split docs freshness owner binding lifecycle from PR completion
relates_to: docs/PRD-linear-9b2d18f0-0062-494f-b37f-340cca5f9fba.md
risk: high
owners:
  - Codex
last_review: 2026-05-26
related_action_plan: docs/ACTION_PLAN-linear-9b2d18f0-0062-494f-b37f-340cca5f9fba.md
task_checklists:
  - tasks/tasks-linear-9b2d18f0-0062-494f-b37f-340cca5f9fba.md
---

# TECH_SPEC - CO-582 split docs freshness owner binding lifecycle from PR completion

## Summary
- Objective: split persistent docs-freshness owner binding lifecycle from implementation PR completion so retained rolling debt does not become terminal-owner debt immediately after an owner PR merges.
- Scope: `docs:freshness:maintain` owner-resolution/finalizer behavior, owner lifecycle metadata in docs freshness policy surfaces, focused tests, and provider/merge closeout contract updates required to keep active owner issues non-terminal.
- Constraints: no freshness/spec guard weakening, no broad owner mapping, no blind review-date refresh, and no historical evidence deletion.

## Issue-Shaping Contract
- User-request translation carried forward: fix the lifecycle design flaw behind `CO-568` / `CO-579` / `CO-581` owner replacement churn by restoring existing active owners instead of creating another replacement owner.
- Protected terms / exact artifact and surface names: `docs:freshness:maintain`, `canonical_owner_issues[]`, `canonical_owner_key`, `active_owner`, `retired_historical`, `restore_existing_owner`, `move_to_backlog_not_done`, `owner_finalizer`, `pass_with_owned_rolling_debt`, `block_unowned_repo_debt`, `CO-581`, `CO-569`, `CO-579`, `CO-568`, `PR #885`.
- Nearby wrong interpretations to reject: weakening `docs:freshness` or `spec-guard`, blindly bumping `last_review`, deleting historical packets, creating another replacement owner as the durable fix, or treating registry row status/fallback expiry as owner lifecycle authority.
- Explicit non-goals carried forward: no owner broadening across unrelated cohorts, no provider-worker WIP consumption for passive Backlog owner bindings, and no retained exception expiry weakening.

## Readiness Gate
- Not done if:
  - terminal same-project `active_owner` still emits only `create_required`
  - `CO-569` or `CO-581` exact owner mappings broaden across cohorts
  - Backlog owner bindings consume active provider-worker WIP without repair work
  - expired retained exceptions pass because an owner is live
- Pre-implementation issue-quality review evidence:
  - 2026-05-26: live `issue-context` confirms `CO-582` is `In Progress`.
  - 2026-05-26: `co-status --format json` confirms no active claims at lane start.
  - 2026-05-26: maintainer output confirms `CO-579` terminal-owner blockage while `CO-569` and `CO-581` remain live exact rolling owners.
- Safeguard ownership split:
  - parent lane owns docs packet, implementation, focused tests, validation, workpad, PR, and handoff
  - same-project passive owner issues remain owner evidence, not WIP claims

## Technical Requirements
- Functional requirements:
  1. Add or normalize owner lifecycle metadata so each configured owner binding can be distinguished as `active_owner`, `retiring`, or `retired_historical`.
  2. Keep missing lifecycle values backward-compatible only when the binding is unambiguously current; terminal or historical ambiguity must fail closed.
  3. Update owner verification so a live same-project Backlog `active_owner` satisfies exact-key ownership for `pass_with_owned_rolling_debt` inside window/capacity.
  4. Update terminal same-project active-owner handling so the action is `restore_existing_owner` / `move_to_backlog_not_done` with issue id, identifier, state, project, team, and canonical owner key evidence.
  5. Preserve `create_required` or `block_unowned_repo_debt` for missing owner, wrong-project owner, retired historical owner, impossible restoration, or unowned debt.
  6. Preserve retained exception expiry blocking even when owner liveness succeeds.
  7. Ensure owner-finalizer and report output expose the lifecycle decision, restoration action, and blocking reason without hiding stale/debt context.
  8. Update merge closeout / owner deliverable contract so active owner issues are not closed to `Done` while candidate cohorts still resolve to them, or are immediately repaired to `Backlog` with audit evidence.
  9. Keep PR automation from treating active owner issues as closing deliverables; use child work issues for closable implementation work.
  10. Keep `CO-569` and `CO-581` exact `canonical_owner_key` mappings isolated.
- Non-functional requirements:
  - keep policy behavior fail-closed and auditable
  - prefer structured lifecycle fields over ad hoc title/state inference
  - keep the diff scoped to docs freshness owner lifecycle and closeout contracts
- Interfaces / contracts:
  - `docs/docs-catalog.json`
  - `docs/guides/docs-freshness-cohorts.md`
  - `scripts/docs-freshness-maintain.mjs`
  - `scripts/docs-freshness.mjs`
  - `scripts/spec-guard.mjs`
  - provider issue handoff / merge closeout surfaces that can move owner issues to `Done`

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- This is a refactor lane for a high-churn control surface. The durable fix is explicit lifecycle authority rather than another minor replacement-owner seam.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Terminal active owner replacement | Terminal same-project active owners route to `create_required`. | remove fallback | CO-582 | CO-579 terminal while still configured as owner. | 2026-05-24 | 2026-05-26 | Not retained | terminal active owner emits restoration action or blocks with impossible-restoration evidence. | focused maintainer tests and JSON output. |
| Active owner issue as PR deliverable | Owner issue can close as `Done` when owner PR merges. | remove fallback | CO-582 | `PR #885` owner issue lifecycle made retained debt unowned. | 2026-05-24 | 2026-05-26 | Not retained | owner issue remains non-terminal/Backlog while retained cohorts resolve to it, or finalizer repairs it. | merge finalizer coverage. |

- Large-refactor check: required. Authority is currently split across policy metadata, Linear state, registry lifecycle, fallback expiry, and PR closeout; another replacement-owner seam would extend the same failure mode.

## Architecture & Data
- Architecture / design adjustments:
  - centralize owner lifecycle resolution before owner action generation
  - make finalizer output consume the same lifecycle decision instead of duplicating terminal-owner routing
  - keep exact canonical owner key matching as the only path from cohort to owner binding
- Data model changes / migrations:
  - add lifecycle metadata to owner bindings or an owner registry
  - mark historical owner bindings as `retired_historical`
  - keep existing owner issue identifiers for lineage and exact-key isolation
- External dependencies / integrations:
  - Linear issue-context verification for owner state, team, project, and terminal/non-terminal classification
  - GitHub/PR closeout only where owner issue state can be finalized

## Validation Plan
- Tests / checks:
  - focused vitest coverage for terminal active owner restoration
  - focused vitest coverage for live Backlog owner pass
  - focused vitest coverage for expired retained exception block
  - focused vitest coverage for retired historical owner block
  - focused vitest coverage for exact-key isolation and wrong-project owner
  - focused vitest coverage for merge finalizer behavior
  - protected-term scan over CO-582 packet files
  - JSON parse for `tasks/index.json`, `docs/docs-freshness-registry.json`, and any changed docs-catalog/policy JSON
  - `git diff --check`
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run docs:freshness:maintain -- --format json`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - manifest-backed standalone review or recorded quota/delegation waiver if the review surface is unavailable
- Rollout verification:
  - maintainer output no longer asks for another replacement owner when a same-project active owner can be restored
  - `CO-569` and `CO-581` remain exact live owners, not broadened owner buckets
  - passive Backlog owner proof does not increase active provider-worker claim count

## Delegation / Parallelization
- Same-turn decomposition matrix:

| Stream | Owner | Scope | Write policy | Evidence |
| --- | --- | --- | --- | --- |
| docs packet | parent | PRD, TECH_SPEC, ACTION_PLAN, task mirrors, registries | write-enabled | packet diff and JSON parse |
| implementation | parent | owner lifecycle resolver, maintainer/finalizer behavior | write-enabled | focused tests and maintainer JSON |
| validation/review | parent plus diagnostics child | docs-review, repo guards, standalone review, queue checks | mixed | `.runs/linear-9b2d18f0-0062-494f-b37f-340cca5f9fba-scout/...` and final manifests |

- Parallelization decision: `stay_serial_after_degraded_delegate_spawn`. `delegate.spawn` transport closed in this session, so implementation stays parent-owned to avoid owner-lifecycle edit collisions; a task-scoped diagnostics child run is used for audit evidence where available.

## Open Questions
- None block implementation. If live Linear state restoration is not safe in a dry-run maintainer path, the implementation must still emit a deterministic `restore_existing_owner` action packet.

## Approvals
- Reviewer: parent CO orchestrator issue-quality review.
- Date: 2026-05-26.
