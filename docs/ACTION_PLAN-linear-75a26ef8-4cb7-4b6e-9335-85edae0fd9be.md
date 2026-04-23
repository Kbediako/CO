# ACTION_PLAN - CO: refresh stale task specs blocking Core Lane spec guard

## Goal
- Remove the current-main stale-spec baseline debt that is stopping unrelated review-ready PRs at `node scripts/spec-guard.mjs`.

## Steps
1. Preserve current-main evidence for the exact six stale task specs and the detached-HEAD false extras.
2. Create the docs-first packet and registry mirrors for `CO-318`.
3. Run pre-implementation docs-review evidence for the new packet.
4. Re-review and refresh only the six verified stale specs.
5. Re-run `node scripts/spec-guard.mjs`, refresh the workpad, and carry the unblock proof into handoff.

## Validation
- Current-main `spec-guard` reproduction saved under `out/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be/`.
- Clean post-fix `node scripts/spec-guard.mjs`.
- Workpad and packet mirrors updated to match the final evidence.

## Boundaries
- No `spec-guard` policy weakening.
- No `CO-314` release-workflow changes.
- No edits outside the exact verified stale-spec set unless new evidence requires it.
