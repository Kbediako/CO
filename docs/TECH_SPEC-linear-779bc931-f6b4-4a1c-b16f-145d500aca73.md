---
id: 20260507-linear-779bc931-f6b4-4a1c-b16f-145d500aca73
title: "CO-492 advisory persisted goal evidence capture"
relates_to: docs/PRD-linear-779bc931-f6b4-4a1c-b16f-145d500aca73.md
risk: medium
owners:
  - Codex
last_review: 2026-05-07
---

# TECH_SPEC - CO-492 advisory persisted goal evidence capture

## Summary
- Objective: add a docs-first implementation contract for optional persisted `/goal` capture as provider-worker run evidence.
- Scope: manifest `goal_evidence`, compact workpad summary wording, unavailable/stale evidence handling, and explicit `authority=advisory_only` boundaries.
- Constraints: no implementation in this child lane; parent owns source/tests, Linear state, workpad, PR lifecycle, review, and final validation.

## Issue-Shaping Contract
- User-request translation carried forward: CO-492 is the narrow follow-up from CO-486 to capture advisory persisted goal state in provider-worker manifests/workpads, not to promote goal state into workflow authority.
- Protected terms / exact artifact and surface names: persisted `/goal`, goals feature, app-server APIs, model tools, provider-worker run evidence, manifest `goal_evidence`, workpad summary, `advisory_only`, Linear remains source of truth.
- Nearby wrong interpretations to reject: goal state authorizes lifecycle movement; `complete` goal status means issue Done; app-server goal notifications drive hook/resume recovery; TUI state is required for automation; missing goal evidence blocks handoff.
- Explicit non-goals carried forward: no Linear transition authority, no PR attachment authority, no review handoff authority, no ready-review success authority, no merge closeout authority, no hook recovery success authority, no long-poll terminal status authority, no hook/resume control integration, and no TUI automation.

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth / intended delta | Explicitly out-of-scope differences |
| --- | --- | --- | --- | --- |
| CO-486 decision | Persisted goal state is advisory provider-worker run evidence. | Linear/workpad/PR/review/check state authorizes lifecycle. | Implement optional capture without changing authority. | Reopening the canary or changing authority classification. |
| Manifest evidence | No normalized `goal_evidence` field is available for provider-worker runs. | Existing manifests are durable audit artifacts. | Add optional manifest `goal_evidence` with provenance and advisory-only authority limits. | Historical manifest rewrites. |
| Workpad summary | Workpad can summarize run evidence and point to manifests. | Workpad remains a governed summary, not sole proof. | Add compact advisory goal line when evidence exists or unavailable reason when capture was attempted. | Workpad closeout from goal status. |
| Capture sources | goals feature, app-server APIs, and model tools can expose thread-scoped goal state. | Capture sources are evidence sources only. | Use them to populate evidence when available and matching the current provider-worker run. | Hook/resume control integration or TUI automation. |

## Readiness Gate
- Not done if:
  - `goal_evidence` can authorize Linear transitions, PR attachment, review handoff, ready-review success, merge closeout, hook recovery success, long-poll terminal status, hook/resume control integration, or TUI automation
  - missing or unavailable goal capture changes lifecycle behavior
  - workpad summary is written without manifest-backed evidence or an explicit unavailable reason
  - `authority=advisory_only` and Linear remains source of truth are absent from the evidence contract
  - implementation changes broaden into hook/resume, long-poll control, TUI automation, or PR lifecycle
- Pre-implementation issue-quality review evidence:
  - 2026-05-07: issue is correctly broader than a micro-task because exact protected terms and authority boundaries are central to correctness.
  - 2026-05-07: issue is correctly narrower than hook/resume or lifecycle control integration; parent implementation should only add advisory evidence capture and rendering.
- Safeguard ownership split:
  - Parent owns implementation, tests, Linear/workpad authority, PR lifecycle, review, and final validation.
  - This child lane owns docs packet and registry mirrors only.

## Technical Requirements
- Functional requirements:
  1. Add optional provider-worker manifest `goal_evidence`.
  2. Populate `goal_evidence` from model tools or app-server APIs only when the captured goal is current and relevant to the provider-worker run.
  3. Include `authority: "advisory_only"` and `linear_authority_preserved: true`.
  4. Include `not_authorized_for` entries covering Linear transitions, PR attachment, review handoff, ready-review success, merge closeout, hook recovery success, long-poll terminal status, hook/resume control integration, and TUI automation.
  5. When capture is unavailable, disabled, stale, or thread-mismatched, record an unavailable advisory state or reason without blocking lifecycle progress.
  6. Record `capture_timestamp` as the provider-worker evidence observation time; keep goal `created_at` and `updated_at` as separate goal provenance.
  7. Render a compact workpad summary line from manifest-backed evidence.
- Non-functional requirements:
  - evidence capture must be deterministic and safe in non-interactive provider-worker runs
  - no TUI dependency
  - no lifecycle gate may treat goal state as authority
  - long objectives should be abbreviated in workpad display without losing manifest fidelity
- Interfaces / contracts:
  - manifest field: `goal_evidence`
  - workpad summary line: `Advisory goal evidence: mode=<capture_mode> status=<status|unknown> thread=<id|unknown> turn=<id|unknown> objective=<short> reason=<reason>; manifest=<manifest>; authority=advisory_only; Linear remains source of truth.`

## Suggested Manifest Shape

```json
{
  "source": "codex-goals",
  "feature_available": true,
  "feature_enabled": true,
  "capture_mode": "captured|cleared|disabled|unavailable|stale|thread_mismatch",
  "capture_timestamp": "ISO-8601|null",
  "thread_id": "string|null",
  "turn_id": "string|null",
  "objective": "string|null",
  "status": "active|paused|budgetLimited|complete|unavailable|unknown",
  "token_budget": "number|null",
  "tokens_used": "number|null",
  "elapsed_seconds": "number|null",
  "created_at": "ISO-8601|null",
  "updated_at": "ISO-8601|null",
  "authority": "advisory_only",
  "linear_authority_preserved": true,
  "reason": "string|null",
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
  ]
}
```

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Required decision table:
- Large-refactor decision: no larger authority refactor is warranted because this issue adds advisory run evidence and explicitly rejects lifecycle authority expansion.
- Minor-seam decision: retain the optional unavailable/non-current goal-evidence seam as a supported no-op evidence path, not as lifecycle authority.
- Contract name: Linear-first provider-worker lifecycle authority with optional advisory `goal_evidence`.
- Owning surface: provider-worker manifest and workpad evidence capture.
- Steady-state proof: Linear/workpad/PR/review/check evidence remains authoritative while `goal_evidence` only records advisory state or reason.
- Tests/docs: focused provider-worker manifest/workpad tests, command-runner manifest persistence tests, and the CO-492 docs packet.
- Non-expiring rationale: optional goal evidence can be absent or unavailable as a supported no-op state because goal evidence is not required for workflow authority.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider-worker `goal_evidence` | Goal evidence can be unavailable, disabled, stale, complete, paused, budget-limited, or thread-mismatched. | justify retaining fallback | CO-492 | capture source cannot provide current matching goal evidence | 2026-05-07 | 2026-05-07 | non-expiring supported no-op | only replaced by approved authority redesign | focused manifest/workpad tests and docs gates |

- Large-refactor check: the large-refactor preference is not triggered because this issue does not split authority or add a second lifecycle control path.

## Architecture & Data
- Architecture / design adjustments: parent implementation should collect goal evidence during provider-worker evidence assembly and pass only normalized evidence to workpad summary rendering.
- Data model changes / migrations: add optional manifest field only; do not migrate historical manifests.
- External dependencies / integrations: Codex goals feature, app-server APIs, model tools, and current provider-worker manifest/workpad surfaces.

## Validation Plan
- Focused tests for manifest capture when goal evidence is available, unavailable, disabled, stale, complete, and thread-mismatched.
- Focused tests that workpad summary renders `advisory_only` and never implies authority.
- Regression coverage proving Linear transitions, PR attachment, review handoff, ready-review success, merge closeout, hook recovery success, long-poll terminal status, hook/resume control integration, and TUI automation do not use goal state as authority.
- Docs-only child lane checks: JSON parse for registry mirrors, protected-term scan, and `git diff --check`.

## Open Questions
- Should unavailable capture be recorded on every run or only when the goals feature is detected?
- Should app-server notification payloads be stored raw in artifacts, or should manifests keep only the normalized snapshot?
- Should child-lane runs capture their own goal evidence separately from parent runs?

## Approvals
- Reviewer: bounded same-issue docs child lane.
- Date: 2026-05-07.
