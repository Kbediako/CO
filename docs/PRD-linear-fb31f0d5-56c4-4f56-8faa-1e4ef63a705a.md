# PRD - CO-394 expire provider workflow fallback mappings

## Traceability
- Linear issue: `CO-394` / `fb31f0d5-56c4-4f56-8faa-1e4ef63a705a`
- Linear URL: https://linear.app/asabeko/issue/CO-394/co-expire-provider-workflow-fallback-mappings
- Task id: `linear-fb31f0d5-56c4-4f56-8faa-1e4ef63a705a`
- Canonical spec: `tasks/specs/linear-fb31f0d5-56c4-4f56-8faa-1e4ef63a705a.md`
- Source policy: `docs/guides/fallback-expiry-and-refactor-policy.md`
- Evidence surface: `orchestrator/src/cli/control/providerIssueHandoff.ts`
- Parent issue: `CO-382`
- Large-refactor owner follow-up: `CO-400` / `6dfd5b1c-ee27-46e4-b31c-7742ea3bdaa3`

## Summary
- Problem Statement: `provider workflow` still contains fallback-heavy provider-id mapping and retained-claim/autopilot paths without a local expiry record tying them to owner, trigger, review date, maximum lifetime, removal condition, and validation.
- Desired Outcome: apply CO-382 `fallback expiry` policy narrowly to `providerIssueHandoff.ts` by inventorying each path, deciding `expire fallback`, adding bounded metadata, and validating activation and non-activation behavior without weakening provider issue current-state authority.

## User Request Translation
- Apply `fallback expiry` and `large refactor` policy to provider workflow fallback mappings only.
- Preserve the protected wording: `provider workflow`, `fallback expiry`, `large refactor`, `minor seam`, `remove fallback`, `expire fallback`, `justify retaining fallback`.
- Reject generic provider cleanup, weakening claim admission safety, and adding a new fallback without owner, trigger, review date, maximum lifetime, removal condition, and validation.

## Intent Checksum
- Exact wording to preserve:
  - `provider workflow`
  - `fallback expiry`
  - `large refactor`
  - `minor seam`
  - `remove fallback`
  - `expire fallback`
  - `justify retaining fallback`
- Protected surfaces:
  - provider-id mapping fallback
  - retained-claim/autopilot fallback
  - provider issue current-state authority
- Nearby wrong interpretations to reject:
  - generic provider workflow cleanup
  - weakening claim admission safety or expected-state guards
  - changing review, merge, runtime routing, or docs freshness fallback behavior
  - adding another provider workflow seam instead of applying the CO-382 large-refactor threshold

## Not Done If
- Provider workflow still has indefinite fallback branches with no owner and removal condition.
- The issue only documents fallbacks without deciding `remove fallback`, `expire fallback`, or `justify retaining fallback`.
- Another provider workflow seam is added instead of applying the CO-382 large-refactor threshold.
- Validation does not cover fallback activation and non-activation paths.

## Goals
- Inventory provider workflow fallback paths in `providerIssueHandoff.ts` that map or retain issue state through fallback sources.
- Record an `expire fallback` decision for each retained provider workflow fallback path.
- Add owner, trigger, introduced date, review date, maximum lifetime, removal condition, and validation metadata.
- Create or reference larger-refactor ownership when the CO-382 threshold says a bigger consolidation is required.
- Run focused provider workflow tests and docs gates relevant to the touched surfaces.

## Non-Goals
- Do not redesign all provider issue handoff behavior.
- Do not weaken CO-125 admission constraints or expected-state transition guards.
- Do not change review, merge, runtime routing, docs freshness, or control-host status fallback behavior in this issue.
- Do not remove a fallback without focused activation and non-activation validation.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior: `Yes`.
- CO-394 adds expiry metadata and focused validation; it does not add a new provider workflow seam.
- Large-refactor result: the retained-claim/autopilot authority split crosses live Linear state, cached claim state, retained run proof, and autopilot snapshots, so a larger consolidation is owned by `CO-400`.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `provider workflow` | provider-id mapping fallback (`mapping_source: provider_id_fallback`, `buildProviderFallbackTaskId`) | `expire fallback` | `CO-400` | Provider issue start/retry derives task identity from provider issue id instead of an explicit authoritative mapping record. | 2026-03-19 | 2026-05-10 | 2026-05-26 | Provider issue task identity is either renamed as a supported contract or replaced by a canonical mapping source with persisted-state compatibility handled by the large refactor. | Metadata regression plus existing provider start activation tests that assert `linear-<issue-id>` task ids and non-activation capacity paths. |
| `provider workflow` | retained-claim/autopilot fallback for cached/synthetic current state | `expire fallback` | `CO-400` | Released or retained claims use cached claim state, retained run identity/proof, or autopilot/refetch fallback when live issue truth is deferred, unavailable, or stale. | 2026-03-20 | 2026-05-10 | 2026-05-26 | One provider issue current-state authority order replaces cached/synthetic arbitration while preserving fail-closed retained-claim safety. | Metadata regression plus existing retained-claim activation/non-activation tests covering reclaim, unresolved retained run identity, completed blockers, pending reopen, and live proof. |

## Parity / Alignment Matrix
- Current truth: provider workflow relies on provider-id fallback mapping and multiple retained-claim/autopilot fallback branches to decide task identity and current issue state.
- Reference truth: CO-382 requires fallback expiry metadata and prefers a `large refactor` when authority is split across live, cached, stale manifest, or synthesized status sources.
- Target truth / intended delta: CO-394 records expiry metadata and validation for the retained paths, and CO-400 owns the larger current-state authority consolidation.
- Explicitly out-of-scope differences: review wrapper, merge closeout, runtime routing, docs freshness ownership, and control-host status fallback contracts.

## Validation Plan
- Docs-first packet and registry mirrors parse and reference the correct TECH_SPEC.
- Focused metadata regression proves every provider workflow fallback record carries owner, trigger, review date, maximum lifetime, removal condition, and validation.
- Existing ProviderIssueHandoff behavior coverage, rerun by the focused provider workflow command, covers fallback activation and non-activation paths.
- Relevant docs gates pass before review handoff.
- Standalone review and elegance pass run before PR review transition.

## Approvals
- Product: Linear issue `CO-394`
- Engineering: parent provider worker
- Date: 2026-04-26
