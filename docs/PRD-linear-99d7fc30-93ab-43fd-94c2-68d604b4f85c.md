# PRD - CO: Add memory provenance and outcome schema to manifests, events, and metrics

## Added by Bootstrap 2026-04-09

## Traceability
- Linear issue: `CO-96` / `99d7fc30-93ab-43fd-94c2-68d604b4f85c`
- Linear URL: https://linear.app/asabeko/issue/CO-96/add-memory-provenance-and-outcome-schema-to-manifests-events-and
- Source issue: `CO-82` / `736c3631-341a-4250-875f-e8808ef2a31b`
- Related sibling memory contract: `CO-91` / `5f850884-855f-41ed-b593-6c2dee5815d2`

## Summary
- Problem Statement: the repo now has a bounded `memory.source_0` run contract, but run artifacts still do not expose a truthful memory-specific provenance and outcome schema. The manifest can point at `source_0`, yet neither the shared manifest contract nor `run:summary` or `metrics.json` can currently answer which memory candidate was selected, which candidates were rejected, when memory had to be rediscovered, whether a contradiction was detected in the artifact lineage, or whether later manual resume/repair activity occurred. That leaves fixed-model memory evaluation prose-heavy and forces downstream inspection to infer state from nearby artifacts instead of reading one additive contract.
- Desired Outcome: add a bounded, additive memory observability contract to manifests, events, and metrics so selected, rejected, rediscovered, and manually repaired memory decisions are inspectable from source-artifact-backed fields rather than transcript dumps, while staying explicitly separate from general provider-worker observability, `CO STATUS`, resident continuity, distributed worker-host parity, or the `0303` umbrella.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): land the sibling autonomy-stream slice that makes fixed-model memory provenance and outcome signals truthful and inspectable across the shared run artifacts. The work must stay memory-specific, additive, and artifact-backed, not widen into general provider-worker telemetry or transcript storage.
- Success criteria / acceptance:
  - additive schema fields exist for contradiction count, rediscovery count, resume latency, manual repair, repeated-failure streak, retrieval hits/misses, and selected-memory provenance
  - at least one event surface emits memory provenance
  - manifests, events, and metrics describe the fields truthfully without transcript dumping
  - tests cover emission and absence behavior
- Constraints / non-goals:
  - this is a memory-specific provenance and outcome schema slice, not a general observability umbrella
  - keep the schema tied back to source artifacts rather than transcript dumps
  - do not reopen `0303` or absorb `CO-82`, `CO-83`, `CO-89`, or `CO-90`

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `memory provenance`
  - `outcome schema`
  - `manifests, events, and metrics`
  - `selected, rejected, rediscovered, and manually repaired memory decisions`
  - `source artifacts`
  - `fixed-model memory`
  - `not a 0303 extension`
  - `not a new umbrella`
- Protected terms / exact artifact and surface names:
  - `memory.source_0`
  - `schemas/manifest.json`
  - `packages/shared/manifest/types.ts`
  - `packages/shared/events/types.ts`
  - `run:summary`
  - `metrics.json`
  - `resume_events`
  - `provider-linear-worker-proof.json`
  - `ctx:`
- Nearby wrong interpretations to reject:
  - `CO-82` already solves this because it added general provider-worker progress telemetry
  - review telemetry or `CO STATUS` should become the owner for memory provenance
  - the right fix is to dump more transcript text into run artifacts
  - `memory.source_0` alone already exposes the full memory decision contract
  - this slice should expand into the entire eval lane or resident continuity work

## Parity / Alignment Matrix
- Current truth:
  - `memory.source_0` exists as a pointer-based context-object descriptor with origin and inheritance lineage
  - source-0 materialization already distinguishes inherited availability versus child-local rebuilds, but that decision is not summarized as a shared memory observability contract
  - `run:summary` and `metrics.json` do not emit any dedicated memory provenance/outcome payload
- `resume_events` capture accepted/blocked resumes, but memory artifacts do not currently project explicitly marked manual repair or resume-latency signals
- Reference truth:
  - `memory.source_0` and its underlying `source.txt` / `index.json` artifacts already provide the bounded source-artifact seam this issue should reuse
  - shared run-summary and metrics artifacts already have additive extension points for bounded machine-readable telemetry
- Target truth / intended delta:
  - manifests expose one additive memory observability block that records selected provenance plus rejected, rediscovered, and manual-repair decisions in an artifact-backed way
  - `run:summary` emits the same memory observability payload on at least one event surface
  - `metrics.json` mirrors the bounded counters and selected-memory provenance summary needed for evaluation/debugging
- Explicitly out-of-scope differences:
  - general provider-worker progress or stall telemetry
  - `CO STATUS` surface semantics
  - resident app-server continuity or distributed worker-host parity
  - transcript dump storage or the full eval umbrella

## Not Done If
- provenance remains prose-only or requires transcript inspection.
- new fields cannot be tied back to source artifacts.
- additive schema exists but neither `run:summary` nor `metrics.json` emits the new signals.
- the issue broadens into general observability, STATUS telemetry, runtime continuity, or worker-host parity work.

## Goals
- Add a bounded memory observability contract to manifests that stays pointer-based and source-artifact-backed.
- Make selected, rejected, rediscovered, and manual-repair memory decisions inspectable without transcript dumps.
- Mirror the bounded memory contract into `run:summary` and `metrics.json`.
- Keep the lane additive, backward-compatible, and explicitly narrower than the surrounding observability work.

## Non-Goals
- Building the entire eval lane.
- Replacing or duplicating general provider-worker observability from `CO-82`.
- Replacing or duplicating `CO STATUS` telemetry work from `CO-83`.
- Reopening resident continuity from `CO-89` or worker-host parity from `CO-90`.
- Reopening `0303` as the umbrella owner.
- Introducing verbose transcript dumps as the main debug surface.

## Stakeholders
- Product: operators and autonomy-lane owners evaluating fixed-model memory behavior
- Engineering: manifest, source-0, run-summary, metrics, and provider-worker maintainers
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - selected-memory provenance is available from the manifest and mirrored into at least one emitted event payload
  - metrics entries expose contradiction, rediscovery, manual-repair, repeated-failure, resume-latency, and retrieval hit/miss signals
  - memory decisions remain tied to artifact pointers, object ids, manifest lineage, and resume-event metadata instead of raw transcript content
- Guardrails / Error Budgets:
  - keep the contract additive and backward-compatible for older manifests without the new memory block
  - prefer existing source artifacts (`memory.source_0`, `resume_events`) over introducing new transcript-derived storage
  - file a follow-up instead of widening scope if a required counter cannot be emitted truthfully from current source artifacts

## User Experience
- Personas:
  - operator debugging why a run used or rebuilt a memory anchor
  - evaluator comparing rediscovery, contradiction, and repair outcomes across runs
  - downstream surface reader consuming manifest/event/metrics artifacts without transcript access
- User Journeys:
  - inspect a manifest and see which memory candidate was selected, which candidate was rejected, and whether the run rediscovered memory after a miss
  - inspect a `run:summary` event and see the same selected-memory provenance plus bounded counters
  - inspect `metrics.json` and compare retrieval hits/misses, rediscovery, contradiction, resume latency, and manual repair without opening transcripts

## Technical Considerations
- Architectural Notes:
  - reuse the existing `memory.source_0` descriptor and `resume_events` instead of inventing a new memory sidecar family
  - keep the detailed decision payload bounded and source-artifact-backed
  - derive contradiction and rediscovery truth from the source-0 inheritance path rather than from model transcript text
- Dependencies / Integrations:
  - `schemas/manifest.json`
  - `packages/shared/manifest/types.ts`
  - `orchestrator/src/cli/run/source0.ts`
  - `orchestrator/src/cli/run/manifest.ts`
  - `packages/shared/events/types.ts`
  - `orchestrator/src/cli/exec/summary.ts`
  - `orchestrator/src/cli/metrics/metricsRecorder.ts`
  - focused tests across manifest/source-0, summary event, and metrics emission

## Open Questions
- Should contradiction count treat only explicit provenance mismatches as contradictions, or should malformed inherited source payloads count as contradictions too? Default target: count payload or lineage mismatches as contradictions, but keep plain missing-artifact misses separate.
- Is the smallest truthful manual-repair signal an explicitly marked `manual-resume` event already stored in `resume_events`, or does this lane need a narrower follow-up once a dedicated memory-repair hook exists?

## Approvals
- Product: Self-approved from the Linear issue scope
- Engineering: Pending `docs-review`
- Design: N/A
