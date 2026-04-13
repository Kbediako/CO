---
id: 20260411-linear-4dd7c20a-3eec-406f-addc-e89948f044f7
title: CO: decide admission posture for unreadable foreign provider manifests
relates_to: docs/PRD-linear-4dd7c20a-3eec-406f-addc-e89948f044f7.md
risk: high
owners:
  - Codex
last_review: 2026-04-11
---
## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-4dd7c20a-3eec-406f-addc-e89948f044f7.md`
- PRD: `docs/PRD-linear-4dd7c20a-3eec-406f-addc-e89948f044f7.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-4dd7c20a-3eec-406f-addc-e89948f044f7.md`
- Task checklist: `tasks/tasks-linear-4dd7c20a-3eec-406f-addc-e89948f044f7.md`

## Traceability
- Linear issue: `CO-149` / `4dd7c20a-3eec-406f-addc-e89948f044f7`
- Linear URL: https://linear.app/asabeko/issue/CO-149/co-decide-admission-posture-for-unreadable-foreign-provider-manifests
- Related source issue: `CO-125` / `e122d053-40f2-4246-9648-81c9001715f1`

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: adopt a bounded fail-closed occupancy posture for unreadable foreign provider manifests only when host-aware proof evidence shows the foreign worker is still live, while preserving the existing skip behavior for stale corrupt history.
- Scope:
  - register the docs-first packet and workpad for `CO-149`
  - document the unreadable foreign manifest policy as an explicit follow-up to `CO-125`
  - add an admission-only proof-backed occupancy fallback for unreadable manifests
  - add focused regression coverage for both live unreadable occupancy and stale-history anti-wedge behavior
- Constraints:
  - do not reopen shared admission-gate unification from `CO-125`
  - do not broaden into generic status-truth or stale-history cleanup work
  - do not introduce host-wide fail-closed behavior for every unreadable manifest

## Technical Requirements
- Functional requirements:
  - unreadable foreign manifests must contribute to provider occupancy only when bounded host-aware proof evidence shows the underlying worker is still active
  - the shared admission gate must therefore block new admissions when an unreadable foreign worker is live, even if no local claim exists
  - unreadable stale corrupt historical manifests without live-worker evidence must continue to be skipped
  - regression coverage must prove webhook/direct, queued retry start, and queued retry resume all inherit the safer occupancy posture through the existing shared gate
- Non-functional requirements (performance, reliability, security):
  - the fallback must stay repo-local and deterministic
  - liveness detection must be host-aware: foreign worker-host proofs cannot depend on a local PID check, and this follow-up intentionally leaves local or hostless unreadable-manifest tightening out of scope
  - the change must preserve `CO-125`'s anti-wedge behavior for unrelated corrupt history
- Interfaces / contracts:
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`
  - `provider-linear-worker-proof.json`
  - shared provider admission gate occupancy seeded from discovered runs plus active claims

## Architecture & Data
- Architecture / design adjustments:
  - keep the shared admission gate as the only policy seam and add a separate unreadable-manifest occupancy supplement instead of changing general discovered-run truth
  - when `manifest.json` is unreadable, inspect the adjacent provider-worker proof sidecar for issue identity, worker host, active owner state, and proof freshness
  - count unreadable occupancy only for admission calculations when the proof sidecar shows a non-empty foreign `worker_host`, `owner_status: in_progress`, a non-terminal `owner_phase`, and a bounded heartbeat TTL based on `proof.updated_at` with `attempt_started_at` fallback
  - define that TTL as `2 * PROVIDER_SEMANTIC_STALL_RECHECK_DELAY_MS`, so one missed heartbeat still counts as live occupancy but stale proof-only history ages out instead of wedging the host
  - do not synthesize a general discovered `in_progress` run record that non-admission call sites could treat as attachable active ownership
- Data model changes / migrations:
  - no persisted schema migration is required
  - a local helper may need to read proof metadata plus worker-host-aware heartbeat freshness rules to classify unreadable admission occupancy
- External dependencies / integrations:
  - `.runs/**/manifest.json`
  - `.runs/**/provider-linear-worker-proof.json`
  - provider intake claims and existing max-concurrency helpers

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review`
  - focused `ProviderIssueHandoff` regressions for:
    - live unreadable foreign worker blocks direct/webhook admission
    - live unreadable foreign worker blocks queued retry resume or start admission
    - stale unreadable corrupt history with missing, terminal, or expired proof heartbeat does not wedge admissions
  - full repo validation floor after implementation if the final diff is non-trivial
- Rollout verification:
  - live unreadable foreign workers are conservatively counted
  - stale corrupt history remains non-blocking
  - the issue remains bounded to provider admission truth, not generic status work
- Monitoring / alerts:
  - rely on focused tests plus manifest/proof evidence in run artifacts

## Open Questions
- Local or hostless unreadable runs remain out of scope for this follow-up unless an active claim already represents them. This lane implements only the foreign-host proof heartbeat rule needed to stop unreadable foreign over-admission without broadening into generic local-worker liveness policy.

## Approvals
- Reviewer: manual docs-review fallback after stalled child stream
- Date: 2026-04-11
