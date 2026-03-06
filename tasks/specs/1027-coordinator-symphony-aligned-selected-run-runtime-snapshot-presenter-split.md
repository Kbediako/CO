---
id: 20260306-1027-coordinator-symphony-aligned-selected-run-runtime-snapshot-presenter-split
title: Coordinator Symphony-Aligned Selected-Run Runtime Snapshot + Presenter Split
relates_to: docs/PRD-coordinator-symphony-aligned-selected-run-runtime-snapshot-presenter-split.md
risk: high
owners:
  - Codex
last_review: 2026-03-06
---

## Summary
- Objective: replace the presenter-shaped selected-run runtime seam from `1026` with a transport-neutral runtime snapshot and explicit presenter adapters.
- Scope: one runtime snapshot type, HTTP/Telegram presenter mappings over that snapshot, dead-helper removal, and focused regression/manual evidence.
- Constraints: keep compatibility HTTP payloads stable, keep snapshot reads provider-free, and preserve CO's authority/auth posture.

## Pre-Implementation Review Note
- Decision: approved for docs-first planning and immediate implementation as the next slice after `1026`.
- Reasoning: `1026` fixed the behavior seam but left the runtime contract presenter-shaped. Real Symphony keeps runtime snapshots authoritative and presenters derived. The narrowest next step is therefore a transport-neutral selected-run runtime snapshot plus presenter split, not another behavior expansion.
- Initial review evidence: `docs/findings/1027-selected-run-runtime-snapshot-presenter-split-deliberation.md`, `out/1026-coordinator-symphony-aligned-control-runtime-canonical-read-model-exposure/manual/20260306T182203Z-closeout/14-next-slice-note.md`, `https://github.com/openai/symphony/blob/b0e0ff0082236a73c12a48483d0c6036fdd31fe1/SPEC.md`, `https://github.com/openai/symphony/blob/b0e0ff0082236a73c12a48483d0c6036fdd31fe1/elixir/lib/symphony_elixir/orchestrator.ex`, `https://github.com/openai/symphony/blob/b0e0ff0082236a73c12a48483d0c6036fdd31fe1/elixir/lib/symphony_elixir_web/presenter.ex`, `https://github.com/openai/symphony/blob/b0e0ff0082236a73c12a48483d0c6036fdd31fe1/elixir/lib/symphony_elixir_web/controllers/observability_api_controller.ex`.
- Delegated read-only review:
  - `019cc486-267d-7b21-810a-f7b8c8b5275d` approved the slice as boundary cleanup, confirmed Telegram plus compatibility `/state` and `/issue` as the concrete consumers of the presenter-shaped seam, and recommended keeping compatibility methods as thin wrappers if removing them would broaden scope.
  - `019cc486-2aff-7901-b9d0-03ad39344ca6` confirmed the smallest viable plan is `readSelectedRunSnapshot()` plus presenter retargeting in `observabilitySurface.ts` and `telegramOversightBridge.ts`, with issue-alias, latest-event contract, and Telegram hash sensitivity called out as the primary regression watch items.

## Technical Requirements
- Functional requirements:
  - `ControlRuntimeSnapshot` exposes a transport-neutral selected-run runtime snapshot,
  - compatibility `/state` and `/issue` shaping derives from that runtime snapshot,
  - Telegram status/issue/fingerprint shaping derives from that runtime snapshot,
  - `resolveIssueIdentifier()` is removed if no longer required,
  - public HTTP payloads and Telegram visible behavior remain stable.
- Non-functional requirements:
  - bounded refactor only,
  - no provider I/O on snapshot paths,
  - no public contract widening,
  - preserve refresh/publish coherence within a runtime snapshot.
- Interfaces / contracts:
  - public HTTP compatibility payloads stay backward-compatible,
  - Telegram command outputs keep the same facts even if their internal presenter source changes.

## Architecture & Data
- Architecture / design adjustments:
  - add a runtime-owned selected-run snapshot type,
  - move public DTO shaping out of the runtime seam,
  - keep `observabilitySurface.ts` and `telegramOversightBridge.ts` as presenter/adapter layers,
  - remove dead helper surface left by `1026`.
- Data model changes / migrations:
  - none.
- External dependencies / integrations:
  - existing runtime, observability, and Telegram bridge code plus real-Symphony read-only reference files only.

## Validation Plan
- Tests / checks:
  - targeted `ControlRuntime`, `TelegramOversightBridge`, and `ControlServer` coverage,
  - regression proving compatibility presenters and Telegram presenters stay aligned with the runtime snapshot,
  - full validation chain for the owned diff.
- Rollout verification:
  - docs-review manifest captured before implementation,
  - explicit elegance review and manual presenter-alignment evidence captured before closeout.
- Monitoring / alerts:
  - record explicit override reasons if shared-branch full-suite or review-wrapper noise recurs.

## Open Questions
- Whether compatibility HTTP read methods stay on `ControlRuntimeSnapshot` in this slice as wrappers over the new runtime snapshot, or whether they become purely controller-owned calls over presenter helpers.

## Approvals
- Reviewer: Codex.
- Date: 2026-03-06.
