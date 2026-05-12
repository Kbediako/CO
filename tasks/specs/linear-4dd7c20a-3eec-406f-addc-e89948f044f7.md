---
id: 20260411-linear-4dd7c20a-3eec-406f-addc-e89948f044f7
title: CO: decide admission posture for unreadable foreign provider manifests
status: done
relates_to: docs/PRD-linear-4dd7c20a-3eec-406f-addc-e89948f044f7.md
related_prd: docs/PRD-linear-4dd7c20a-3eec-406f-addc-e89948f044f7.md
related_action_plan: docs/ACTION_PLAN-linear-4dd7c20a-3eec-406f-addc-e89948f044f7.md
risk: high
owners:
  - Codex
last_review: 2026-05-12
review_notes:
  - 2026-05-12: CO-523 live Linear audit verified CO-149 is Done/completed; reclassified this task spec as inactive done metadata for strict spec-guard evidence. Evidence: .runs/linear-8573da42-d9f9-44ce-a24e-224984539044/cli/2026-05-12T18-47-35-293Z-376d8842/provider-linear-issue-context-cache-4dd7c20a-3eec-406f-addc-e89948f044f7.json.
---

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: explicitly decide and implement the unreadable foreign manifest admission posture so live foreign workers remain conservatively counted while stale corrupt history stays non-blocking.
- Scope:
  - docs-first packet and Linear workpad for `CO-149`
  - one bounded unreadable-manifest fallback rooted in existing proof-sidecar evidence
  - focused `providerIssueHandoff.ts` implementation and `ProviderIssueHandoff.test.ts` regressions
  - validation, standalone review, and elegance pass before review handoff
- Constraints:
  - keep `CO-125`'s broader shared-gate work closed
  - do not broaden into generic `CO STATUS` or stale-history cleanup work
  - do not kill live provider workers to regain capacity

## Issue-Shaping Contract
- User-request translation carried forward:
  - this lane is about admission truth for unreadable foreign manifests only, not generic status denominator cleanup
- Protected terms / exact artifact and surface names:
  - `unreadable foreign provider manifests`
  - `shared admission gate`
  - `fail-open vs fail-closed occupancy`
  - `historical-manifest inflation`
  - `discoverProviderIssueRuns(...)`
  - `provider-linear-worker-proof.json`
  - `ProviderIssueHandoff.test.ts`
- Nearby wrong interpretations to reject:
  - reverting `CO-125` to fail on any unreadable manifest
  - treating this as a generic `CO STATUS` denominator issue
  - broadening into queue shepherding, runtime/event-text, or worker supervision work
  - solving the issue by killing live provider workers
- Explicit non-goals carried forward:
  - reopening shared-gate unification
  - stale-history cleanup beyond bounded live-worker evidence
  - generic provider status or review/merge workflow changes

## Parity / Alignment Matrix
- Current truth:
  - `discoverProviderIssueRuns(...)` skips unreadable manifests
  - the shared admission gate counts active claims plus discovered active runs
  - unreadable live foreign workers can disappear from occupancy
  - stale corrupt history currently remains non-blocking because unreadable manifests are skipped
- Reference truth:
  - live foreign occupancy must not disappear because a manifest is unreadable
  - stale corrupt history should remain non-blocking
  - admission truth should stay bounded to provider occupancy
- Target truth / intended delta:
  - unreadable manifests add admission-only occupancy only when bounded host-aware proof evidence proves the worker is still active
  - proof-only unreadable occupancy requires foreign `worker_host`, in-progress owner state, and a bounded heartbeat TTL of `2 * PROVIDER_SEMANTIC_STALL_RECHECK_DELAY_MS` derived from `updated_at` with `attempt_started_at` fallback
  - stale unreadable corrupt history without that evidence continues to be skipped
  - shared admission gating therefore blocks webhook/direct and retry over-admission without reopening broader control-host seams
- Explicitly out-of-scope differences:
  - generic status/denominator cleanup
  - stale manifest cleanup beyond this live-worker decision
  - worker termination or supervision changes

## Readiness Gate
- Not done if:
  - live unreadable foreign workers can still bypass occupancy
  - stale corrupt history wedges admissions again
  - the implementation lacks explicit policy wording for unreadable foreign manifests
  - regression coverage does not distinguish live unreadable occupancy from stale inflation
- Pre-implementation issue-quality review evidence:
  - reviewed the issue against `providerIssueHandoff.ts` before implementation. The confirmed gap is narrow and concrete: unreadable manifests are skipped during discovery, and the shared gate already trusts discovery output. The later docs-review tightened the seam further: the corrective change belongs in admission occupancy accounting, not in general discovered-run reconstruction, because `discoverProviderIssueRuns(...)` also feeds non-admission flows.
- Safeguard ownership split:
  - parent lane owns docs, workpad, implementation, validation, and review handoff
  - child `docs-review` stream is bounded to pre-implementation approval evidence for this task id

## Technical Requirements
- Functional requirements:
  - unreadable foreign manifests must count toward occupancy only when bounded host-aware proof evidence indicates a live worker
  - proof-only unreadable occupancy must expire when the sidecar falls outside the explicit heartbeat TTL so stale in-progress sidecars cannot wedge admissions
  - the shared admission gate must therefore block new starts or resumes when such live unreadable occupancy reaches cap
  - stale unreadable history without live evidence must stay skipped
  - focused tests must prove the behavior through direct/webhook and queued retry paths
- Non-functional requirements (performance, reliability, security):
  - keep the fallback local, deterministic, and inexpensive
  - avoid adding broad new persisted state or cross-host coordination, and do not require a local PID check for foreign worker-host proofs
  - preserve existing provenance in manifests/proofs rather than fabricating broad reconstructed metadata
- Interfaces / contracts:
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`
  - `.runs/**/provider-linear-worker-proof.json`

## Architecture & Data
- Architecture / design adjustments:
  - add a helper that can classify unreadable admission occupancy using adjacent proof-sidecar metadata plus host-aware heartbeat freshness rules
  - keep any synthetic unreadable occupancy inside admission accounting instead of general discovered-run records
  - leave all non-unreadable manifest and shared-gate behavior untouched
- Data model changes / migrations:
  - none expected
- External dependencies / integrations:
  - provider worker proof sidecars
  - worker-host-aware proof freshness bounded by the explicit unreadable-manifest heartbeat TTL
  - existing provider admission occupancy helpers

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review --stream co-149-docs-review --format json`
  - focused `ProviderIssueHandoff` tests for:
    - live unreadable foreign occupancy blocks direct/webhook admission
    - live unreadable foreign occupancy blocks queued retry start or resume
    - stale unreadable corrupt history with missing, terminal, or expired proof heartbeat does not wedge admissions
  - full validation floor after implementation because the expected diff is non-trivial
- Rollout verification:
  - over-admission is prevented for live unreadable foreign workers
  - stale history remains non-blocking
  - the issue stays bounded to provider admission truth
- Monitoring / alerts:
  - rely on focused tests and the existing proof/manifests in run artifacts

## Review Notes
- `linear child-stream --pipeline docs-review --stream co-149-docs-review --format json` first exposed packet-shape issues (`docs:check` line budget plus one bad path reference), then exposed two design corrections before implementation: foreign worker-host occupancy cannot rely on local PID liveness, and unreadable-manifest fallback must stay out of general run discovery because `discoverProviderIssueRuns(...)` also feeds non-admission flows.
- the rerun `docs-review` at `.runs/linear-4dd7c20a-3eec-406f-addc-e89948f044f7-co-149-docs-review/cli/2026-04-11T12-19-25-209Z-1c292aec/manifest.json` added one more P1: proof-only unreadable occupancy needed an explicit freshness anchor so stale in-progress sidecars could not recreate historical-manifest inflation. The packet now fixes that by requiring a bounded heartbeat TTL tied to provider proof refresh cadence.
- the latest rerun at `.runs/linear-4dd7c20a-3eec-406f-addc-e89948f044f7-co-149-docs-review/cli/2026-04-11T12-44-14-281Z-e269d6a8/manifest.json` cleared `docs:check` and `docs:freshness`, but the forced review step remained `in_progress` past the bounded window without writing `review/telemetry.json`; `review/output.log` showed repo-wide artifact drift instead of a concrete verdict. The parent lane therefore recorded a truthful manual docs-review fallback, aligned the action-plan helper command to the active provider-worker invocation, and removed stale local/hostless wording from this spec before implementation.
- the implementation validation floor later surfaced one concrete regression outside the new tests: `npm run test` failed in `ProviderIssueHandoffAdmissionCache.test.ts` because unreadable-manifest occupancy added a second `.runs` discovery pass. The final code fixed that by caching a combined discovery snapshot with both readable runs and unreadable admission occupancy, then reran the focused cache test plus the full repo validation floor clean.
- a manifest-backed standalone review was attempted with `FORCE_CODEX_REVIEW=1 npm run review -- --manifest .runs/linear-4dd7c20a-3eec-406f-addc-e89948f044f7/cli/2026-04-11T11-38-35-453Z-bf352bf9/manifest.json`, but the wrapper again never produced `review/telemetry.json` and drifted without a concrete verdict. The parent lane therefore completed a truthful manual review fallback against the final diff, found no remaining correctness or missing-test gaps, and used the explicit elegance pass to remove the unused unreadable-occupancy `workerHost` field rather than widen the helper surface.

## Open Questions
- Local or hostless unreadable runs remain out of scope for this follow-up unless an active claim already represents them. This lane implements only the foreign-host proof heartbeat rule needed to stop unreadable foreign over-admission without broadening into generic local-worker liveness policy.

## Approvals
- Reviewer: manual docs-review fallback after stalled child stream `2026-04-11T12-44-14-281Z-e269d6a8`
- Date: 2026-04-11
