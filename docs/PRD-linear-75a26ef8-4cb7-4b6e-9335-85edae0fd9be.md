# PRD - CO: refresh stale task specs blocking Core Lane spec guard

## Traceability
- Linear issue: `CO-318` / `75a26ef8-4cb7-4b6e-9335-85edae0fd9be`
- Linear URL: https://linear.app/asabeko/issue/CO-318/co-refresh-stale-task-specs-blocking-core-lane-spec-guard
- Source issue: `CO-314` / `e2852b4f-09d0-4220-b0ac-b763170eacb2`
- Representative blocked PR: `#608`
- Representative failed Actions run: `24809623873`

## Summary
- Problem Statement: `node scripts/spec-guard.mjs` currently fails on current `origin/main` because six active task specs still carry `last_review: 2026-03-23`, which is 31 days old on `2026-04-23`. This is baseline debt on main, not a `CO-314` release-workflow regression.
- Desired Outcome: re-review and refresh the exact six stale specs on a branch containing only the blocker fix so `spec-guard` passes again and downstream PRs stop failing `Core Lane` for unrelated freshness debt.

## User Request Translation
- Resolve the exact current-main stale blocker set proven by live `spec-guard` output.
- Keep `spec-guard` freshness enforcement intact; do not waive or weaken it.
- Stay out of `CO-314` release-workflow changes, generic docs cleanup, and mass edits outside the verified stale set.

## Protected Terms
- `node scripts/spec-guard.mjs`
- `Core Lane`
- `last_review`
- current `origin/main`
- `tasks/specs/0975-codex-cli-capability-adoption-redesign.md`
- `tasks/specs/0976-context-alignment-checker-option2.md`
- `tasks/specs/1319-coordinator-symphony-end-to-end-operational-parity-remediation.md`
- `tasks/specs/1320-coordinator-symphony-post-merge-retry-timer-follow-up.md`
- `tasks/specs/1321-coordinator-live-linear-unassigned-active-claim-alignment-and-recovery.md`
- `tasks/specs/linear-856c1318-524f-4db3-8d4a-b357ec51c304.md`

## Scope
- Record the current-main failure evidence for the exact six-spec stale set.
- Create the CO-318 docs-first packet and registry mirrors.
- Re-review and refresh only the six proven-stale task specs.
- Validate `node scripts/spec-guard.mjs` passes on the blocker-fix branch and that the representative blocked PR seam was the same baseline failure.

## Acceptance Criteria
- Reproduce and record the current-main `spec-guard` failure against the exact stale spec set.
- Update or otherwise resolve the six stale task specs so they no longer violate the 30-day freshness rule on current main.
- Validate that `node scripts/spec-guard.mjs` passes on a branch containing only the blocker fix.
- Confirm the fix unblocks review handoff for dependent PRs that were red only because of this baseline failure.

## Not Done If
- Current `origin/main` still fails `node scripts/spec-guard.mjs` on the six stale specs.
- The change weakens `spec-guard` instead of resolving the freshness debt.
- The lane edits task packets outside the verified stale set without new evidence.
- The branch still leaves downstream PRs blocked on the same baseline `Core Lane` seam.
