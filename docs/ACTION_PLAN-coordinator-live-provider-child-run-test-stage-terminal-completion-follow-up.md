# ACTION_PLAN - Coordinator Live Provider Child-Run Test-Stage Terminal Completion Follow-Up

## Added by Bootstrap (refresh as needed)

## Summary
- Goal: Clear the current `npm run test` long-tail blocker after `1306` by isolating CLI subprocess command-surface tests from ambient runtime/provider state, then rerun the live provider-started child run until it advances beyond `test` or exposes the next exact blocker.
- Scope: docs-first lane registration, delegated read-only analysis, docs review, one narrow test-harness fix, required validation, live rerun, and PR-to-merge closeout.
- Assumptions:
  - the strongest current hold-open signal is still the CLI subprocess command-surface suite rather than a reopened provider contract failure
  - `tests/cli-orchestrator.spec.ts` exiting cleanly means the first fix does not need to target every CLI integration file equally
  - the existing control host and provider setup remain live enough to reuse without repeating setup work

## Milestones & Sequencing
1) Register `1307` docs, mirrors, freshness entries, and task snapshot with truthful predecessor wording from `1306`.
2) Capture a delegated scout run and docs-review for `1307`, then confirm the smallest correct fix surface from split-run evidence (`cli-command-surface` vs `cli-orchestrator`).
3) Implement the CLI subprocess test-harness runtime isolation fix and any directly coupled regression coverage updates.
4) Run the required validation floor plus explicit elegance/review passes.
5) Rerun the live provider-started path, capture the next exact stage result, then open the PR, handle feedback/checks, merge, and return to clean `main` if the lane is green.

## Dependencies
- Current `1306` branch state
- Existing runtime/provider regression tests
- Existing control-host advisory/provider-intake state and live provider child-run lineage

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
  - revert the test-harness isolation change if it weakens the intended CLI command-surface contract or hides genuine runtime coverage
  - if the live rerun reveals a new downstream blocker, stop and record that blocker rather than widening scope

## Risks & Mitigations
- Risk: a blanket runtime pin could accidentally hide tests that really do need runtime-provider behavior.
  - Mitigation: put the deterministic runtime baseline in the shared test helper and preserve per-test env override precedence.
- Risk: the full-suite long tail is not fully explained by ambient runtime drift.
  - Mitigation: rerun isolated and full tests immediately after the harness change; if a residual hold-open or full-suite-only assertion failure remains, use that fresh evidence to target the next smallest cleanup surface rather than speculating.
- Risk: the live provider rerun exposes a downstream stage blocker unrelated to local test harnesses.
  - Mitigation: treat the local test fix as necessary but not sufficient, and stop at the first exact new live blocker with captured evidence.

## Approvals
- Reviewer: Codex docs-review approved on 2026-03-19. Evidence: `.runs/1307-coordinator-live-provider-child-run-test-stage-terminal-completion-follow-up/cli/2026-03-19T23-03-46-459Z-587c5d05/manifest.json`
- Date: 2026-03-19
