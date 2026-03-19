# Findings - 1039 UI Data Controller Extraction Deliberation

## Decision

- Proceed with a bounded `/ui/data.json` controller extraction as the immediate next slice after `1038`.

## Why This Slice

- `1037` already isolated selected-run payload construction in `selectedRunPresenter.ts`.
- `1038` already isolated the `/api/v1/*` controller tree in `observabilityApiController.ts`.
- The remaining read-only controller concentration in `controlServer.ts` is now the standalone `/ui/data.json` route, which can be extracted without broadening into auth/session/webhook/control behavior.

## Guardrails

- Keep `selectedRunPresenter.ts` as the UI dataset builder.
- Keep `/api/v1/*`, Telegram, Linear, and mutating control behavior out of scope.
- Preserve `/ui/data.json` status, headers, and payload shape.

## Evidence

- `out/1038-coordinator-symphony-aligned-observability-api-controller-extraction/manual/20260307T045306Z-closeout/14-next-slice-note.md`
- `orchestrator/src/cli/control/controlServer.ts`
- `orchestrator/src/cli/control/selectedRunPresenter.ts`
- `orchestrator/tests/ControlServer.test.ts`
