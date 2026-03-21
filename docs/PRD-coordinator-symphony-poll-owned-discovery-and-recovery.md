# PRD - Coordinator Symphony Poll-Owned Discovery Recovery and Observability API Normalization

## Added by Bootstrap 2026-03-21

## Summary
- Problem Statement: after the landed `1312`-`1315` work and the current `1316` implementation on this branch, CO now has poll-backed refresh/reconcile hooks, fresh issue discovery without a new accepted webhook, retry redispatch based on tracker refetch, startup immediate poll on the real control-host path, the Symphony-shaped `/api/v1/refresh`, running/issue/workspace normalization, full active candidate pagination, Symphony-ordered fresh dispatch, slot-capped launch gating, and the final Linear default-contract alignment (`page size 50`, request timeout `30000 ms`). The remaining work is no longer implementation of the blocker itself; it is truthful publication closeout against `/Users/kbediako/Code/symphony/SPEC.md:704-739`, `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex:523-567,1311-1313`, and `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/linear/client.ex:13-50,243-260`.
- Desired Outcome: close `1316` truthfully by recording the now-landed dispatch behavior, rerunning the required validation/review/live-proof loop, and publishing the lane without overstating anything beyond the verified evidence.

## Status Update - 2026-03-21
- Current branch posture: the branch now carries implemented `1312`/`1313`/`1314`, the landed `1315` retry-owner slice, and the full owned `1316` discovery/recovery, API-normalization, pagination, ordering, capacity, and Linear-default-alignment work.
- Current branch truth: `providerIssueHandoff.poll()` now reconciles claims before fresh-candidate processing, fresh eligible issues can be launched on poll without a webhook, queued retries can re-fetch candidates from poll truth, `/api/v1/refresh` returns the queued/coalesced acknowledgement contract, and running/issue/workspace projection semantics have been normalized to the Symphony baseline while keeping additive CO fields.
- Final implementation delta now landed: `orchestrator/src/cli/control/linearDispatchSource.ts` pages the active Linear candidate set with Symphony defaults (`page size 50`, request timeout `30000 ms`) and preserves ordering metadata, while `orchestrator/src/cli/control/providerIssueHandoff.ts` sorts fresh poll candidates and enforces slot-capped dispatch before launch.
- Historical closeout evidence: `out/1316-coordinator-symphony-poll-owned-discovery-and-recovery/manual/20260321T164742Z-stacked-closeout/` records the earlier stacked validation pass and the two review findings that were later addressed on branch. The active publication closeout has moved to `out/1316-coordinator-symphony-poll-owned-discovery-and-recovery/manual/20260321T211653Z-current-head-closeout/`, which records the current-head guard/build/lint/targeted-tests/docs/diff/pack-smoke evidence plus the explicit review-waiver and no-fresh-live-proof publication decision.
- Truthful remaining boundary after `1316`: implementation is now in place, but parity publication should close only after the current-head GitHub checks, unresolved actionable review-thread closure, and merge complete cleanly.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): finish the remaining parity gap truthfully by aligning CO to the spec and Elixir reference instead of carrying stale umbrella wording.
- Success criteria / acceptance:
  - the packet states the current branch truth exactly: the earlier discovery/recovery and `/api/v1` normalization blockers are already landed here
  - the packet records that the former final blocker is now implemented: full active-candidate pagination plus priority-ordered, slot-capped fresh poll dispatch are landed
  - the packet records the final Linear default-contract alignment: `page size 50`, request timeout `30000 ms`
  - the packet keeps `1315` explicit as a landed prerequisite slice and does not overstate full parity before the final validation/review/live-proof loop is completed
  - the packet keeps CO-only additive routes/fields explicit as acceptable extensions rather than blockers
- Constraints / non-goals:
  - do not reopen already-landed `1312`-`1315` or earlier `1316` fixes unless tests prove a regression
  - do not claim full hardened parity published/closed until validation, review, live proof, PR, and merge are closed
  - do not widen the slice into dashboard/TUI/Telegram richness, tracker write-back, or SSH-host parity

## Goals
- Keep `1316` truthful as the current publication lane for the now-landed final parity slice.
- Record that the full active candidate set, tracked-issue ordering metadata, and slot-capped fresh poll dispatch are now implemented.
- Preserve the already-landed poll/recovery, retry-refetch, and observability normalization work while closing the publication loop truthfully.

## Non-Goals
- Reopening already-landed `1312`/`1313`/`1314`/`1315` behavior.
- Reopening already-landed `1316` poll/recovery and `/api/v1` normalization fixes unless tests require a narrow regression repair.
- Treating tracker-write ownership, dashboard richness, or SSH-host execution as blockers for this packet.

## Stakeholders
- Product: CO operator
- Engineering: Codex
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - the docs accurately state that full active-candidate pagination plus fresh poll ordering/slot budget are now landed
  - fresh poll launches follow the Symphony order
  - fresh poll launches stop when the global/per-state slot budget is exhausted
- Guardrails / Error Budgets:
  - do not claim parity publication closed until refreshed validation/review/live proof exist for the now-landed ordering/capacity behavior
  - keep retry-owner sequencing explicit: `1315` remains separate even though its prerequisites are already landed here
  - keep wording tied to currently verified branch behavior rather than aspirational semantics

## User Experience
- Personas:
  - CO operator validating the remaining parity path after `1315`
  - follow-on implementer carrying discovery/recovery work without reopening already-landed slices
- User Journeys:
  - the operator can see that the earlier `1316` gaps and the former final dispatch blocker are now landed
  - fresh eligible issues are considered from the full active set and launch in the same order and bounded-concurrency shape as Symphony

## Technical Considerations
- Architectural Notes:
  - `/Users/kbediako/Code/symphony/SPEC.md:704-739` requires candidate selection to exclude running/claimed work, sort by `priority` then oldest `created_at`, and dispatch only while global/per-state slots remain
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/linear/client.ex:13-50,243-260` paginates across the full active Linear candidate set before the orchestrator sorts and dispatches
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex:523-567,1311-1313` implements the dispatch contract by sorting issues first and checking `available_slots(state)` plus per-state limits before each dispatch
  - current CO already has the earlier `1316` poll/recovery and API-normalization seams; the closing implementation now adds full pagination, the Symphony Linear defaults (`page size 50`, request timeout `30000 ms`), and the already-landed budget-aware ordering and slot checks
- Dependencies / Integrations:
  - `/Users/kbediako/Code/symphony/SPEC.md`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/linear/client.ex`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex`
  - `orchestrator/src/cli/control/linearDispatchSource.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`

## Open Questions
- No owned implementation blockers remain. The remaining open items are publication-only: the fresh clean rerun, `pack:smoke`, live proof, PR, and merge.

## Approvals
- Product: Self-approved for the final bounded `1316` parity blocker.
- Engineering: Self-approved on 2026-03-21 against the current Symphony SPEC, Elixir orchestrator dispatch ordering/capacity behavior, and the verified branch state.
- Design: N/A
