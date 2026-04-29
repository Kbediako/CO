---
id: 20260329-linear-ebb62cc0-77d0-41e4-8640-abbd5126cced
title: CO: Surface and handle Linear rate limits in provider tracked-issue rereads
status: done
owner: Codex
created: 2026-03-29
last_review: 2026-04-29
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-ebb62cc0-77d0-41e4-8640-abbd5126cced.md
related_action_plan: docs/ACTION_PLAN-linear-ebb62cc0-77d0-41e4-8640-abbd5126cced.md
related_tasks:
  - tasks/tasks-linear-ebb62cc0-77d0-41e4-8640-abbd5126cced.md
review_notes:
  - 2026-04-29: CO-409 PR #719 freshness review reread this historical task packet/mirror after the Mar 29 cadence crossed the gate; content remains valid for its original issue scope, so only freshness metadata was refreshed under live docs:freshness:maintain owner CO-409.
  - 2026-04-29: CO-422 live Linear audit confirmed CO-34 is `Done`; this spec is reclassified to inactive `done` after the CO-409 freshness review so completed implementation evidence remains preserved without staying in active-spec freshness.
  - 2026-03-29: Opened from Linear issue `CO-34` after rechecking the live workflow states with `linear issue-context`; the CO team exposes `In Progress`, `In Review`, `Merging`, and `Rework`, and the issue started this lane in `Ready` with no attached PR or workpad comment.
  - 2026-03-29: The workspace started detached at `c7f3b2134d71f323fe874734510e8f324b96f661` and moved onto branch `co-34-surface-tracked-issue-rate-limits` before repo edits.
  - 2026-03-29: Pre-implementation review approves the narrow path: preserve explicit Linear rate-limit metadata in tracked-issue rereads, add bounded short-window wait only where safe, widen worker proof truthfully, and avoid reopening the broader `CO-33` mutation seam.
  - 2026-03-29: Docs-review succeeded via `/Users/kbediako/Code/CO/.runs/linear-ebb62cc0-77d0-41e4-8640-abbd5126cced-docs-review/cli/2026-03-29T11-31-24-681Z-749a0ed3/manifest.json`; the `linear child-stream` wrapper returned `provider_worker_child_stream_output_invalid` because orchestrator logs preceded the final JSON payload, so this lane records the manifest-backed approval directly instead of treating the wrapper parse bug as a docs-review failure.
---

# Technical Specification

## Context

`CO-34` is a bounded follow-up to `CO-33`. The helper mutation/write seam now surfaces explicit rate limits, but the provider tracked-issue reread path still collapses Linear `RATELIMITED` failures into `dispatch_source_provider_request_failed` and later into worker `tracked_issue_read_failed`. The repair lane must keep scope limited to tracked-issue rereads, bounded pacing, proof surfacing, and focused tests.

## Requirements

1. Tracked-issue-by-id rereads must classify Linear `RATELIMITED` failures explicitly instead of returning a generic provider request failure.
2. The structured tracked-issue rate-limit failure must preserve request/reset metadata derived from Linear response headers.
3. Provider-worker rereads may wait through a reset window only when the computed wait is short, explicit, and safe; otherwise the worker must fail explicitly as rate-limited.
4. `ProviderLinearWorkerProof` must distinguish tracked-issue rate limits from other reread failures and expose retry/reset metadata to downstream control-host readers.
5. The implementation may reduce avoidable reread pressure only where doing so does not weaken ownership, scope, or state truthfulness.
6. Focused regressions must cover by-id rate-limit classification and worker post-turn reread behavior.
7. Docs must record the Linear header/reset semantics used for rate-limit classification and bounded reread pacing.

## Current Truth

- `linearDispatchSource.ts` currently maps most tracked-issue GraphQL failures to `dispatch_source_provider_request_failed`, even when the underlying GraphQL error is `RATELIMITED`.
- `providerLinearWorkflowFacade.ts` already contains the richer `linear_rate_limited` mapping introduced in `CO-33`, including `retry-after`, `x-ratelimit-requests-reset`, remaining/limit counters, and request id metadata.
- `providerLinearWorkerRunner.ts` currently throws `Unable to resolve provider issue ...: <reason>` when rereads fail, then persists only `end_reason: tracked_issue_read_failed`, so the raw reason/metadata are lost from proof.
- Current selected-run and observability surfaces already pass raw `provider_linear_worker_proof` through, so a widened proof contract is likely sufficient for control-host visibility unless tests prove otherwise.

## Validation Plan

- Run `docs-review` via the audited `linear child-stream` path before implementation handoff.
- Add focused tests in `orchestrator/tests/LinearDispatchSource.test.ts` and `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`.
- Add proof/read-model coverage only if widened proof fields require it.
- Run the required validation floor after implementation.
- Capture standalone review and explicit elegance review before review handoff.
