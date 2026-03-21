---
id: 20260322-1316-coordinator-symphony-poll-owned-discovery-and-recovery
title: Coordinator Symphony Poll-Owned Discovery Recovery and Observability API Normalization
relates_to: docs/PRD-coordinator-symphony-poll-owned-discovery-and-recovery.md
risk: high
owners:
  - Codex
last_review: 2026-03-22
---

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: close `1316` truthfully now that the final implementation blocker has landed: full active-candidate pagination plus Symphony-style fresh-candidate ordering and slot-capped dispatch sit on top of the already-landed poll-owned discovery/recovery and `/api/v1` normalization work.
- Scope: record the landed full active Linear candidate pagination, preserved ordering metadata, Symphony-sorted fresh poll candidates, dispatch slot gating, and the final Linear default-contract alignment without regressing the landed `1316` behavior.
- Constraints:
  - parity authority is `/Users/kbediako/Code/symphony/SPEC.md` plus the current Elixir `orchestrator.ex`
  - `1315` is already landed on the current branch and is a prerequisite for this packet
  - the earlier `1316` poll/recovery and `/api/v1` normalization work are already present on this branch
  - optional dashboard/TUI/Telegram richness and tracker write-back stay out of scope
  - full parity publication remains open only while the current closeout pack still has unresolved rerun findings plus pending `pack:smoke`, live-proof, PR, and merge artifacts

## Current Branch State
- Upstream fresh-dispatch ordering and capacity contract:
  - `/Users/kbediako/Code/symphony/SPEC.md:704-739` requires candidate selection to exclude running/claimed work, sort by `priority` then oldest `created_at` then `identifier`, and dispatch only while global/per-state slots remain
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/linear/client.ex:13-50,243-260` paginates across the full active Linear candidate set before orchestration sorting
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex:523-567,1311-1313` implements that contract through `sort_issues_for_dispatch/1`, `available_slots/1`, and `state_slots_available?/2`
- Current CO divergence on this branch:
  - none in the owned `1316` slice after the current pagination/ordering/capacity implementation; optional SSH per-host caps remain explicitly out of scope and non-blocking
- Current CO truth that must remain intact:
  - `1312` same-session continuation inside one worker session
  - `1313` authoritative runtime snapshot fields
  - `1314` authoritative retry payloads
  - `1315` retry-owner scheduling is already landed
  - the earlier `1316` discovery/recovery and `/api/v1` normalization work is already landed on this branch
  - live Linear polling now uses Symphony default candidate paging and timeout values: `page size 50`, request timeout `30000 ms`

## Technical Requirements
Functional requirements:
  - fresh poll candidate retrieval must page through the full active Linear candidate set before dispatch evaluation
  - fresh poll candidates must sort by `priority` ascending (`1..4`, null/unknown last), then oldest `created_at`, then `identifier`
  - fresh launches must stop when the global dispatch slot budget is exhausted
  - fresh launches must respect the current per-state slot overrides sourced from control/runtime feature-toggle inputs
  - the slice must preserve the already-landed poll reconcile/retry-refetch and `/api/v1` normalization behavior
- Non-functional requirements:
  - keep `1316` bounded away from unrelated UI richness, tracker write-back, and SSH-host work
  - preserve auditable claim transitions and manifest-backed runtime evidence
  - keep publication status explicit until the current closeout pack reaches terminal clean state

## Architecture & Data
- Architecture / design adjustments:
  - preserve `LiveLinearTrackedIssue` ordering metadata (`priority`, `created_at`) while extending live Linear polling to page through `pageInfo/endCursor`
  - align live Linear polling defaults to the Symphony contract: `page size 50`, request timeout `30000 ms`
  - sort live tracked issues before fresh poll launch evaluation
  - add a fresh-launch dispatch budget in `providerIssueHandoff.ts` so new starts stop when no slots remain
- Data model changes / migrations:
  - preserve current provider-intake claim records as auditable state
  - add non-breaking tracked-issue fields required for ordering
- External dependencies / integrations:
  - `/Users/kbediako/Code/symphony/SPEC.md`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/linear/client.ex`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex`
  - `orchestrator/src/cli/control/linearDispatchSource.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`

## Validation Plan
- Tests / checks:
  - docs-review for the registered `1316` packet before implementation: `.runs/1316-coordinator-symphony-poll-owned-discovery-and-recovery/cli/2026-03-21T15-25-27-365Z-543bcc14/manifest.json`
  - current closeout pack: `out/1316-coordinator-symphony-poll-owned-discovery-and-recovery/manual/20260321T164742Z-stacked-closeout/`
    - `01-delegation-guard.log`, `02-spec-guard.log`, `03-build.log`, `04-lint.log`, `05-targeted-tests.log`, `06-full-test.log`, `07-docs-check.log`, `08-docs-freshness.log`, and `09-diff-budget.log` passed
    - `10-review-pre-fix.log` captured the earlier `3` P2 findings
    - `11-review-rerun.log` is terminal and not clean, with a P1 in `orchestrator/src/cli/providerLinearWorkerRunner.ts` and a P2 in `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`
    - `12-pack-smoke.log`, `14-live-proof.md`, and PR/merge artifacts remain pending
- Rollout verification:
  - live control-host proof shows fresh issues launching in Symphony order when multiple active candidates are available
  - live control-host proof shows new launches stop once the configured slot budget is exhausted
- Monitoring / alerts:
  - inspect for duplicate launches caused by incorrect slot accounting
  - inspect for stale ordering metadata or unexpected null-priority behavior

## Open Questions
- No owned implementation blockers remain. The remaining open items are publication-only: the P1/P2 rerun findings, `pack:smoke`, live proof, PR, and merge.

## Approvals
- Reviewer: docs-review succeeded for the registered packet; the closeout pack has `01`-`09` green, `10-review-pre-fix.log` recorded the earlier `3` P2 findings, `11-review-rerun.log` is terminal and not clean with one P1 plus one P2 still being resolved, and publication closeout still awaits `pack:smoke`, live proof, PR, and merge.
- Date: 2026-03-22
