# PRD - CO Add Audited Provider-Worker Child-Stream Support for Bounded Multi-Agent Work
- Linear issue: `CO-13` / `488135bf-954e-4bd9-be7a-ad09d75f5f29`
- Problem: `provider-linear-worker` cannot launch a sanctioned in-session review/planning child stream, so provider review lanes still rely on the blanket child-stream-unavailable delegation override.
- Outcome: add a bounded provider-worker child-stream path that keeps the main worker authoritative, preserves issue-workspace confinement, and records truthful lineage in manifests/proofs.
- Acceptance: allowlisted review/planning child stream launches work, lineage is auditable, the single-stream path still works, and nested child manifests do not look like scheduler-owned provider runs.
- Constraints: keep the Symphony-derived bounded-concurrency/workspace/same-thread invariants and do not weaken `delegation-guard`.
