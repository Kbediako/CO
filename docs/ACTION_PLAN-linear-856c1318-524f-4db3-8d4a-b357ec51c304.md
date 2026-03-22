# ACTION_PLAN - Archive Automation Policy Mismatch for Linked PRD/TECH_SPEC/ACTION_PLAN Docs

## Added by Bootstrap (refresh as needed)

## Summary
- Goal: Finish Linear issue `CO-2` by aligning implementation-docs archive behavior with the existing policy and proving the linked-doc archive output with a focused regression.
- Scope: docs-first packet, pre-implementation docs-review, one archive-pattern fix, focused tests, validation, PR prep, and Linear handoff.
- Assumptions:
  - the intended archive scope remains the broader existing policy scope
  - the issue can stay in `In Progress` through coding and only move to `In Review` after a PR is attached

## Milestones & Sequencing
1) Register the docs-first packet for `linear-856c1318-524f-4db3-8d4a-b357ec51c304`, update `tasks/index.json`, update `docs/TASKS.md`, and create the persistent `## Codex Workpad` comment.
2) Run docs-review with an explicit delegation override for this worker run, because subagent spawning is unavailable in-session.
3) Patch archive-pattern handling plus canonical `tasks/index.json` `paths.docs` discovery in `scripts/implementation-docs-archive.mjs` so linked implementation docs are found and matched correctly.
4) Add focused regression coverage in `tests/implementation-docs-archive.spec.ts` for linked PRD/TECH_SPEC/ACTION_PLAN archiving across both legacy `path` and canonical `paths.docs` task-index entries.
5) Run validation, prepare a PR, attach it to Linear, update the single workpad comment, and stop coding at the team review state.

## Dependencies
- `docs/implementation-docs-archive-policy.json`
- `scripts/implementation-docs-archive.mjs`
- `tests/implementation-docs-archive.spec.ts`
- Linear issue `856c1318-524f-4db3-8d4a-b357ec51c304`

## Validation
- Checks / tests:
  - `DELEGATION_GUARD_OVERRIDE_REASON=\"subagent spawning unavailable in-session for this provider worker\" npx codex-orchestrator start docs-review --format json --no-interactive --task linear-856c1318-524f-4db3-8d4a-b357ec51c304`
  - `DELEGATION_GUARD_OVERRIDE_REASON=\"subagent spawning unavailable in-session for this provider worker\" node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
  - `npm run pack:smoke`
- Rollback plan:
  - revert the archive-pattern fix and regression if it changes behavior outside the existing policy contract
  - keep the issue in an active workflow state until the fix or blocker is clear

## Risks & Mitigations
- Risk: a fix to glob handling changes other doc-pattern behavior.
  - Mitigation: keep the implementation small and cover the intended linked-doc case explicitly in tests.
- Risk: required validation finds unrelated branch noise.
  - Mitigation: call out unrelated failures separately and avoid overstating completion.

## Approvals
- Reviewer: Pending docs-review
- Date: 2026-03-22
