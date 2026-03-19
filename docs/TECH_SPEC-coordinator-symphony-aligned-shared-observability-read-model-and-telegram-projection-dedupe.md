# TECH_SPEC - Coordinator Symphony-Aligned Shared Observability Read Model + Telegram Projection Dedupe (1025)

## Summary
- Objective: create one shared internal observability read-model boundary for selected-run snapshot data and use it across HTTP/UI/Telegram, while correcting Telegram projection dedupe to hash the same question-summary fields that `/status` renders.
- Scope: one new shared read-model module, one observability-surface remap to consume it, one Telegram adapter/renderer remap to consume it, and focused regression/manual evidence.
- Constraints: keep CO execution authority unchanged, keep Linear advisory-only, keep snapshot surfaces provider-free, and avoid widening external contracts beyond backed state.

## Technical Requirements
- Functional requirements:
  - introduce one internal typed read-model layer for:
    - selected-run summary,
    - running summary,
    - question summary,
    - tracked Linear snapshot payload,
    - synchronous dispatch summary,
    - UI-facing task/run summary inputs where fields overlap the selected-run snapshot,
  - remove duplicate tracked Linear payload builders from selected-run projection and observability surface code,
  - let Telegram render state and issue output from the shared read-model types instead of a shadow HTTP payload contract,
  - preserve existing dispatch route behavior and fail-closed envelopes,
  - make Telegram projection hashing include the rendered latest-question prompt and urgency so visible status changes cause push invalidation.
- Non-functional requirements:
  - no public route changes,
  - no live provider work on snapshot surfaces,
  - keep the shared read model internal to the control layer,
  - keep the patch reviewable and bounded.
- Interfaces / contracts:
  - `ControlRuntime.snapshot()` may continue exposing transport-facing route methods, but those methods should be implemented from the shared read-model seam rather than generic ad hoc payload assembly,
  - Telegram read adapter contracts should consume shared typed snapshot models plus explicit dispatch/question read methods,
  - HTTP/UI payload shapes should remain backward-compatible unless a field is corrected by the intentional Telegram hash-only behavior fix.

## Architecture & Data
- Architecture / design adjustments:
  - add a focused internal module such as `observabilityReadModel.ts` that owns:
    - shared snapshot types,
    - tracked Linear snapshot payload builder,
    - selected-run public/read summary builders,
    - UI task/run summary input builders where appropriate,
    - projection fingerprint input for Telegram push dedupe,
  - keep `selectedRunProjection.ts` focused on runtime-state extraction and selected-run context assembly,
  - keep `observabilitySurface.ts` responsible for HTTP/UI envelopes and method-specific payload composition, but make it consume the shared typed read model instead of rebuilding overlapping selected-run structures,
  - keep `telegramOversightBridge.ts` responsible for command routing and text rendering, but make it consume the shared typed read model and shared projection fingerprint input,
  - keep `controlServer.ts` as the controller/adapter that wires runtime methods, question expiry/audit behavior, and dispatch audit events.
- Data model changes / migrations:
  - none at storage or persisted state level,
  - one internal TypeScript type cleanup replacing generic `Record<string, unknown>` usage where snapshot models are already known.
- External dependencies / integrations:
  - existing `ControlRuntime`, `SelectedRunProjectionReader`, and `LiveLinearAdvisoryRuntime` boundaries,
  - existing Telegram bridge state file and push cooldown semantics,
  - real `openai/symphony` snapshot/presenter guidance as read-only reference only.

## Validation Plan
- Tests / checks:
  - targeted `ControlRuntime`, `ControlServer`, and `TelegramOversightBridge` regression coverage,
  - add a Telegram push regression proving a changed latest-question prompt or urgency under the same question id changes the projection hash and emits a push,
  - full repo validation gate chain for the owned diff.
- Rollout verification:
  - docs-review manifest captured before implementation,
  - manual simulated/mock evidence proving HTTP/UI/Telegram remain aligned on shared snapshot fields,
  - explicit elegance review before closeout.
- Monitoring / alerts:
  - if review/full-suite noise recurs, record explicit bounded override reasons instead of overstating unrelated failures.

## Open Questions
- Whether `ControlRuntime` should expose the shared snapshot/read model directly in a later slice, or whether this lane should keep that boundary internal to the observability and Telegram adapters.

## Approvals
- Reviewer: Codex.
- Date: 2026-03-06.
