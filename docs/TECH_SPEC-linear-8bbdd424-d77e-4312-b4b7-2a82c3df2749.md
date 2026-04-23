---
id: 20260422-linear-8bbdd424-d77e-4312-b4b7-2a82c3df2749
title: Control host: reconcile released-claim run metadata, operator advisories, and advisory-state truth after issue release
relates_to: docs/PRD-linear-8bbdd424-d77e-4312-b4b7-2a82c3df2749.md
risk: high
owners:
  - Codex
last_review: 2026-04-22
---

## Canonical Reference
This file mirrors the canonical spec at `tasks/specs/linear-8bbdd424-d77e-4312-b4b7-2a82c3df2749.md` for docs discovery. Update both files together.

## Summary
- Objective: reconcile post-release control-host truth so retained released claims, operator autopilot advisories, and persisted advisory state cannot present stale run, blocker, or advisory data as current actionable truth.
- Scope: released/non-active run metadata, stale terminal `in_progress` manifest pointers, stale `ready_to_unblock` advice, stale/deprecated `linear-advisory-state.json`, and focused regressions.
- Constraints: preserve retained audit history and active-lane admission/attach behavior; keep this separate from `CO-292`.

## Issue-Shaping Contract
- User-request translation carried forward: close the broader post-release truth gap where released claims retain stale run pointers, operator autopilot suggests unblock from stale blocker truth, and `linear-advisory-state.json` stays stale while refresh/rehydrate is live.
- Protected terms / exact artifact and surface names: `released claims`, `run_manifest_path`, `manifest.json status=in_progress`, `provider-intake-state.json`, `provider-operator-autopilot.jsonl`, `ready_to_unblock`, `linear-advisory-state.json`, `refresh/rehydrate`, `CO-272`, `CO-278:Done`, PR `#571`, `CO-292`, `CO-286`, `CO-211`.
- Nearby wrong interpretations to reject: display-only changes, manual state-file cleanup, deleting retained history, weakening live-worker attach, or treating `CO-292` as the complete fix.
- Explicit non-goals: no generic scheduler/capacity rewrite, no auto-unblock/auto-close from stale blocker edges, no broad advisory subsystem replacement, and no April 21 local file cleanup as the shipped fix.

## Parity / Alignment Matrix
- Current truth: stale post-release run pointers, stale `ready_to_unblock` advice, and stale advisory JSON can appear current.
- Reference truth: retained state is audit evidence; current operator truth must prefer live issue/run/PR/intake evidence.
- Target truth / intended delta: contradictory post-release run metadata is demoted or sanitized, stale unblock advice is suppressed or corrected, and advisory JSON is refreshed or marked stale/deprecated.
- Explicitly out-of-scope differences: manual file cleanup, active-lane admission loosening, broad advisory redesign, or `CO-292` as the only deliverable.

## Technical Requirements
- Detect terminal released/non-active claim run metadata contradictions before operator-facing projection.
- Ensure terminal issues do not surface stale `in_progress` manifests as current work.
- Suppress or correct `ready_to_unblock` output when fresher blocker/PR truth contradicts retained blocker truth.
- Refresh or explicitly stale-mark `linear-advisory-state.json` when newer provider-intake truth exists.
- Preserve adjacent live active-run and attach behavior.

## Architecture & Data
- Prefer shared stale-post-release classification over scattered display text changes.
- Separate historical run pointers from current active-run pointers in projection/read-model data.
- Add stale/deprecated advisory-source metadata only if live refresh does not update `linear-advisory-state.json`.
- Keep persisted intake history auditable.

## Validation Plan
- Focused provider-intake/projection regression for terminal released issue plus stale `in_progress` manifest pointer.
- Focused operator-autopilot regression for stale completed blocker edge with fresher blocker/PR truth.
- Focused advisory-state freshness/deprecation regression, including polling-only heartbeat and ignored-delivery edge cases.
- Adjacent active-lane admission/attach coverage for touched seams.
- Full repo validation and review gates before handoff.

## Approvals
- Reviewer: docs-review succeeded at `.runs/linear-8bbdd424-d77e-4312-b4b7-2a82c3df2749/cli/2026-04-21T16-18-01-364Z-26084c74/manifest.json`; implementation review pending
- Date: 2026-04-22
