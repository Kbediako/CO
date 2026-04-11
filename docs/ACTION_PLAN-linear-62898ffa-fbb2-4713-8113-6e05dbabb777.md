# ACTION_PLAN - CO: Reinvestigate current-main npm run test failure in ProviderIssueHandoff snapshot-only Todo retry path
## Added by Bootstrap (refresh as needed)

## Traceability
- Linear issue: `CO-150` / `62898ffa-fbb2-4713-8113-6e05dbabb777`
- Linear URL: https://linear.app/asabeko/issue/CO-150/co-reinvestigate-current-main-npm-run-test-failure-in

## Summary
- Goal: reproduce and isolate the current-main `ProviderIssueHandoff` snapshot-only Todo retry failure, then restore truthful repo-wide `npm run test` behavior without folding the blocker into `CO-128`.
- Scope: docs-first packet, workpad, same-turn parallelization decision, docs-review child stream, focused reproduction, bounded provider handoff repair or validation-contract update, full validation, and review handoff.
- Assumptions:
  - current workspace branch is rebased onto `origin/main` at `6d7ab74f8`
  - the failing surface is `ProviderIssueHandoff.test.ts`, not the `CO-128` `frontend-test` bootstrap lane
  - the smallest correct fix will stay in the provider handoff retry seam or its direct test contract if fresh reproduction finds a live failure

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `npm run test`
  - `ProviderIssueHandoff.test.ts`
  - issue-reported `continues snapshot-only Todo retries when persisted blocker metadata is still non-terminal`
  - current source anchor `releases snapshot-only Todo retries when persisted blocker metadata is still non-terminal`
  - issue-reported `line-5975 timeout-count assertion mismatch`
  - `CO-128` remains out of scope
- Not done if:
  - the current non-terminal snapshot-only Todo retry case still fails with the issue-reported timeout-count shape or a fresh equivalent
  - the lane lacks fresh current-main reproduction evidence
  - the blocker is routed into `CO-128`
- Pre-implementation issue-quality review:
  - the issue is not narrower than the user request: it names the exact test, assertion mismatch, validation command, and separation from `CO-128`; implementation should not broaden beyond that surface unless reproduction evidence requires it

## Milestones & Sequencing
- [x] Read Linear issue context, move `Ready` to `In Progress`, record same-turn parallelization decision, and create the task branch/workpad source. Proof: packaged Linear helper, branch `linear-62898ffa-fbb2-4713-8113-6e05dbabb777`, `out/linear-62898ffa-fbb2-4713-8113-6e05dbabb777/manual/workpad.md`.
- [x] Register the docs-first packet and mirrors, run archive helper if `docs/TASKS.md` exceeds its line budget, and publish the initial workpad. Proof: docs packet files, `tasks/index.json`, `docs/docs-freshness-registry.json`, tracked `docs/TASKS-archive-2026.md` update, and Linear workpad `cdc4108c-e046-413c-815d-782c6afc52c2`.
- [x] Run audited docs-review child stream before implementation and record the manifest or truthful fallback. Proof: `.runs/linear-62898ffa-fbb2-4713-8113-6e05dbabb777-co-150-docs-review-r2/cli/2026-04-11T03-47-09-381Z-eee21cae/manifest.json`.
- [x] Reproduce the failing focused path on current main and capture the exact assertion context. Proof: no failure reproduced after rebasing onto `origin/main` `6d7ab74f8`; focused subset and full ProviderIssueHandoff file logs passed under `out/linear-62898ffa-fbb2-4713-8113-6e05dbabb777/manual/`.
- [x] Inspect the retry scheduling seam, implement the smallest fix or validation-contract update, and refresh packet notes if the contract changes. Proof: no production retry code fix required for the issue-reported snapshot-only Todo surface; after later PR Core Lane failures, nearby queued-retry overlap tests were stabilized to advance Vitest's fake timer clock synchronously without timeout inflation.
- [x] Run focused and full validation, standalone review, and elegance review before PR handoff. Proof: post-rebase validation logs under `out/linear-62898ffa-fbb2-4713-8113-6e05dbabb777/manual/`, final standalone review log `20260411T0420Z-standalone-review-final.log`, elegance review `20260411T0424Z-elegance-review.md`, test-patch review log `20260411T0445Z-standalone-review-test-patch.log`, and test-patch elegance review `20260411T0447Z-elegance-review-test-patch.md`; PR checks and `pr ready-review` remain in the handoff phase.

## Dependencies
- `orchestrator/tests/ProviderIssueHandoff.test.ts`
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `tasks/index.json`
- `docs/docs-freshness-registry.json`
- `docs/TASKS.md`

## Validation
- [x] Fresh current-main focused reproduction captures the exact failing case and timeout-count mismatch. Evidence: no matching failure exists after rebasing onto `origin/main` `6d7ab74f8`; current non-terminal source anchor is `releases...` around line 6686 and focused reproduction passed.
- [x] Focused `ProviderIssueHandoff` regression is green after the repair or contract update. Evidence: focused snapshot-only Todo subset and full `ProviderIssueHandoff.test.ts` file passed; the later queued-retry overlap focused tests and full file rerun passed after the fake-timer dispatch stabilization.
- [x] Repo-wide `npm run test` is green or any remaining failure has a specific repo-owned contract. Evidence: post-rebase full `npm run test` passed with `328` files and `3494` tests; Node 20 CI-mode `npm run test` also passed after the later test-harness stabilization.
- [x] Full repo validation floor is completed for a non-trivial diff before review handoff.
- [x] Standalone review and explicit elegance/minimality pass are recorded before handoff.

## Risks & Mitigations
- Risk: the second timeout is intentional and the old assertion is stale.
  - Mitigation: require source evidence before changing the assertion, and document the intended retry contract.
- Risk: a code fix suppresses necessary Todo retry behavior.
  - Mitigation: keep focused coverage on snapshot-only Todo retries with non-terminal blocker metadata.
- Risk: full-suite behavior differs from the focused file.
  - Mitigation: run full `npm run test` after the focused fix.

## Approvals
- Reviewer: docs-review clean after packet fixes; final standalone review clean after post-rebase validation
- Date: 2026-04-11
