---
id: 20260409-linear-a87ae732-0cf0-475e-b7af-a2dec20933e1
title: CO: Emit structured pointer-based block memory from run lifecycle seams
status: done
owner: Codex
created: 2026-04-09
last_review: 2026-05-12
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-a87ae732-0cf0-475e-b7af-a2dec20933e1.md
related_action_plan: docs/ACTION_PLAN-linear-a87ae732-0cf0-475e-b7af-a2dec20933e1.md
related_tasks:
  - tasks/tasks-linear-a87ae732-0cf0-475e-b7af-a2dec20933e1.md
review_notes:
  - 2026-04-09: Opened from Linear issue `CO-93` in the provider-worker workspace after rechecking live CO team states with the packaged `linear issue-context` helper, moving the issue from `Ready` to `In Progress`, recording the required same-turn `stay_serial` / `single_bounded_change` parallelization decision, and switching the detached workspace at `d47f219ef` onto branch `linear/co-93-block-memory-lifecycle-seams`.
  - 2026-04-09: Pre-implementation audit confirms the current seam is a lifecycle memory-contract gap, not a new umbrella. `memory.source_0` already exists, but no additive lifecycle artifact captures bounded execution blocks with pointers back to existing run artifacts.
  - 2026-04-09: Current code audit shows the smallest truthful authority seam is `persistRunSummary(...)` in `orchestrator/src/cli/services/runSummaryWriter.ts`, because it already owns `run-summary.json` persistence and the manifest writeback used by lifecycle completion.
  - 2026-04-09: `orchestrator/src/cli/events/runEventStream.ts` already exposes the drill-down event vocabulary (`run_started`, `step_started`, `step_completed`, `step_failed`, `run_completed`) needed for block-memory traceability without replacing `events.jsonl` as source truth.
  - 2026-04-09: The first consumer can stay intentionally narrow. `scripts/lib/review-prompt-context.ts` already reads `memory.source_0` from manifests and is a suitable proof surface for block-memory discovery without reopening broader worker or cloud contracts.
  - 2026-04-09: The first docs-review child stream failed only because the spec referenced the planned helper path before the file existed; after narrowing that reference, the rerun passed `spec-guard`, `docs:check`, and `docs:freshness` and then stalled in nested forced review without terminal telemetry. Manual fallback is accepted and recorded in `out/linear-a87ae732-0cf0-475e-b7af-a2dec20933e1/manual/20260409T084843Z-docs-review-fallback.md` with rerun manifest `.runs/linear-a87ae732-0cf0-475e-b7af-a2dec20933e1-co-93-docs-review-rerun/cli/2026-04-09T08-45-44-860Z-1bacbce2/manifest.json`.
  - 2026-05-12: CO-523 live Linear audit verified CO-93 is Done/completed; reclassified this task spec as inactive done metadata for strict spec-guard evidence. Evidence: .runs/linear-8573da42-d9f9-44ce-a24e-224984539044/cli/2026-05-12T18-47-35-293Z-376d8842/provider-linear-issue-context-cache-a87ae732-0cf0-475e-b7af-a2dec20933e1.json.
---

# Technical Specification

## Context
`CO-91` landed a shared `memory.source_0` run anchor, but there is still no first-class `block memory` layer over lifecycle artifacts. Consumers that need phase-bounded execution memory still have to reconstruct it manually from `manifest.json`, `events.jsonl`, `run-summary.json`, and logs. This issue therefore adds one additive lifecycle artifact contract instead of reopening general run-memory, telemetry, or controller-policy work.

## Requirements
1. The shared run contract must expose an additive block-memory descriptor discoverable from the manifest.
2. Lifecycle completion must emit one additive block-memory artifact under the run artifact root.
3. Each emitted block entry must stay pointer-based and traceable back to existing drill-down artifacts.
4. The new layer must not replace `manifest.json`, `events.jsonl`, `run-summary.json`, or `rlm/state.json`.
5. At least one consumer must read the emitted artifact.
6. Focused tests must cover lifecycle write/finalize behavior and consumer reads.
7. The change must remain bounded to lifecycle memory rather than telemetry, continuity, parity, or controller-policy work.

## Design
- Contract:
  - extend `schemas/manifest.json` and generated types with additive `memory.block_memory`
  - model `memory.block_memory` as a descriptor pointing at an emitted block-memory index file
- Block-memory index:
  - emitted under the run artifact root
  - contains structured block descriptors for the run and completed or failed stages
  - each descriptor includes a context-object pointer plus traceability to manifest/events/summary/log artifacts
- Block payloads:
  - use context objects so entries stay pointer-based
  - store bounded structured snapshots rather than free-form prose
- Reader path:
  - add one shared helper to read the descriptor and index
  - first consumer is `scripts/lib/review-prompt-context.ts`

## Implementation Surface
- Expected codepaths:
  - `schemas/manifest.json`
  - `packages/shared/manifest/types.ts`
  - new run-lifecycle block-memory helper under `orchestrator/src/cli/run/`
  - `orchestrator/src/cli/services/runSummaryWriter.ts`
  - `scripts/lib/review-prompt-context.ts`
- Expected tests:
  - lifecycle completion coverage in `orchestrator/tests/OrchestratorRunLifecycleCompletion.test.ts`
  - consumer read coverage in `tests/review-prompt-context.spec.ts`
  - focused helper/unit coverage if the new block-memory module needs seam-local tests

## Protected Expectations
- Keep literal `block memory` wording in the contract and docs.
- Keep entries pointer-based and traceable back to source artifacts.
- Keep the change additive and backwards-compatible.
- Keep existing lifecycle artifacts as source-of-truth inputs.

## Reject These Wrong Interpretations
- `block memory` can be free-form prose.
- end-state summaries already solve the memory problem.
- the slice should settle final controller or retrieval policy.
- the slice should duplicate `CO-82`, `CO-83`, `CO-89`, or `CO-90`.
- the lane should expand into a general autonomy-memory umbrella.

## Current Truth
- `memory.source_0` is already available as a shared pointer-based run anchor.
- `run-summary.json` is persisted during lifecycle completion, and `events.jsonl` plus stage logs already exist as drill-down artifacts.
- no additive block-memory contract exists today, so phase history still requires manual artifact stitching.

## Proposed Design
- Add `memory.block_memory` to the shared manifest contract.
- Emit a block-memory index during `persistRunSummary(...)`, with one run-completion block plus stage blocks for the executed lifecycle commands.
- Materialize each block as a context object and record traceability back to manifest/events/summary/log artifacts through explicit selectors.
- Let review prompt context read the descriptor and index through one helper-backed path.

## Non-Goals
- Replacing existing lifecycle artifacts.
- Block-memory controller/retrieval scoring policy.
- Provider-worker telemetry or status projection work.
- Resident-session continuity work.
- Distributed worker-host parity work.
- Reopening `0303`.

## Parity / Alignment Matrix
- Current truth:
  - lifecycle artifacts exist, block memory does not
  - `source_0` already provides the lower-level pointer contract precedent
- Reference truth:
  - `source_0` and context objects are already the repo-approved pointer substrate
  - lifecycle seams already emit truthful drill-down artifacts
- Target truth / intended delta:
  - completed lifecycle runs emit manifest-discoverable block memory
  - at least one consumer reads the new artifact
  - operators can retrieve bounded phase memory through pointers instead of prose-only summaries
- Explicitly out-of-scope differences:
  - broader memory-controller policy
  - telemetry/status expansion
  - continuity/parity follow-ups

## Not Done If
- block memory remains only prose.
- entries cannot drill down to source artifacts.
- no consumer reads the new artifact.
- the issue broadens into unrelated telemetry or continuity work.

## Validation Plan
- `MCP_RUNNER_TASK_ID=linear-a87ae732-0cf0-475e-b7af-a2dec20933e1 "/opt/homebrew/Cellar/node/25.2.1/bin/node" "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-93-docs-review --format json`
- focused lifecycle completion tests for block-memory emission/finalize behavior
- focused review prompt context tests for consumer reads
- `MCP_RUNNER_TASK_ID=linear-a87ae732-0cf0-475e-b7af-a2dec20933e1 node scripts/delegation-guard.mjs`
- `MCP_RUNNER_TASK_ID=linear-a87ae732-0cf0-475e-b7af-a2dec20933e1 node scripts/spec-guard.mjs --dry-run`
- `MCP_RUNNER_TASK_ID=linear-a87ae732-0cf0-475e-b7af-a2dec20933e1 npm run build`
- `MCP_RUNNER_TASK_ID=linear-a87ae732-0cf0-475e-b7af-a2dec20933e1 npm run lint`
- `MCP_RUNNER_TASK_ID=linear-a87ae732-0cf0-475e-b7af-a2dec20933e1 npm run test`
- `MCP_RUNNER_TASK_ID=linear-a87ae732-0cf0-475e-b7af-a2dec20933e1 npm run docs:check`
- `MCP_RUNNER_TASK_ID=linear-a87ae732-0cf0-475e-b7af-a2dec20933e1 npm run docs:freshness`
- `MCP_RUNNER_TASK_ID=linear-a87ae732-0cf0-475e-b7af-a2dec20933e1 node scripts/diff-budget.mjs`
- `MCP_RUNNER_TASK_ID=linear-a87ae732-0cf0-475e-b7af-a2dec20933e1 FORCE_CODEX_REVIEW=1 npm run review`
- `MCP_RUNNER_TASK_ID=linear-a87ae732-0cf0-475e-b7af-a2dec20933e1 npm run pack:smoke`

## Approvals
- Reviewer: `codex-orchestrator docs-review (stalled-review fallback accepted)`
- Date: 2026-04-09
