# ACTION_PLAN - Coordinator Symphony Full-Parity Audit and Closure Truthfulness Reassessment

## Added by Bootstrap (refresh as needed)

## Summary
- Goal: register the full parity truthfulness lane, fix the bounded current-tree parity bugs, and close with a merged branch that no longer overstates repo parity.
- Scope: docs-first packet, parity-matrix evidence, bounded provider-intake plus observability fixes, validation, live proof, review, PR, and merge.
- Assumptions:
  - larger architectural divergences will remain after this lane unless they are explicitly implemented
  - the existing control host and provider setup remain usable for live proof
  - orchestrator-managed tracker writes are still not a required parity target on the current evidence

## Milestones & Sequencing
1. Register `1310` as a truthful full-parity audit lane, capture the parity matrix, and update docs/task mirrors plus freshness/index registries.
2. Implement the bounded parity fixes:
   - provider handoff no longer hard-stops at `latestRun.status === "succeeded"` for a fresh accepted active issue event
   - selected-run/status rendering stops surfacing stale failure summaries from a now-succeeded child manifest
3. Run the required validation floor, perform a live provider proof against the current control host, then complete review, PR, feedback handling, merge, and clean-main closeout.

## Dependencies
- Current CO `main` baseline plus the existing live control-host setup
- Current local Symphony checkout and the bounded audit evidence from the required subagent streams
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `orchestrator/src/cli/control/selectedRunProjection.ts`
- `orchestrator/src/cli/control/controlTelegramReadController.ts`

## Validation
- Checks / tests:
  - docs-review for `1310` or explicit waiver
  - targeted provider handoff and status/observability tests
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
  - `npm run pack:smoke` if touched surfaces require it
  - explicit elegance review pass
- Rollback plan:
  - if the live proof shows a larger architecture-level blocker instead of the targeted bounded behavior, stop widening scope, record the blocker, and merge only the truthful rebaseline plus the proven small fixes

## Risks & Mitigations
- Risk: the branch claims more closure than the audit proves.
  - Mitigation: keep the matrix explicit and preserve "larger architectural divergence" labels where warranted.
- Risk: a bounded provider-intake fix is mistaken for full repeated-turn parity.
  - Mitigation: document that the patch only removes the fresh-event hard gate; true internal continuation remains a larger divergence.
- Risk: selected-run/status changes accidentally hide useful failure context for genuinely failed runs.
  - Mitigation: key summary freshness off the manifest status and cover the success/failure cases with focused tests.

## Approvals
- Reviewer: Top-level orchestrator self-review completed on 2026-03-20.
- Date: 2026-03-20
