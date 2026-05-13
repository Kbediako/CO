---
id: 20260410-linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc
title: CO STATUS: clear stale retry state when active claims rehydrate so one issue cannot appear in both Running and Backoff
relates_to: docs/PRD-linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc.md
risk: medium
owners:
  - Codex
last_review: 2026-04-10
---

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: repair the provider claim-state seam so authoritative active-run rehydrates clear stale retry metadata and one issue cannot truthfully project as both `Running` and `Backoff`.
- Scope: active-run rehydrate/upsert paths, retry-field persistence defaults, focused claim/runtime regressions, and docs/review evidence.
- Constraints: preserve true retry-owned semantics for `resumable` and `handoff_failed` flows; do not widen into renderer dedupe, fallback-row identity, EVENT provenance, or merge-closeout cleanup work.

## Issue-Shaping Contract
- User-request translation carried forward:
  - fix the underlying claim-state bug, not just the rendered duplicate
  - once a claim is authoritatively rebound to an active run, stale `retry_queued`, `retry_due_at`, and `retry_error` should be cleared unless the claim is still genuinely retry-owned
- Protected terms / exact artifact and surface names:
  - `Running`, `Backoff`, `retry_queued`, `retry_due_at`, `retry_error`, `provider_issue_rehydrated_active_run`, `providerIssueHandoff.ts`, `providerIntakeState.ts`
- Nearby wrong interpretations to reject:
  - renderer-only duplicate suppression
  - blanket retry-field clearing on all non-retry states without preserving real resumable/handoff-failed semantics
  - reopening synthetic fallback-row or merge-closeout work
- Explicit non-goals carried forward:
  - no `CO-112`, `CO-138`, or fallback-row work in this lane

## Parity / Alignment Matrix
- Required for parity/alignment lanes; otherwise state `Not applicable`.
- Current truth:
  - rehydrate paths write `state: running` / `reason: provider_issue_rehydrated_active_run` and clear `merge_closeout`, but stale retry metadata can remain
  - `upsertProviderIntakeClaim(...)` can preserve existing retry fields when the incoming write does not explicitly supersede them
  - runtime/dashboard surfaces are mostly truthful about current claim state
  - the current shared-root intake artifact no longer preserves the original stale-shape claim, so focused tests are the authoritative reproducer in this rework attempt
- Reference truth:
  - running claims should not retain stale retry metadata unless they are still intentionally retry-owned
- Target truth / intended delta:
  - active rehydrate/upsert paths explicitly clear stale retry metadata for authoritative running claims
  - true retry-owned paths still preserve retry fields and Backoff projection
- Explicitly out-of-scope differences:
  - generic renderer dedupe
  - unrelated merge-closeout or fallback identity work

## Readiness Gate
- Not done if:
  - a running rehydrated claim can still keep stale retry metadata
  - real retry/resumable flows lose their retry ownership semantics
  - the same issue can still project into both `Running` and `Backoff` after authoritative rehydrate
- Pre-implementation issue-quality review evidence:
  - Local source audit confirms the issue is narrower than a STATUS/UI lane. `providerIssueHandoff.ts` has multiple active-run rehydrate writes that clear `merge_closeout` but do not explicitly clear retry metadata, and `providerIntakeState.ts` can preserve retry fields by default from existing claim state. The runtime/dashboard layers are already mostly truthful about the resulting inconsistent claim record.
- Safeguard ownership split:
  - top-level lane owns docs, implementation, validation, and Linear workpad updates; the audited child stream is review-only evidence, not overlapping code ownership

## Technical Requirements
- Functional requirements:
  - every authoritative active-run rehydrate/upsert path must clear stale retry metadata unless the claim is still genuinely retry-owned
  - `resumable` / `handoff_failed` flows must continue to preserve retry metadata
  - the fix must cover the observed `CO-127` shape where stale retry metadata survives an active rehydrate
- Non-functional requirements (performance, reliability, security):
  - keep the change bounded to claim-state management
  - preserve current runtime/status behavior outside the stale retry seam
  - remain deterministic and fully covered by focused regressions
- Interfaces / contracts:
  - `ProviderIntakeClaimRecord.retry_queued`, `retry_due_at`, `retry_error`
  - rehydrate/upsert helpers in `providerIssueHandoff.ts`
  - retry-field defaulting in `providerIntakeState.ts`

## Architecture & Data
- Architecture / design adjustments:
  - centralize authoritative active-running claim writes through `buildActiveRunRetryFields()` and `buildRehydratedActiveRunClaimFields()` in `providerIssueHandoff.ts`
  - keep `providerIntakeState.ts` unchanged in this lane because explicit authoritative running writers now supersede stale retry metadata with lower blast radius than a broader intake-state default rewrite
- Data model changes / migrations:
  - none; this is a bounded behavior fix on existing claim fields
- External dependencies / integrations:
  - no new external dependencies

## Validation Plan
- Tests / checks:
  - focused `ProviderIssueHandoff` regressions for stale retry metadata on active rehydrate
  - any necessary `ProviderIntakeState` regression for retry default persistence
  - `ControlRuntime` or related projection test proving the same issue no longer renders in both `Running` and `Backoff` after rehydrate
  - full repo validation floor before review handoff
- Rollout verification:
  - confirm the `CO-127` shape is covered by focused regressions and resolves through claim truth rather than renderer dedupe
  - record that the current shared-root intake artifact no longer reproduces the stale shape so the rework proof stays test-backed rather than overstating live local artifact coverage
- Monitoring / alerts:
  - none beyond existing claim/runtime visibility

## Open Questions
- Is one shared `clearProviderRetryState(...)` helper already sufficient for all affected rehydrate paths, or is there one additional active-running upsert seam that must be made explicit to avoid future drift?

## Approvals
- Reviewer: `codex-orchestrator docs-review` child stream `docs-review-rework-rerun` (`succeeded`, `clean-success`)
- Manifest: `.runs/linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc-docs-review-rework-rerun/cli/2026-04-10T10-09-14-033Z-b783a0b7/manifest.json`
- Override reason: This rerun supersedes the earlier temporary `docs/TASKS.md` line-budget stop. See `.runs/linear-cb368f80-6d3e-4deb-b89b-4bd3577562cc-docs-review-rework-rerun/cli/2026-04-10T10-09-14-033Z-b783a0b7/run-summary.json`.
- Date: 2026-04-10
