---
id: 20260306-1021-coordinator-symphony-aligned-telegram-in-process-read-model-reuse
title: Coordinator Symphony-Aligned Telegram In-Process Read Model Reuse
relates_to: docs/PRD-coordinator-symphony-aligned-telegram-in-process-read-model-reuse.md
risk: high
owners:
  - Codex
last_review: 2026-03-06
---

## Summary
- Objective: remove Telegram's local self-HTTP read loop and reuse CO's internal selected-run/observability read boundary directly.
- Scope: one Telegram read-adapter refactor, one `controlServer.ts` bridge-start wiring change, and focused regression coverage.
- Constraints: keep CO execution authority unchanged, keep Linear advisory-only and fail-closed, and keep `/pause` and `/resume` on the existing `/control/action` transport path in this lane.

## Pre-Implementation Review Note
- Decision: approved for docs-first planning and immediate implementation as the next slice after `1020`.
- Reasoning: `1020` closed the dispatch presenter/controller seam, leaving Telegram's in-process self-HTTP loop as the highest-leverage remaining architectural mismatch against Symphony's snapshot-first reuse pattern.
- Initial review evidence: `docs/findings/1021-telegram-in-process-read-model-reuse-deliberation.md`, `out/1020-coordinator-symphony-aligned-dispatch-presenter-controller-extraction/manual/20260306T121624Z-closeout/12-next-slice-note.md`, `out/1019-coordinator-symphony-aligned-observability-presenter-controller-split/manual/20260306T112455Z-closeout/22-next-slice-note.md`.
- Delegated review synthesis: bounded `gpt-5.4` research and design streams both converged on a narrow Telegram read adapter for state/issue/dispatch/questions plus current issue resolution, warned against holding one long-lived memoized `SelectedRunProjectionReader`, and recommended keeping `/pause` and `/resume` on `/control/action` for this slice so transport/idempotency/traceability behavior stays unchanged. Evidence: `docs/findings/1021-telegram-in-process-read-model-reuse-deliberation.md`.

## Technical Requirements
- Functional requirements:
  - remove bridge read-side calls to local `/api/v1/state`, `/api/v1/:issue`, `/api/v1/dispatch`, and `/questions`,
  - replace them with an injected in-process Telegram read adapter,
  - preserve Telegram `/status`, `/issue`, `/dispatch`, `/questions`, and projection-push behavior,
  - keep the write path for `/pause` and `/resume` unchanged.
- Non-functional requirements:
  - no public behavior regression for Telegram commands,
  - no authority widening,
  - fresher, simpler in-process layering than the `1014`-`1020` baseline,
  - deterministic, testable bridge behavior.
- Interfaces / contracts:
  - bridge-facing read model remains internal-only,
  - external HTTP routes remain intact for external clients,
  - no new env vars or secret storage contracts are introduced.

## Architecture & Data
- Architecture / design adjustments:
  - `telegramOversightBridge.ts` gains a narrow injected read adapter,
  - `controlServer.ts` constructs that adapter from existing read-side boundaries,
  - no long-lived memoized selected-run reader is retained inside the bridge runtime.
- Data model changes / migrations:
  - none at repo or runtime storage level.
- External dependencies / integrations:
  - existing `selectedRunProjection.ts`,
  - existing `observabilitySurface.ts`,
  - existing `ControlServer`,
  - real `openai/symphony` files as read-only reference only.

## Validation Plan
- Tests / checks:
  - targeted Telegram bridge coverage for read commands, push-delta dedupe, and retained mutation behavior,
  - integrated coverage through `ControlServer.start()` so bridge wiring is exercised on the real startup path,
  - manual simulated/mock Telegram bridge verification,
  - full repo validation gate chain for the owned diff.
- Rollout verification:
  - delegated read-only review stream captured before implementation closeout,
  - elegance review and closeout evidence captured before handoff.
- Monitoring / alerts:
  - rely on existing push/manual artifacts,
  - keep override reasons explicit if review-wrapper or branch-scope diff-budget noise persists.

## Open Questions
- Whether the follow-on slice should extract an internal observability update notifier so Telegram can react to projection changes through the same shared read boundary rather than direct control-server callbacks.

## Approvals
- Reviewer: Codex.
- Date: 2026-03-06.
