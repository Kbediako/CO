# PRD - CO: re-enforce CO-185 provider-helper preflight guarantees in live worker attempts
## Traceability
- Issue: `CO-306` / `0297d59b-66c3-4bfe-b019-fe2fa423063d`
- Source contract: `CO-185`
- Canonical task: `20260422-linear-0297d59b-66c3-4bfe-b019-fe2fa423063d`
- Source anchor: `ctx:sha256:da29a2b000e92976ef06ef6b0d4b5b0ac127ead95990269b2208338853a8b988#chunk:c000001`
## Problem
- Apr 22 live runs still repeat the CO-185 failure shapes: `CO-295` still churns on `provider_worker_child_lane_parent_dirty`, while `CO-299` and `CO-302` still repeat same-attempt `linear_follow_up_parity_matrix_missing`, so the live provider-worker path is not carrying the first deterministic helper failure forward into same-attempt behavior.
## Outcome
- Unchanged same-attempt parity follow-up retries stop after the first deterministic failure, parent-dirty child-lane launch churn converges through deterministic sequencing/guidance, and parity-matrix and clean-parent checks stay fail-closed.
## Boundaries
- Preserve `CO-185`, `CO-295`, `CO-299`, `CO-302`, `provider_worker_child_lane_parent_dirty`, `linear_follow_up_parity_matrix_missing`, `provider truth/prompting/retry suppression`, `provider-linear-worker-linear-audit.jsonl`, and `provider-linear-worker-proof.json`; reject any weakening of parity-matrix enforcement or clean-parent checks.
## Parity Matrix
| Surface | Current | Reference | Target |
| --- | --- | --- | --- |
| Same-attempt parity retry | `CO-299` / `CO-302` repeat `linear_follow_up_parity_matrix_missing`. | CO-185 intended unchanged same-attempt suppression. | Unchanged parity follow-up retries stop after the first deterministic failure. |
| Parent-dirty launch recovery | `CO-295` / `CO-299` repeat `provider_worker_child_lane_parent_dirty`. | Clean-parent stays fail-closed, but the next step changes deterministically. | Parent-dirty launch churn converges instead of recurring. |
| Guardrails | Pressure exists to bypass checks to stop churn. | Parity-matrix and clean-parent checks stay authoritative. | Churn drops without weakening either contract. |
## Not Done If
- The same attempt can still repeat either deterministic failure shape without materially changed inputs or improved sequencing/guidance, or the fix weakens parity-matrix enforcement, clean-parent checks, or broadens scope beyond the bounded helper-preflight gap.
## Acceptance Criteria
- [ ] Reproduce the Apr 22 live failure shapes from `CO-295`, `CO-299`, and `CO-302`, restore same-attempt parity suppression and parent-dirty launch guidance in the current provider-worker path, add focused regression coverage for both guarantees, and preserve fail-closed parity-matrix and clean-parent contracts while reducing retry churn.
