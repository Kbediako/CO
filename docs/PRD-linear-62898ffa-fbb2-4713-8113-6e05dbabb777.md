# PRD - CO: Reinvestigate current-main npm run test failure in ProviderIssueHandoff snapshot-only Todo retry path
## Added by Bootstrap 2026-04-11

## Traceability
- Linear issue: `CO-150` / `62898ffa-fbb2-4713-8113-6e05dbabb777`
- Linear URL: https://linear.app/asabeko/issue/CO-150/co-reinvestigate-current-main-npm-run-test-failure-in
- Source issue: `CO-128` / `1cd22f2a-5a12-4d2f-bc32-8289f4d24be6`

## Summary
- Problem Statement: fresh current-main validation no longer reproduces the `frontend-test` pre-manifest hang from `CO-128`, but repo-wide `npm run test` still reported a `ProviderIssueHandoff` snapshot-only Todo retry failure. The issue report named `continues snapshot-only Todo retries when persisted blocker metadata is still non-terminal` with a line-5975 scheduled-timeout count mismatch; on rebased `origin/main` `6d7ab74f8`, the nearby live non-terminal test anchor is `releases snapshot-only Todo retries when persisted blocker metadata is still non-terminal` around `orchestrator/tests/ProviderIssueHandoff.test.ts:6686`, so fresh reproduction must verify the current line/assertion before implementation.
- Desired Outcome: reproduce the failure on fresh current main, isolate the owning retry-timer or snapshot-only Todo blocker-release cause, and restore truthful repo-wide `npm run test` behavior without routing this blocker back into `CO-128`.
- 2026-04-11 outcome: after rebasing onto `origin/main` `6d7ab74f8`, the issue-reported failure still does not reproduce. Focused snapshot-only Todo tests, the full `ProviderIssueHandoff.test.ts` file, and repo-wide `npm run test` all pass for that surface. Later PR Core Lane runs exposed nearby queued-retry fake-timer races in `ProviderIssueHandoff.test.ts`, so this lane keeps the production retry implementation unchanged and stabilizes the test harness by advancing the fake timer clock synchronously instead of manually invoking captured timeout callbacks.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): treat the `ProviderIssueHandoff` failure as its own current-main blocker. Reproduce it first, identify whether snapshot-only Todo retries are scheduling an extra retry after non-terminal blocker metadata is released, then land the smallest responsible fix or document a truthful repo-owned validation contract.
- Success criteria / acceptance:
  - fresh current-main reproduction records the exact failing test case and assertion context
  - the owning cause of the snapshot-only Todo retry / non-terminal blocker failure is identified with code and test evidence
  - repo validation is truthful again: `npm run test` passes cleanly after the fix or an explicit repo-owned contract is documented
  - `CO-128` remains scoped to `frontend-test` non-repro evidence and does not absorb this blocker
- Constraints / non-goals:
  - do not fold this blocker into `CO-128`
  - do not reclassify the issue as generic provider cleanup without fresh reproduction
  - do not waive the failure silently or rely on timeout inflation

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `npm run test`
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`
  - issue-reported `continues snapshot-only Todo retries when persisted blocker metadata is still non-terminal`
  - current source anchor `releases snapshot-only Todo retries when persisted blocker metadata is still non-terminal`
  - issue-reported `line-5975 timeout-count assertion mismatch`
  - issue-reported `expected the scheduled timeout count to stay at 1 after refresh, but it observed 2`
- Protected terms / exact artifact and surface names:
  - `ProviderIssueHandoff.test.ts`
  - `snapshot-only Todo retries`
  - `persisted blocker metadata`
  - `non-terminal`
  - `scheduled timeout count`
  - `CO-128`
- Nearby wrong interpretations to reject:
  - this is still the `CO-128` `frontend-test` hang
  - reopening older broad timeout issues without fresh evidence is enough
  - the narrow `frontend-test` pass makes repo-wide `npm run test` irrelevant
  - increasing or ignoring timeout counts is a valid fix without explaining the retry contract

## Parity / Alignment Matrix
- Current truth:
  - current main is at `6d7ab74f8` in this workspace and the issue reports `npm run test` failing in `ProviderIssueHandoff.test.ts`
  - the issue-reported line/test anchor has drifted; current source has the non-terminal snapshot-only Todo case at `ProviderIssueHandoff.test.ts:6686`
  - fresh validation did not reproduce the issue-reported shape: focused snapshot-only Todo subset passed, the full `ProviderIssueHandoff.test.ts` file passed, and full `npm run test` passed
  - the failure was observed on a docs-only `CO-128` branch, so it is not evidence that the `frontend-test` hang returned
- Reference truth:
  - snapshot-only Todo issues with persisted non-terminal blocker metadata should release rather than continue retrying; continued retries should only occur when blocker metadata is terminal, without duplicating retry timers across refresh cycles
  - the test should encode the real retry contract, not a stale assumption
  - repo-wide `npm run test` should be a truthful gate for unrelated lanes
- Target truth / intended delta:
  - reproduction evidence captures whether the current extra timeout is a product bug or a stale assertion
  - no production retry code changes when current-main evidence is green and the reported assertion does not exist at the current anchor; the only current delta is a test-harness stabilization for nearby queued-retry timer dispatch paths
  - full validation proves the repo-wide test suite is green or records a specific repo-owned contract if that is not possible
- Explicitly out-of-scope differences:
  - `frontend-test` bootstrap or pre-manifest hang recovery
  - generic provider status/dashboard cleanup
  - broad timeout-suite worker tuning unless fresh evidence proves it owns this failure

## Not Done If
- `npm run test` still fails at the same `ProviderIssueHandoff` case with no current owner.
- The only outcome is to mention the failure in another issue without this dedicated lane carrying reproduction and ownership evidence.
- The investigation lacks fresh current-main reproduction evidence.
- `CO-128` absorbs this repo-wide blocker.

## Goals
- Reproduce the `ProviderIssueHandoff` failure on the current-main baseline.
- Identify the exact retry scheduling cause and whether the assertion or implementation is wrong.
- Land the smallest code or test-contract repair needed for truthful repo-wide validation.
- Keep `CO-128` scoped to the `frontend-test` non-repro outcome.

## Non-Goals
- Reopen the `frontend-test` hang lane.
- Mask a failing full-suite case by weakening validation.
- Expand into unrelated provider cleanup or broad queue redesign.
- Add timeout inflation as a substitute for a retry-contract explanation.

## Stakeholders
- Product: CO operators depending on repo-wide validation to distinguish unrelated blockers.
- Engineering: maintainers of provider issue handoff, retry scheduling, and full-suite validation.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - fresh reproduction log captures the exact failing case and timeout-count mismatch
  - focused regression or corrected assertion explains the retry-timer contract
  - `npm run test` is green after the repair, or a narrowly documented repo-owned contract explains any remaining blocker
- Guardrails / Error Budgets:
  - keep the lane separate from `CO-128`
  - keep changes bounded to the failing provider handoff retry seam and task packet
  - do not silently waive the full suite

## User Experience
- Personas:
  - provider worker validating a current-main issue lane
  - reviewer checking whether a full-suite blocker is owned by the correct Linear issue
  - maintainer debugging provider retry scheduling
- User Journeys:
  - run `npm run test` on current main and see the `ProviderIssueHandoff` failure reproduced with artifact-backed context
  - inspect the focused test and implementation to understand why only one retry timer should remain, or why the expected contract changed
  - rerun full validation after the fix and use the green suite as handoff evidence

## Technical Considerations
- Architectural Notes:
  - start by reproducing the exact failing test before changing code
  - inspect the snapshot-only Todo retry path, persisted blocker release path, and retry timer scheduling helpers before broadening
  - prefer deleting duplicate scheduling or tightening the test setup over adding new retry state unless evidence requires it
- Dependencies / Integrations:
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`
  - Vitest fake timers and timeout scheduling assertions

## Open Questions
- Resolved for the issue-reported snapshot-only Todo surface on current `origin/main`: no observed second-timeout failure remains in fresh reproduction, so there is no current owning production retry seam to patch in this lane.
- Resolved for the later PR Core Lane failures: queued-retry overlap tests should drive Vitest's fake timer clock synchronously, not manually invoke captured timeout callbacks while refresh or launch promises are still blocked.

## Approvals
- Product: self-approved from Linear issue `CO-150`.
- Engineering: docs-review clean after packet fixes; implementation validation records no production retry change and a bounded test-harness stabilization because `npm run test` is green on current main while later PR Core Lane failures exposed deterministic timer-dispatch test debt.
- Design: N/A.
