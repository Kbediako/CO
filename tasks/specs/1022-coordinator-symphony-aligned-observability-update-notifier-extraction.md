---
id: 20260306-1022-coordinator-symphony-aligned-observability-update-notifier-extraction
title: Coordinator Symphony-Aligned Observability Update Notifier Extraction
relates_to: docs/PRD-coordinator-symphony-aligned-observability-update-notifier-extraction.md
risk: high
owners:
  - Codex
last_review: 2026-03-06
---

## Summary
- Objective: remove Telegram-specific observability update coupling by introducing a generic in-process notifier for projection/observability update signals.
- Scope: one notifier extraction, `ControlServer` publisher/subscriber rewiring, and focused regression coverage.
- Constraints: keep CO execution authority unchanged, keep Linear advisory-only and fail-closed, and keep `/control/action` plus current Telegram read rendering behavior intact in this lane.

## Pre-Implementation Review Note
- Decision: approved for docs-first planning and immediate implementation as the next slice after `1021`.
- Reasoning: `1021` removed Telegram's self-HTTP read loop, leaving the direct Telegram callback contract inside `RequestContext` and `ControlServer` as the clearest remaining architectural mismatch against Symphony's generic observability update signaling pattern.
- Initial review evidence: `docs/findings/1022-observability-update-notifier-extraction-deliberation.md`, `docs/findings/1021-telegram-in-process-read-model-reuse-deliberation.md`, `out/1020-coordinator-symphony-aligned-dispatch-presenter-controller-extraction/manual/20260306T121624Z-closeout/12-next-slice-note.md`.
- Delegated review synthesis: the delegated next-slice scout found no pre-existing registered post-`1021` task and pointed to the notifier/PubSub seam as the smallest coherent follow-on; a second collab research stream was blocked by the active thread limit, so local read-only inspection of CO and real Symphony update-signaling code was used as the explicit bounded fallback for this docs-first review. Evidence: `docs/findings/1022-observability-update-notifier-extraction-deliberation.md`.

## Technical Requirements
- Functional requirements:
  - replace publisher-facing `notifyTelegramProjectionDelta(...)` usage with a generic observability update notifier,
  - preserve current update-trigger sources unless they are already intentionally silent,
  - subscribe the Telegram bridge through the notifier without changing Telegram command behavior,
  - keep bridge startup/shutdown safe with zero or one subscriber.
- Non-functional requirements:
  - no public API changes,
  - no authority widening,
  - fail-soft subscriber behavior,
  - minimal, testable in-process extraction only.
- Interfaces / contracts:
  - notifier contract should stay internal-only,
  - external HTTP routes remain intact,
  - no new env vars, persisted state files, or secret contracts are introduced.

## Architecture & Data
- Architecture / design adjustments:
  - add a tiny notifier module or equivalent internal helper in the control layer,
  - `ControlServer` becomes the owner of notifier lifecycle instead of a Telegram-named callback contract,
  - publishers send generic update metadata and subscribers decide how to react.
- Data model changes / migrations:
  - none at repo or runtime storage level.
- External dependencies / integrations:
  - existing `ControlServer`,
  - existing `telegramOversightBridge.ts`,
  - real `openai/symphony` `ObservabilityPubSub` and dashboard subscriber files as read-only reference only.

## Validation Plan
- Tests / checks:
  - targeted control/Telegram coverage for notifier publish/subscribe lifecycle and retained update triggers,
  - manual simulated/mock notifier-to-Telegram verification,
  - full repo validation gate chain for the owned diff.
- Rollout verification:
  - docs-review manifest captured before implementation,
  - elegance review and closeout evidence captured before handoff.
- Monitoring / alerts:
  - rely on existing bridge/manual artifacts,
  - record any collab-thread-limit, diff-budget, or review-wrapper overrides explicitly if they recur.

## Open Questions
- Whether the next slice after this one should stay in observability/control-surface layering or move to a different Symphony-inspired seam once publishers stop knowing about Telegram directly.

## Approvals
- Reviewer: Codex.
- Date: 2026-03-06.
