---
id: 20260408-linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd
title: CO: Make ordinary eligible provider-worker issues actually leverage parent-owned same-issue child-lane parallelisation
relates_to: docs/PRD-linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd.md
related_prd: docs/PRD-linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd.md
related_action_plan: docs/ACTION_PLAN-linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd.md
risk: high
owners:
  - Codex
last_review: 2026-04-08
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd.md`
- PRD: `docs/PRD-linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd.md`
- Task checklist: `tasks/tasks-linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd.md`

## Scope
- Keep the lane bounded to ordinary provider-worker child-lane eligibility decisioning, proof/debug projection, prompt-contract enforcement, and focused replay evidence.
- Reuse the existing `CO-35` runtime, `CO-52` phase-scope contract, `CO-56` delegation evidence path, `CO-68` parsing hardening, and `CO-82` proof/debug observability surfaces.
- Preserve parent-only Linear mutation, explicit child-lane acceptance, and current subordinate run discovery behavior.

## Design
- Add one parent-only ordinary-worker parallelisation decision helper on the packaged `linear` CLI surface that records `parallelize_now`, `stay_serial`, or `forbid_parallel` plus a bounded machine-checkable reason code and free-form summary.
- Persist the source of truth through the existing provider-worker audit stream, then hydrate the current decision back into `provider-linear-worker-proof.json` and `provider_debug_snapshot` during proof refresh so live runner writes cannot silently overwrite it.
- Tighten the provider-worker prompt contract so each active turn records a current decision explicitly, and enforce that `parallelize_now` must correspond to at least one launched same-issue child lane before the turn can finish cleanly.
- Expose the hydrated decision, reason, summary, and recorded child-lane count in the debug snapshot so `child_lanes: []` becomes explicit rather than silent on control-host read surfaces.

## Validation
Validation evidence for this lane belongs in `tasks/tasks-linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd.md`,
`.agent/task/linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd.md`, and the Linear workpad.
Required checks remain:
- docs-review evidence for the docs-first packet
- Focused regressions across the decision helper, proof hydration, prompt/runner enforcement, and debug-snapshot projection
- Ordinary-worker replay artifacts for both `parallelize_now` and explicit serial/no-go outcomes
- Standard repo validation and review gates before review handoff
