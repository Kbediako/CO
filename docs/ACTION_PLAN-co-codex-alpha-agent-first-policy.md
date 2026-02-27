# ACTION_PLAN - CO Codex Alpha Agent-First Policy

## Summary
- Goal: Codify CO-only Codex alpha procedures in agent-first docs.
- Scope: docs-first scaffolding, handbook updates, canonical policy guide, mirror/index updates, and validation.

## Milestones
1) Docs-first artifacts + task registration.
2) Policy updates in `AGENTS.md` and `docs/AGENTS.md`.
3) Canonical guide with cadence/evidence/rollback.
4) Validation and checklist closeout.

## Validation
- Run ordered quality lane for this task after edits:
  1. `node scripts/delegation-guard.mjs`
  2. `node scripts/spec-guard.mjs --dry-run`
  3. `npm run build`
  4. `npm run lint`
  5. `npm run test`
  6. `npm run docs:check`
  7. `npm run docs:freshness`
  8. `node scripts/diff-budget.mjs`
  9. `npm run review`
  10. `npm run pack:smoke`

## Approvals
- Reviewer: Codex (self-approval with user-approved objective).
- Date: 2026-02-27.
