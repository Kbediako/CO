# PRD - CO-582 split docs freshness owner binding lifecycle from PR completion

## Traceability
- Linear issue: `CO-582` / `9b2d18f0-0062-494f-b37f-340cca5f9fba`
- Task id: `linear-9b2d18f0-0062-494f-b37f-340cca5f9fba`
- Registry id: `20260526-linear-9b2d18f0-0062-494f-b37f-340cca5f9fba`
- Canonical owner key: `docs:freshness:owner-binding-lifecycle:v1`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=docs:freshness:owner-binding-lifecycle:v1`
- Live issue-context evidence: `./bin/codex-orchestrator.js linear issue-context --issue-id 9b2d18f0-0062-494f-b37f-340cca5f9fba --format json` returned `CO-582` in `In Progress` on 2026-05-26.

## Summary
- Problem Statement: `docs:freshness:maintain` currently binds retained rolling debt to Linear issues that can be completed as implementation PR deliverables. Once an `active_owner` issue reaches terminal `Done`, owner verification fails closed and the maintainer falls back to replacement-owner creation instead of restoring the existing owner binding.
- Desired Outcome: split persistent docs-freshness owner binding lifecycle from PR completion so active retained cohorts can keep a live same-project non-terminal owner, preferably `Backlog`, without consuming provider-worker WIP or creating another replacement-owner chain.

## User Request Translation
- Preserve the exact issue contract for `CO-582`: fix the lifecycle design flaw behind the `CO-568` / `CO-579` / `CO-581` replacement-owner chain and make terminal active owners restore to Backlog when possible.
- Do not weaken `docs:freshness`, `docs:freshness:maintain`, or `spec-guard`.
- Keep `CO-569` and `CO-581` as exact owned rolling-debt blockers while their retained cohorts remain live.
- Treat current `CO-579` terminal-owner evidence as the live symptom to repair, not as a reason to create another replacement owner.

## Intent Checksum
- Protected terms: `docs:freshness:maintain`, `canonical_owner_issues[]`, `canonical_owner_key`, `active_owner`, `retired_historical`, `restore_existing_owner`, `move_to_backlog_not_done`, `owner_finalizer`, `pass_with_owned_rolling_debt`, `block_unowned_repo_debt`, `CO-581`, `CO-569`, `CO-579`, `CO-568`, `PR #885`.
- Nearby wrong interpretations to reject: do not weaken `docs:freshness` or `spec-guard`; do not blindly bump `last_review`; do not delete historical packets just to pass gates; do not create another replacement owner as the durable fix; do not treat registry row status or fallback expiry as owner lifecycle authority.
- Explicit non-goals: no broad owner mapping, no cap increase, no historical packet deletion, no passive Backlog owner WIP consumption, and no retained exception expiry weakening.

## Current Truth
- Shared root is clean on `origin/main` at `974fe72002` after CO-576 merged.
- `co-status --format json` reports no running or retrying issues and no active claims before CO-582 implementation work.
- Current `docs:freshness:maintain -- --format json --dry-run-linear-actions --warn` reports `freshness_decision=block_spec_guard_pre_expiry`, `owner_finalizer.status=blocked_terminal_owner`, and `owner_finalizer.blocking_owner_issue=CO-579`.
- The same maintainer output verifies `CO-581` and `CO-569` as live same-project Blocked exact owners for their canonical owner keys.
- The observed bug is that `CO-579` is terminal while still configured as the global `docs:freshness:maintain` owner, causing terminal-owner routing instead of an owner lifecycle repair action.

## Parity / Alignment Matrix

| Surface | Current truth | Target truth | Explicitly out of scope |
| --- | --- | --- | --- |
| Active owner lifecycle | `canonical_owner_issues[]` and global owner metadata can point at terminal implementation issues. | Owner binding records expose `active_owner` versus `retired_historical`, and terminal `active_owner` issues route to `restore_existing_owner`. | Making registry row status a substitute owner lifecycle authority. |
| Terminal owner action | Terminal same-project owners can emit replacement `create_required` owner actions. | Terminal same-project `active_owner` emits `restore_existing_owner` / `move_to_backlog_not_done` when restoration is possible. | Creating another durable replacement owner for CO-579. |
| Passive Backlog owner | Backlog owner bindings are not clearly accepted as live owner proof. | Exact-key Backlog owners allow `pass_with_owned_rolling_debt` inside window/capacity without counting as provider-worker WIP. | Letting passive Backlog issues hide expired retained debt. |
| Retired historical owner | Historical owners can look similar to active owners. | `retired_historical` owners are lineage only and cannot satisfy live owner proof. | Deleting CO-568 or CO-579 lineage. |
| Merge closeout | A merged owner PR can close an active owner issue to `Done`. | Merge/finalizer paths prevent or repair active owner issues back to Backlog while candidate cohorts still resolve to them. | PR lifecycle redesign unrelated to docs freshness owners. |

## Acceptance Criteria
1. `canonical_owner_issues[]` or a dedicated owner registry supports an explicit owner lifecycle field such as `active_owner`, `retiring`, and `retired_historical`.
2. An `active_owner` mapped to a terminal same-project Linear issue emits a `restore_existing_owner` / `move_to_backlog_not_done` action, not replacement-owner `create_required`, unless restoration is impossible.
3. A live same-project `Backlog` owner for the exact canonical key permits `pass_with_owned_rolling_debt` only while retained debt is within window and capacity.
4. Retained exception expiry still blocks when expired, regardless of live owner state.
5. Registry row status remains document lifecycle only and cannot make an active owner terminal-safe.
6. Merge closeout prevents active owner issues from ending in `Done` while candidate cohorts still resolve to them, or immediately repairs them back to `Backlog` with audit evidence.
7. PR descriptions and automation stop using active owner issues as closing deliverables; child work issues may close instead.
8. Regression tests cover terminal active owner, live Backlog owner, expired retained exception, retired historical owner, exact-key isolation, wrong-project owner, and merge finalizer behavior.
9. `npm run docs:freshness`, `npm run docs:freshness:maintain -- --format json`, and focused vitest coverage demonstrate that `CO-581` does not immediately become terminal-owner debt after its PR merges.

## Not Done If
- A merged owner PR can still close an active owner issue to `Done` while candidate cohorts resolve to it.
- A terminal same-project active owner still emits only `create_required` instead of a restore-existing-owner action when restoration is possible.
- Exact owner mappings for `CO-581` and `CO-569` can leak across cohorts.
- Backlog owner bindings count as active provider-worker WIP without an actual repair/archive/reclassification run.
- `docs:freshness` or `spec-guard` passes by weakening freshness, expiry, or owner liveness checks.

## Goals
- Repair docs-freshness owner lifecycle routing with explicit owner lifecycle semantics.
- Preserve fail-closed behavior for unowned, wrong-project, expired, or retired historical debt.
- Make the current CO-579 terminal-owner symptom actionable as restoration, not replacement.
- Keep CO-569 and CO-581 exact owner truth visible and unchanged.

## Non-Goals
- No blind `last_review` bump.
- No historical packet deletion.
- No owner cap increase or broad cohort consolidation.
- No unrelated provider-worker queue policy change.
- No GitHub or Linear mutation outside the active CO-582 lane and required workpad/lifecycle updates.

## Metrics & Guardrails
- Maintainer output contains restoration action evidence for terminal same-project `active_owner`.
- Backlog exact owners verify as live owner proof without increasing active worker count.
- Expired retained exception and wrong-project owner cases still block.
- Focused tests cover owner lifecycle routing before broad validation runs.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- This lane removes the replacement-owner chain fallback and replaces split owner authority with an explicit lifecycle contract.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Docs freshness replacement-owner chain | Terminal active owners create replacement owner issues instead of restoring the owner binding. | remove fallback | CO-582 | `owner_finalizer.status=blocked_terminal_owner` for CO-579 after owner PR completion. | 2026-05-24 | 2026-05-26 | Not retained | Terminal same-project active owner emits `restore_existing_owner` / `move_to_backlog_not_done`, or blocks only when restoration is impossible. | focused docs-freshness maintain tests and maintainer JSON. |
| Owner lifecycle authority split | Registry status, task status, fallback expiry, and Linear terminal state can be mistaken for owner lifecycle authority. | remove fallback | CO-582 | Active owner issues reached `Done` while retained cohorts still existed. | 2026-05-24 | 2026-05-26 | Not retained | Dedicated owner lifecycle state separates `active_owner` from `retired_historical`. | owner lifecycle tests and docs freshness maintain. |

## Open Questions
- None currently block implementation; live Linear mutation for restoration can stay dry-run/audit-only unless the maintainer command already supports safe Linear state changes.

## Approvals
- Pre-implementation issue-quality review: parent CO orchestrator self-approval after live issue-context, co-status, and maintainer output recheck.
- Date: 2026-05-26.
