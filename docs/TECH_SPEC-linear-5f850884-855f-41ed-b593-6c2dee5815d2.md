---
id: 20260409-linear-5f850884-855f-41ed-b593-6c2dee5815d2
title: CO: Add source 0 to the run contract and shared memory-consumer read path
relates_to: docs/PRD-linear-5f850884-855f-41ed-b593-6c2dee5815d2.md
risk: high
owners:
  - Codex
last_review: 2026-04-09
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-5f850884-855f-41ed-b593-6c2dee5815d2.md`
- PRD: `docs/PRD-linear-5f850884-855f-41ed-b593-6c2dee5815d2.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-5f850884-855f-41ed-b593-6c2dee5815d2.md`
- Task checklist: `tasks/tasks-linear-5f850884-855f-41ed-b593-6c2dee5815d2.md`

## Traceability
- Linear issue: `CO-91` / `5f850884-855f-41ed-b593-6c2dee5815d2`
- Linear URL: https://linear.app/asabeko/issue/CO-91/add-source-0-to-the-run-contract-and-shared-memory-consumer-read-path
- Follow-up to: `CO-89` / `70e83230-4f52-4850-b494-41fd0ec32f13`

## Summary
- Objective: add a durable `source 0` run-contract anchor and shared reader path for the existing post-bootstrap memory consumers without broadening into general run-memory or telemetry work.
- Scope:
  - extend the shared manifest schema/types with additive `memory.source_0` backing
  - materialize a pointer-based context object once per run and inherit it into child runs in a traceable way
  - expose one shared reader for reviewer, cloud, provider-worker, child-lane, and RLM consumers
  - add focused tests for contract creation plus consumer reads
- Constraints:
  - no `0303` umbrella expansion
  - no run-memory-controller or retrieval-policy work
  - no telemetry, resident-session continuity, or distributed-parity expansion

## Implementation Boundary
- Manifest contract:
  - add an additive `memory` block to `schemas/manifest.json`
  - regenerate `packages/shared/manifest/types.ts`
  - keep legacy manifests readable when `memory.source_0` is absent
- Shared helper:
  - introduce one repo-owned helper that can materialize, inherit, resolve, and format `source 0`
  - store the payload as a context object backed by `source.txt` plus `index.json`, reusing the existing `ctx:` pointer scheme
- Consumers:
  - review prompt context via `scripts/lib/review-prompt-context.ts` and `scripts/run-review.ts`
  - cloud prompt context via `orchestrator/src/cli/services/orchestratorCloudPromptBuilder.ts`
  - provider-worker and child-lane prompt context
  - RLM read path, without inventing a second anchor format

## Design
- `memory.source_0` descriptor:
  - `kind: "context_object"`
  - stable `object_id`
  - local `dir_path`, `index_path`, and `source_path`
  - traceability fields such as `created_at`, `byte_length`, `chunk_count`, `origin_run_id`, and `origin_manifest_path`
- Root-run materialization:
  - build the bounded `source 0` payload from existing run/task/instruction metadata
  - encode the payload as structured JSON content inside the context-object source file so it stays pointer-based but not prose-flattened
- Child-run inheritance:
  - copy the existing context object into the child run artifact tree or re-materialize it from the parent descriptor while preserving the same `object_id`
  - update only local file paths plus inheritance metadata
- Reader contract:
  - shared helper returns both descriptor metadata and resolved payload so prompt builders can stay thin and consistent

## Validation
- audited `linear child-stream --pipeline docs-review`
- focused tests for:
  - manifest/source-0 contract creation
  - at least two consumer read surfaces
  - child-run inheritance or fallback resolution
- full repo validation floor before review handoff

## Approvals
- Reviewer: `codex-orchestrator docs-review` child stream failed only on the repo-wide `docs:freshness` stale-doc baseline after `spec-guard` and `docs:check` passed; manual fallback accepted
- Date: 2026-04-09
- Manifest: `.runs/linear-5f850884-855f-41ed-b593-6c2dee5815d2-co-91-docs-review/cli/2026-04-08T14-55-38-137Z-305205e3/manifest.json`
- Review telemetry: fallback note at `out/linear-5f850884-855f-41ed-b593-6c2dee5815d2/manual/20260408T145538Z-docs-review-fallback.md`
