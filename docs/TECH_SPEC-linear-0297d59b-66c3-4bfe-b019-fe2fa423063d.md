---
id: 20260422-linear-0297d59b-66c3-4bfe-b019-fe2fa423063d
title: CO: re-enforce CO-185 provider-helper preflight guarantees in live worker attempts
related_prd: docs/PRD-linear-0297d59b-66c3-4bfe-b019-fe2fa423063d.md
related_action_plan: docs/ACTION_PLAN-linear-0297d59b-66c3-4bfe-b019-fe2fa423063d.md
risk: high
owners:
  - Codex
last_review: 2026-04-22
---
# TECH_SPEC Mirror - CO: re-enforce CO-185 provider-helper preflight guarantees in live worker attempts
Canonical task spec: `tasks/specs/linear-0297d59b-66c3-4bfe-b019-fe2fa423063d.md`
That canonical spec carries the issue-shaping contract, current/reference/target parity matrix, live `CO-295` / `CO-299` / `CO-302` failure evidence, readiness gate, target surfaces, and validation plan for `CO-306`.
## Protected Summary
- Preserve `CO-185` as the source contract; `CO-295`, `CO-299`, and `CO-302` as the live failure evidence set; and deterministic failure names `provider_worker_child_lane_parent_dirty` and `linear_follow_up_parity_matrix_missing`.
- Preserve the desired outcome and guardrails: restore the `CO-185` helper-preflight guarantees in the live provider-worker path so repeated deterministic failures do not recur across a single attempt without weakening fail-closed parity-matrix enforcement or clean-parent child-lane safety checks.
- Preserve parent ownership of registry mirrors, implementation, validation, Linear state, workpad updates, PR lifecycle, and patch acceptance.
