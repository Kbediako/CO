---
id: 20260518-linear-5e9dfba2-d54c-474a-94b0-79dbd3c1f18e
title: CO-515 control-host source freshness recheck after main advances
relates_to: docs/PRD-linear-5e9dfba2-d54c-474a-94b0-79dbd3c1f18e.md
risk: high
owners:
  - Codex
last_review: 2026-05-18
related_action_plan: docs/ACTION_PLAN-linear-5e9dfba2-d54c-474a-94b0-79dbd3c1f18e.md
task_checklists:
  - tasks/tasks-linear-5e9dfba2-d54c-474a-94b0-79dbd3c1f18e.md
---

# TECH_SPEC - CO-515 control-host source freshness recheck after main advances

## Canonical Reference
- PRD: `docs/PRD-linear-5e9dfba2-d54c-474a-94b0-79dbd3c1f18e.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-5e9dfba2-d54c-474a-94b0-79dbd3c1f18e.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-5e9dfba2-d54c-474a-94b0-79dbd3c1f18e.md`
- Task checklist: `tasks/tasks-linear-5e9dfba2-d54c-474a-94b0-79dbd3c1f18e.md`
- Registry: `tasks/index.json`
- Task snapshot: `docs/TASKS.md`
- Freshness registry: `docs/docs-freshness-registry.json`
- Source anchor: `ctx:sha256:e50fbc86099d15a7bd5e45c23028430bd6de7f985de2237cb5ea66b7673567f2#chunk:c000001`

## Summary
- Objective: make control-host source freshness recheck local `origin/main` after main advances so stale current status cannot survive on a long-running resident supervised control-host.
- Scope:
  - `control-host source freshness`
  - resident supervised control-host freshness projection
  - `co-status --format json` and `/ui/data.json` source freshness evidence
  - `observed_at`, `source_checkout.head`, upstream, and behind/ahead freshness fields
  - CO-555 recurrence fixture
  - task packet and declared registry/checklist mirrors
- Constraints:
  - no manual `provider-intake-state.json` edits
  - no broad restart or fail-closed policy; CO-556 owns that dependent policy
  - no provider-worker WIP, admission, issue selection, or Linear lifecycle authority changes
  - status/proof freshness rechecks must be read-only against local refs

## Issue-Shaping Contract
- User-request translation carried forward:
  - the resident supervised control-host must not keep stale current source freshness after local `origin/main` advances
  - source freshness output must carry enough proof for operators to compare `observed_at`, `source_checkout.head`, and local `origin/main`
  - CO-555 recurrence fixture must prove this after main advances
  - this lane makes stale-source detection trustworthy before CO-556 implements auto-restart or fail-closed behavior
- Protected terms / exact artifact and surface names:
  - `control-host source freshness`
  - `origin/main`
  - `observed_at`
  - `source_checkout.head`
  - `source_checkout.upstream`
  - `source_checkout.behind`
  - stale current status
  - long-running control-host
  - shared-root posture
  - resident supervised control-host
  - `provider-intake-state.json`
  - `co-status --format json`
  - `/ui/data.json`
  - CO-555 recurrence fixture
  - CO-556 dependent policy
- Nearby wrong interpretations to reject:
  - hand-editing `provider-intake-state.json`
  - restarting the host as the fix
  - hiding source freshness evidence
  - treating shared-root cleanliness as supervised source-root freshness
  - implementing provider-worker issue selection, WIP caps, or Linear lifecycle changes
- Explicit non-goals carried forward:
  - no manual provider-intake edits
  - no broad control-host restart policy rewrite
  - no provider-worker issue selection, WIP cap, or Linear lifecycle authority changes
  - no auto-restart/fail-closed policy before CO-556

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| Source freshness status | Persisted/startup freshness can keep stale current status. | Current means checked against the current local `origin/main`. | Recheck before reporting current; stale source root emits stale/warning. | Restart/fail-closed policy. |
| `observed_at` | Can describe the old startup-time freshness comparison. | Should describe the comparison that produced the latest verdict. | Updates when the freshness recheck runs. | Time-based restart SLA. |
| `source_checkout.head` | Can remain the old source root head while current status persists. | Should identify the source root head being compared to local `origin/main`. | Shows stale source head, upstream, and behind count when stale. | Remote fetch/mutation. |
| Shared-root posture | Shared root can be current while resident supervised source root is stale. | Shared-root posture is context, not proof of the running host source. | Surfaces keep shared-root and source-root evidence separate. | Shared-root cleanup. |
| Provider-intake evidence | `provider-intake-state.json` may still be operationally fresh. | Intake evidence must not be edited to hide stale source truth. | Intake remains separate evidence while source freshness reports independently. | Manual provider-intake edits. |

## Readiness Gate
- Not done if:
  - `co-status --format json` can still show stale current source freshness after local `origin/main` advances
  - `observed_at` is stale or ambiguous for the source freshness comparison
  - `source_checkout.head` does not match the supervised source root head used for the verdict
  - parent implementation fixes the incident by restarting the host, hiding source evidence, or editing `provider-intake-state.json`
  - CO-556 restart/fail-closed policy is absorbed into CO-515
- Pre-implementation issue-quality review evidence:
  - 2026-05-18: bounded docs child lane translated the parent issue contract into a narrow detection/trustworthiness packet. The issue is not satisfied by CO-458 alone because CO-515 specifically requires rechecking after main advances so stale current status cannot persist on a resident supervised control-host.
- Safeguard ownership split:
  - child owns docs packet, task checklist, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`
  - parent owns source inspection, implementation, focused tests, docs-review, Linear state, workpad, PR, and review lifecycle

## Technical Requirements
1. Recheck resident supervised control-host source freshness against local `origin/main` before projecting `current`.
2. Preserve `observed_at` as the timestamp of the comparison that produced the freshness verdict.
3. Preserve `source_checkout.head`, upstream, and behind/ahead evidence for the supervised source root.
4. Keep shared-root posture separate from supervised source-root freshness.
5. Keep `provider-intake-state.json` as source-labeled operational evidence, not a source freshness mutation surface.
6. Add a CO-555 recurrence fixture where `origin/main` advances after a resident supervised control-host source freshness snapshot and status projection must change from stale current to stale/warning.
7. Keep all freshness reads no-fetch/no-mutation by default.
8. Defer auto-restart/fail-closed policy to CO-556 after source freshness detection is trustworthy.

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Decision: remove the cached-current source freshness seam for resident supervised control-host status.
- Large-refactor check: keep this scoped to source freshness recheck/projection unless source inspection shows duplicate freshness refresh logic that must be consolidated to make stale-source detection trustworthy.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Control-host source freshness projection | Cached or startup-time freshness can keep stale current status after `origin/main` advances. | remove fallback | CO-515 | Long-running resident supervised control-host source root is behind local `origin/main` while status/proof surfaces still say current. | Observed 2026-05-18 | 2026-05-18 | This issue | Source freshness rechecks local `origin/main` before reporting current and emits stale/warning with updated `observed_at` and `source_checkout.head` when behind. | CO-555 recurrence fixture plus focused source freshness/status projection tests. |

## Acceptance Criteria
- CO-515 packet docs and task registration exist in the declared file scope.
- `tasks/index.json` registers `20260518-linear-5e9dfba2-d54c-474a-94b0-79dbd3c1f18e`.
- `docs/TASKS.md` includes a CO-515 snapshot.
- `docs/docs-freshness-registry.json` includes the declared packet/task rows without blind date bumps.
- Parent implementation rechecks source freshness after local `origin/main` advances.
- Parent implementation updates or reprojects `observed_at` and `source_checkout.head` truthfully.
- Parent implementation includes CO-555 recurrence fixture coverage.
- Parent implementation does not edit `provider-intake-state.json`, hide source freshness evidence, or implement CO-556 auto-restart/fail-closed policy.

## Validation Plan
- Child lane:
  - JSON parse for `tasks/index.json` and `docs/docs-freshness-registry.json`
  - protected-term scan over declared CO-515 files
  - `git diff --check` over declared touched paths
- Parent lane:
  - focused source freshness recheck tests
  - CO-555 recurrence fixture
  - focused `co-status --format json` or `/ui/data.json` projection assertions
  - docs-review before implementation
  - implementation gate, standalone review, elegance pass, PR checks, ready-review drain, and Linear handoff

## Open Questions
- Should recheck be performed at control-host polling refresh, at every `co-status --format json` read, or through a shared freshness refresh helper?
- What structured status should missing local `origin/main` produce for resident host freshness: `unavailable`, `warning`, or an existing no-remote detail?

## Approvals
- Reviewer: CO-515 provider worker / parent lane.
- Date: 2026-05-18.
