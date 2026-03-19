# PRD: Coordinator Symphony-Aligned Orchestrator Resume Pre-Start Failure Persistence Callback Extraction

## Summary

After `1199` extracted resume-token validation, the next truthful seam is the remaining resume-only pre-start failure persistence callback still living inline in `orchestrator.ts`.

## Problem

`orchestrator/src/cli/orchestrator.ts` still owns a cohesive resume-specific failure-handling cluster inside `resume()`:

- finalize the manifest into failed / `resume-pre-start-failed`
- attempt forced manifest persistence
- warn if that persistence fails

That behavior is passed as `onStartFailure` into the already-extracted `orchestratorControlPlaneLifecycleShell`, leaving the orchestrator entrypoint with one remaining reusable failure-persistence callback contract after the broader resume-preparation and validation seams have already been extracted.

## Goal

Extract the resume pre-start failure persistence callback behavior into one bounded helper while preserving exact failed-status, persistence, and warning semantics and keeping broader control-plane and lifecycle behavior intact.

## Non-Goals

- changing runtime selection or resume-token validation behavior
- changing public `start()`, `resume()`, `status()`, or `plan()` behavior
- changing control-plane lifecycle sequencing
- changing route-adapter or run-lifecycle orchestration
- changing status rendering beyond bounded refactor equivalence

## Success Criteria

- one bounded helper owns the resume pre-start failure persistence callback behavior
- `orchestrator.ts` no longer directly owns the inline `onStartFailure` callback body
- focused regressions preserve failed-status detail, forced persistence, and warning behavior
