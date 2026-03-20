# ACTION_PLAN - Coordinator Live Provider Child-Run Test-Stage Regression Follow-Up

## Added by Bootstrap (refresh as needed)

## Summary
- Goal: Clear the current `04-test` regressions on top of the `1305` provider contract fix and rerun the live provider-started child run until it moves beyond the test stage or exposes the next exact blocker.
- Scope: docs-first lane registration, docs review, one narrow env normalization fix, one provider-intake truthfulness fix, one narrow guard contract fix, required validation, live rerun, and PR-to-merge closeout.
- Assumptions:
  - the existing control host and provider setup remain live enough to reuse
  - the current live blocker is the concrete test-stage failure proven by the `CO-2` manifest and `04-test` log

## Milestones & Sequencing
1) Register `1306` docs, mirrors, freshness entries, and task snapshot; truth-sync the `1305` wording that still described a generic post-Vitest non-return.
2) Run docs-review for `1306`, then confirm the smallest fix surface from code inspection and subagent findings.
3) Implement the RLM runtime-shell env normalization fix, keep manifest-observed provider starts in `starting` until rehydrate confirms `in_progress`, and teach `delegation-guard` to resolve non-default control-host ledger locations via manifest-carried control-host provenance with resume backfill for older provider manifests.
4) Run the required validation floor and explicit elegance/review passes.
5) Rerun the live provider-started path, capture the next exact stage result, then open the PR, handle feedback/checks, merge, and return to clean `main` if the tree is green.

## Dependencies
- Current `1305` branch state
- Existing control-host advisory/provider-intake state and live `CO-2` child-run lineage
- Current regression harnesses for RLM runtime shell and delegation guard

## Validation
- Checks / tests:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
  - `npm run pack:smoke`
  - explicit elegance review pass
- Rollback plan:
  - revert the narrow env/guard diagnostic fixes if they change the `1305` provider contract behavior or break live provider-started runs
  - if the live rerun reveals a new downstream blocker, stop and record that blocker rather than widening scope

## Risks & Mitigations
- Risk: the `delegation-guard` fix accidentally suppresses real provider-child errors or trusts non-authoritative ledgers.
  - Mitigation: only suppress provider-child diagnostics when there is no sanctioned provider parent-prefix proof path to evaluate, and only accept non-default ledger paths when the active provider or provider-child manifest carries explicit control-host task/run provenance backed by the authoritative control-host claim ledger.
- Risk: the RLM env fix masks caller-provided explicit interactive overrides.
  - Mitigation: normalize only empty-string inputs when non-interactive mode is already being forced; preserve explicit non-empty overrides.
- Risk: the provider-intake truthfulness fix leaves a duplicate-start window if the immediate post-start claim still exits `starting` too early.
  - Mitigation: keep manifest-observed starts in `starting` until the existing rehydrate path confirms the child manifest is truly `in_progress`, and add a repeat-delivery regression for that window.

## Approvals
- Reviewer: docs-review approved via `.runs/1306-coordinator-live-provider-child-run-test-stage-regression-follow-up/cli/2026-03-19T21-44-24-346Z-e87d8d12/manifest.json`
- Date: 2026-03-20
