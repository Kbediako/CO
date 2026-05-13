---
id: 20260409-linear-a87ae732-0cf0-475e-b7af-a2dec20933e1
title: CO: Emit structured pointer-based block memory from run lifecycle seams
relates_to: docs/PRD-linear-a87ae732-0cf0-475e-b7af-a2dec20933e1.md
risk: high
owners:
  - Codex
last_review: 2026-04-09
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-a87ae732-0cf0-475e-b7af-a2dec20933e1.md`
- PRD: `docs/PRD-linear-a87ae732-0cf0-475e-b7af-a2dec20933e1.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-a87ae732-0cf0-475e-b7af-a2dec20933e1.md`
- Task checklist: `tasks/tasks-linear-a87ae732-0cf0-475e-b7af-a2dec20933e1.md`

## Traceability
- Linear issue: `CO-93` / `a87ae732-0cf0-475e-b7af-a2dec20933e1`
- Linear URL: https://linear.app/asabeko/issue/CO-93/emit-structured-pointer-based-block-memory-from-run-lifecycle-seams
- Source issue: `CO-89` / `70e83230-4f52-4850-b494-41fd0ec32f13`
- Adjacent bounded lane: `CO-91` / `5f850884-855f-41ed-b593-6c2dee5815d2`

## Summary
- Objective: emit one additive `block memory` lifecycle artifact that captures bounded execution blocks as pointer-based entries with drill-down references back to existing run artifacts.
- Scope:
  - extend the shared manifest memory contract with an additive block-memory descriptor
  - materialize a lifecycle block-memory index at run-summary persistence time
  - keep block entries pointer-based and traceable to `manifest.json`, `events.jsonl`, `run-summary.json`, and relevant logs
  - wire at least one consumer to read the new artifact
  - add focused lifecycle and consumer regressions
- Constraints:
  - preserve current artifact truth; do not replace manifest, events, run summary, or RLM state
  - keep the change bounded to lifecycle persistence plus one consumer
  - do not broaden into telemetry, continuity, parity, or controller-policy work

## Technical Requirements
- Functional requirements:
  - lifecycle-complete runs emit one additive block-memory artifact under the run artifact root
  - the manifest exposes an additive block-memory descriptor so consumers can discover the artifact without ad hoc path guessing
  - each block entry carries a context-object pointer and explicit traceability to existing drill-down artifacts
  - at least one consumer reads the artifact through a helper-backed path
  - focused tests cover block-memory write/finalize behavior and consumer reads
- Non-functional requirements:
  - preserve backwards compatibility when block memory is absent from older manifests
  - keep payloads structured and pointer-based rather than prose-only
  - keep the solution minimal and additive
- Interfaces / contracts:
  - lifecycle write seam: `orchestrator/src/cli/services/runSummaryWriter.ts`
  - lifecycle completion authority: `orchestrator/src/cli/services/orchestratorRunLifecycleCompletion.ts`
  - manifest contract: `schemas/manifest.json`, `packages/shared/manifest/types.ts`
  - first consumer seam: `scripts/lib/review-prompt-context.ts`

## Architecture & Data
- Architecture / design adjustments:
  - add a dedicated block-memory helper under the run lifecycle surface rather than overloading `source_0`
  - emit a block-memory index file plus per-block context-object payloads under the run artifact tree
  - keep source-of-truth data in existing artifacts and store only bounded structured snapshots plus drill-down selectors in block memory
- Data model changes / migrations:
  - extend `manifest.memory` with an additive `block_memory` descriptor
  - define a block-memory index schema with block descriptors, pointers, and traceability fields
- External dependencies / integrations:
  - reuse `buildContextObject(...)` from `orchestrator/src/cli/rlm/context.ts`
  - reuse run paths already owned by lifecycle persistence

## Validation Plan
- Tests / checks:
  - audited `linear child-stream --pipeline docs-review` before implementation
  - focused lifecycle completion tests for block-memory emission and finalize ordering
  - focused consumer test proving review prompt context can read the emitted artifact
  - required repo validation floor after implementation
  - manifest-backed standalone review followed by explicit elegance review before handoff
- Rollout verification:
  - confirm a completed run writes the block-memory artifact and updates the manifest descriptor
  - confirm at least one consumer reads the artifact without reconstructing phase history from prose-only summaries
- Monitoring / alerts:
  - rely on manifest descriptor presence plus the emitted block-memory files for operator-visible evidence

## Open Questions
- Whether a follow-up should extend the same block-memory contract into the exec-only summary seam once the orchestrator lifecycle path is landed.

## Approvals
- Reviewer: `codex-orchestrator docs-review (stalled-review fallback accepted)`
- Date: 2026-04-09
- Manifest: `.runs/linear-a87ae732-0cf0-475e-b7af-a2dec20933e1-co-93-docs-review-rerun/cli/2026-04-09T08-45-44-860Z-1bacbce2/manifest.json`
- Review telemetry: fallback note at `out/linear-a87ae732-0cf0-475e-b7af-a2dec20933e1/manual/20260409T084843Z-docs-review-fallback.md`
