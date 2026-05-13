# ACTION_PLAN - CO: stop startup recovery sweeps from burning issue-by-id reads for retained released claims

## Added by Bootstrap 2026-04-12

## Summary
- Goal: close `CO-162` by making startup recovery-sweep polls fail closed for locally terminal retained released claims instead of re-reading each issue by id, while preserving runnable recovery-sweep handling and explicit reopen behavior.
- Scope: docs-first packet, single workpad, audited docs-review evidence, narrow `controlServerPublicLifecycle.ts` plus `providerIssueHandoff.ts` change, focused regressions, guarded restart proof, and the normal validation and review gates.
- Assumptions:
  - `CO-160` already fixed the ordinary deferred-poll all-released no-burn path
  - the remaining defect is specific to startup `mode: recovery_sweep`
  - the existing released-claim cached helper and reopen seams are the correct shared logic to preserve

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - preserve `dispatch_source_issue_by_id`, `dispatch_source_tracked_issues:recovery_sweep`, `request_burn_history`, `providerIssueHandoff.poll(...)`, `allowPollFailClosed`, `deferFreshDiscovery`, `provider_issue_released:not_active`, and `provider_issue_released:not_mutable`
- Not done if:
  - startup recovery sweep still burns issue-by-id reads for retained released claims
  - the fix only works for deferred polls and not startup recovery
  - recovery sweep stops processing runnable tracked issues it already fetched
- Pre-implementation issue-quality review:
  - keep the lane bounded to the startup caller contract plus shared released-claim poll fallback behavior; do not widen into global fresh-discovery or scheduler policy

## Milestones & Sequencing
1. Draft and register the `CO-162` docs-first packet, mirror the checklist, seed the single workpad source, and run the audited `linear child-stream --pipeline docs-review` lane or a documented fallback.
2. Implement the narrow startup recovery-sweep fail-closed change in `controlServerPublicLifecycle.ts` and `providerIssueHandoff.ts`.
3. Add focused regressions proving zero direct issue-by-id reads for retained released claims during startup recovery sweep while still processing runnable tracked issues returned by the sweep, and preserve the existing deferred-poll and explicit reopen coverage.
4. Capture a guarded restart proof against `request_burn_history`, then run the required validation floor, standalone review, and explicit elegance pass before any review handoff.

## Dependencies
- `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `orchestrator/tests/ProviderIssueHandoff.test.ts`
- `orchestrator/tests/ControlServerPublicLifecycle.test.ts`

## Validation
- Checks / tests:
  - audited `linear child-stream --pipeline docs-review --format json`
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
  - `npm run pack:smoke`
- Rollback plan:
  - revert the startup recovery-sweep poll-input change together with its focused regressions if it suppresses genuinely runnable recovery-sweep work
  - preserve the current deferred-poll contract and explicit reopen behavior as the rollback baseline

## Risks & Mitigations
- Risk: startup recovery sweep suppresses a runnable released claim that should reopen from live sweep results.
  - Mitigation: keep the cached fail-closed behavior only for claims absent from the returned recovery-sweep tracked-issue map, and keep non-deferred reopen behavior intact.
- Risk: the fix works for startup recovery but accidentally changes deferred fresh-discovery behavior.
  - Mitigation: add a dedicated bounded caller signal and keep the existing deferred-poll regression intact.
- Risk: the lane widens into fresh-discovery or scheduler redesign.
  - Mitigation: keep the implementation centered on the startup caller contract and `resolveTrackedIssuePollResolutionWithFallback(...)`.

## Approvals
- Reviewer: pending docs-review evidence
- Date: 2026-04-12
