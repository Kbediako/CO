# PRD: Coordinator Symphony-Aligned Plan CLI Shell Extraction

## Summary

`handlePlan(...)` in `bin/codex-orchestrator.ts` still owns a bounded binary-facing `plan` shell above `orchestrator.plan(...)`.

## Problem

The local `plan` command still mixes binary wrapper concerns with a dedicated launch/output shell:

- top-level help gating and shared `parseArgs(...)` ownership
- repo-policy application and task/stage flag resolution
- inline `orchestrator.plan(...)` invocation
- inline JSON/text output selection and `formatPlanPreview(...)` rendering

That makes `plan` the next truthful nearby binary-facing CLI shell candidate after the `status` freeze.

## Goal

Extract the bounded `plan` launch/output shell behind a dedicated helper while preserving current CLI behavior exactly.

## Non-Goals

- reopening the lower `orchestrator.plan(...)` or `runOrchestratorPlanShell(...)` ownership
- widening into shared parser/help helpers
- changing plan output text/JSON behavior

## Success Criteria

- the binary keeps only the top-level `plan` parse/help/wrapper responsibilities
- the extracted helper owns the `orchestrator.plan(...)` call and output emission
- focused parity covers the extracted helper and the binary command surface
