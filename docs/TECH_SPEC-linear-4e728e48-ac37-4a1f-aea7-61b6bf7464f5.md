---
id: 20260418-linear-4e728e48-ac37-4a1f-aea7-61b6bf7464f5
title: CO-224 appserver child lanes stall after runtime selection and leave the parent blocked on a synthetic launching reservation
relates_to: docs/PRD-linear-4e728e48-ac37-4a1f-aea7-61b6bf7464f5.md
risk: high
owners:
  - Codex
last_review: 2026-04-18
---

# TECH_SPEC - CO-224 appserver child lanes stall after runtime selection and leave the parent blocked on a synthetic launching reservation

## Canonical Reference
- Canonical implementation spec: `tasks/specs/linear-4e728e48-ac37-4a1f-aea7-61b6bf7464f5.md`
- PRD: `docs/PRD-linear-4e728e48-ac37-4a1f-aea7-61b6bf7464f5.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-4e728e48-ac37-4a1f-aea7-61b6bf7464f5.md`
- Task checklist: `tasks/tasks-linear-4e728e48-ac37-4a1f-aea7-61b6bf7464f5.md`

## Summary
`CO-224` stays narrowly focused on the pre-startup seam where a provider child lane resolves `runtime_mode=appserver`, emits runtime-selection truth, and then never produces real startup evidence, proof, or patch artifacts. The fix is a bounded appserver startup watchdog plus better parent-visible failure truth; it does not reopen `CO-210`, `CO-211`, or `CO-218`.

## Scope
- Detect the post-runtime-selection / pre-startup gap for provider child lanes running under `appserver`.
- Fail fast when no matching startup session-log evidence appears within a bounded window.
- Abort the stuck child command so the parent does not wait indefinitely behind a synthetic launching reservation.
- Surface the failed child proof detail back through the parent shell so recovery and CLI relaunch remain deterministic.
- Preserve the current invalidate-plus-CLI workaround until appserver startup is reliable.

## Protected Surfaces
- `provider-linear-child-lane`
- `Child lane reserved before child run startup.`
- synthetic launching reservation
- runtime selection
- `appserver`
- `provider-linear-child-lane-proof.json`
- `provider-linear-worker-child-lanes.json`
- `providerLinearChildLaneRunner`
- `providerLinearChildLaneShell`
- `CO-210`
- `CO-211`
- `CO-218`

## Validation Plan
- Focused provider-child-lane regression coverage for:
  - timeout when appserver startup evidence never materializes
  - success when matching startup session-log evidence appears
  - parent failure detail propagation when the child run times out pre-startup
- Required repo gates, including `docs:check`, `docs:freshness`, `repo:stewardship`, diff budget, and `pack:smoke`.
- Manifest-backed standalone review plus an explicit elegance/minimality pass before review handoff.

## Approvals
- Pre-implementation issue-quality review is recorded in the canonical task spec.
- The docs packet started in a bounded docs child lane; the parent lane owns the runtime implementation, validation, and handoff.
