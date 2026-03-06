# PRD - Coordinator Symphony-Aligned Selected-Run Runtime Snapshot + Presenter Split (1027)

## Summary
- Problem Statement: `1026` removed Telegram's dependency on compatibility `state`/`issue` envelopes, but the runtime seam is still presenter-shaped. `ControlRuntime` exports `ControlSelectedRunReadModel`, which is built from public snake_case DTOs in `observabilityReadModel.ts`, and still carries the now-redundant `resolveIssueIdentifier()` helper.
- Desired Outcome: introduce one transport-neutral selected-run runtime snapshot owned by `ControlRuntime`, move HTTP/Telegram fingerprint and rendering layers onto presenter mappings over that runtime snapshot, and keep existing public HTTP payloads and Telegram behavior stable.
- Scope Status: docs-first planning for the next Symphony-aligned boundary slice after `1026`; implementation is expected in this lane if docs-review approves the scope unchanged.

## User Request Translation
- Continue as the Orchestrator and keep delivering the remaining Symphony-aligned CO slices end to end.
- Use real `openai/symphony` as the structural reference, especially where it keeps orchestrator/runtime state distinct from presenter/controller payloads.
- Stay open to larger refactors when justified, but keep each slice bounded, evidence-backed, and reviewable.
- Preserve CO's harder authority posture:
  - CO remains execution authority,
  - Telegram remains a bounded operator/downstream surface,
  - Linear remains advisory-only and fail-closed,
  - no scheduler ownership transfer.

## Baseline and Gap
- `1026` gave `ControlRuntime` a direct selected-run seam and moved Telegram onto it.
- The remaining mismatch is type ownership, not behavior:
  - the runtime seam still returns public payload DTOs,
  - presenter helpers still live inside the runtime path,
  - dead/read-through helpers remain because the seam is not fully presenter-neutral.
- Real Symphony still points to the same next move:
  - runtime snapshot first,
  - presenter mapping second,
  - controller/transport shells last.

## Goals
- Add one runtime-owned selected-run snapshot type that is not shaped as public DTOs.
- Move presenter mapping for HTTP compatibility payloads and Telegram text/fingerprint shaping onto explicit adapter helpers over that runtime snapshot.
- Remove dead helper surface left behind by `1026`, especially `resolveIssueIdentifier()`.
- Keep public HTTP routes and Telegram user-visible semantics stable.
- Lock the new boundary down with focused regression/manual evidence.

## Non-Goals
- No new routes, commands, or provider behaviors.
- No Linear authority widening or mutation flow changes.
- No question-queue model expansion unless it is strictly required by the selected-run runtime snapshot boundary.
- No rewrite of dispatch evaluation behavior.
- No Elixir/BEAM rewrite.

## Stakeholders
- CO operators and future downstream CO users who need a stable oversight surface.
- CO maintainers who need a runtime contract that is not implicitly coupled to HTTP payload shapes.

## Metrics & Guardrails
- Primary Success Metrics:
  - `ControlRuntime` owns a transport-neutral selected-run snapshot type,
  - HTTP compatibility state/issue presenters consume that runtime snapshot,
  - Telegram status/issue/fingerprint presenters consume that runtime snapshot,
  - redundant runtime helper surface is reduced,
  - public route behavior stays backward-compatible.
- Guardrails / Error Budgets:
  - no provider I/O added to snapshot reads,
  - no auth/control semantics change,
  - no public payload contract drift,
  - no new branch-wide scope creep beyond the selected-run runtime snapshot/presenter split.

## Technical Considerations
- Architectural Notes:
  - mirror Symphony's runtime/presenter separation, not its product surface,
  - keep runtime facts in runtime-owned camelCase/internal types,
  - keep public snake_case DTOs in presenter/adapter helpers only,
  - let Telegram remain a thin renderer over runtime facts.
- Dependencies / Integrations:
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - `orchestrator/src/cli/control/observabilityReadModel.ts`
  - `orchestrator/src/cli/control/observabilitySurface.ts`
  - `orchestrator/src/cli/control/telegramOversightBridge.ts`
  - `orchestrator/src/cli/control/controlServer.ts`
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - real `openai/symphony` `SPEC.md`, `orchestrator.ex`, `presenter.ex`, and `observability_api_controller.ex` as read-only references

## Open Questions
- Whether compatibility HTTP route methods remain on `ControlRuntimeSnapshot` in this slice as thin wrappers, or whether only the selected-run runtime snapshot surface should stay public to internal consumers.

## Approvals
- Product: Codex (per user-approved current and future slices, 2026-03-06).
- Engineering: Codex.
- Design: N/A.
