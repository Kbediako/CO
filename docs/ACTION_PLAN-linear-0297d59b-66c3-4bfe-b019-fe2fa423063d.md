# ACTION_PLAN - CO: re-enforce CO-185 provider-helper preflight guarantees in live worker attempts

## Summary
- Goal: define the bounded follow-up needed to re-audit and restore the `CO-185` helper-preflight guarantees in the current provider-worker path.
- Scope: docs-first packet, parent-owned registry updates, parent-owned live failure reproduction from `CO-295` / `CO-299` / `CO-302`, provider truth/prompting/retry suppression, parent-dirty child-lane guidance/sequencing, and focused regression coverage.
- Assumptions:
  - The parent lane owns the authoritative issue workspace, Linear state, workpad, registry mirrors, implementation, validation, and PR lifecycle.
  - Existing guardrails remain valid: fail-closed parity-matrix enforcement, clean-parent checks, and bounded issue scope.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `CO-185`, `CO-295`, `CO-299`, `CO-302`, `provider_worker_child_lane_parent_dirty`, `linear_follow_up_parity_matrix_missing`, `provider truth/prompting/retry suppression`, `live provider-worker path`, `provider-linear-worker-linear-audit.jsonl`, and `provider-linear-worker-proof.json`.
- Not done if: a single provider-worker attempt can still repeat `linear_follow_up_parity_matrix_missing` without materially changed inputs, or parent-dirty child-lane launch failures can still recur without deterministic sequencing/guidance that prevents repeated failed launches.
- Pre-implementation issue-quality review: approved from the live `CO-306` issue body on 2026-04-22. The packet is not narrower than the request because it preserves the source contract, the current live failure evidence, the guardrail boundaries, the target outcome, and the focused validation expectations.

## Non-Goals
- Do not weaken parity-matrix enforcement.
- Do not weaken clean-parent child-lane safety checks.
- Do not broaden active issue scopes beyond the helper-preflight gap shared across `CO-295`, `CO-299`, and `CO-302`.
- Do not redesign scheduler, dispatch, or concurrency policy beyond what is needed to restore the `CO-185` guarantees.

## Parity Matrix

| Criterion | Current | Reference | Target |
| --- | --- | --- | --- |
| Same-attempt parity retry truth | `CO-299` and `CO-302` still repeat `linear_follow_up_parity_matrix_missing` in one live attempt. | `CO-185` intended guarantee suppresses unchanged same-attempt retries after the first deterministic failure. | The current provider-worker path stops repeating unchanged parity-follow-up mutations inside the same attempt. |
| Parent-dirty launch recovery | `CO-295` and `CO-299` still repeat `provider_worker_child_lane_parent_dirty` churn inside one live attempt. | Clean-parent checks stay fail-closed, but the worker gets deterministic sequencing or recovery guidance. | Parent-dirty situations converge instead of recurring through repeated failed launches. |
| Guardrail preservation | Fix pressure could encourage bypasses. | Parity-matrix and clean-parent contracts remain authoritative. | Guarantees are restored without weakening either contract or widening scheduler/dispatch scope. |

## Milestones & Sequencing
1. Create the docs-first packet and parent-owned registry entries for `20260422-linear-0297d59b-66c3-4bfe-b019-fe2fa423063d`.
2. Run pre-implementation docs review and record the result or truthful fallback before implementation.
3. Reproduce the Apr 22 live failure shapes from `CO-295`, `CO-299`, and `CO-302` using current provider audit/proof evidence and isolate why the `CO-185` guarantee did not hold.
4. Restore same-attempt suppression for deterministic `linear_follow_up_parity_matrix_missing` failures in the live provider-worker path.
5. Restore deterministic parent-dirty child-lane guidance or sequencing so repeated `provider_worker_child_lane_parent_dirty` launches do not recur in the same attempt.
6. Add focused regression coverage proving both guarantees in the current worker path while preserving fail-closed guardrails.
7. Run the normal implementation validation and review gates for the touched implementation surfaces.

## Dependencies
- Source contract packet from `CO-185`:
  - `docs/PRD-linear-9a54c7d8-518f-4452-95aa-c5852008b38d.md`
  - `docs/TECH_SPEC-linear-9a54c7d8-518f-4452-95aa-c5852008b38d.md`
  - `docs/ACTION_PLAN-linear-9a54c7d8-518f-4452-95aa-c5852008b38d.md`
  - `tasks/specs/linear-9a54c7d8-518f-4452-95aa-c5852008b38d.md`
- Live audit/proof evidence from `CO-295`, `CO-299`, and `CO-302`.
- Existing provider-worker, child-lane, and follow-up helper surfaces listed in the PRD and canonical TECH_SPEC.

## Validation
- Pre-implementation docs checks:
  - `linear child-stream --pipeline docs-review`
  - truthful parent-owned fallback if docs-review fails only on unrelated baseline debt
- Parent implementation checks:
  - focused audit-based reproduction for `CO-295`, `CO-299`, and `CO-302`
  - focused provider-worker truth/prompting tests for same-attempt parity suppression
  - focused child-lane guidance tests for parent-dirty sequencing/recovery
  - focused regression coverage proving both guarantees in the current provider-worker path
  - normal parent-owned validation and review gates for the touched implementation surfaces
- Rollback plan:
  - revert the implementation and this packet together if the issue-shaping contract is wrong; do not weaken existing fail-closed guardrails as rollback.

## Risks & Mitigations
- Risk: the parent fixes churn by weakening parity-matrix or clean-parent enforcement.
  - Mitigation: keep those guardrails as explicit protected terms, acceptance criteria, and readiness-gate requirements.
- Risk: `CO-306` drifts into broad fixes for `CO-295`, `CO-299`, or `CO-302`.
  - Mitigation: keep the scope anchored to the shared helper-preflight guarantee gap only.
- Risk: same-attempt suppression is added in one seam but not actually leveraged by the current live worker path.
  - Mitigation: require live-path reproduction plus focused regression coverage against the current provider-worker path.

## Approvals
- Reviewer: pending parent review and docs-review.
- Date: pending.
