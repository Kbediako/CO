---
id: 20260424-co-343-apr-24-spec-freshness-dry-run-accounting
title: CO-343 Apr 24 Spec Freshness and Dry-Run Accounting
status: in_progress
owner: Codex
created: 2026-04-24
last_review: 2026-05-18
review_cadence_days: 30
risk_level: medium
related_prd: docs/PRD-co-343-apr-24-spec-freshness-dry-run-accounting.md
related_action_plan: docs/ACTION_PLAN-co-343-apr-24-spec-freshness-dry-run-accounting.md
related_tasks:
  - tasks/tasks-co-343-apr-24-spec-freshness-dry-run-accounting.md
review_notes:
  - 2026-04-24: Opened from CO-341 validation after `spec-guard --dry-run` printed five stale active-spec failures while exiting zero.
  - 2026-04-24: Same-turn read-only validator reproduced non-dry-run `spec-guard` exit 1 on the same five specs and recommended a separate owner issue rather than widening CO-341.
  - 2026-04-24: Parent created CO-343 as the live owner for Apr 24 spec/docs freshness debt and keeps CO-324 as terminal historical evidence only.
  - 2026-05-18: CO-522 active-spec audit found 1 unchecked task checklist item, so this spec remains active and was reviewed for current lifecycle ownership rather than archived. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-local-classification.json`.
---

# Technical Specification

## Context
The Apr 24 UTC date boundary made five active task specs older than the 30-day `spec-guard` window. `docs:freshness` also found 24 stale task packet/mirror rows. The issue was discovered during CO-341 PR validation, but its cause is repo-wide freshness debt rather than Codex CLI `0.124.0` posture.

## Requirements
1. Reproduce the failure shape:
   - `node scripts/spec-guard.mjs --dry-run` prints failures but exits zero.
   - `node scripts/spec-guard.mjs` exits non-zero before refresh.
   - `npm run docs:freshness` reports 24 stale rows.
2. Classify the exact stale rows in a durable finding.
3. Refresh only rows that remain active and accurate after review.
4. Re-home the live freshness owner to CO-343.
5. Use non-dry-run `spec-guard` for terminal validation evidence.

## Non-Goals
- Do not change `spec-guard --dry-run` exit semantics.
- Do not add this cohort to rolling deferral.
- Do not change CO-341 posture code.

## Validation
- `node scripts/spec-guard.mjs`
- `npm run docs:freshness`
- `npm run docs:freshness:maintain`
- `git diff --check`
