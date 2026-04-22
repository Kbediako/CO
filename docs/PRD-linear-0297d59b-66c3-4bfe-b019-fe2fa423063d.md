# PRD - CO: re-enforce CO-185 provider-helper preflight guarantees in live worker attempts

## Traceability
- Linear issue: `CO-306` / `0297d59b-66c3-4bfe-b019-fe2fa423063d`
- Source issue: `CO-185` / `9a54c7d8-518f-4452-95aa-c5852008b38d`
- Canonical task id: `20260422-linear-0297d59b-66c3-4bfe-b019-fe2fa423063d`
- Source anchor: `ctx:sha256:da29a2b000e92976ef06ef6b0d4b5b0ac127ead95990269b2208338853a8b988#chunk:c000001`

## Problem
- Apr 22 live runs still repeat the exact CO-185 failure shapes.
- `CO-295` still shows same-attempt `provider_worker_child_lane_parent_dirty` launch churn.
- `CO-299` and `CO-302` still show repeated same-attempt `linear_follow_up_parity_matrix_missing` failures.
- That means the live provider-worker path is not actually carrying the CO-185 helper-preflight guarantee forward.

## Desired Outcome
- After the first deterministic parity follow-up failure, unchanged same-attempt retries stop until the inputs materially change.
- After the first parent-dirty child-lane failure, the same attempt gets deterministic sequencing or recovery guidance instead of repeating failed launches.
- The fix must land on the live provider-worker path without weakening fail-closed parity-matrix or clean-parent checks.

## Scope
- In scope: live audit/root-cause analysis from `CO-295` / `CO-299` / `CO-302`, provider truth or prompting or retry suppression, child-lane launch guidance, focused regression coverage, and the required docs packet/registry updates.
- Out of scope: weakening guardrails, broad remediation of `CO-295` / `CO-299` / `CO-302`, or scheduler/dispatch/concurrency redesign beyond this helper-preflight gap.

## Protected Terms
- Preserve: `CO-185`, `CO-295`, `CO-299`, `CO-302`, `provider_worker_child_lane_parent_dirty`, `linear_follow_up_parity_matrix_missing`, `provider truth/prompting/retry suppression`, `live provider-worker path`, `provider-linear-worker-linear-audit.jsonl`, and `provider-linear-worker-proof.json`.
- Reject: any interpretation that solves the churn by weakening parity-matrix enforcement, weakening clean-parent checks, or widening scope beyond the shared helper-preflight gap.

## Parity Matrix

| Surface | Current | Reference | Target |
| --- | --- | --- | --- |
| Same-attempt parity retry | `CO-299` / `CO-302` repeat `linear_follow_up_parity_matrix_missing` in one attempt. | CO-185 intended unchanged same-attempt suppression after the first deterministic failure. | The same attempt stops repeating unchanged parity follow-up mutations. |
| Parent-dirty launch recovery | `CO-295` / `CO-299` repeat `provider_worker_child_lane_parent_dirty` churn. | Clean-parent stays fail-closed, but the next step changes deterministically. | Parent-dirty situations converge instead of recurring through repeated failed launches. |
| Live leverage of helper truth | Current live attempts still ignore the first deterministic failure. | The first deterministic failure must alter same-attempt behavior. | The live worker path changes guidance or retry behavior after the first failure. |
| Guardrails | Fix pressure could encourage bypasses. | Parity-matrix and clean-parent contracts stay authoritative. | The churn stops without weakening those contracts. |

## Not Done If
- A single attempt can still emit repeated `linear_follow_up_parity_matrix_missing` failures without changed inputs.
- A single attempt can still repeat parent-dirty child-lane launch failures without deterministic sequencing or recovery guidance.
- The live provider-worker path still does not carry forward the CO-185 helper-preflight truth after the first deterministic failure.
- The fix weakens parity-matrix enforcement, clean-parent checks, or broadens scope beyond the bounded helper-preflight gap.

## Acceptance Criteria
- [ ] Reproduce the Apr 22 live failure shapes from `CO-295`, `CO-299`, and `CO-302` and isolate why CO-185 did not hold.
- [ ] Restore or add same-attempt suppression so unchanged `linear_follow_up_parity_matrix_missing` retries do not reissue the mutation.
- [ ] Restore or add deterministic parent-dirty sequencing/guidance so repeated `provider_worker_child_lane_parent_dirty` launches do not recur.
- [ ] Add focused regression coverage for both guarantees in the current provider-worker path.
- [ ] Preserve fail-closed parity-matrix and clean-parent contracts while reducing retry churn.
