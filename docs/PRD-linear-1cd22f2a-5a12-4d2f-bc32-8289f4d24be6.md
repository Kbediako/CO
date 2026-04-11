# PRD - CO: Recover frontend-test CLI from pre-manifest hang under ts-node entrypoint

## Added by Bootstrap 2026-04-11

## Traceability
- Linear issue: `CO-128` / `1cd22f2a-5a12-4d2f-bc32-8289f4d24be6`
- Linear URL: https://linear.app/asabeko/issue/CO-128/co-recover-frontend-test-cli-from-pre-manifest-hang-under-ts-node
- Source issue: `CO-119` / `da009c42-d0fc-4834-be72-f977a778693c`
- Current workspace branch: `linear/co-128-frontend-test-pre-manifest-hang`
- Rework reset: prior PR `#427` was closed, the stale workpad was deleted, and this branch was recreated from fresh `origin/main` at `16223531e33c22ce96597e83618f1fdcab511f79`

## Summary
- Problem Statement: standalone `frontend-test` had been reported to hang before it wrote a manifest when invoked through `node --loader ts-node/esm bin/codex-orchestrator.ts frontend-test --format json`, and `tests/cli-frontend-test.spec.ts` had timed out on the stale branch that is now closed.
- Desired Outcome: determine whether that exact pre-manifest failure still exists on the fresh rework branch and land only the smallest truthful delta needed for current `origin/main`. Current fresh-main evidence shows the lane closes truthfully as a non-repro with no runtime patch.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): treat this as a narrow `frontend-test` bootstrap recovery lane, separate from provider refresh-path recovery, and handle the `Rework` reset cleanly before reapplying any prior fix.
- Success criteria / acceptance:
  - reproduce the hang in `tests/cli-frontend-test.spec.ts` and with the direct `node --loader ts-node/esm ... frontend-test --format json` CLI entrypoint on the fresh branch
  - identify whether the stall is in bootstrap, config resolution, runtime selection, or loader initialization
  - land the smallest fix that makes the command emit a manifest path and terminal status instead of hanging pre-manifest
  - keep focused validation proving the `frontend-test` contract still works
- Constraints / non-goals:
  - do not fold this into CO-119 provider refresh recovery
  - do not paper over the problem by only raising Vitest timeouts
  - do not broaden into unrelated frontend infrastructure cleanup

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `tests/cli-frontend-test.spec.ts`
  - `frontend-test`
  - `bin/codex-orchestrator.ts frontend-test --format json`
  - `pre-manifest hang`
  - `node --loader ts-node/esm`
- Protected terms / exact artifact and surface names:
  - `tests/cli-frontend-test.spec.ts`
  - `bin/codex-orchestrator.ts`
  - `frontend-test`
  - `.runs/.../manifest.json`
  - `CODEX_CLI_BIN`
  - `frontend-testing`
- Nearby wrong interpretations to reject:
  - the CO-119 refresh patch broke frontend behavior
  - this is a generic frontend app behavior bug
  - the right fix is to inflate the suite timeout and move on
  - provider-worker recovery logic is the correct place to absorb the seam

## Parity / Alignment Matrix
- Required for parity/alignment lanes; otherwise state `Not applicable`.
- Current truth: the fresh rework branch was reset to current `origin/main`, and the original failure does not reproduce there. `npm run test -- tests/cli-frontend-test.spec.ts` passes, `npm run test -- tests/cli-command-surface.spec.ts tests/cli-frontend-test.spec.ts` passes, and the direct manual `frontend-test --format json` repro emits a manifest with terminal success. Evidence: `out/linear-1cd22f2a-5a12-4d2f-bc32-8289f4d24be6/manual/20260410T153728Z-manual-repro-fresh-main.json` and `out/linear-1cd22f2a-5a12-4d2f-bc32-8289f4d24be6/manual/20260410T154308Z-fresh-main-nonrepro-summary.md`.
- Reference truth: `frontend-test --format json` should create a manifest, complete with terminal status, and keep the suite green under the same `ts-node/esm` entry path.
- Target truth / intended delta: preserve the now-healthy current-main behavior and close the issue without inventing a runtime patch that the fresh tree no longer needs.
- Explicitly out-of-scope differences: provider refresh-path work, generic frontend app behavior, and unrelated CLI cleanup.

## Not Done If
- `tests/cli-frontend-test.spec.ts` still times out in standalone runs.
- A manual `frontend-test --format json` repro still hangs before writing a manifest.
- The only mitigation is a timeout increase with no identified startup seam.

## Goals
- Establish whether the pre-manifest hang still exists on the fresh rework branch.
- Preserve the current healthy `frontend-test` behavior if the fresh tree already satisfies the issue contract.
- Avoid reapplying a stale runtime patch when the current tree no longer needs it.
- Record enough evidence that later workers can distinguish this lane from provider refresh-path recovery and from the closed stale PR attempt.

## Non-Goals
- Reopening or extending CO-119 provider refresh-path work.
- Weakening validation by deleting tests or inflating timeouts without a real fix.
- Broad frontend infrastructure or runtime cleanup outside the reproduced seam.

## Stakeholders
- Product: CO operators blocked by a red focused CLI validation lane
- Engineering: maintainers of CLI bootstrap, runtime selection, and `frontend-testing` pipeline wiring
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - `npm run test -- tests/cli-frontend-test.spec.ts` exits `0`
  - direct `frontend-test --format json` reproductions emit a manifest and terminal success
  - closeout names the actual pre-manifest seam, not just the symptom
- Guardrails / Error Budgets:
  - keep changes bounded to the `frontend-test` CLI/test harness seam
  - create a follow-up issue instead of widening scope if a different subsystem is implicated
  - preserve the intended `frontend-testing` pipeline contract and runtime sanitization behavior

## User Experience
- Personas:
  - provider worker validating a focused CLI lane
  - reviewer checking whether the fix restored real manifest-backed completion
  - maintainer auditing whether the bug lived in bootstrap or the downstream frontend-testing stage
- User Journeys:
  - a focused test run finishes instead of timing out at 30s/60s
  - a manual `frontend-test --format json` repro writes a manifest before exiting
  - a reviewer can see exactly which startup seam was fixed on the fresh branch

## Technical Considerations
- Architectural Notes:
  - the bug is explicitly pre-manifest, so the likely seam is above the `frontend-testing` stage body itself
  - the failing path goes through the live source entrypoint under `node --loader ts-node/esm`, not only the built `dist` wrapper
  - the prior closed PR isolated the likely bootstrap seam, but this rework attempt must reconfirm it against current `origin/main`
- Dependencies / Integrations:
  - `tests/cli-frontend-test.spec.ts`
  - `bin/codex-orchestrator.ts`
  - `orchestrator/src/cli/frontendTestingRunner.ts`
  - `codex.orchestrator.json`

## Open Questions
- The unrelated fresh-main `npm run test` failure discovered during validation is tracked separately in follow-up `CO-150`; no extra CO-128 widening is planned.

## Approvals
- Product: pending
- Engineering: docs-review child stream passed cleanly on the refreshed packet; standalone review fallback recorded after wrapper boundary
- Design: N/A
