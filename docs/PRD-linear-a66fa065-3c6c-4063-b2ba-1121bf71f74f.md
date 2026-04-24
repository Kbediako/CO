# PRD - CO-346 skipped review prerequisite-stage truth

## Traceability
- Linear issue: `CO-346` / `a66fa065-3c6c-4063-b2ba-1121bf71f74f`
- Linear URL: https://linear.app/asabeko/issue/CO-346/co-report-skipped-review-prerequisite-stage-truthfully-when-guard
- Task id: `linear-a66fa065-3c6c-4063-b2ba-1121bf71f74f`
- Canonical spec: `tasks/specs/linear-a66fa065-3c6c-4063-b2ba-1121bf71f74f.md`
- Rework source: PR `#634` review feedback accepted in-thread before closing the old PR.

## Summary
- Problem Statement: review prerequisite guard failures can make the review stage skip, while the visible run summary and feedback still report a generic build-stage failure or point at unrelated artifacts.
- Desired Outcome: skipped-review output names the failed prerequisite stage only when the manifest exposes real stage/failed-command evidence, keeps true build/test/review failures generic, and includes only relevant error artifact paths.

## User Request Translation
- User intent / needs: fix the CO-346 bug through the provider-worker Rework lane without broadening into unrelated manifest-summary cleanup.
- Success criteria / acceptance:
  - skipped-review summaries name known failed prerequisite stages such as `delegation-guard`, `spec-guard`, `docs:check`, or `diff-budget`
  - true `build`, `test`, and `review` stage failures keep their existing generic skipped-review wording
  - non-stage `status_detail` values such as `cloud-env-missing` do not infer a prerequisite stage from target command ids
  - advisory or skipped `allowFailure` command `error_file` values do not become failed-stage evidence
  - skipped-review feedback includes an error artifact path only when it is tied to the failed stage or failed command
- Constraints / non-goals:
  - no weakening of guard execution
  - no broad `CO-172` manifest-summary rewrite
  - no review-wrapper telemetry taxonomy changes unless directly needed for this wording fix

## Intent Checksum
- Protected terms / artifact names:
  - `Review skipped: build stage failed.`
  - `stage:delegation-guard:failed`
  - `errors/01-delegation-guard.json`
  - `cloud-env-missing`
  - `allowFailure`
  - `orchestrator/src/manager.ts`
  - `orchestrator/src/cli/adapters/CommandBuilder.ts`
- Nearby wrong interpretations to reject:
  - treating every failed builder result as a compile/build failure
  - treating every failed command id as a failed stage when `status_detail` already names a non-stage failure
  - hiding guard-stage failures behind generic build wording
  - attaching unrelated advisory error artifacts to skipped-review feedback
  - changing pipeline guard behavior

## Not Done If
- `delegation-guard` or similar prerequisite-stage failures still report as `build stage failed`.
- build failures stop reporting as build failures.
- `cloud-env-missing` or other non-stage failure details are mislabeled as prerequisite-stage failures.
- skipped/advisory `allowFailure` command artifacts are used as failed-stage evidence.
- feedback points operators at unrelated `errors/` artifacts when no failed stage/command artifact is known.
- tests only assert the old generic wording.

## Goals
- Improve skipped-review truthfulness for prerequisite guard/stage failures.
- Preserve existing review result schema and guard behavior.
- Keep the diff focused on builder failure diagnostics, skipped-review wording, docs packet, and focused tests.

## Non-Goals
- No pipeline redesign.
- No change to command execution or guard semantics.
- No cleanup of stale historical run artifacts.
- No broad provider closeout or review-wrapper telemetry work.

## Validation
- `node scripts/spec-guard.mjs --dry-run`
- focused CO-346 orchestrator tests
- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run repo:stewardship`
- `node scripts/diff-budget.mjs`
- manifest-backed standalone review and explicit elegance review

## Approvals
- Product: Linear CO-346
- Engineering: parent provider worker plus same-issue child test lane
