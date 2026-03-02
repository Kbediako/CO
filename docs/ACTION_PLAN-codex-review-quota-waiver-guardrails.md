# ACTION_PLAN - Codex Review Quota + Merge Waiver Guardrails

## Summary
- Goal: prevent repeated Codex re-review pings and standardize quota-blocked merge handling.
- Scope: docs-first task scaffolding, policy updates in handbooks + version guide, checklist/index updates, and validation.

## Milestones
1) Docs-first artifacts and task mirror/index registration.
2) Policy updates in `AGENTS.md` and `docs/AGENTS.md`.
3) Version policy guide update.
4) Validation and PR/merge closeout.

## Validation
- Run ordered quality lane after edits:
  1. `node scripts/delegation-guard.mjs`
  2. `node scripts/spec-guard.mjs --dry-run`
  3. `npm run build`
  4. `npm run lint`
  5. `npm run test`
  6. `npm run docs:check`
  7. `npm run docs:freshness`
  8. `node scripts/diff-budget.mjs`
  9. `npm run review`
  10. `npm run pack:smoke` (only if required by touched paths)

## Approvals
- Reviewer: Codex (self-approval with user-approved objective).
- Date: 2026-03-02.
