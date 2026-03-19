# 1148 Closeout Summary

- Status: completed
- Task: `1148-coordinator-symphony-aligned-control-oversight-read-service-boundary-extraction`
- Scope: replace the Telegram-named read adapter beneath `controlOversightFacade.ts` with a coordinator-owned read service without reopening the Telegram bridge contract, payload types, or dispatch/question helper semantics.

## Outcome

`controlOversightFacade.ts` now composes the coordinator-owned `controlOversightReadService.ts`, and the old `controlTelegramReadAdapter.ts` seam plus its test have been removed. The new read service preserves the same three-read contract by delegating selected-run reads to the runtime snapshot and continuing to use the existing Telegram dispatch/question helper seams.

## Validation

- Deterministic guards passed: `delegation-guard`, `spec-guard`, `build`, `lint`, `docs:check`, `docs:freshness`, stacked-branch `diff-budget` override, and `pack:smoke`.
- Focused final-tree regressions passed `4/4` files and `7/7` tests in `05b-targeted-tests.log`.
- Manual/mock seam evidence was captured in `11-manual-oversight-read-service-check.json`, confirming matching selected-run/dispatch/question payloads through both the read service and facade plus unchanged subscription passthrough.

## Review + Overrides

The first bounded `npm run review` pass surfaced one real completeness issue: `docs/TECH_SPEC-coordinator-symphony-aligned-control-oversight-service-boundary-extraction.md` still named the deleted `controlTelegramReadAdapter.ts` file. That path was corrected and `docs:check` reran green. The rerun of `npm run review` then widened into broader docs/package speculation without surfacing an additional diff-local defect, so the review lane is recorded as an explicit wrapper-drift override rather than a clean no-findings verdict.

`npm run test` again hit the recurring full-suite quiet-tail after visible progress through `tests/cli-orchestrator.spec.ts`; that is also recorded as an explicit override instead of a claimed full-suite pass.
