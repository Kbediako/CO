---
id: 20260422-linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9
title: Child lane launcher fail closed on appserver scope drift and stuck launching ledgers
relates_to: docs/PRD-linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md
risk: high
owners:
  - Codex
last_review: 2026-04-22
---

# TECH_SPEC - Child-lane launcher must fail closed on appserver scope drift and stuck launching ledgers

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md`
- PRD: `docs/PRD-linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md`
- Task checklist: `tasks/tasks-linear-7ceb95a8-218d-4353-82eb-a06a7f8aece9.md`

## Summary
`CO-303` is the launcher and ledger fail-closed follow-up created from the `CO-295` same-issue child-lane failures. The bounded fix is not a `CO-295` product-behavior change. It is a launcher/runtime/ledger contract repair so child lanes either stay within their bounded docs/tests/advisory scope and return a usable parent-owned patch or artifact, or they fail closed with terminal evidence and recovery guidance.

## Scope
- converge child-lane launcher and ledger state to terminal success, failure, or invalidation
- prevent child lanes from treating direct commit or push to the parent PR branch as a valid completion path
- fail closed when a bounded child drifts into parent-owned Linear/GitHub/PR lifecycle work
- make runtime selection and unsupported override behavior explicit for appserver child lanes
- keep operator recovery bounded and evidence-backed through manifest/session output

## Protected Surfaces
- `linear child-lane`
- `provider-linear-child-lane`
- `review-docs-nitpicks`
- `review-tests-validation`
- `status=launching`
- `provider_worker_child_lane_not_ready`
- `appserver runtime`
- `patch artifact`
- `parent PR branch`
- `parent-owned PR monitoring`
- `bounded advisory lane`
- `CO-295`
- `PR #597`

## Current Truth
- `review-docs-nitpicks` produced commit `6a717726d`, pushed the parent PR branch directly, continued into parent-owned PR monitoring, and stayed stuck at `status=launching` / `provider_worker_child_lane_not_ready` until parent invalidation.
- `review-tests-validation` recorded `runtime requested=appserver selected=appserver` despite an attempted CLI-runtime override, then drifted into broad Linear/GitHub discovery instead of focused validation.
- Parent workpad evidence narrows the live seams to launcher/runtime fail-closed behavior and parent-visible ledger repair for recoverable `status=launching` rows tied to real child manifests.

## Target Design
- Launcher outcome must reflect the real child-run lifecycle and parent-owned acceptance path.
- Direct child integration into the parent PR branch is an invalid completion path, not a success variant.
- Bounded-scope drift into parent-owned Linear/GitHub/PR lifecycle work becomes explicit fail-closed evidence before parent-owned surfaces are mutated further.
- Runtime posture remains explicit: unsupported override attempts either fail clearly or record why `appserver` remains mandatory.
- Operator-visible output names the decisive manifest/session evidence and recommended recovery action.

## Validation Plan
- Focused launcher/ledger regression coverage for:
  - the `review-docs-nitpicks` stuck-launching/direct-push shape
  - the `review-tests-validation` appserver drift shape
  - terminal convergence when an appserver child run starts, finishes, stalls, or is killed
- Parent docs-review before implementation.
- Parent-required validation floor before handoff.

## Approvals
- Pre-implementation issue-quality review is recorded in the canonical task spec.
- This bounded child lane owns docs only; the parent lane owns registry updates, implementation, validation, and handoff.
