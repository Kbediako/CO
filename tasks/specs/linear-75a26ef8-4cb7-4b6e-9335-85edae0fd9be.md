---
id: 20260423-linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be
title: CO: refresh stale task specs blocking Core Lane spec guard
status: done
relates_to: docs/PRD-linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be.md
risk: medium
owners:
  - Codex
last_review: 2026-05-18
review_notes:
  - 2026-05-18: CO-522 spec lifecycle audit found the linked task checklist has zero unchecked items (9 checked), so this spec is terminal and eligible for implementation-docs archive. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-local-classification.json`.
---

## Traceability
- Linear issue: `CO-318` / `75a26ef8-4cb7-4b6e-9335-85edae0fd9be`
- Linear URL: https://linear.app/asabeko/issue/CO-318/co-refresh-stale-task-specs-blocking-core-lane-spec-guard
- Source issue: `CO-314` / `e2852b4f-09d0-4220-b0ac-b763170eacb2`
- Representative blocked PR: `#608`
- Representative failed Actions run: `24809623873`
- Current-main failure log: `out/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be/before/spec-guard-current-main.log`
- Detached-HEAD comparison log: `out/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be/before/spec-guard.log`
- Accepted child-lane evidence note: `out/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be/manual/20260423T0051Z-child-lane-baseline-note.md`

## Summary
- Current `origin/main` fails `node scripts/spec-guard.mjs` because six active task specs still carry `last_review: 2026-03-23`.
- A detached workspace that was behind `origin/main` falsely added `0954`, `1317`, and `1318`; those are comparison evidence only and must not widen the fix set.
- The intended repair is a bounded re-review and freshness refresh of the exact six current-main stale specs with no `spec-guard` policy change.

## Requirements
1. Preserve live evidence that current `origin/main` fails on the exact six stale specs listed in `CO-318`.
2. Keep the fix scoped to those six specs unless new current-main evidence proves the set changed.
3. Re-review the six stale specs before refreshing `last_review`.
4. Keep `spec-guard` freshness enforcement unchanged.
5. Prove the blocker fix with a clean `node scripts/spec-guard.mjs` run on this branch.
6. Carry forward the downstream-unblock proof that `CO-314` / PR `#608` was blocked by this baseline seam rather than by release-workflow changes.

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

## Wrong Interpretations To Reject
- Treat this as a `CO-314` release-workflow bug.
- Weaken or disable `spec-guard` instead of fixing the stale specs.
- Expand into generic docs-freshness cleanup or mass packet edits.
- Use detached-HEAD false extras `0954`, `1317`, or `1318` to justify a broader refresh set.

## Parity Matrix

| Surface | Current | Target |
| --- | --- | --- |
| `spec-guard` on current main | fails on six stale task specs | passes without changing guard behavior |
| Stale set | exact six specs from `CO-318` | same six specs refreshed or otherwise resolved |
| Detached stale comparison | old workspace also reported `0954`, `1317`, `1318` | false extras documented but not edited |
| Downstream unblock proof | PR `#608` was red on the same baseline seam | blocker lane proves unrelated PRs are no longer stopped here |

## Validation
- Preserve current-main `spec-guard` failure logs.
- Re-review the six stale specs and refresh only their `last_review` values if no content changes are required.
- Re-run `node scripts/spec-guard.mjs`.
- Record the result in the workpad and packet mirrors before review handoff.

## Notes
- 2026-04-23 pre-implementation issue-quality review: the issue is narrower than generic docs freshness and broader than a pure log-only closeout. Current-main evidence proves the work is the exact six-spec stale set already named in `CO-318`; detached-HEAD extras are comparison noise from an out-of-date workspace and do not widen scope.
- 2026-04-23 accepted bounded child lane `co318-baseline-note`: the child produced and the parent accepted a one-file evidence note confirming the exact six current-main stale specs plus the detached-HEAD false extras.
- 2026-04-23 docs-review fallback: rerun manifest `.runs/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be-docs-review/cli/2026-04-23T01-02-51-949Z-949cc108/manifest.json` passed `docs:check` and stopped at `docs:freshness:maintain` on the same stale-spec freshness debt this issue owns plus older historical docs-freshness baseline debt. Fallback evidence is recorded at `out/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be/manual/20260423T0103Z-docs-review-fallback.md`.
- 2026-04-23 post-fix validation: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run repo:stewardship`, and `node scripts/diff-budget.mjs` all passed after the six target specs were refreshed.
- 2026-04-23 residual repo debt: `npm run docs:freshness` and `npm run docs:freshness:maintain -- --format json` still report unrelated historical docs debt on current `origin/main`; same-project follow-up `CO-319` was created to restore a live canonical owner for the remaining Mar 23 `tasks/tasks-*` cohort instead of widening `CO-318`.
- 2026-04-23 post-sync review and elegance: manifest-backed standalone review telemetry reported `bounded-success`, the only actionable finding was removal of untracked `.child-lanes` runtime clones, and the follow-on manual recheck plus explicit elegance pass are recorded at `out/linear-75a26ef8-4cb7-4b6e-9335-85edae0fd9be/manual/20260423T0140Z-post-sync-review-elegance.md`.
