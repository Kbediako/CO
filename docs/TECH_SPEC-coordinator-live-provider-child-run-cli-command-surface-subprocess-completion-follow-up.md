# TECH_SPEC: Coordinator Live Provider Child-Run CLI Command-Surface Subprocess Completion Follow-Up

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: Reassess the apparent post-`1307` command-surface completion blocker with fresh terminal evidence, avoid an unjustified code change, then rerun the full local validation floor and live provider child run to the next exact stage boundary.
- Scope:
  - docs-first registration for the new follow-up lane
  - delegated read-only analysis and docs-review for the corrected blocker statement
  - truthful evidence correction across the 1308 packet
  - required repo validation plus a live provider rerun against the existing control-host state
- Constraints:
  - preserve the shipped `1305`/`1306` provider and delegation contracts
  - preserve the `1307` deterministic runtime-env baseline for command-surface tests
  - stop at the first exact downstream blocker after the current `test` stage

## Technical Requirements
- Functional requirements:
  - the lane must record that focused [`tests/cli-command-surface.spec.ts`](../tests/cli-command-surface.spec.ts) coverage returns terminally on the current tree
  - runtime-env override precedence from `1307` must remain intact
  - full `npm run test` must be rerun with patience-first monitoring on the implementation tree
  - the live provider-started child run must still clear the current `delegation-guard`, `build`, `lint`, and `test` stages or else capture the next exact failing stage
- Non-functional requirements:
  - keep the diff minimal and localized to docs/evidence unless a fresh blocker demands code
  - preserve the CLI command-surface coverage goals without weakening the tests
  - keep the docs/checklist/evidence trail truthful about what was observed and why
- Interfaces / contracts:
  - CLI subprocess test harness in [`tests/cli-command-surface.spec.ts`](../tests/cli-command-surface.spec.ts)
  - live provider child-run evidence under `.runs/local-mcp/cli/control-host/` and `.runs/linear-*/`

## Architecture & Data
- Architecture / design adjustments:
  - keep the `1307` test-helper runtime env defaults in place; do not reopen that contract because the focused rerun passed
  - treat the fresh `297.91s` focused pass as evidence that the suspected help-path hang was a duration/patience issue rather than a proven CLI entry bug
  - prefer no code change unless the full suite or live rerun reproduces a new concrete failure
  - if a fresh full-suite rerun still shows another blocker after this correction, stop at that next exact blocker instead of broadening the lane
- Data model changes / migrations:
  - none expected
- External dependencies / integrations:
  - live `codex` / ts-node CLI boot remains part of the command-surface contract under test
  - live provider control-host state and reused child-run lineage remain the authoritative downstream validation target

## Validation Plan
- Tests / checks:
  - docs-review for `1308`
  - focused CLI command-surface rerun proving the suspected blocker is terminal after a long runtime
  - full validation floor:
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
- Rollout verification:
  - verify the control-host state still shows accepted provider claims
  - trigger or observe a real started Linear issue against the current live setup
  - confirm the mapped child run gets beyond the current `test` stage
  - if another blocker appears, capture the manifest/log evidence and stop there
- Monitoring / alerts:
  - monitor the local Vitest processes with patience-first polling rather than treating quiet windows as proof of a hang
  - monitor the reused or newly launched provider child-run manifest plus `commands/*.ndjson`

## Open Questions
- Whether full `npm run test` is also long-but-terminal on the current tree, or whether it still exposes another specific blocker after the focused command-surface pass?
- Which downstream stage becomes the next live blocker once the local validation floor is rerun with patience-first monitoring?

## Approvals
- Reviewer: Codex docs-review rerun approved on 2026-03-19. Evidence: `.runs/1308-coordinator-live-provider-child-run-cli-command-surface-subprocess-completion-follow-up-docs-rerun/cli/2026-03-19T23-44-17-826Z-d4c5ecb0/manifest.json`
- Date: 2026-03-19
