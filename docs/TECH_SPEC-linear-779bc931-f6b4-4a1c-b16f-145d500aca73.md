---
id: 20260507-linear-779bc931-f6b4-4a1c-b16f-145d500aca73
title: CO-492 capture advisory persisted goal evidence in provider-worker manifests
relates_to: docs/PRD-linear-779bc931-f6b4-4a1c-b16f-145d500aca73.md
risk: medium
owners:
  - Codex
last_review: 2026-05-07
related_action_plan: docs/ACTION_PLAN-linear-779bc931-f6b4-4a1c-b16f-145d500aca73.md
task_checklists:
  - tasks/tasks-linear-779bc931-f6b4-4a1c-b16f-145d500aca73.md
---

# TECH_SPEC - CO-492 Advisory Persisted Goal Evidence Capture

## Canonical Reference
- PRD: `docs/PRD-linear-779bc931-f6b4-4a1c-b16f-145d500aca73.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-779bc931-f6b4-4a1c-b16f-145d500aca73.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-779bc931-f6b4-4a1c-b16f-145d500aca73.md`
- Task checklist: `tasks/tasks-linear-779bc931-f6b4-4a1c-b16f-145d500aca73.md`
- Linear issue: `CO-492` / `779bc931-f6b4-4a1c-b16f-145d500aca73`
- Source anchor: `ctx:sha256:3d2d783bff06744771ae73806255246cfa5f544055209f45373d48804ad1e0ba#chunk:c000001`
- Child lane manifest: `.runs/linear-779bc931-f6b4-4a1c-b16f-145d500aca73-docs-packet-rework/cli/2026-05-07T15-57-09-661Z-55e51e78/manifest.json`

## Summary
- Objective: implement optional persisted `/goal` capture in provider-worker manifests and workpad summary surfaces as advisory provider-worker run evidence only.
- Scope:
  - provider-worker run manifest evidence assembly
  - command-runner manifest persistence and manifest patching behavior
  - workpad summary rendering
  - app-server APIs and model tools as goal evidence sources
  - legacy hydration fail-closed behavior
  - stale candidate, disabled feature, fractional elapsed time, and thread mismatch regressions
- Constraints:
  - `goal_evidence.authority` must be `advisory_only`
  - Linear remains source of truth
  - no goal state may authorize Linear transitions, PR attachment, review handoff, ready-review success, merge closeout, hook recovery success, or long-poll terminal status
  - no hook/resume control integration
  - no TUI automation
  - no historical manifest rewrites or stale fallback snapshot writes

## Issue-Shaping Contract
- User-request translation carried forward: CO-492 is the narrow follow-up from CO-486 that captures optional advisory persisted `/goal` evidence in provider-worker run manifests and workpad summaries without changing lifecycle authority.
- Protected terms / exact artifact and surface names:
  - persisted `/goal`
  - goals feature
  - app-server APIs
  - model tools
  - provider-worker run evidence
  - manifest goal_evidence
  - workpad summary
  - `advisory_only`
  - `authority=advisory_only`
  - Linear remains source of truth
  - stale PR `#788`
- Nearby wrong interpretations to reject:
  - goal state authorizes Linear transitions
  - goal state authorizes PR attachment
  - goal state authorizes review handoff
  - goal state authorizes ready-review success
  - goal state authorizes merge closeout
  - goal state authorizes hook recovery success
  - goal state authorizes long-poll terminal status
  - this lane implements hook/resume control integration
  - this lane implements TUI automation
  - stale PR `#788` remains active PR truth
- Explicit non-goals carried forward:
  - no broad provider-worker lifecycle authority redesign
  - no Linear/GitHub/workpad lifecycle mutation from this child lane
  - no implementation or test edits by this child lane
  - no fallback snapshot backfill from stale manifests

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth | Explicitly out-of-scope differences |
| --- | --- | --- | --- | --- |
| Provider-worker manifest | No normalized persisted goal evidence field is guaranteed. | CO-486 proposed optional `goal_evidence` as advisory provider-worker run evidence. | Manifest contains `goal_evidence` when capture is current and trusted, or an advisory unavailable/stale reason when it fails closed. | Lifecycle authority, hook recovery, long-poll completion, PR or review decisions. |
| Command-runner manifest persistence | Manifest patching can update run evidence. | Review feedback requires advisory markers to survive persistence. | Persisted manifest patches preserve `authority=advisory_only`, `linear_authority_preserved=true`, and not-authorized-for markers. | Stale fallback snapshot writes. |
| Candidate reuse | Existing implementation attempt exposed stale/disabled candidate reuse concerns. | Disabled, stale, or thread-mismatched candidates are untrusted. | Candidate reuse is blocked before use when goals are disabled, timestamps are stale, or thread ids mismatch. | Reusing stale candidates to keep workpad output populated. |
| Legacy hydration | Legacy manifests may lack normalized goal evidence. | Hydration must not invent goal evidence. | Legacy hydration performs no backfill unless a real goal notification or current model-tool snapshot exists. | Historical manifest rewriting. |
| Workpad summary | Workpad is a compact evidence pointer. | Linear remains source of truth. | Summary names advisory status and points at manifest evidence without implying closeout authority. | Workpad closeout based on goal completion. |

## Functional Requirements
1. Add normalized provider-worker `manifest goal_evidence` capture only when the goals feature is available and the candidate belongs to the current provider-worker thread.
2. Capture from app-server APIs and/or model tools into a normalized advisory shape that includes source, capture mode, captured time, thread id, objective, status, elapsed seconds, candidate timestamps, and `authority=advisory_only`.
3. Preserve not-authorized-for markers covering Linear transitions, PR attachment, review handoff, ready-review success, merge closeout, hook recovery success, and long-poll terminal status.
4. Fail closed before candidate reuse when goals are disabled or unavailable.
5. Classify stale candidate timestamps as stale before workpad or manifest reuse.
6. Treat thread mismatch as untrusted and keep goals feature regression coverage pinned on.
7. Ensure command-runner manifest persistence and manifest patching never write stale fallback snapshots.
8. Ensure legacy hydration does not backfill goal evidence unless a real goal notification or current model-tool snapshot exists.
9. Accept fractional `elapsed_seconds` values without truncation or parse failure.
10. Render a compact workpad summary only from persisted advisory manifest evidence.

## Required Goal Evidence Shape

```json
{
  "source": "codex-goals",
  "feature_available": true,
  "feature_enabled": true,
  "capture_mode": "captured",
  "capture_timestamp": "ISO-8601|null",
  "thread_id": "string|null",
  "turn_id": "string|null",
  "objective": "string|null",
  "status": "string|null",
  "token_budget": 5000,
  "tokens_used": 120,
  "elapsed_seconds": 0.25,
  "created_at": "ISO-8601|null",
  "updated_at": "ISO-8601|null",
  "authority": "advisory_only",
  "linear_authority_preserved": true,
  "not_authorized_for": [
    "linear_transition",
    "workpad_replacement",
    "pr_attachment",
    "review_handoff",
    "ready_review_success",
    "merge_closeout",
    "hook_recovery_success",
    "long_poll_terminal_status",
    "hook_resume_control_integration",
    "tui_automation"
  ],
  "reason": "string|null"
}
```

Valid `capture_mode` values are `captured`, `cleared`, `disabled`, `unavailable`, `stale`, and `thread_mismatch`.

## PR #788 Review Findings Required For Replacement Branch
- Disabled goals fail closed before candidate reuse.
- Manifest patching does not write stale fallback snapshots.
- Command-runner manifest persistence enforces advisory markers.
- Legacy hydration no-backfill is tested with a real goal notification.
- `elapsed_seconds` accepts fractional seconds.
- Thread-mismatch regression pins goals on.
- Stale candidate timestamps classify as stale.

## Acceptance Criteria
- [ ] Provider-worker manifests persist `goal_evidence.authority=advisory_only` and preserve `linear_authority_preserved=true`.
- [ ] Workpad summary includes at most a compact advisory line and never presents goal state as completion, review, or merge authority.
- [ ] Disabled goals fail closed before candidate reuse.
- [ ] Manifest patching does not write stale fallback snapshots.
- [ ] Command-runner manifest persistence enforces advisory markers.
- [ ] Legacy hydration no-backfill is tested with a real goal notification.
- [ ] `elapsed_seconds` accepts fractional seconds.
- [ ] Thread-mismatch regression pins goals on.
- [ ] Stale candidate timestamps classify as stale.
- [ ] Goal state cannot authorize Linear transitions, workpad replacement, PR attachment, review handoff, ready-review success, merge closeout, hook recovery success, long-poll terminal status, hook/resume control integration, or TUI automation.

## Architecture & Data
- Candidate sources:
  - app-server goal notifications from app-server APIs
  - model tools goal snapshots
  - command-runner manifest context for persistence only after candidate validation
- Candidate validation order:
  1. Check goals feature availability.
  2. Check candidate source provenance.
  3. Check thread identity.
  4. Check candidate timestamp freshness.
  5. Normalize fractional `elapsed_seconds`.
  6. Attach advisory authority markers.
  7. Persist into manifest and derive workpad summary from manifest evidence.
- Data model changes:
  - Add optional `goal_evidence` to provider-worker run manifests.
  - No migration or rewrite of historical manifests.
  - Legacy hydration can read current real notifications/snapshots but cannot backfill stale fallback snapshots.

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Large-refactor decision: not required; this is an additive evidence capture field that preserves existing lifecycle authority.
- Minor-seam decision: acceptable only with explicit fail-closed candidate validation and advisory markers.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider-worker lifecycle authority | Goal evidence may exist beside Linear/workpad/PR/review/check truth. | justify retaining fallback | CO provider-worker workflow | goals feature enabled, unavailable, stale, or thread mismatched | Existing authority predates CO-492 | 2026-05-07 | non-expiring authority contract | only replaced by a separate approved authority redesign | Advisory marker tests plus provider-worker lifecycle gates. |
| Stale fallback snapshots | Manifest patching could reuse stale candidate data to populate `goal_evidence`. | remove fallback | CO-492 | candidate reuse or manifest patching | stale PR #788 attempt | 2026-05-07 | this issue | stale snapshots are never written; stale candidates classify as stale | Manifest patching and stale timestamp regressions. |
| Legacy hydration backfill | Legacy manifests could infer goal evidence without real goal notification. | remove fallback | CO-492 | legacy hydration reads old manifests | stale PR #788 attempt | 2026-05-07 | this issue | no backfill without real notification/current snapshot | Legacy hydration real notification regression. |

- Contract name: Linear-first lifecycle authority with optional advisory `manifest goal_evidence`.
- Owning surface: provider-worker manifest persistence and workpad summary rendering.
- Steady-state proof: focused tests prove invalid candidate rejection and advisory marker persistence.
- Tests/docs: CO-492 focused provider-worker manifest/workpad tests and this packet.
- Non-expiring rationale: Linear/workpad/PR/review/check authority is the durable governing contract; advisory goal evidence is not temporary lifecycle authority and can only be replaced by a separate approved authority redesign.

## Validation Plan
- Focused tests:
  - Disabled goals fail closed before candidate reuse.
  - Manifest patching refuses stale fallback snapshots and classifies stale candidate timestamps as stale.
  - Command-runner manifest persistence preserves `authority=advisory_only`, `linear_authority_preserved=true`, and not-authorized-for markers.
  - Legacy hydration no-backfill path uses a real goal notification fixture and proves no invented snapshot is written.
  - Fractional `elapsed_seconds` values parse and persist.
  - Thread mismatch regression pins goals on and rejects mismatched thread evidence.
  - Workpad summary renders from persisted advisory manifest evidence only.
  - Goal state never unlocks Linear transitions, PR attachment, review handoff, ready-review success, merge closeout, hook recovery success, long-poll terminal status, hook/resume control integration, or TUI automation.
- Parent validation gates:
  - focused test commands around provider-worker manifest/workpad goal evidence surfaces
  - `node scripts/spec-guard.mjs --dry-run`
  - build/lint/test/docs gates as required by the parent lane
  - manifest-backed review and elegance/minimality pass before replacement PR handoff
- Child-lane validation:
  - docs-only file-scope inspection
  - `jq` parse of registry mirrors
  - protected-term scan over changed packet files
  - `git diff --check`

## Open Questions
- Parent implementation must choose the exact freshness window for stale candidate timestamps.
- Parent implementation must decide whether unavailable goal evidence is a minimal object or full normalized object with `capture_mode=unavailable`.

## Approvals
- Reviewer: provider-worker parent lane after patch import.
- Date: 2026-05-07.
