---
id: 20260322-1316-coordinator-symphony-poll-owned-discovery-and-recovery
title: Coordinator Symphony Poll-Owned Discovery Recovery and Observability API Normalization
status: in_progress
owner: Codex
created: 2026-03-21
last_review: 2026-03-21
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-coordinator-symphony-poll-owned-discovery-and-recovery.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-poll-owned-discovery-and-recovery.md
related_tasks:
  - tasks/tasks-1316-coordinator-symphony-poll-owned-discovery-and-recovery.md
review_notes:
  - 2026-03-21: Opened as the next truthful post-`1315` slice for the remaining full-parity blockers instead of splitting poll/recovery from the still-real API normalization gaps.
  - 2026-03-21: Upstream authority for the final remaining blocker is `/Users/kbediako/Code/symphony/SPEC.md:704-739` plus `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/linear/client.ex:13-50,243-260` and `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex:523-567,1311-1313`.
  - 2026-03-21: Current branch truth is that the earlier `1316` discovery/recovery and observability API normalization work are already landed here, and the former final gap of full active-candidate pagination plus fresh poll dispatch ordering and slot budgeting is now implemented on this branch.
  - 2026-03-21: Final Linear default-contract alignment is also landed locally: candidate paging now uses `page size 50` and request timeout `30000 ms`.
  - 2026-03-21: Current publication root is `out/1316-coordinator-symphony-poll-owned-discovery-and-recovery/manual/20260321T211653Z-current-head-closeout/`; it records the current-head review-tool waiver, fresh `pack:smoke`, and the explicit no-fresh-live-proof publication decision while GitHub checks, thread closure, and merge remain open.
---

# Technical Specification

## Context

After the landed `1312`-`1315` work and the current `1316` implementation on this branch, the former final parity blocker is now implemented: fresh poll dispatch pages the active Linear candidate set, applies the Symphony ordering rules, respects the slot-budget rules, and aligns Linear polling defaults to `page size 50` with request timeout `30000 ms`. The earlier `1316` poll/recovery and `/api/v1` normalization work remain present here.

## Requirements

1. Register `1316` as the bounded closeout lane for the final poll-owned parity slice.
2. Preserve the landed full active Linear candidate pagination before dispatch evaluation.
3. Preserve tracked-issue metadata required for Symphony fresh-dispatch ordering (`priority`, `created_at`).
4. Preserve fresh poll candidate sorting by `priority`, oldest `created_at`, then `identifier`.
5. Preserve dispatch slot limits on fresh poll launches.
6. Preserve the landed poll/recovery, retry-refetch, and `/api/v1` normalization work while closing the publication loop truthfully.
7. Keep dashboard/TUI/Telegram richness, tracker write-back, and SSH-host parity out of scope unless implementation proves a hard coupling.

## Current Truth

- Upstream fresh-dispatch ordering and capacity authority is explicit in `/Users/kbediako/Code/symphony/SPEC.md:704-739`, `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/linear/client.ex:13-50,243-260`, and `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex:523-567,1311-1313`.
- Current branch truth for `1316` is:
  - the owned pagination/ordering/capacity implementation is landed on branch
  - publication still remains open until the current-head closeout, required GitHub checks, PR thread closure, and merge are complete
  - optional SSH per-host caps remain outside scope and non-blocking
- Current CO truth that must be preserved:
  - `1312` same-session continuation inside a live worker session
  - `1313` authoritative runtime snapshot fields
  - `1314` authoritative retry payload truth
  - `1315` is the landed prerequisite retry-owner scheduling slice
  - the earlier `1316` discovery/recovery and `/api/v1` normalization work is already landed on this branch
- Use `out/1316-coordinator-symphony-poll-owned-discovery-and-recovery/manual/20260321T211653Z-current-head-closeout/` as the active current-head closeout root for this lane: it records the fresh `pack:smoke` log, the current-head review rerun that produced no concrete findings but hit the bounded `active-closeout-bundle-reread` boundary, and the explicit no-fresh-live-proof publication decision.
- `1316` is implemented on the current branch, but publication remains open in PR `#283` only while the current-head GitHub checks, unresolved actionable thread closure, and merge remain incomplete.
- Full parity publication still remains open only while current-head review closure, PR checks, and merge remain unresolved.

## Validation Plan

- docs-review before implementation: `.runs/1316-coordinator-symphony-poll-owned-discovery-and-recovery/cli/2026-03-21T15-25-27-365Z-543bcc14/manifest.json`
- current closeout root: `out/1316-coordinator-symphony-poll-owned-discovery-and-recovery/manual/20260321T211653Z-current-head-closeout/`
- `01-delegation-guard.log`, `02-spec-guard.log`, `03-build.log`, `04-lint.log`, `05-targeted-tests.log`, `06-full-test.log`, `07-docs-check.log`, `08-docs-freshness.log`, and `09-diff-budget.log` passed
- `10-review.log` is terminal and produced no concrete findings, but it hit the bounded `active-closeout-bundle-reread` boundary and therefore requires the documented review-tool waiver instead of a clean-review claim
- `09-pack-smoke.log` passed on the current head
- PR `#283` is the current publication vehicle for this stack; current-head GitHub checks, unresolved actionable thread closure, and merge remain pending
- no fresh live proof was taken on this head; the closeout pack records that explicit publication decision instead of claiming new live evidence
