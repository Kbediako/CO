---
id: 20260416-linear-f8281682-ceed-4409-949c-efca2358568a
title: Control host: reclaim Ready issues suppressed by plain released/not_active stale Blocked cache
relates_to: docs/PRD-linear-f8281682-ceed-4409-949c-efca2358568a.md
risk: high
owners:
  - Codex
last_review: 2026-04-16
---

# TECH_SPEC - Control host: reclaim Ready issues suppressed by plain released/not_active stale Blocked cache

## Canonical Reference
- Canonical implementation spec: `tasks/specs/linear-f8281682-ceed-4409-949c-efca2358568a.md`
- PRD: `docs/PRD-linear-f8281682-ceed-4409-949c-efca2358568a.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-f8281682-ceed-4409-949c-efca2358568a.md`
- Task checklist: `tasks/tasks-linear-f8281682-ceed-4409-949c-efca2358568a.md`
- Accepted child-lane manifest: `.runs/linear-f8281682-ceed-4409-949c-efca2358568a-plain-not-active-regression/cli/2026-04-16T03-24-44-832Z-087d1c47/manifest.json`

## Summary
`CO-202` fixes the provider-intake reclaim gap where a live `Ready` / `unstarted` issue can stay suppressed by a stale local plain `released` / `provider_issue_released:not_active` claim that still caches `issue_state=Blocked` and `issue_state_type=started`.

## Scope
- Recheck stale plain released/not_active claims only when cached workflow state is non-terminal, non-active, and non-handoff.
- Reclaim only through existing refresh/fresh-discovery seams after live Linear data confirms Ready/unstarted eligibility and no blockers.
- Preserve `CO-193` released-pending-reopen recovery, `CO-192` terminal stale-row pruning, and `CO-189` same-issue live-worker duplicate protection.
- Retain `provider-intake-state.json`, run manifests, proofs, and debug evidence; do not delete stale rows as the product fix.
- Do not broaden Linear polling or request burn.

## Protected Surfaces
- `provider-intake-state.json`
- `provider_issue_released:not_active`
- plain released/not_active
- stale `issue_state=Blocked`
- `Ready`
- `unstarted`
- `fresh_discovery`
- `active_claims`
- `provider_debug_snapshot.claim`
- `co-status --format json`
- `counts.running`
- `counts.issues`
- no live same-issue worker
- no retry queued
- no retry due

## Validation Plan
- Focused provider handoff regressions for stale plain released/not_active Ready reclaim and unresolved retained-run identity.
- Broader provider handoff regressions for blocker, assignee, pending-reopen, terminal, and live-worker invariants.
- CO STATUS/runtime projection slice for adjacent `CO-192` and `CO-189` status behavior.
- Required repo gates: delegation guard, spec guard, build, lint, test, docs checks, docs freshness, repo stewardship, diff budget, manifest-backed review, and elegance pass.

## Approvals
- Pre-implementation issue-quality review is recorded in the canonical task spec.
- Review handoff requires successful validation, bounded automated-feedback drain, and workpad closeout.
