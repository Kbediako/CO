---
id: 20260418-linear-104aa410-5c94-457c-bbce-9962c7308ac5
title: Record provider control-host provenance on provider-worker manifests for same-issue child lanes
relates_to: docs/PRD-linear-104aa410-5c94-457c-bbce-9962c7308ac5.md
risk: high
owners:
  - Codex
last_review: 2026-04-18
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-104aa410-5c94-457c-bbce-9962c7308ac5.md`
- PRD: `docs/PRD-linear-104aa410-5c94-457c-bbce-9962c7308ac5.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-104aa410-5c94-457c-bbce-9962c7308ac5.md`
- Task checklist: `tasks/tasks-linear-104aa410-5c94-457c-bbce-9962c7308ac5.md`

## Traceability
- Linear issue: `CO-244` / `104aa410-5c94-457c-bbce-9962c7308ac5`
- Source anchor: `ctx:sha256:7b36f0086f31a972affc4bd5f989199d7d1bfa3ba460ad8de937b4e7d71916c2#chunk:c000001`
- Shared source payload: `../../.runs/linear-104aa410-5c94-457c-bbce-9962c7308ac5/cli/2026-04-18T06-39-49-873Z-49b0c9a0/memory/source-0/source.txt`
- Parent worker manifest: `.runs/linear-104aa410-5c94-457c-bbce-9962c7308ac5/cli/2026-04-18T06-39-49-873Z-49b0c9a0/manifest.json`
- Historical child-lane evidence: `.runs/linear-104aa410-5c94-457c-bbce-9962c7308ac5-docs-packet/cli/2026-04-18T06-47-21-165Z-f43e496c/manifest.json` (successful lane, rejected patch)

## Summary
- Objective: keep `CO-244` narrowly on provider-worker manifest provenance persistence for control-host launches.
- Scope:
  - add `provider_launch_source` to manifest schema/types
  - persist/backfill the full control-host provenance tuple on provider-worker manifests
  - require the full tuple for valid child-lane / child-stream provenance
  - cover happy-path and fail-closed mismatch regressions
- Constraints:
  - keep provenance validation strict
  - do not widen into unrelated provider-worker UX or doctor-test cleanup
  - keep the implementation bounded to manifest creation/load and the consumers that depend on it

## Issue-Shaping Contract
- User-request translation carried forward: the problem is missing manifest provenance, not over-strict validation. The fix is to make provider-worker manifests accurately record control-host provenance so child helpers can keep trusting the manifest and still fail closed on real mismatch.
- Protected terms / exact artifact and surface names:
  - `provider_worker_child_lane_provenance_invalid`
  - `provider_launch_source`
  - `provider_control_host_task_id`
  - `provider_control_host_run_id`
  - `linear child-lane`
  - `linear child-stream`
  - `orchestrator/src/cli/run/manifest.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `schemas/manifest.json`
  - `packages/shared/manifest/types.ts`
- Nearby wrong interpretations to reject:
  - disable provenance validation
  - use override text instead of manifest evidence
  - accept task/run-only matches without launch-source parity
  - broaden into stale doctor timeout cleanup
- Explicit non-goals carried forward:
  - no provider admission redesign
  - no blanket delegation-guard override text
  - no unrelated test cleanup
  - no broad control-host workflow redesign

## Parity / Alignment Matrix
- Not applicable.
- Current truth:
  - provider-worker manifests can omit `provider_launch_source`
  - child-lane and child-stream shells require recorded provenance and fail closed when it is missing
- Reference truth:
  - a control-host-launched provider worker should record the full provenance tuple on its manifest
  - same-run backfill should repair only missing, non-conflicting tuple values
- Target truth / intended delta:
  - the full tuple is recorded and retained
  - child helpers succeed when env and manifest provenance match
  - fail-closed mismatch behavior remains intact
- Explicitly out-of-scope differences:
  - lifecycle redesign
  - generic child helper UX work
  - doctor-timeout cleanup

## Readiness Gate
- Not done if:
  - `provider_launch_source` remains `null` on the parent manifest after a matching control-host-launched load path
  - same-issue child-lane or child-stream still fails with provenance-invalid output despite matching env/manifest truth
  - mismatch behavior stops failing closed
- Pre-implementation issue-quality review evidence:
  - 2026-04-18: the initial docs child-lane patch drifted beyond `CO-244` and was rejected; the parent-authored packet restores the exact issue contract around `provider_launch_source` and same-issue child helper success.
- Safeguard ownership split:
  - child-lane success remains audit evidence only
  - parent lane owns the accepted docs packet, implementation, validation, and handoff

## Technical Requirements
- Functional requirements:
  1. Manifest schema/types include `provider_launch_source`.
  2. Manifest bootstrap writes `provider_launch_source`, `provider_control_host_task_id`, and `provider_control_host_run_id` for control-host launches.
  3. Provider-worker context load backfills missing tuple values only when the live env matches and the manifest has no conflicting non-null provenance.
  4. Provider-worker context treats provenance as recorded/valid only when `provider_launch_source=control-host` and task/run match the live env.
  5. Child-lane and child-stream shells keep failing closed when the tuple is missing or mismatched.
- Non-functional requirements:
  - additive manifest persistence only
  - no hidden env-only steady-state fallback
  - exact launch-source matching for control-host provenance
- Interfaces / contracts:
  - `schemas/manifest.json`
  - `packages/shared/manifest/types.ts`
  - `orchestrator/src/cli/run/manifest.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/providerLinearChildLaneShell.ts`
  - `orchestrator/src/cli/providerLinearChildStreamShell.ts`

## Architecture & Data
- Architecture / design adjustments:
  - extend the manifest tuple to include launch source
  - keep backfill conflict-aware and same-run only
  - make provider-worker context own the authoritative manifest repair/write-through step
- Data model changes / migrations:
  - optional `provider_launch_source` field on manifests
  - reuse existing task/run fields
  - no offline migration beyond runtime backfill
- External dependencies / integrations:
  - `orchestrator/tests/Manifest.test.ts`
  - `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
  - `orchestrator/tests/ProviderLinearChildLaneShell.test.ts`
  - `orchestrator/tests/ProviderLinearChildStreamShell.test.ts`

## Validation Plan
- Tests / checks:
  - `npm run generate:manifest-types`
  - `npx vitest run orchestrator/tests/Manifest.test.ts orchestrator/tests/ProviderLinearWorkerRunner.test.ts orchestrator/tests/ProviderLinearChildLaneShell.test.ts orchestrator/tests/ProviderLinearChildStreamShell.test.ts`
  - `npm run build`
  - live same-issue `linear child-stream --pipeline docs-review|implementation-gate|docs-relevance-advisory`
  - `node scripts/spec-guard.mjs --dry-run`
- Rollout verification:
  - inspect the parent provider-worker manifest for non-null tuple values
  - keep the successful child-lane manifest as same-turn happy-path evidence
  - keep the child-stream manifest as live success evidence under matching provenance
- Monitoring / alerts:
  - existing helper error codes and manifest snapshots are sufficient

## Open Questions
- Does the live persistence gap remain on the shared-root parent manifest after the current implementation slice, or only on stale pre-fix manifests that have not traversed a repaired load path yet?

## Approvals
- Reviewer: parent provider worker
- Date: 2026-04-18
