# TECH_SPEC - Coordinator Symphony-Aligned Selected-Run Presenter Extraction

## Scope

- Extract selected-run presenter policy from `observabilityReadModel.ts` and `observabilitySurface.ts`.
- Keep `/ui/data.json` and Telegram-selected-run behavior stable.
- Preserve the current selected-run seam for UI/Telegram/dispatch evaluation.

## Files / Modules

- `orchestrator/src/cli/control/observabilityReadModel.ts`
- `orchestrator/src/cli/control/observabilitySurface.ts`
- `orchestrator/src/cli/control/telegramOversightBridge.ts`
- `orchestrator/src/cli/control/compatibilityIssuePresenter.ts`
- `orchestrator/src/cli/control/`
- `orchestrator/src/cli/control/controlServer.ts`
- `orchestrator/tests/ControlServer.test.ts`
- `orchestrator/tests/TelegramOversightBridge.test.ts`
- `orchestrator/tests/ControlRuntime.test.ts`

## Design

1. Introduce `selectedRunPresenter.ts` for selected-run presentation concerns:
   - selected-run public payload assembly,
   - UI dataset assembly helpers.
2. Move `readUiDataset()` out of `observabilitySurface.ts` into the new presenter as UI-facing assembly logic; keep `/ui/data.json` route handling in `controlServer.ts` / `observabilitySurface.ts` thin.
3. Keep `controlRuntime.ts` responsible for selected-run snapshot reading/caching only.
4. Keep `telegramOversightBridge.ts` unchanged in this slice; do not move Telegram formatting or fingerprint helpers.
5. Keep `compatibilityIssuePresenter.ts` behavior stable.

## Constraints

- No behavior regressions from the current selected-run/UI/Telegram surface.
- No new authority or transport behavior.
- No route or Telegram payload contract changes unless a test-backed correction is required.

## Validation

- Targeted `ControlServer` regressions covering the extracted selected-run presenter path.
- Keep the selected-run-authority and cache-boundary regressions in `ControlRuntime.test.ts`.
- Keep Telegram regressions only if any shared imports move unexpectedly.
- Add one direct unit test for the new presenter module covering `selected`, `runs[0]`, `tasks[0]`, relative links, and null-manifest fallback.
- Manual mock artifact confirming the extracted presenter returns the same selected-run UI payload shape as the pre-extraction path.
- Standard validation lane before closeout.
