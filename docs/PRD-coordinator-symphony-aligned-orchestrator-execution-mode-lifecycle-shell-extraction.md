# PRD: Coordinator Symphony-Aligned Orchestrator Execution-Mode Lifecycle Shell Extraction

## Problem

After `1155`, the duplicated startup control-plane lifecycle shell is gone, but `orchestrator.ts` still owns a larger duplicated execution-mode lifecycle shell one layer deeper: both local and cloud execution paths perform the same persister/control-watcher/heartbeat/in-progress/finalization choreography around different mode-specific execution bodies.

## Goal

Extract one bounded coordinator-owned execution lifecycle shell that wraps both local and cloud execution bodies while preserving their distinct runtime selection, preflight, failure semantics, and persistence behavior.

## Non-Goals

- Merging local and cloud execution bodies into one generic executor
- Changing runtime selection, cloud preflight/fallback policy, or execution-mode semantics
- Moving local-only guardrail enforcement into cloud execution
- Reopening `ControlServer`, Telegram internals, or observability/controller seams
- Changing manifest schema, run-event payloads, or provider-specific cloud executor wiring

## Requirements

1. One bounded seam owns the shared execution lifecycle shell currently duplicated across the local and cloud execution paths in `orchestrator.ts`.
2. The extracted shell preserves the existing pre-body ordering:
   - control watcher sync
   - wait-for-resume handling
   - cancel handling
   - manifest transition to `in_progress`
   - run-started event emission
   - advanced/autoscout note emission
   - heartbeat and post-run persistence/finalization
3. Local and cloud execution bodies remain distinct and retain their mode-specific semantics:
   - local-only `ensureGuardrailStatus(...)` remains local-only
   - cloud `onUpdate` persistence and fallback behavior remain cloud-only
   - terminal failure details remain distinct (`pipeline-failed` vs `cloud-execution-failed`)
4. `orchestrator.ts` remains the public coordinator entrypoint and authority owner for runtime selection and execution-mode decisions.
5. Focused regressions cover the extracted execution lifecycle shell without reopening unrelated route/controller or Telegram-local seams.

## Success Criteria

- `orchestrator.ts` no longer duplicates the same execution lifecycle shell around both local and cloud execution modes.
- Focused regressions stay green on the final tree.
- The closeout bundle stays honest about any unrelated non-green items while preserving bounded review discipline.
