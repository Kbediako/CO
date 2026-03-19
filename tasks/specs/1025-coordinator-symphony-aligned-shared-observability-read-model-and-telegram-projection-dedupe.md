---
id: 20260306-1025-coordinator-symphony-aligned-shared-observability-read-model-and-telegram-projection-dedupe
title: Coordinator Symphony-Aligned Shared Observability Read Model + Telegram Projection Dedupe
relates_to: docs/PRD-coordinator-symphony-aligned-shared-observability-read-model-and-telegram-projection-dedupe.md
risk: high
owners:
  - Codex
last_review: 2026-03-06
---

## Summary
- Objective: unify HTTP/UI/Telegram snapshot shaping behind one shared internal observability read-model seam and close the Telegram question-summary push-dedupe gap.
- Scope: one shared read-model extraction, one Telegram renderer/hash remap onto that model, and focused validation/manual evidence.
- Constraints: keep snapshot surfaces provider-free, keep CO's authority model unchanged, and avoid widening public contracts or transport behavior beyond the intentional Telegram dedupe correction.

## Pre-Implementation Review Note
- Decision: approved for docs-first planning and immediate implementation as the next slice after `1024`.
- Reasoning: the runtime/provider boundary is now stable, and the real remaining drift is read-model ownership. Real Symphony supports a canonical snapshot/read-model seam with thin controllers and optional surface renderers, while CO still duplicates tracked-linear shaping, selected-run summary shaping, and Telegram read contracts. The smallest behavior-correcting follow-up is a shared snapshot/read model plus the Telegram prompt/urgency hash fix.
- Initial review evidence: `docs/findings/1025-shared-observability-read-model-and-telegram-projection-dedupe-deliberation.md`, `out/1024-coordinator-symphony-aligned-snapshot-reads-and-live-linear-dispatch-separation/manual/20260306T160352Z-closeout/15-next-slice-note.md`, `/Users/kbediako/Code/symphony/SPEC.md`, `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir_web/presenter.ex`, `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir_web/controllers/observability_api_controller.ex`.
- Delegated review refinement: a bounded `gpt-5.4` Symphony research stream confirmed the next durable seam is canonical coordinator snapshot/read-model reuse, not another transport/controller extraction. A second bounded `gpt-5.4` CO-local audit identified the remaining duplicate tracked-linear builder, the shadow Telegram payload contract, and the question-summary hash bug. Those findings are incorporated into this spec and checklist as the approved next move. Evidence: `docs/findings/1025-shared-observability-read-model-and-telegram-projection-dedupe-deliberation.md`.

## Technical Requirements
- Functional requirements:
  - shared internal read-model types/builders exist for selected-run snapshot facts and tracked/question/dispatch summary facts,
  - HTTP/UI payload builders consume the shared read model instead of rebuilding overlapping summary fields independently,
  - Telegram rendering consumes the shared read-model types instead of a shadow HTTP payload contract,
  - Telegram push dedupe invalidates on prompt or urgency changes for the latest queued question even when `question_id` is unchanged,
  - dispatch semantics stay unchanged.
- Non-functional requirements:
  - no public route additions,
  - no provider I/O added back to snapshot paths,
  - bounded refactor only.
- Interfaces / contracts:
  - existing HTTP response shapes stay compatible,
  - Telegram command outputs may change only where the intended hash correction causes a missing push to now emit.

## Architecture & Data
- Architecture / design adjustments:
  - add a focused internal shared snapshot/read-model module,
  - keep `selectedRunProjection.ts` focused on runtime-state extraction,
  - keep `observabilitySurface.ts` focused on HTTP/UI payload envelopes,
  - keep `telegramOversightBridge.ts` focused on text rendering and transport behavior,
  - let `controlServer.ts` continue to own question expiry/audit/controller wiring.
- Data model changes / migrations:
  - none.
- External dependencies / integrations:
  - existing `ControlRuntime`, `SelectedRunProjectionReader`, `LiveLinearAdvisoryRuntime`, and Telegram oversight bridge,
  - real `openai/symphony` snapshot/presenter guidance as read-only reference only.

## Validation Plan
- Tests / checks:
  - targeted `ControlRuntime`, `ControlServer`, and `TelegramOversightBridge` coverage,
  - regression covering prompt/urgency-only latest-question changes under the same `question_id`,
  - full validation chain for the owned diff.
- Rollout verification:
  - docs-review manifest captured before implementation,
  - explicit elegance review and manual mock evidence captured before closeout.
- Monitoring / alerts:
  - record explicit override reasons if shared branch noise recurs in full-suite or review lanes.

## Open Questions
- Whether the next slice after this one should expose the shared read model directly from `ControlRuntime`, or whether that remains an internal seam behind HTTP/UI/Telegram consumers.

## Approvals
- Reviewer: Codex.
- Date: 2026-03-06.
