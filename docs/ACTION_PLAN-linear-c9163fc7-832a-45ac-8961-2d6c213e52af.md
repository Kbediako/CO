# ACTION_PLAN - Control host: safely reclaim plain not_active rows when retained run record disappeared

## Added by Bootstrap 2026-04-16

## Summary
- Goal: close `CO-203` by making plain `provider_issue_released:not_active` missing-run rows reclaimable through `fresh_discovery` only after machine-checkable no-live-worker proof.
- Scope: docs-first packet, same-issue child-lane regression coverage, provider handoff implementation, validation, review, and workpad/Linear lifecycle.
- Assumptions:
  - `provider-intake-state.json` remains the retained claim ledger
  - unreadable-manifest occupancy remains authoritative live-worker evidence
  - pending-reopen missing-manifest behavior must remain unchanged

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - preserve `provider-intake-state.json`, `provider_issue_released:not_active`, retained `run_id`, retained `run_manifest_path`, missing retained run manifest, disappeared run record, `fresh_discovery`, no live same-issue worker, CO-189 duplicate-worker protection, unreadable manifest occupancy, and release cancel pending
- Not done if:
  - missing retained identity can still duplicate a live same-issue worker
  - missing-run reclaim never recovers after no-live-worker proof exists
  - pending-reopen missing-manifest rows become reclaimable
  - recovery depends on manual intake-row deletion
- Pre-implementation issue-quality review:
  - 2026-04-16: parent review confirmed this is a bounded `fresh_discovery` reclaim-proof lane, not a generic `run === null` relaxation. The first child-lane launch produced a zero-byte failed artifact before docs registration, so the parent will relaunch after docs-review rather than widening scope.

## Milestones & Sequencing
1. Inspect live Linear state, move `CO-203` from `Ready` to `In Progress`, create the single workpad, and record the pre-turn decomposition matrix plus `parallelize_now` decision.
2. Register the docs-first packet and mirrors for `linear-c9163fc7-832a-45ac-8961-2d6c213e52af`.
3. Run `linear child-stream --pipeline docs-review`, then relaunch the bounded same-issue regression lane and accept only a successful patch artifact.
4. Implement the missing-run reclaim proof in `orchestrator/src/cli/control/providerIssueHandoff.ts`.
5. Run focused tests, then the required validation floor.
6. Run manifest-backed standalone review and an explicit elegance review before PR/review handoff.

## Dependencies
- provider issue run discovery
- unreadable manifest admission occupancy
- release-cancel tracking
- `provider_issue_released:not_active`
- `provider_issue_released_pending_reopen:*`
- `fresh_discovery`
- `CO-189` and `CO-202`

## Validation
- Checks / tests:
  - focused `orchestrator/tests/ProviderIssueHandoff.test.ts` coverage for safe missing-run reclaim and unreadable-manifest blocking
  - `linear child-stream --pipeline docs-review`
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - manifest-backed standalone review
  - explicit elegance review
- Rollback plan:
  - revert the reclaim helper and targeted tests if missing-run rows become reclaimable while live-worker evidence still exists
  - keep retained intake/manifests/proofs available for incident audit
  - do not roll back by deleting provider-intake rows

## Risks & Mitigations
- Risk: missing retained identity is treated as equivalent to inactive proof.
  - Mitigation: require same-issue no-live-worker proof plus no unreadable occupancy plus no pending release cancel.
- Risk: pending-reopen rows accidentally inherit the new reclaim path.
  - Mitigation: keep plain released/not_active missing-run proof separate from pending-reopen logic.
- Risk: child-lane retries stall on guardrails.
  - Mitigation: complete docs registration and docs-review first, then relaunch the bounded test lane with the same narrow scope.

## Approvals
- Reviewer: pending docs-review and implementation review
- Date: 2026-04-16
