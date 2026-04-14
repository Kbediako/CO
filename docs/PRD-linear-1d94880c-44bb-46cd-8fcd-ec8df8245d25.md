# PRD - CO: add provider/control-host throughput and freshness gauge

## Traceability
- Linear issue: `CO-177` / `1d94880c-44bb-46cd-8fcd-ec8df8245d25`
- Linear URL: https://linear.app/asabeko/issue/CO-177/co-add-providercontrol-host-throughput-and-freshness-gauge
- Source issue: `CO-176` / `afb6ebc9-1341-4dbd-a522-6531a15aab90`
- MCP task id: `linear-1d94880c-44bb-46cd-8fcd-ec8df8245d25`

## Summary
- Current CO operational health is split across CO STATUS, provider polling health, provider issue observability, Linear budget state, run metrics, provider manifests, and worker proof/audit artifacts.
- Operators need one read-only, replayable gauge that consumes existing local artifacts and classifies provider/control-host throughput and freshness as `healthy`, `degraded`, `stale`, `contradictory`, or `unknown`.
- The gauge must not increase Linear/GitHub polling or redesign provider scheduling. It should turn existing artifacts into machine-readable evidence that agents, CO STATUS diagnostics, CI artifacts, and future eval dashboards can cite.

## User Request Translation (Context Anchor)
- Intent: add a machine-readable provider/control-host throughput and freshness gauge for CO operational health.
- Success: a command replays local/sanitized artifacts such as `provider-intake-state.json`, provider manifests/proofs, worker audit JSONL, control endpoint metadata, provider polling health, provider issue observability, Linear shared-budget state, retry/backoff state, and status snapshots; it emits the required age/latency/pressure fields and fails when stale or contradictory evidence would otherwise render healthy.
- Constraints: no higher-frequency live polling, no CO-176 provider-adoption eval duplication, no CO-156 request-headroom gating duplication, no provider scheduler redesign, and no raw private transcript fixtures.

## Intent Checksum
- Preserve: "provider/control-host throughput and freshness gauge", "CO STATUS", `provider-intake-state.json`, provider manifests, `provider-linear-worker-proof.json`, worker audit JSONL, control endpoint metadata, provider polling health, provider issue observability, Linear shared-budget state, claim queue age, refresh age, heartbeat age, terminal reconciliation lag, and child-lane cap pressure.
- Protected surfaces: read-only gauge/eval command, replayed local artifacts, JSON output fields, stale-source verdict, degraded fixtures, operator interpretation docs, artifact citation paths.
- Reject: treating existing focused tests or CO STATUS rendering checks as sufficient; redesigning provider scheduling; increasing polling; duplicating CO-156 Linear request-headroom gates; duplicating CO-176 provider-adoption evals.

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth |
| --- | --- | --- | --- |
| Operational health | Evidence is fragmented across status, provider polling, issue observability, budget state, manifests, proofs, audit logs, and run metrics. | Operators need one replayable freshness/throughput check. | A single read-only gauge consumes existing artifacts and emits a machine-readable verdict with source paths. |
| Freshness fields | Focused tests cover individual slices such as polling cooldown, projections, burn history, and rate-limit evidence. | The issue requires queue age, refresh age, heartbeat age, terminal lag, retry age, and child-lane pressure in one output. | Gauge JSON includes all requested fields with null/unknown handling and source references. |
| Failure modes | Stale intake, stale heartbeat, stale proof, terminal-proof/active-claim contradictions, low headroom, and stale retry queue can be reasoned about manually. | These cases must not render healthy. | Degraded fixtures prove each case classifies correctly and exits non-zero when requested. |
| API volume | Existing local artifacts already record the needed evidence. | No additional live polling. | Gauge reads filesystem artifacts only; live API clients stay out of scope. |
| Operator handoff | Agents cite different files ad hoc. | Operators need citation paths for failures. | Docs describe interpretation and the artifact paths to cite for each freshness/throughput failure. |

## Not Done If
- The gauge only checks static code paths and does not consume provider/control-host artifacts.
- The output cannot distinguish healthy, stale, contradictory, degraded, and unknown states.
- Stale provider intake, stale worker heartbeat, active manifest with stale proof, terminal proof with active claim, low Linear headroom, or stale retry queue can still render as healthy.
- The implementation requires additional high-frequency live API polling.
- The gauge cannot be consumed by agents, CO STATUS diagnostics, CI artifacts, or future eval dashboards.

## Goals
- Add a read-only gauge/eval command that replays existing local artifacts and emits machine-readable throughput/freshness JSON.
- Lock stale and contradictory cases with sanitized fixtures and focused regression tests.
- Document operator interpretation and concrete artifact citation paths.

## Non-Goals
- Do not increase Linear/GitHub polling or add live polling loops.
- Do not duplicate CO-176 provider-adoption evals or CO-156 request-headroom gate logic.
- Do not redesign provider scheduling, child-lane policy, or merge closeout logic unless the gauge exposes a concrete defect.
- Do not store raw private transcripts in fixtures.

## Stakeholders
- CO operators, provider-worker maintainers, control-host maintainers, review agents, and future eval/dashboard consumers.

## Metrics & Guardrails
- Success: the gauge classifies healthy, degraded, stale, contradictory, and unknown evidence deterministically; fixture tests fail if stale/contradictory evidence renders healthy; output carries source paths for audit.
- Guardrails: filesystem replay only, sanitized fixtures only, no new API request volume, no scheduler policy mutation, and no raw transcript storage.

## User Experience
- Personas: operator checking whether CO status is trustworthy; provider worker deciding whether to continue; reviewer validating stale-source failures; dashboard/eval consumer reading JSON.
- Journey: run the gauge against `.runs/...` artifacts or fixture roots, inspect verdict and per-field evidence, cite the listed source paths when reporting stale or contradictory provider/control-host health.

## Technical Considerations
- Architecture: add a small parser/evaluator around existing artifacts and expose it through the existing CLI/test style. Keep output stable, deterministic, and JSON-first.
- Dependencies: `provider-intake-state.json`, provider manifests/proofs, worker audit JSONL, provider issue observability, provider polling health, Linear budget state, control endpoint metadata, and status snapshots when present.

## Open Questions
- None blocking. Unknown/missing optional artifact classes should produce explicit `unknown` components rather than force healthy or fail closed by default; stale/contradictory evidence should dominate the overall verdict.

## Approvals
- Product: self-approved from Linear issue `CO-177`.
- Engineering: docs-review child stream `linear-1d94880c-44bb-46cd-8fcd-ec8df8245d25-co-177-docs-review-r2` passed on 2026-04-14 with review telemetry `status=succeeded`, `review_outcome=clean-success`; evidence `.runs/linear-1d94880c-44bb-46cd-8fcd-ec8df8245d25-co-177-docs-review-r2/cli/2026-04-14T05-20-05-166Z-23f9d876/manifest.json`.
