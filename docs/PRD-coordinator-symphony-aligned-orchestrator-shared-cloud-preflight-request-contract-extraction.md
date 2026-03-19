# PRD: Coordinator Symphony-Aligned Orchestrator Shared Cloud-Preflight Request Contract Extraction

## Summary

After `1171` isolated the router-local cloud-preflight request assembly, the next truthful seam is the remaining cross-shell duplication between `orchestratorExecutionRouter.ts` and `doctor.ts` when they shape `runCloudPreflight(...)` requests.

## Problem

The router and doctor surfaces still assemble cloud-preflight requests separately. Both decide `codexBin`, branch, and final `runCloudPreflight(...)` inputs, but they do so through different local shapes. That leaves a remaining risk of drift in request contract behavior even though the underlying preflight utility is shared.

## Goal

Extract or align a shared cloud-preflight request contract so router and doctor can prepare preflight inputs through one bounded seam while keeping their higher-level behavior local.

## Non-Goals

- changing cloud preflight rules in `runCloudPreflight(...)`
- changing router hard-fail or fallback behavior
- changing doctor guidance wording or plan-metadata policy
- broad executor or lifecycle refactors

## Success Criteria

- router and doctor both rely on a shared bounded contract for shaping `runCloudPreflight(...)` requests
- existing precedence for resolved `environmentId`, `branch`, `codexBin`, and merged env remains explicit and preserved
- focused tests cover the shared contract without reopening broader router or doctor behavior
