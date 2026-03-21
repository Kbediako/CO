---
id: 20260322-1316-coordinator-symphony-poll-owned-discovery-and-recovery
title: Coordinator Symphony Poll-Owned Discovery Recovery and Observability API Normalization
status: in_progress
owner: Codex
created: 2026-03-22
last_review: 2026-03-22
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-coordinator-symphony-poll-owned-discovery-and-recovery.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-poll-owned-discovery-and-recovery.md
related_tasks:
  - tasks/tasks-1316-coordinator-symphony-poll-owned-discovery-and-recovery.md
review_notes:
  - 2026-03-22: Opened as the next truthful post-`1315` slice for the remaining full-parity blockers instead of splitting poll/recovery from the still-real API normalization gaps.
  - 2026-03-22: Upstream authority for the final remaining blocker is `/Users/kbediako/Code/symphony/SPEC.md:704-739` plus `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/linear/client.ex:13-50,243-260` and `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex:523-567,1311-1313`.
  - 2026-03-22: Current branch truth is that the earlier `1316` discovery/recovery and observability API normalization work are already landed here, and the former final gap of full active-candidate pagination plus fresh poll dispatch ordering and slot budgeting is now implemented on this branch.
  - 2026-03-22: Final Linear default-contract alignment is also landed locally: candidate paging now uses `page size 50` and request timeout `30000 ms`.
  - 2026-03-22: Current closeout root is `out/1316-coordinator-symphony-poll-owned-discovery-and-recovery/manual/20260321T164742Z-stacked-closeout/`: `01`-`09` passed, `10-review-pre-fix.log` captured the earlier `3` P2 findings, `11-review-rerun.log` is terminal and not clean with one P1 plus one P2 still being resolved, and `12-pack-smoke.log` plus `14-live-proof.md` plus PR/merge artifacts remain pending.
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
- Current CO still diverges through:
  - no remaining owned `1316` blocker in the pagination/ordering/capacity slice; optional SSH per-host caps remain outside scope and non-blocking
- Current CO truth that must be preserved:
  - `1312` same-session continuation inside a live worker session
  - `1313` authoritative runtime snapshot fields
  - `1314` authoritative retry payload truth
  - `1315` is the landed prerequisite retry-owner scheduling slice
  - the earlier `1316` discovery/recovery and `/api/v1` normalization work is already landed on this branch
- Use `out/1316-coordinator-symphony-poll-owned-discovery-and-recovery/manual/20260321T164742Z-stacked-closeout/` as the active current-head closeout root for this lane: `01`-`09` passed, `10-review-pre-fix.log` captured the earlier `3` P2 findings, `11-review-rerun.log` is terminal and not clean with one P1 plus one P2 still being resolved, and `12-pack-smoke.log` plus `14-live-proof.md` plus PR/merge artifacts remain pending.
- Full parity publication still remains open only while refreshed validation, review, live proof, PR, CI, and merge remain unresolved.

## Validation Plan

- docs-review before implementation: `.runs/1316-coordinator-symphony-poll-owned-discovery-and-recovery/cli/2026-03-21T15-25-27-365Z-543bcc14/manifest.json`
- current closeout root: `out/1316-coordinator-symphony-poll-owned-discovery-and-recovery/manual/20260321T164742Z-stacked-closeout/`
- `01-delegation-guard.log`, `02-spec-guard.log`, `03-build.log`, `04-lint.log`, `05-targeted-tests.log`, `06-full-test.log`, `07-docs-check.log`, `08-docs-freshness.log`, and `09-diff-budget.log` passed
- `10-review-pre-fix.log` captured the earlier `3` P2 findings
- `11-review-rerun.log` is terminal and not clean, with a P1 in `orchestrator/src/cli/providerLinearWorkerRunner.ts` and a P2 in `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`
- `12-pack-smoke.log`, `14-live-proof.md`, PR, CI, and merge remain pending
