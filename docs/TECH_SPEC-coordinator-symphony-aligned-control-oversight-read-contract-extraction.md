# TECH_SPEC: Coordinator Symphony-Aligned Control Oversight Read Contract Extraction

## Context

`1148` left the coordinator-owned oversight facade and read service in place, but both still return `TelegramOversightReadAdapter`, and the associated dispatch/question payload types still live in `telegramOversightBridge.ts`.

That means the remaining mismatch is no longer service ownership. It is contract ownership: the Telegram bridge still defines the interface that the coordinator-owned surface implements.

## In Scope

- Introduce one coordinator-owned oversight read-contract module under `orchestrator/src/cli/control/`
- Move the selected-run/dispatch/question read interface into that module
- Move the related read payload typings into that coordinator-owned contract module
- Rewire `controlOversightReadService.ts`, `controlOversightFacade.ts`, `controlTelegramReadController.ts`, and `telegramOversightBridge.ts` to consume the coordinator-owned contract
- Keep focused coordinator and Telegram regressions green

## Out of Scope

- Telegram runtime lifecycle, polling, update handling, or projection delivery
- Read payload behavior changes
- Controller presentation changes
- New non-Telegram consumers
- Broader `controlServer` work

## Design

1. Add a coordinator-owned oversight contract module that defines:
   - the selected-run/dispatch/question read interface
   - `ControlDispatchPayload`
   - `QuestionRecordPayload`
   - `QuestionsPayload`
2. Update `controlOversightReadService.ts` to implement the coordinator-owned contract.
3. Keep `controlOversightFacade.ts` as the public coordinator-owned composition seam over the read contract plus runtime subscription.
4. Update Telegram consumer sites to import the contract from the coordinator-owned module rather than `telegramOversightBridge.ts`.
5. Preserve boundedness:
   - do not change payload semantics
   - do not rename Telegram runtime types unrelated to the read contract
   - do not introduce a generic multi-channel abstraction

## Validation

- Focused coordinator and Telegram tests for the extracted contract seam
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
