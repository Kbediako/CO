---
id: 20260320-1311-coordinator-symphony-full-parity-hardening-and-closure
title: Coordinator Symphony Full-Parity Hardening and Closure
status: in_progress
owner: Codex
created: 2026-03-20
last_review: 2026-03-22
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-coordinator-symphony-full-parity-hardening-and-closure.md
related_action_plan: docs/ACTION_PLAN-coordinator-symphony-full-parity-hardening-and-closure.md
related_tasks:
  - tasks/tasks-1311-coordinator-symphony-full-parity-hardening-and-closure.md
review_notes:
  - 2026-03-20: Pre-implementation review completed and approved against user intent before the bounded `1311` implementation tranche started; the successful `docs-review` gate is recorded at `.runs/1311-coordinator-symphony-full-parity-hardening-and-closure/cli/2026-03-20T10-25-11-174Z-514b632e/manifest.json`.
  - 2026-03-20: Opened as the delivery follow-up to `1310`. The parity authority is `Symphony SPEC.md` at commit `a164593aacb3db4d6808adc5a87173d906726406`, with current Elixir reference behavior used to scope richer operational parity surfaces.
  - 2026-03-22: `1311` now remains an umbrella/historical lane rather than the current publication unit. The current branch now carries the integrated `1312`-`1316` implementation stack; the remaining work is truthful publication closeout, not another owned implementation blocker.
  - 2026-03-22: Use `out/1316-coordinator-symphony-poll-owned-discovery-and-recovery/manual/20260321T164742Z-stacked-closeout/` as the active current-head closeout pack for the integrated `1312`-`1316` stack. Older `20260321T124445Z-stacked-closeout`, `20260321T124510Z-stack-closeout`, and the earlier `1314` summary pack are stale for current-head validation. In the current `1316` closeout pack, `01`-`09` passed, `10-review-pre-fix.log` captured the earlier `3` P2 findings, `11-review-rerun.log` is terminal and not clean with one P1 plus one P2 still being resolved, and `12-pack-smoke.log` plus `14-live-proof.md` plus PR/merge artifacts remain pending.
---

# Technical Specification

## Context

`1310` closed the truthful rebaseline plus bounded fixes. `1311` now remains as the umbrella/historical lane that tracks the later parity slices truthfully rather than owning the active publication unit itself.

## Requirements

1. Keep `1311` framed as the umbrella/historical parity-truth lane rather than the active publication unit.
2. Record the integrated `1312`-`1316` implementation unit on the current branch.
3. Keep `1316` explicit as the current lane for the now-landed final full-parity slice.
4. Keep the remaining real work explicit: publication validation, review, live proof, PR, CI, and merge still remain after the final blocker lands.
5. Keep tracker-write ownership aligned with the SPEC's scheduler/reader boundary instead of widening it into a false blocker.

## Current Truth

- The active implemented branch packet now includes the integrated `1312`-`1316` stack, not `1311`.
- Use `out/1316-coordinator-symphony-poll-owned-discovery-and-recovery/manual/20260321T164742Z-stacked-closeout/` as the active current-head closeout pack for the integrated `1312`-`1316` unit: `01`-`09` passed, `10-review-pre-fix.log` captured the earlier `3` P2 findings, `11-review-rerun.log` is terminal and not clean with one P1 plus one P2 still being resolved, and `12-pack-smoke.log` plus `14-live-proof.md` plus PR/merge artifacts remain pending.
- `1315` retry-owner scheduling is now landed on the current branch through `providerIssueRetryQueue.ts`, `providerIssueHandoff.ts`, and the associated focused regressions.
- `1315` docs-review succeeded via `.runs/1315-coordinator-symphony-post-worker-retry-queue-ownership/cli/2026-03-21T13-04-33-775Z-038089ca/manifest.json`.
- Full parity publication still remains open only because the refreshed validation/review/live-proof/merge loop remains unresolved.
- Tracker writes are aligned at the core-contract level and do not block `1311`.
- `1311` must not claim closure while real blockers remain, and current-head publication/validation truth now lives with the later implementation unit rather than this umbrella packet.

## Validation Plan

- preserve the historical bounded `1311` closeout artifacts
- preserve the current-head integrated validation summary for the active implementation unit at `out/1316-coordinator-symphony-poll-owned-discovery-and-recovery/manual/20260321T164742Z-stacked-closeout/`
- keep current-head rerun findings, `pack:smoke`, live provider proof, PR, and merge marked pending in that current-head closeout pack until the later implementation slice closes them
- keep later slices responsible for their own validation, review, live proof, and PR ownership
