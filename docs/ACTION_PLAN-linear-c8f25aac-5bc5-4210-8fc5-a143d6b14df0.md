# ACTION_PLAN - CO-544 release rehydrated blocked provider claims from active WIP

## Summary
- Goal: stop rehydrated accepted pending-revalidation claims from consuming active WIP after live Linear proves the issue is non-runnable.
- Scope: provider-intake/control-host claim refresh, active-WIP/status/freshness-gauge classification, focused tests, docs packet, validation, optional draft PR.
- Assumptions:
  - CO-510 and CO-512 are incident exemplars, not identifiers to special-case.
  - Parent orchestration owns live queue monitoring and any Linear state updates outside this issue.
  - Missing live issue evidence must remain fail-closed.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `provider_issue_rehydration_pending_revalidation`
  - `provider-intake-state.json`
  - `CO-510`
  - `CO-512`
  - `Blocked`
  - stale `issue_state=In Progress`
  - `co-status`
  - `control-host freshness-gauge`
  - active WIP
- Not done if:
  - live non-runnable Linear state still leaves a rehydrated accepted pending-revalidation claim in active WIP
  - unavailable live issue evidence silently releases/drops the claim
  - status/freshness-gauge output cannot separate cached pending revalidation from live workers
  - fix relies on manual intake edits or issue-specific identifiers
- Pre-implementation issue-quality review:
  - CO-544 is a concrete provider-intake/control-host root-cause lane, not a UI-only projection or queue-policy request.
  - The micro-task path is unavailable because exact stale/cache/fail-closed semantics define correctness.
- Fallback / refactor decision:
  - `remove fallback`: stale cached pending-revalidation active-WIP occupancy after live non-runnable evidence.
  - `justify retaining fallback`: fail-closed pending revalidation when live evidence is unavailable.
- Durable retention evidence:
  - Fail-closed pending revalidation is a safety contract owned by provider-intake control-host, retained only for unavailable or ambiguous live issue evidence.
- Large-refactor check:
  - Another minor seam is acceptable only if the implementation keeps a single live-issue authority and shares classification where needed by status and freshness-gauge.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Rehydrated accepted pending revalidation | Cached accepted row with stale runnable metadata can occupy active WIP before live revalidation releases it. | `remove fallback` | CO-544 | Live Linear state is non-runnable for a rehydrated accepted pending-revalidation claim. | 2026-05-16 | 2026-05-16 | This issue | Live non-runnable state releases/downgrades the claim and excludes it from active WIP. | Focused CO-510/CO-512-shaped regression. |
| Missing live issue evidence | Pending revalidation fails closed instead of assuming stale cache is clean. | `justify retaining fallback` | Provider-intake control-host | Linear issue evidence is unavailable, incomplete, or degraded. | Existing provider-intake rehydration behavior | 2026-05-16 | Durable safety contract | Separate issue-quality review proves fail-closed pending revalidation is no longer needed. | Regression coverage for unavailable evidence preserving pending/degraded classification. |

## Milestones & Sequencing
1. Read workflow instructions, live CO-544 `issue-context`, create workpad, and record one `linear parallelization` decision.
2. Create/register docs-first packet and run pre-implementation docs review or record a bounded fallback.
3. Inspect provider-intake refresh, active-WIP classification, co-status projection, and freshness-gauge code.
4. Add failing focused regression for stale accepted pending-revalidation cached `In Progress` plus live `Blocked`.
5. Implement the smallest shared root-cause fix that preserves fail-closed unavailable-evidence behavior.
6. Add or adjust status/freshness-gauge tests to prove cached pending revalidation is distinguished from live active workers.
7. Run focused validation; broaden only when touched shared surfaces require it.
8. Run explicit elegance/minimality review and refresh workpad with evidence.
9. Stop before merge; create a draft PR only if useful for parent handoff.

## Dependencies
- Live CO-544 issue context.
- Existing provider-intake claim refresh and active-WIP projection.
- Existing control-host freshness-gauge artifact readers.
- Parent orchestration for live queue confirmation after the fix lands.

## Validation
- Checks / tests:
  - focused provider-intake/control-host tests for live `Blocked` stale cached `In Progress`
  - focused fail-closed unavailable-evidence test
  - status/freshness-gauge classification test
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run test:core -- <focused touched tests>`
  - build/lint/docs gates as required by touched source
- Rollback plan:
  - Revert provider-intake/control-host source and focused tests if fail-closed pending revalidation or active-worker WIP accounting regresses.

## Risks & Mitigations
- Risk: live evidence lookup failure accidentally frees stale claims.
  - Mitigation: explicit unavailable-evidence regression and degraded/pending classification.
- Risk: UI/status layer hides the row while provider-intake still consumes WIP.
  - Mitigation: regression on root claim refresh/active-WIP logic, not projection alone.
- Risk: classification splits across co-status and freshness-gauge.
  - Mitigation: prefer a shared helper or shared predicate where local structure allows.

## Approvals
- Reviewer: provider-worker parent lane.
- Date: 2026-05-16.
