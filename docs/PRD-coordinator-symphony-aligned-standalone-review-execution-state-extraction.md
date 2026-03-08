# PRD - Coordinator Symphony-Aligned Standalone Review Execution State Extraction

## User Request Translation

Make the standalone review wrapper more reliable and better aligned with the real Symphony architecture by extracting a single owner for live review-execution state instead of keeping enforcement and telemetry split across multiple parsing paths inside `scripts/run-review.ts`.

## Problem

CO's standalone review wrapper currently mixes:

- prompt assembly
- runtime selection
- child-process supervision
- startup-loop and heavy-command enforcement
- checkpoint logging
- post-hoc telemetry reconstruction from `output.log`

The current shape works, but recent `1055` and `1056` runs showed a remaining reliability gap: the wrapper can drift through long low-signal review traversals without producing a crisp, machine-readable terminal assessment soon enough. Structurally, `scripts/run-review.ts` still uses one live mutable path for enforcement and a second parser over `output.log` for telemetry summaries, which means two interpretations of one runtime.

## Goal

Introduce a dedicated `ReviewExecutionState`/`ReviewMonitor` module adjacent to `scripts/run-review.ts` that ingests review output once, owns the live state snapshot, and serves as the single source of truth for timeout checks, startup-loop detection, checkpoint logging, telemetry persistence, and failure summaries. Keep the CLI shell thin and artifact-first.

## Non-Goals

- No attempt to copy Symphony's BEAM/Phoenix/OTP stack into CO.
- No change to the downstream artifact contract (`prompt.txt`, `output.log`, `telemetry.json`) beyond making it more reliable.
- No redesign of diff-budget policy, task manifest selection, or non-interactive handoff semantics outside the scope needed to support the extracted state owner.
- No broad rewrite of all review docs in this slice.

## Requirements

- Add a dedicated review execution state/monitor module near `scripts/run-review.ts`.
- Route stdout/stderr ingestion through that single state owner instead of later reparsing `output.log` for the authoritative summary.
- Drive these behaviors from the shared state snapshot:
  - startup-loop detection
  - stall/timeout detection
  - patience-first checkpoint logging
  - telemetry persistence
  - failure summaries
- Keep `scripts/run-review.ts` as a thinner orchestrating shell around prompt construction, runtime selection, and final artifact emission.
- Add direct tests for state snapshots/projections in addition to existing wrapper tests.

## Constraints

- Preserve the current artifact-first wrapper contract and non-interactive handoff behavior.
- Preserve bounded review guidance and heavy-command controls unless an explicit docs-first decision changes them.
- Treat real Symphony as a structural reference only: one state owner plus thin controller/projection layers, not a literal implementation template.

## Acceptance Criteria

1. A dedicated review execution state/monitor module exists and is the single owner of live review output state.
2. `scripts/run-review.ts` no longer keeps separate live enforcement state and post-hoc telemetry reconstruction as independent authorities.
3. Checkpoint logging, failure summaries, and telemetry persistence come from the same runtime snapshot.
4. Direct snapshot/projection tests plus existing wrapper tests pass.
5. Review docs stay aligned with the shipped behavior.
