---
id: 20260306-1023-coordinator-symphony-aligned-control-runtime-boundary-extraction
title: Coordinator Symphony-Aligned Control Runtime Boundary Extraction
relates_to: docs/PRD-coordinator-symphony-aligned-control-runtime-boundary-extraction.md
risk: high
owners:
  - Codex
last_review: 2026-03-06
---

## Summary
- Objective: extract a shared control runtime boundary from `controlServer.ts` so HTTP/UI/Telegram surfaces consume a shared snapshot/refresh/subscribe contract instead of local runtime assembly.
- Scope: one runtime-boundary extraction, one `controlServer.ts` integration pass, one bounded refresh-semantics upgrade, and focused regression coverage.
- Constraints: keep CO execution authority unchanged, keep Linear advisory-only, and avoid live cache/poller or broader route-guard refactors in this lane.

## Pre-Implementation Review Note
- Decision: approved for docs-first planning and immediate implementation as the next slice after `1022`.
- Reasoning: `1017` through `1022` substantially reduced read-side and notifier concentration, but left `controlServer.ts` as the runtime composition hub; the real Symphony seam is orchestrator/runtime state -> presenter -> controller/UI, so the next bounded extraction should target that runtime boundary rather than another Telegram- or route-local cleanup.
- Initial review evidence: `docs/findings/1023-control-runtime-boundary-extraction-deliberation.md`, `docs/findings/1022-observability-update-notifier-extraction-deliberation.md`, `out/1022-coordinator-symphony-aligned-observability-update-notifier-extraction/manual/20260306T141051Z-closeout/00-summary.md`.
- Delegated review synthesis: a delegated CO scout confirmed the remaining concentration is still centered in `controlServer.ts`, a delegated real-Symphony scout recommended a supervisor-owned `snapshot()/requestRefresh()/subscribe()` boundary as the strongest next seam, a second real-Symphony audit identified refresh as the main semantic mismatch still left in CO, and the delegated real-Symphony Linear scout confirmed the upstream Linear pattern is a tool-contract and hardening reference rather than a generic full-tracker write model. Evidence: `docs/findings/1023-control-runtime-boundary-extraction-deliberation.md`.
- Docs-review gate evidence: `.runs/1023-coordinator-symphony-aligned-control-runtime-boundary-extraction/cli/2026-03-06T14-54-00-695Z-3528b753/manifest.json`, `out/1023-coordinator-symphony-aligned-control-runtime-boundary-extraction/manual/20260306T145600Z-docs-review-override/00-summary.md`.

## Technical Requirements
- Functional requirements:
  - move shared runtime composition out of `controlServer.ts`,
  - preserve shared selected-run/advisory/read payload behavior,
  - upgrade refresh from route-local acknowledgement to bounded runtime invalidation/re-warm behavior while preserving the external response shape,
  - preserve observability publish/subscribe behavior.
- Non-functional requirements:
  - no public contract changes,
  - no new authority or mutation semantics,
  - bounded internal extraction only,
  - direct testability with runtime-boundary-focused tests.
- Interfaces / contracts:
  - existing state/issue/dispatch/refresh/UI route contracts remain authoritative,
  - advisory state sidecar schema remains unchanged,
  - no new env vars or secret storage contracts are introduced.

## Architecture & Data
- Architecture / design adjustments:
  - add one dedicated control runtime module under `orchestrator/src/cli/control/`,
  - keep `controlServer.ts` responsible for route hosting and protocol behavior,
  - move selected-run/read-model/notifier assembly behind the runtime boundary,
  - let the runtime own refresh invalidation and re-warm behavior.
- Data model changes / migrations:
  - none at repo or runtime storage level.
- External dependencies / integrations:
  - existing `selectedRunProjection.ts`,
  - existing `observabilitySurface.ts`,
  - existing advisory state sidecar and observability notifier,
  - real `openai/symphony` `SPEC.md`, `elixir/lib/symphony_elixir/orchestrator.ex`, `elixir/lib/symphony_elixir_web/presenter.ex`, `elixir/lib/symphony_elixir_web/controllers/observability_api_controller.ex`, and the upstream Linear skill contract as read-only reference only.

## Validation Plan
- Tests / checks:
  - targeted runtime-boundary regression coverage,
  - targeted refresh invalidation/warm-path coverage,
  - targeted Telegram/coherence regression coverage where notifier behavior matters,
  - manual simulated/mock runtime coherence verification,
  - full repo validation gate chain for the owned diff.
- Rollout verification:
  - delegated scout evidence captured before implementation,
  - docs-review manifest captured before implementation,
  - elegance review and closeout evidence captured before handoff,
  - closeout evidence recorded in `out/1023-coordinator-symphony-aligned-control-runtime-boundary-extraction/manual/20260306T150635Z-closeout/00-summary.md`.
- Monitoring / alerts:
  - rely on existing manual artifacts,
  - record any diff-budget or review-wrapper overrides explicitly if they recur.

## Open Questions
- Whether the immediate follow-up after this extraction should move live Linear tracked context behind a refreshable cache/poller or extract the remaining route/protocol guards from `controlServer.ts`.

## Approvals
- Reviewer: Codex.
- Date: 2026-03-06.
