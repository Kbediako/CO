# TECH_SPEC Mirror - CO: refresh stale task specs blocking Core Lane spec guard

Canonical spec: `tasks/specs/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be.md`

## Summary
- Current `origin/main` fails `node scripts/spec-guard.mjs` on the exact six stale task specs already called out in `CO-318`.
- The repair is a bounded re-review and `last_review` refresh of that six-spec set only.
- `spec-guard` enforcement, `CO-314` release-workflow behavior, and unrelated packet cleanup remain out of scope.

## Validation
- Reproduce the current-main failure and preserve the before logs.
- Refresh only the six verified stale specs.
- Re-run `node scripts/spec-guard.mjs` on the blocker-fix branch.
- Carry the result into workpad, review, and handoff notes.
