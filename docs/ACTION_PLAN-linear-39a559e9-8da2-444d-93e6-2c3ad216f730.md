# ACTION_PLAN - CO STATUS / observability: recover direct `co-status --format json` current endpoint timeouts

## Added by Parent Provider Worker 2026-04-21

## Summary
- Goal: close `CO-296` by making direct `co-status --format json` recover from or truthfully classify current resolved `/ui/data.json` timeout hangs on a healthy control-host.
- Scope: docs-first packet, docs-review child stream, focused same-endpoint timeout implementation, focused regressions, required validation, standalone review, elegance review, PR handoff, and merge shepherding if the issue enters `Merging`.
- Assumptions:
  - current endpoint timeout handling belongs in the existing direct JSON / UI dataset fetch-recovery seam
  - successful JSON payload shape should not change
  - tests can inject a short timeout budget instead of waiting 15 seconds

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `co-status --format json`
  - current resolved `/ui/data.json`
  - healthy control-host
  - 15s attach timeout budget
  - same-endpoint hang / timeout
  - bounded recovery or truthful classification
  - `stuck=false`
  - `restart_required=false`
  - `CO-246`, `CO-179`, and `CO-211` boundaries
- Not done if:
  - direct JSON still fails with the same raw 15s timeout on a healthy current endpoint
  - the fix only improves stale/dead endpoint recovery
  - timeout messaging hides whether the failure was current endpoint hang, endpoint rotation, or host unavailability
  - regression coverage lacks a current-endpoint timeout case
- Pre-implementation issue-quality review:
  - Parent review on 2026-04-21 approves this as a bounded direct JSON timeout recovery/classification lane. The issue is not a generic host-health fix, not an attach redesign, and not a provider-intake or queue-truth lane.

## Milestones & Sequencing
1. Create the docs-first packet and registry mirrors for `CO-296`.
2. Run docs-review child stream on the packet before source implementation.
3. Inspect `coStatusCliShell.ts`, `coStatusAttachCliShell.ts`, and focused shell tests to locate the direct JSON recovery helper and timeout test seams.
4. Add a failing focused regression for direct current-endpoint `/ui/data.json` timeout with healthy-host polling/running-claim context.
5. Implement one bounded same-endpoint timeout recovery/classification path without increasing polling frequency or changing successful JSON schema.
6. Preserve `CO-246` stale/dead endpoint recovery through existing tests or an additive assertion.
7. Run focused tests, scoped docs checks, required repo gates, standalone review, and explicit elegance review.
8. Attach/update PR, run `pr ready-review`, refresh the Linear workpad, and transition to `In Review` only after clean handoff criteria.

## Dependencies
- `orchestrator/src/cli/coStatusCliShell.ts`
- `orchestrator/src/cli/coStatusAttachCliShell.ts`
- `orchestrator/tests/CoStatusCliShell.test.ts`
- `orchestrator/tests/CoStatusAttachCliShell.test.ts`
- Existing direct JSON stale/dead endpoint recovery from `CO-246`
- Linear workpad and provider-worker audit helpers

## Validation
- Checks / tests:
  - `npx vitest run --config vitest.config.core.ts orchestrator/tests/CoStatusCliShell.test.ts`
  - `npx vitest run --config vitest.config.core.ts orchestrator/tests/CoStatusAttachCliShell.test.ts` if shared helper behavior changes
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - manifest-backed `codex-orchestrator review`
  - explicit elegance/minimality pass
- Rollback plan:
  - revert the bounded timeout recovery/classification patch if it masks real host unavailability, broadens retry loops, or regresses stale endpoint recovery.

## Risks & Mitigations
- Risk: timeout recovery becomes request burn.
  - Mitigation: use one bounded retry/classification step only.
- Risk: current-endpoint timeout is mislabeled as stale endpoint recovery.
  - Mitigation: test same endpoint/no artifact rotation separately from dead endpoint/rotation tests.
- Risk: genuine refresh-stuck host failure gets downgraded.
  - Mitigation: preserve stuck/restart-required messaging and do not alter polling-health classification.
- Risk: tests wait for the real 15s timeout.
  - Mitigation: expose or inject a short timeout budget in tests while preserving production default.

## Approvals
- Reviewer: parent provider worker, pending docs-review child stream.
- Date: 2026-04-21
