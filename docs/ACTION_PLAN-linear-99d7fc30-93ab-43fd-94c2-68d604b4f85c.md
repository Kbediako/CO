# ACTION_PLAN - CO: Add memory provenance and outcome schema to manifests, events, and metrics

## Added by Bootstrap 2026-04-09

## Summary
- Goal: land a bounded memory observability contract across manifest, run-summary event, and metrics surfaces without widening into general observability work.
- Scope: docs packet and registry setup, additive manifest memory schema, summary-event and metrics projection, focused regressions, and normal validation/review gates.
- Assumptions:
  - `memory.source_0` and `resume_events` are the authoritative raw seams for this slice
  - source-0 inheritance can truthfully distinguish inherited hits, rejected candidates, and rediscovery rebuilds
  - manual repair can be represented narrowly only from explicitly marked manual-resume records until a dedicated memory-repair hook exists

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - keep the work memory-specific, additive, traceable, and artifact-backed
  - preserve literal `memory provenance`, `outcome schema`, `selected, rejected, rediscovered, and manually repaired memory decisions`, and `source artifacts`
  - reject widening into `CO-82`, `CO-83`, `CO-89`, `CO-90`, transcript dumps, or the `0303` umbrella
- Not done if:
  - manifests/events/metrics still cannot expose selected-memory provenance and the requested counters
  - provenance depends on transcript inspection instead of source artifacts
  - the lane broadens into general provider-worker observability
- Pre-implementation issue-quality review:
  - current repo truth is narrower than the issue wording suggests: `memory.source_0` already exists, source-0 inheritance already exposes a hit/miss seam, and `resume_events` already capture bounded manual resume truth; the missing work is the additive cross-artifact schema and projection, not a new telemetry family

## Milestones & Sequencing
1. Draft/register the CO-96 docs packet, checklist mirror, workpad source, and registry updates; then run an audited `docs-review` child stream and fold back any packet-only fixes.
2. Implement the additive memory observability contract in the manifest/source-0 seam and mirror it into `run:summary` and `metrics.json`.
3. Add focused tests for emission and absence behavior, then run the required validation, standalone review, and elegance pass before handoff.

## Dependencies
- `memory.source_0` descriptor and payload lineage in `orchestrator/src/cli/run/source0.ts`
- `resume_events` contract in `packages/shared/manifest/types.ts` / `orchestrator/src/cli/run/manifest.ts`
- run-summary event contract in `packages/shared/events/types.ts` and `orchestrator/src/cli/exec/summary.ts`
- metrics recorder output in `orchestrator/src/cli/metrics/metricsRecorder.ts`

## Validation
- Checks / tests:
  - audited `linear child-stream --pipeline docs-review`
  - focused manifest/source-0, summary-event, and metrics tests
  - full required validation chain from delegation guard through pack smoke
  - standalone review followed by explicit elegance review
- Rollback plan:
  - keep the fields additive and removable without changing existing `memory.source_0` semantics
  - if one requested counter cannot be emitted truthfully, leave the additive field present but documented as `0` or `null`, or file a follow-up instead of widening scope

## Risks & Mitigations
- Risk: contradiction or manual-repair semantics are guessed instead of derived.
  - Mitigation: restrict contradiction to explicit descriptor/payload provenance mismatches and manual repair to explicitly marked manual resume artifacts already persisted on the manifest.
- Risk: event/metrics projection duplicates general provider-worker observability.
  - Mitigation: keep the new contract under memory-specific names and source-artifact lineage fields only.
- Risk: registry or docs-review drift blocks implementation.
  - Mitigation: update packet mirrors first and use the audited docs-review child stream before code changes.

## Approvals
- Reviewer: Pending `codex-orchestrator docs-review`
- Date: 2026-04-09
