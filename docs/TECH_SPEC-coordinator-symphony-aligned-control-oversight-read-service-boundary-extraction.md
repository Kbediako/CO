# TECH_SPEC: Coordinator Symphony-Aligned Control Oversight Read Service Boundary Extraction

## Context

`1147` introduced `controlOversightFacade.ts` so Telegram now consumes one coordinator-owned contract for selected-run reads, dispatch reads, question reads, and runtime subscription. The remaining mismatch is below that facade: `createControlOversightFacade(...)` still delegates its read side to `createControlTelegramReadAdapter(...)`.

That means the next truthful seam is not more Telegram behavior work. It is a bounded ownership/naming follow-on that lifts the read assembly behind the facade into a coordinator-owned service boundary.

## In Scope

- Introduce one coordinator-owned oversight read service under `orchestrator/src/cli/control/`
- Replace `createControlTelegramReadAdapter(...)` usage inside `controlOversightFacade.ts`
- Preserve current selected-run, dispatch, and question read outputs
- Leave the existing `TelegramOversightReadAdapter` bridge contract and payload types unchanged
- Keep focused coordinator and Telegram regressions green

## Out of Scope

- Telegram polling/update-handler/state-store/queue internals
- `telegramOversightBridge.ts` runtime lifecycle or config parsing
- Changes to dispatch/question controller behavior
- Broader `controlServer` rewrites
- New command, policy, or authority behavior

## Design

1. Introduce one coordinator-owned read-service module that owns the oversight read assembly currently packaged as `createControlTelegramReadAdapter(...)`.
2. Keep the service thin and compositional:
   - selected-run snapshot access still comes from runtime
   - dispatch reads still use the existing dispatch-read implementation
   - question reads still use the existing question-read implementation
3. Keep `controlOversightFacade.ts` as the public boundary that combines the read service with runtime subscription.
4. Preserve boundedness:
   - do not widen into a generic multi-channel read abstraction
   - do not rename or rewrite lower-level dispatch/question helpers unless needed for the seam

## Validation

- Focused coordinator and Telegram tests for the new read-service seam and integrated facade behavior
- `delegation-guard`
- `spec-guard`
- `build`
- `lint`
- `test`
- `docs:check`
- `docs:freshness`
- `diff-budget`
- `review`
- `pack:smoke`
