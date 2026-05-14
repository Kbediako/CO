# PRD: Coordinator Symphony-Aligned Orchestrator Control Plane Lifecycle Shell Extraction

## Problem

After `1154`, the remaining duplicated control-plane lifecycle orchestration is no longer inside `ControlServer`; it sits in `orchestrator.ts`, where both `start()` and `resume()` repeat the same run-entry shell: create the run event stream, resolve delegation config layers, optionally start the control server, attach the run-event adapter, and tear everything down in the same guarded order.

## Goal

Extract one bounded coordinator-owned lifecycle shell for that duplicated control-plane wiring while preserving current start/resume behavior and keeping the already-thin `ControlServer` surface unchanged.

## Non-Goals

- Reopening `ControlServer`, its adjacent lifecycle helpers, or request/controller seams
- Telegram bridge/runtime internals
- Planner/runtime execution semantics outside the duplicated control-plane lifecycle shell
- Changes to control auth/session policy, persistence paths, or run-event payloads
- Broad orchestrator refactors outside the shared start/resume control-plane setup and teardown

## Requirements

1. One bounded seam owns the shared control-plane lifecycle orchestration currently duplicated across `Orchestrator.start()` and `Orchestrator.resume()`.
2. Startup order remains unchanged:
   - create the run event stream
   - resolve delegation config layers
   - optionally start the control server when UI control is enabled
   - attach the run-event adapter and publish through the same runtime
3. Teardown order remains unchanged:
   - detach the run-event adapter
   - close the control server
   - close the run event stream
4. `orchestrator.ts` remains the public coordinator entrypoint and authority owner for run lifecycle decisions.
5. Focused regressions cover the extracted lifecycle shell without reopening route/controller or Telegram-local seams.

## Success Criteria

- `orchestrator.ts` no longer duplicates the same control-plane lifecycle shell across `start()` and `resume()`.
- Focused regressions stay green on the final tree.
- The closeout bundle stays honest about any unrelated non-green items while preserving bounded review discipline.
