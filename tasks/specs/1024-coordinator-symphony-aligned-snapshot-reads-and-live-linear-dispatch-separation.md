---
id: 20260306-1024-coordinator-symphony-aligned-snapshot-reads-and-live-linear-dispatch-separation
title: Coordinator Symphony-Aligned Snapshot Reads + Live Linear Dispatch Separation
relates_to: docs/PRD-coordinator-symphony-aligned-snapshot-reads-and-live-linear-dispatch-separation.md
risk: high
owners:
  - Codex
last_review: 2026-03-06
---

## Summary
- Objective: keep synchronous snapshot/read surfaces runtime-state-only by moving live Linear advisory work behind a bounded runtime-owned advisory cache while preserving explicit live evaluation on the dispatch path.
- Scope: one runtime advisory-cache seam, one snapshot/dispatch semantic split, one tracked-payload meaning cleanup, and focused regression/manual evidence.
- Constraints: keep CO execution authority unchanged, keep Linear advisory-only, keep Telegram bounded, and avoid introducing a background async cache/poller in this lane.

## Pre-Implementation Review Note
- Decision: approved for docs-first planning and immediate implementation as the next slice after `1023`.
- Reasoning: the runtime boundary from `1023` is now good enough to separate snapshot-state semantics from explicit dispatch evaluation without reopening control/runtime ownership. Real Symphony guidance is clear that synchronous snapshot surfaces should draw from orchestrator state only; CO still violates that by warming live provider evaluation during status reads. Delegated real-Symphony research and local failure analysis both converged on the same fix: provider-free selected-run projection plus a bounded runtime-owned advisory cache.
- Initial review evidence: `docs/findings/1024-snapshot-reads-and-live-linear-dispatch-separation-deliberation.md`, `out/1023-coordinator-symphony-aligned-control-runtime-boundary-extraction/manual/20260306T150635Z-closeout/00-summary.md`, `/Users/kbediako/Code/symphony/SPEC.md`, `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir_web/presenter.ex`.
- Delegated review refinement: real-Symphony research recommended a runtime-owned live advisory cache with single-flight refresh and cache-only snapshot reads, while local failure analysis confirmed the current root cause is runtime-boundary coupling rather than a payload contract bug. Those findings are incorporated into this spec and checklist as the approved next move.

## Technical Requirements
- Functional requirements:
  - snapshot surfaces stop doing live provider reads,
  - runtime owns bounded advisory refresh/invalidation behavior,
  - snapshot `tracked` payloads reflect accepted advisory/runtime-owned context only,
  - dispatch route keeps explicit live advisory evaluation and fail-closed behavior,
  - live-Linear ingress tests become deterministic without depending on real network.
- Non-functional requirements:
  - no public surface expansion,
  - no new env vars or persistence contracts,
  - bounded semantic cleanup only.
- Interfaces / contracts:
  - `/api/v1/state`, `/api/v1/:issue`, `/ui/data.json`, and Telegram reads remain authoritative status surfaces,
  - `/api/v1/dispatch` remains the explicit live advisory read surface,
  - Linear advisory ingress sidecar remains the source of accepted tracked context.

## Architecture & Data
- Architecture / design adjustments:
  - add a bounded runtime-owned advisory cache seam,
  - keep provider-backed evaluation on the dispatch path,
  - keep snapshot surfaces on runtime-state-only data,
  - separate snapshot policy summary from provider-backed recommendation data where needed.
- Data model changes / migrations:
  - none at repo or runtime storage level.
- External dependencies / integrations:
  - existing runtime boundary from `1023`,
  - existing tracker-dispatch helpers and advisory ingress sidecar,
  - real `openai/symphony` snapshot/presenter guidance as read-only reference only.

## Validation Plan
- Tests / checks:
  - targeted snapshot/dispatch/Linear-ingress regression coverage,
  - manual simulated/mock proof that state/issue/UI avoid provider reads,
  - full repo validation gate chain for the owned diff.
- Rollout verification:
  - docs-review manifest captured before implementation,
  - elegance review and closeout evidence captured before handoff.
- Monitoring / alerts:
  - keep override reasons explicit if the existing review/full-suite noise recurs.

## Open Questions
- Whether the follow-up after this slice should add poller cadence around the advisory cache or keep refresh/webhook invalidation as the only refresh triggers.

## Approvals
- Reviewer: Codex.
- Date: 2026-03-06.
