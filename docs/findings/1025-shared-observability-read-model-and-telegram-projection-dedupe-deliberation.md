# Findings - 1025 Shared Observability Read Model + Telegram Projection Dedupe

## Decision
- Proceed with a bounded follow-up slice that extracts one shared internal observability read model for HTTP/UI/Telegram snapshot surfaces and fixes Telegram push dedupe to include the rendered latest-question prompt and urgency.

## Why This Slice Next
- `1024` closed the provider-read boundary, so the remaining drift is inside snapshot/read-model ownership rather than runtime/provider semantics.
- Real Symphony reinforces that the durable seam is not another controller split or transport-specific slice:
  - normalize domain state once,
  - materialize orchestrator snapshot state once,
  - let optional surfaces render from that state.
- CO still has one remaining class of duplication/misalignment:
  - tracked Linear payload shaping is duplicated,
  - UI list entries manually reassemble selected-run summary fields,
  - Telegram keeps a shadow HTTP payload contract and misses one visible question-summary change in its push hash.

## Local Evidence
- `orchestrator/src/cli/control/selectedRunProjection.ts` and `orchestrator/src/cli/control/observabilitySurface.ts` both define the same tracked Linear snapshot payload builder.
- `orchestrator/src/cli/control/controlRuntime.ts` and `orchestrator/src/cli/control/observabilitySurface.ts` still expose generic record payloads, while `orchestrator/src/cli/control/telegramOversightBridge.ts` re-declares its own state/issue/dispatch payload types and `controlServer.ts` casts runtime results into those local types.
- `orchestrator/src/cli/control/telegramOversightBridge.ts` renders `/status` from queued-question prompt and urgency, but its projection hash only fingerprints `queued_count` and `latest_question_id`, so a visible status-message change can be skipped if the question id is stable.
- `orchestrator/src/cli/control/observabilitySurface.ts` still manually rebuilds overlapping selected-run summary fields for UI task/run entries instead of consuming one shared summary view object.

## Real-Symphony Evidence
- `SPEC.md` positions observability surfaces as optional shells over canonical orchestrator state and warns against transport-specific coupling.
- `elixir/lib/symphony_elixir_web/presenter.ex` reads orchestrator snapshot state and shapes shared payloads for API and dashboard consumers.
- `elixir/lib/symphony_elixir_web/controllers/observability_api_controller.ex` stays thin and defers almost entirely to the presenter.
- `elixir/lib/symphony_elixir/tracker.ex` and the Linear adapter normalize transport data early so surface consumers do not depend on provider-specific shapes.

## Minimal Recommendation
- Add one shared internal read-model module for canonical snapshot facts and projection fingerprint inputs.
- Keep HTTP/UI payload envelopes and Telegram text rendering local, but make them consume the same underlying typed read model.
- Treat the Telegram question-summary hash correction as the only intentional behavior change in this slice.
- Keep `/api/v1/dispatch` and all provider I/O boundaries unchanged.

## Non-Goals
- No transport-command redesign.
- No auth or mutation-path changes.
- No contract widening ahead of real backing state.
- No new live-provider work or poller behavior.
