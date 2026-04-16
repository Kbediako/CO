---
id: 20260416-linear-c9163fc7-832a-45ac-8961-2d6c213e52af
title: Control host: safely reclaim plain not_active rows when retained run record disappeared
relates_to: docs/PRD-linear-c9163fc7-832a-45ac-8961-2d6c213e52af.md
risk: high
owners:
  - Codex
last_review: 2026-04-16
---

# TECH_SPEC - Control host: safely reclaim plain not_active rows when retained run record disappeared

## Canonical Reference
- Canonical implementation spec: `tasks/specs/linear-c9163fc7-832a-45ac-8961-2d6c213e52af.md`
- PRD: `docs/PRD-linear-c9163fc7-832a-45ac-8961-2d6c213e52af.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-c9163fc7-832a-45ac-8961-2d6c213e52af.md`
- Task checklist: `tasks/tasks-linear-c9163fc7-832a-45ac-8961-2d6c213e52af.md`

## Summary
`CO-203` narrows the missing-run follow-up to `CO-202`: plain `provider_issue_released:not_active` rows with retained `run_id` / `run_manifest_path` should re-enter `fresh_discovery` only after same-issue run discovery proves the old worker is not live.

## Scope
- Missing retained run identity reclaim for plain released/not_active rows.
- Same-issue live-worker proof via discovered runs, unreadable-manifest occupancy, and release-cancel state.
- Preservation of pending-reopen missing-manifest exclusion and `CO-189` duplicate-worker protection.
- No broad replay, polling, or intake-schema expansion.

## Protected Surfaces
- `provider-intake-state.json`
- `provider_issue_released:not_active`
- retained run identity: `run_id` and `run_manifest_path`
- missing retained run manifest
- disappeared run record
- `fresh_discovery`
- no live same-issue worker
- unreadable manifest occupancy
- release cancel pending

## Validation Plan
- Focused provider handoff regressions for safe reclaim and unreadable-manifest blocking.
- Existing pending-reopen missing-manifest regressions stay green.
- Docs-review child stream before implementation.
- Required repo gates plus manifest-backed standalone review and elegance review before handoff.

## Approvals
- Pre-implementation issue-quality review is recorded in the canonical task spec.
- Docs-review child stream succeeded at `.runs/linear-c9163fc7-832a-45ac-8961-2d6c213e52af-co203-docs-review/cli/2026-04-16T07-30-40-817Z-0e7a5f4e/manifest.json`.
- Review handoff requires successful docs-review, a successful same-issue child lane, green validation, and workpad closeout.
