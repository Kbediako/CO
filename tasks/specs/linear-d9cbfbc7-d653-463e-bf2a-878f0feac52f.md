---
id: 20260426-linear-d9cbfbc7-d653-463e-bf2a-878f0feac52f
title: "CO-374 archive Core Lane dispatch discovery break"
relates_to: docs/PRD-linear-d9cbfbc7-d653-463e-bf2a-878f0feac52f.md
risk: medium
owners:
  - Codex
last_review: 2026-05-19
---

# Mini Spec - CO-374 archive Core Lane dispatch discovery break

See also:
- `docs/PRD-linear-d9cbfbc7-d653-463e-bf2a-878f0feac52f.md`
- `docs/TECH_SPEC-linear-d9cbfbc7-d653-463e-bf2a-878f0feac52f.md`
- `docs/ACTION_PLAN-linear-d9cbfbc7-d653-463e-bf2a-878f0feac52f.md`

## User-request translation
- Stop the archive automation `Dispatch Core Lane for archive PR` step from continuing the full bounded discovery loop after it already found the dispatched Core Lane run id.
- Preserve the existing fail-closed ambiguity behavior when more than one new matching run id is visible.
- Preserve archive PR `Core Lane` pending/success/failure/error commit-status mirroring.
- Validate with a focused harness if no live archive PR workflow run is available.

## Protected terms
- `Dispatch Core Lane for archive PR`
- `CANDIDATE_RUN_ID`
- `RUN_ID`
- `BASELINE_RUN_IDS`
- `gh run watch`
- `Core Lane`
- `.github/workflows/archive-automation-base.yml`

## Nearby wrong interpretations
- Do not replace the existing baseline/delta discovery strategy.
- Do not silently choose one id when multiple new ids match.
- Do not remove the bounded retry path for the no-run-visible case.
- Do not rename, remove, or weaken `Core Lane` commit-status mirroring.

## Explicit non-goals
- No changes to `core-lane.yml`.
- No archive payload, archive policy, auto-merge token, or branch-protection changes.
- No new workflow dependencies.

## Not done if
- `RUN_ID` is assigned but the loop can still continue to `sleep 15`.
- Ambiguity failure is removed or bypassed.
- Existing success/failure/error status paths change behavior.
- Focused validation does not prove the `break` is ordered before the next sleep.

## Parity matrix

| Surface | Current behavior | Target behavior |
| --- | --- | --- |
| Successful discovery | `RUN_ID` is assigned, then the loop keeps polling/sleeping through remaining attempts. | `RUN_ID` is assigned and the loop breaks immediately. |
| Multiple new ids | `find_dispatched_run_id` returns `2` and the archive workflow fails with a status error. | Same behavior. |
| No new id visible | Loop retries up to 40 attempts, then writes not-found error status. | Same behavior. |
| Status mirroring | Pending before dispatch; success/failure/error after watch/view result. | Same behavior. |

## Scope
- Add a `break` immediately after `RUN_ID="${CANDIDATE_RUN_ID}"`.
- Add/refresh focused workflow tests that prove break-before-sleep ordering and ambiguity preservation.
- Keep docs/task/workpad evidence aligned for review.

## Acceptance
- [x] Break out of discovery immediately after exactly one new Core Lane run id is found.
- [x] Preserve ambiguity failure behavior when multiple matching runs are found.
- [x] Preserve pending/success/failure commit-status mirroring for archive PRs.
- [x] Validate with a focused script/harness that proves no fixed 10-minute delay remains.

## Validation
- [x] Focused Vitest: `npx vitest run --config vitest.config.core.ts tests/archive-automation-workflow.spec.ts tests/archive-automation-core-lane-dispatch.spec.ts`.
- [x] Same-issue child lane accepted: `.runs/linear-d9cbfbc7-d653-463e-bf2a-878f0feac52f-dispatch-validation/cli/2026-04-25T17-50-15-458Z-21e3a1b5/manifest.json`.
- [x] Full guard/build/lint/test/docs/review gates complete before handoff: delegation guard, spec guard, build, lint, full test, docs checks, repo stewardship, diff budget, diff whitespace check, bounded-success standalone review, and explicit elegance review passed.
