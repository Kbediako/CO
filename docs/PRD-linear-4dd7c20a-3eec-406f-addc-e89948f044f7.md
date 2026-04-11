# PRD - CO: decide admission posture for unreadable foreign provider manifests
## Added by Bootstrap 2026-04-11

## Traceability
- Linear issue: `CO-149` / `4dd7c20a-3eec-406f-addc-e89948f044f7`
- Linear URL: https://linear.app/asabeko/issue/CO-149/co-decide-admission-posture-for-unreadable-foreign-provider-manifests
- Related source issue: `CO-125` / `e122d053-40f2-4246-9648-81c9001715f1`

## Summary
- Problem Statement: `CO-125` intentionally changed provider run discovery to warn and skip unreadable manifests so one corrupt historical manifest does not wedge all provider admissions. That bounded fix leaves one admission-truth gap behind: if a foreign or otherwise unclaimed live provider worker has an unreadable `manifest.json`, the shared admission gate can undercount host occupancy because the run is absent from active local claims and also cannot be reconstructed from manifest discovery.
- Desired Outcome: CO should adopt and implement an explicit policy for unreadable foreign provider manifests that conservatively protects admission truth for live foreign workers without reintroducing the host-wide wedge behavior that `CO-125` removed for stale corrupt history.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): decide the provider admission posture for unreadable foreign manifests as a bounded follow-up to `CO-125`, then implement the smallest admission-truth fix that prevents over-admission when a live foreign worker cannot be parsed while still ignoring unrelated stale corrupt historical manifests.
- Success criteria / acceptance:
  - the policy for unreadable foreign provider manifests is explicit, documented, and linked from the task packet
  - shared admission gating conservatively counts unreadable live foreign occupancy or uses an equivalent safe mechanism
  - regression coverage proves unreadable live foreign workers cannot let webhook, retry, or resume over-admit beyond cap
  - unrelated stale corrupt historical manifests still do not wedge new admissions host-wide
  - the lane remains clearly related to `CO-125` without broadening into generic status-truth work
- Constraints / non-goals:
  - do not reopen webhook/direct/retry/resume unification from `CO-125`
  - do not broaden into generic `CO STATUS` denominator or freshness work
  - do not treat this as stale historical manifest cleanup or worker supervision
  - do not kill or cancel live provider workers to restore capacity

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `unreadable foreign provider manifests`
  - `shared admission gate`
  - `fail-open vs fail-closed occupancy`
  - `historical-manifest inflation`
  - `live unreadable foreign worker`
- Protected terms / exact artifact and surface names:
  - `discoverProviderIssueRuns(...)`
  - `provider-linear-worker-proof.json`
  - `ProviderIssueHandoff.test.ts`
  - `providerIssueHandoff.ts`
  - `launchStartForTrackedIssue(...)`
  - `launchResumeForRun(...)`
  - `CO-125`
- Nearby wrong interpretations to reject:
  - reverting `CO-125` so any unreadable manifest wedges admissions again
  - solving this only by generic `CO STATUS` denominator cleanup
  - broadening into queue shepherding, runtime/event-text, or worker-supervision work
  - ignoring unreadable foreign workers because they are not locally claimed

## Parity / Alignment Matrix
- Current truth:
  - `discoverProviderIssueRuns(...)` currently logs and skips unreadable manifests
  - the shared admission gate seeds occupancy from active claims plus discovered `in_progress` runs
  - a live foreign provider worker with an unreadable manifest and no local claim can disappear from occupancy
  - stale corrupt historical manifests do not currently wedge all new admissions because discovery skips them
- Reference truth:
  - live foreign occupancy should not disappear just because the worker manifest is unreadable
  - stale corrupt history should not block the whole host
  - admission truth should stay bounded to provider admission, not generic status aggregation
- Target truth / intended delta:
  - unreadable foreign manifests count only when bounded host-aware proof evidence proves the worker is still active
  - proof-only unreadable occupancy requires an in-progress foreign `worker_host` plus a bounded heartbeat TTL derived from provider proof refresh cadence, so stale sidecars do not recreate historical inflation
  - stale corrupt historical manifests without live-worker evidence continue to be skipped
  - webhook/direct, queued retry start, and queued retry resume all inherit the safer occupancy posture through the existing shared admission gate
- Explicitly out-of-scope differences:
  - stale-history cleanup outside bounded live-worker evidence
  - generic provider status dashboard or denominator changes
  - killing live workers to force capacity recovery

## Not Done If
- The lane claims success without an explicit policy for unreadable foreign manifests.
- A live unreadable foreign worker can still disappear from occupancy and allow over-admission.
- Unrelated stale corrupt historical manifests wedge all new admissions again.
- Coverage does not distinguish live unreadable occupancy from stale historical inflation.

## Goals
- Document the admission posture for unreadable foreign provider manifests.
- Implement the smallest live-evidence fallback that preserves conservative occupancy for unreadable foreign workers.
- Preserve the `CO-125` anti-wedge behavior for stale corrupt history.
- Add focused regression coverage for both the live-worker and stale-history cases.

## Non-Goals
- Reopening the broader shared-gate work from `CO-125`.
- Generic `CO STATUS` or runtime/status freshness work.
- Stale-history cleanup beyond bounded live-worker evidence.
- Killing or canceling live provider workers.

## Stakeholders
- Product: CO operators depending on truthful provider admission under concurrency caps.
- Engineering: maintainers of provider admission, manifest/proof discovery, and provider-worker runtime truth.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - unreadable live foreign workers are counted conservatively enough to block over-admission
  - stale corrupt manifests without live-worker evidence do not wedge admissions
  - focused tests isolate live unreadable occupancy from stale-history inflation
- Guardrails / Error Budgets:
  - keep the change bounded to provider admission truth and direct tests
  - require concrete live-worker evidence before counting an unreadable manifest toward occupancy
  - preserve existing manifest/proof provenance instead of inventing broad new state

## User Experience
- Personas:
  - operator relying on provider max-concurrency to avoid over-admission
  - maintainer debugging provider host occupancy with corrupt historical artifacts present
  - reviewer auditing whether live unreadable workers remain safely counted
- User Journeys:
  - a live foreign provider worker has an unreadable `manifest.json`, but its sidecar proof still shows fresh in-progress owner state on a worker host, so new admissions are conservatively blocked
  - a stale corrupt historical manifest exists with no live-worker evidence, and new admissions continue normally
  - queued retry or direct admission reuses the same shared gate and does not bypass the live unreadable occupancy posture

## Technical Considerations
- Architectural Notes:
  - the smallest correct seam is admission occupancy accounting, not general run discovery, because `discoverProviderIssueRuns(...)` is reused by non-admission flows such as rehydration and claim attachment
  - the unreadable-manifest fallback should stay tightly bounded to foreign/live occupancy evidence rather than broad manifest reconstruction
  - an adjacent proof sidecar already exists and can provide issue identity, worker-host identity, and owner-state hints without reopening the wider manifest contract
- Dependencies / Integrations:
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/control/providerLinearWorkerTruth.ts`
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`

## Open Questions
- Whether local or hostless unreadable runs should require extra local liveness checks in addition to fresh proof state, while foreign worker-host runs rely on worker-host-aware proof freshness instead of local PID checks. The implementation should pick the smallest conservative rule that blocks live over-admission without turning stale history into occupancy inflation.

## Approvals
- Product: self-approved from the Linear issue scope and acceptance criteria.
- Engineering: pending docs-review child stream and implementation validation.
- Design: N/A.
