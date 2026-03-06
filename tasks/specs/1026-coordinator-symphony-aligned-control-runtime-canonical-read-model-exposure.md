---
id: 20260306-1026-coordinator-symphony-aligned-control-runtime-canonical-read-model-exposure
title: Coordinator Symphony-Aligned Control Runtime Canonical Read Model Exposure
relates_to: docs/PRD-coordinator-symphony-aligned-control-runtime-canonical-read-model-exposure.md
risk: high
owners:
  - Codex
last_review: 2026-03-06
---

## Summary
- Objective: expose a canonical selected-run/read-model seam directly from `ControlRuntime` and move Telegram read-side status/issue rendering plus projection-push hashing onto it.
- Scope: one runtime contract addition, one Telegram adapter/remap, and focused regression/manual evidence.
- Constraints: keep compatibility HTTP behavior stable, keep snapshot reads provider-free, and preserve CO's authority/auth posture.

## Pre-Implementation Review Note
- Decision: approved for docs-first planning and immediate implementation as the next slice after `1025`.
- Reasoning: `1025` unified snapshot shaping, but the runtime boundary still leans on compatibility HTTP envelopes. Real Symphony keeps orchestrator/runtime snapshot state primary and controller/presenter layers thin. The smallest next correction is therefore to expose the canonical selected-run seam directly from `ControlRuntime` and let Telegram consume it without another transport-shaped hop.
- Initial review evidence: `docs/findings/1026-control-runtime-canonical-read-model-exposure-deliberation.md`, `out/1025-coordinator-symphony-aligned-shared-observability-read-model-and-telegram-projection-dedupe/manual/20260306T173344Z-closeout/15-next-slice-note.md`, `https://github.com/openai/symphony/blob/b0e0ff0082236a73c12a48483d0c6036fdd31fe1/SPEC.md`, `https://github.com/openai/symphony/blob/b0e0ff0082236a73c12a48483d0c6036fdd31fe1/elixir/lib/symphony_elixir/orchestrator.ex`, `https://github.com/openai/symphony/blob/b0e0ff0082236a73c12a48483d0c6036fdd31fe1/elixir/lib/symphony_elixir_web/presenter.ex`, `https://github.com/openai/symphony/blob/b0e0ff0082236a73c12a48483d0c6036fdd31fe1/elixir/lib/symphony_elixir_web/controllers/observability_api_controller.ex`.
- Delegated review refinement: bounded `gpt-5.4` Symphony and CO-local explorer streams converged on the same minimal move: expose one runtime-owned selected-run read model, let Telegram consume it directly for status/issue/hash behavior, and leave compatibility HTTP state/issue routes as thin wrappers for now. The Symphony stream did not surface evidence strong enough to reopen earlier completed slices. Evidence: `docs/findings/1026-control-runtime-canonical-read-model-exposure-deliberation.md`.

## Technical Requirements
- Functional requirements:
  - `ControlRuntimeSnapshot` exposes a canonical selected-run/read-model method for internal consumers,
  - Telegram `/status` and `/issue` rendering consume that canonical model,
  - Telegram projection-push hashing consumes that canonical model rather than the compatibility `state` payload,
  - compatibility HTTP state/issue/dispatch/refresh behavior remains unchanged,
  - `resolveIssueIdentifier()` remains coherent with the new runtime seam.
- Non-functional requirements:
  - bounded refactor only,
  - no new provider I/O on snapshot paths,
  - no public contract widening.
- Interfaces / contracts:
  - existing HTTP compatibility payloads stay backward-compatible,
  - Telegram output remains semantically equivalent, now sourced from the canonical runtime model.

## Architecture & Data
- Architecture / design adjustments:
  - add a canonical selected-run/read-model method to `ControlRuntime`,
  - keep `selectedRunProjection.ts` focused on selected-run extraction,
  - keep `observabilitySurface.ts` focused on compatibility/UI payload shaping,
  - keep `telegramOversightBridge.ts` focused on text rendering and transport behavior.
- Data model changes / migrations:
  - none.
- External dependencies / integrations:
  - existing runtime, observability, Telegram bridge, and real-Symphony read-only reference files only.

## Validation Plan
- Tests / checks:
  - targeted `ControlRuntime`, `TelegramOversightBridge`, and `ControlServer` coverage,
  - regression for canonical-model-driven projection hashing,
  - full validation chain for the owned diff.
- Rollout verification:
  - docs-review manifest captured before implementation,
  - explicit elegance review and manual mock evidence captured before closeout.
- Monitoring / alerts:
  - record explicit override reasons if shared-branch full-suite or review-wrapper noise recurs.

## Open Questions
- Whether a later slice should also move compatibility HTTP state/issue shaping to the canonical runtime model directly, or whether the current separation is the right stopping point.

## Approvals
- Reviewer: Codex.
- Date: 2026-03-06.
