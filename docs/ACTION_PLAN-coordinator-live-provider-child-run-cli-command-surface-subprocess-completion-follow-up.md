# ACTION_PLAN - Coordinator Live Provider Child-Run CLI Command-Surface Subprocess Completion Follow-Up

## Added by Bootstrap (refresh as needed)

## Summary
- Goal: Correct the apparent post-`1307` command-surface non-return with fresh terminal evidence, then rerun the full local validation floor and the live provider-started child run until the next exact blocker is known.
- Scope: docs-first lane registration, delegated read-only analysis, docs review, truthful evidence correction, required validation, live rerun, and PR-to-merge closeout if the lane is green.
- Assumptions:
  - the runtime-env isolation added in `1307` remains correct and should stay in place
  - the focused command-surface suite is long but terminal on the current tree
  - the existing control host and provider setup remain live enough to reuse without repeating setup work

## Milestones & Sequencing
1. Register `1308` docs, mirrors, freshness entries, and task snapshot with truthful predecessor wording from `1307`.
2. Capture delegated scout/docs-review evidence for `1308`, then correct the lane wording to reflect that the focused command-surface suite is terminal after a long runtime.
3. Run the required validation floor plus explicit elegance/review passes without inventing a code fix unless a fresh blocker appears.
4. Rerun the live provider-started path, capture the next exact stage result, then open the PR, handle feedback/checks, merge, and return to clean `main` if the lane is green.

## Dependencies
- Current `1307` branch state
- Existing command-surface and runtime/provider regression coverage
- Existing control-host advisory/provider-intake state and live provider child-run lineage

## Validation
- Checks / tests:
  - focused `npx vitest run --config vitest.config.core.ts tests/cli-command-surface.spec.ts`
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
  - if a new concrete blocker appears, stop and record it instead of preserving a stale “command-surface hang” hypothesis
  - if the live rerun reveals a new downstream blocker, stop and record that blocker rather than widening scope

## Risks & Mitigations
- Risk: a no-code reassessment misses a later full-suite or live blocker.
  - Mitigation: rerun the full local and live validation chain instead of stopping at the focused suite result.
- Risk: the lane docs stay stale after the focused suite proves terminal.
  - Mitigation: update the 1308 packet immediately before continuing with validation.
- Risk: the live provider rerun exposes a downstream blocker unrelated to local CLI duration.
  - Mitigation: stop at the first exact new live blocker with captured evidence.

## Approvals
- Reviewer: Codex docs-review rerun approved on 2026-03-19. Evidence: `.runs/1308-coordinator-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up-docs-rerun/cli/2026-03-19T23-44-17-826Z-d4c5ecb0/manifest.json`
- Date: 2026-03-19
