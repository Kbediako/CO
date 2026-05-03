---
id: 20260430-linear-8a453a7c-ba31-4604-a88e-2e4c6244ec51
title: "CO-442 classify Codex rollout-item thread-not-found review log noise"
relates_to: docs/PRD-linear-8a453a7c-ba31-4604-a88e-2e4c6244ec51.md
risk: medium
owners:
  - Codex
last_review: 2026-05-03
---

# TECH_SPEC - CO-442 classify Codex rollout-item thread-not-found review log noise

This mirror points to the canonical task spec at `tasks/specs/linear-8a453a7c-ba31-4604-a88e-2e4c6244ec51.md`.

## Implementation Summary
- Create the CO-442 packet and registry mirrors for the recurring `codex_core::session` review log line.
- Preserve the exact log shape: `failed to record rollout items` plus `thread not found`.
- Preserve `review/telemetry.json` as authoritative when `status=succeeded`, `review_outcome=clean-success` or `review_outcome=bounded-success`, and `error=null`.
- Clear `backlog_head_follow_up_traceability_pending` through packet and mirror registration before active implementation begins.
- Define the blocking boundary: telemetry missing, unreadable, failed, contradictory, or wrapper-error outcomes remain blocking.
- Keep raw review output visible and do not suppress the emitted log line.
- Keep `CO-441` owner re-home work out of scope.

## Implementation Boundaries
- Packet setup edits only the CO-442 packet files, task index, task snapshot, and docs-freshness registry rows.
- Parent implementation may add parser/fixture/status projection coverage for review-log classification.
- No `CO-441` owner metadata edits.
- No raw log deletion, suppression, or redaction.
- No standalone review or review-wrapper weakening.
- No upstream Codex CLI patch unless local evidence proves CO-side classification cannot be safe.

## Validation Contract
- Packet setup validation must show:
  - all six packet/mirror files exist
  - `tasks/index.json` parses and contains `20260430-linear-8a453a7c-ba31-4604-a88e-2e4c6244ec51`
  - `docs/docs-freshness-registry.json` parses and contains six rows for the CO-442 packet/mirror docs
  - protected terms appear across packet and mirror surfaces
- Implementation validation must show:
  - fixture or parser coverage for the log shape
  - successful telemetry keeps the review outcome non-blocking despite the log line
  - missing or failed telemetry remains blocking
  - status, workpad, and handoff text do not flatten the case into a generic failed review
