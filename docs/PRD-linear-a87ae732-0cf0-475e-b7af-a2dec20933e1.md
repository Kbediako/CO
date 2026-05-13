# PRD - CO: Emit structured pointer-based block memory from run lifecycle seams

## Added by Bootstrap 2026-04-09

## Traceability
- Linear issue: `CO-93` / `a87ae732-0cf0-475e-b7af-a2dec20933e1`
- Linear URL: https://linear.app/asabeko/issue/CO-93/emit-structured-pointer-based-block-memory-from-run-lifecycle-seams
- Source issue: `CO-89` / `70e83230-4f52-4850-b494-41fd0ec32f13`
- Adjacent bounded lane: `CO-91` / `5f850884-855f-41ed-b593-6c2dee5815d2`

## Summary
- Problem Statement: after `CO-91`, runs now expose a shared `memory.source_0` anchor, but execution history is still reconstructible only by manually stitching together `manifest.json`, `events.jsonl`, `run-summary.json`, and per-stage logs. There is no first-class `block memory` artifact that captures bounded lifecycle blocks with durable pointers back to those existing drill-down artifacts.
- Desired Outcome: emit one additive `block memory` artifact from the run lifecycle persistence seam so block entries stay pointer-based, traceable back to existing run artifacts, and readable by at least one consumer without broadening into telemetry, continuity, or controller-policy work.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): land the bounded sibling autonomy-stream slice that turns literal `block memory` into a truthful lifecycle artifact contract. The emitted data must stay pointer-based and phase-bounded, not collapse into prose summaries or reopen a broader run-memory umbrella.
- Success criteria / acceptance:
  - one additive artifact such as `run-memory.json` or `blocks.jsonl` is emitted from the lifecycle persistence seam
  - block entries are pointer-based and traceable to existing drill-down artifacts
  - at least one consumer reads the emitted artifact
  - lifecycle tests cover write/finalize behavior
- Constraints / non-goals:
  - existing artifacts remain the source of truth; this slice adds one memory-focused layer over them
  - this is not a `0303` extension, not a new umbrella, and not a resident-app continuity lane
  - do not absorb `CO-82`, `CO-83`, `CO-89`, or `CO-90`

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `block memory`
  - pointer-based
  - run lifecycle seams
  - bounded phase granularity
  - drill-down pointers
  - additive artifact
- Protected terms / exact artifact and surface names:
  - `manifest.json`
  - `events.jsonl`
  - `run-summary.json`
  - `rlm/state.json`
  - `memory.source_0`
  - `orchestrator/src/cli/services/runSummaryWriter.ts`
  - `orchestrator/src/cli/services/orchestratorRunLifecycleCompletion.ts`
  - `scripts/lib/review-prompt-context.ts`
- Nearby wrong interpretations to reject:
  - `block memory` can be free-form prose with no pointers
  - end-state summaries already solve phase memory
  - this lane should settle final controller or retrieval policy
  - this issue should absorb adjacent telemetry, continuity, or worker-host parity work

## Parity / Alignment Matrix
- Current truth:
  - `memory.source_0` exists as a shared pointer-based run anchor
  - lifecycle completion writes `run-summary.json` and points at `events.jsonl`, but there is no additive block-memory contract
  - consumers that want bounded execution history still have to reconstruct it from multiple artifacts manually
- Reference truth:
  - `source_0` already shows the repo-approved pattern for manifest-backed, pointer-based memory descriptors
  - lifecycle seams already emit truthful per-stage and terminal artifacts that block memory can point back to
- Target truth / intended delta:
  - lifecycle completion emits one additive block-memory index with per-block pointers and drill-down selectors
  - at least one consumer reads that artifact through a shared helper instead of deriving history only from prose or ad hoc file reads
- Explicitly out-of-scope differences:
  - controller/scoring policy
  - provider-worker telemetry or `CO STATUS` projection work
  - resident continuity and distributed worker-host parity

## Not Done If
- memory remains stored only as prose summaries.
- emitted entries cannot drill down to source artifacts.
- no consumer reads the additive artifact.
- the issue broadens into unrelated telemetry, runtime continuity, or worker-host parity work.

## Goals
- Add a manifest-backed `block memory` descriptor that points at an additive lifecycle artifact.
- Keep entries pointer-based and traceable to existing lifecycle artifacts rather than replacing them.
- Prove at least one consumer can read the artifact.
- Cover lifecycle write/finalize behavior with focused tests.

## Non-Goals
- Replacing `manifest.json`, `events.jsonl`, `run-summary.json`, or `rlm/state.json`.
- Settling final controller or scoring policy.
- Duplicating `CO-82`, `CO-83`, `CO-89`, or `CO-90` scope.
- Reopening `0303` as the umbrella owner.

## Stakeholders
- Product: operators and autonomy-lane owners who need bounded execution memory without manual artifact stitching
- Engineering: run lifecycle, manifest, review, and memory-contract maintainers
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - emitted block memory is present for completed lifecycle runs
  - each block entry carries a pointer plus traceability back to existing run artifacts
  - at least one consumer reads the emitted artifact through a helper-backed path
- Guardrails / Error Budgets:
  - preserve existing artifacts as source-of-truth inputs
  - keep the change additive and backward-compatible when `block_memory` is absent
  - keep the implementation bounded to lifecycle persistence plus one consumer

## User Experience
- Personas:
  - reviewer or operator inspecting a run after completion
  - downstream consumer needing phase-bounded execution memory without bespoke artifact stitching
- User Journeys:
  - a lifecycle-complete run emits block memory alongside existing artifacts
  - a consumer reads the artifact and sees block pointers plus drill-down references
  - deeper inspection still follows the referenced manifest, events, summary, or log artifacts

## Technical Considerations
- Architectural Notes:
  - follow the `memory.source_0` pattern for manifest-backed pointer descriptors
  - emit block memory from the lifecycle persistence seam that already owns `run-summary.json`
  - keep traceability explicit through artifact paths plus event/log selectors rather than prose-only summaries
- Dependencies / Integrations:
  - `schemas/manifest.json`
  - `packages/shared/manifest/types.ts`
  - `orchestrator/src/cli/services/runSummaryWriter.ts`
  - `orchestrator/src/cli/services/orchestratorRunLifecycleCompletion.ts`
  - `orchestrator/src/cli/events/runEventStream.ts`
  - `scripts/lib/review-prompt-context.ts`

## Open Questions
- Should the first consumer surface only the block index metadata, or also resolve the pointed context payload for a compact prompt scaffold?
- Is a single lifecycle-completion seam sufficient for the first slice, or does a follow-up need to extend the same contract into the exec-only summary path?

## Approvals
- Product: Self-approved from the Linear issue scope
- Engineering: `codex-orchestrator docs-review` rerun passed `spec-guard`, `docs:check`, and `docs:freshness`, then stalled in the nested forced-review stage without terminal telemetry; manual fallback accepted and recorded in `out/linear-a87ae732-0cf0-475e-b7af-a2dec20933e1/manual/20260409T084843Z-docs-review-fallback.md`
- Design: N/A
