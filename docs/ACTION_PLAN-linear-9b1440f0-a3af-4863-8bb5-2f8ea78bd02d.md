# ACTION_PLAN - CO: reclaim Ready released-pending-reopen issues after blockers clear

## Added by Bootstrap 2026-04-15

## Summary
- Goal: ensure Ready/unstarted issues with terminal blockers and stale `released-pending-reopen` claims are reclaimed or surfaced as actionable recovery instead of remaining suppressed.
- Scope: corrected docs-first packet, narrow provider handoff refresh/fresh-discovery fix, focused regressions, and validation for CO-191 plus CO-189 behavior.
- Assumptions:
  - `Ready` is a queued/unstarted state eligible for provider pickup once non-terminal blockers clear
  - retained `provider_issue_released_pending_reopen:*` claims should be recoverable without deleting dirty workspace contents
  - existing live-worker detection is authoritative and must block duplicate launches
  - the lowest-risk implementation reuses existing tracked issue candidate admission

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `released-pending-reopen`, `provider_issue_released_pending_reopen:provider_issue_released:not_active`, `CO-191 shape`, `dirty workspace`, `live same-issue worker`, `provider-intake-state.json`, `fresh_discovery`
- Not done if:
  - Ready released-pending-reopen issues with terminal blockers remain suppressed with no retry queued
  - reclaim can duplicate a live same-issue worker
  - dirty workspace contents are deleted or ignored
  - provider-intake/CO STATUS reason text cannot distinguish blocker wait, live-worker wait, and eligible/reclaim states
- Pre-implementation issue-quality review:
  - 2026-04-15: parent rejected the first child docs patch for intent drift and restored the reclaim/pickup contract from the Linear issue body.

## Milestones & Sequencing
1. Create corrected PRD, TECH_SPEC, ACTION_PLAN, task checklist, task mirror, `tasks/index.json`, `docs/TASKS.md`, and docs freshness registry entries.
2. Audit provider handoff refresh and fresh-discovery handling for stale released pending-reopen claims.
3. Add focused regression for the CO-191 Ready shape with dirty workspace preservation and dead/no worker PID evidence.
4. Implement the smallest reclaim/fresh-discovery fix while preserving blocker and live-worker safety.
5. Rerun focused provider-intake/control-host tests plus `npm run build`.
6. Refresh workpad, run required review/elegance gates, create/attach PR, and drain automated feedback before review-state handoff.

## Dependencies
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `orchestrator/src/cli/control/controlRuntime.ts`
- `orchestrator/src/cli/control/providerIntakeState.ts`
- `orchestrator/tests/ProviderIssueHandoff.test.ts`
- `orchestrator/tests/ControlRuntime.test.ts`
- `provider-intake-state.json`
- `provider-linear-worker-proof.json`

## Validation
- Checks / tests:
  - `jq empty tasks/index.json docs/docs-freshness-registry.json`
  - `node scripts/spec-guard.mjs --dry-run`
  - focused `npx vitest run orchestrator/tests/ProviderIssueHandoff.test.ts ...`
  - focused `npx vitest run orchestrator/tests/ControlRuntime.test.ts ...`
  - `npm run build`
- Rollback plan:
  - revert runtime/test changes together if reclaim bypasses blocker/live-worker safety
  - keep docs packet only if it remains accurate to issue scope

## Risks & Mitigations
- Risk: allowing fresh-discovery reclaim for released pending-reopen claims could duplicate a live worker.
  - Mitigation: keep live-worker/active-run checks before launch and rerun CO-189 live-worker tests.
- Risk: reclaim could hide dirty workspace evidence.
  - Mitigation: test dirty file preservation and avoid cleanup code in this slice.
- Risk: reason-string changes could destabilize existing no-burn behavior.
  - Mitigation: add only prefix-compatible reasons and run adjacent pending-reopen tests.

## Approvals
- Docs-review: passed. Evidence: `.runs/linear-9b1440f0-a3af-4863-8bb5-2f8ea78bd02d-docs-review/cli/2026-04-15T15-33-50-178Z-e7664739/manifest.json`.
- Standalone review: passed with `review_outcome: bounded-success`. Evidence: `../../.runs/linear-9b1440f0-a3af-4863-8bb5-2f8ea78bd02d/cli/2026-04-15T15-14-04-331Z-0bebe30c/review/telemetry.json`.
- Elegance pass: complete; kept the localized proof-gated reclaim helper and explicit regression tests.
- Validation floor: passed through `npm run pack:smoke` on 2026-04-15.
