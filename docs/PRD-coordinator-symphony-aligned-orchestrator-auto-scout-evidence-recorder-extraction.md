# PRD: Coordinator Symphony-Aligned Orchestrator Auto-Scout Evidence Recorder Extraction

- Date: 2026-03-14
- Owner: Codex (top-level agent)
- Task: `1167-coordinator-symphony-aligned-orchestrator-auto-scout-evidence-recorder-extraction`

## Background

`1165` and `1166` closed the remaining truthful public lifecycle seams around `start()` / `resume()`. From the current thinned orchestrator baseline, the last clearly cohesive non-trivial utility still embedded inside `CodexOrchestrator` is the class-local `runAutoScout(...)` cluster:

- merged-env timeout resolution
- evidence payload build/write
- normalized `recorded | timeout | error` outcome shaping

This logic is orchestrator-adjacent rather than lifecycle-owning, already has meaningful orchestration coverage, and is a better Symphony-aligned extraction target than reopening another fake lifecycle micro-slice.

## Goal

Extract the auto-scout evidence recorder into one adjacent helper/service, tentatively `recordOrchestratorAutoScoutEvidence`, while keeping routing, manifest ownership, and public lifecycle shells where they already belong.

## Non-Goals

- Reopening `start()` / `resume()` bootstrap extraction
- Changing cloud/local execution routing decisions
- Moving manifest mutation or orchestration completion ownership out of the existing execution router/lifecycle seams
- Altering auto-scout trigger policy or downstream artifact format

## Success Criteria

- `CodexOrchestrator` no longer owns the inline auto-scout evidence-writing / timeout / outcome-shaping cluster.
- The extracted seam stays narrowly focused on evidence recording and normalized outcomes.
- Router callbacks and orchestration behavior remain unchanged.
- Focused helper tests cover `recorded`, `timeout`, and `error` outcomes.
- Existing orchestration integration still proves the cloud/non-trivial path records `auto-scout.json`.
