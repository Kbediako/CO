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
  - cloud target-stage details are promoted only when the matching command actually failed
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
  - `cloud:diff-budget:failed`
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
- Pipeline design remains unchanged.
- Command execution and guard semantics stay unchanged.
- Stale historical run artifacts remain untouched.
- Provider closeout and review-wrapper telemetry stay out of scope.

## Validation
- `MCP_RUNNER_TASK_ID=linear-a66fa065-3c6c-4063-b2ba-1121bf71f74f node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- `npm run test -- orchestrator/tests/CommandBuilder.test.ts orchestrator/tests/TaskManager.test.ts`
- `npm run test:core -- orchestrator/tests/ProviderIssueHandoff.test.ts -t "blocks direct webhook admission when queued retry and resumable claims fill max_allowed"`
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run repo:stewardship`
- `node scripts/diff-budget.mjs`
- `npm run pack:smoke`
- `TASK=linear-a66fa065-3c6c-4063-b2ba-1121bf71f74f NOTES="Goal: verify CO-346 skipped-review prerequisite-stage truth fix after exact artifact-stage matching | Summary: BuildResult carries failed-stage diagnostics, CommandBuilder derives explicit failed-stage evidence, TaskManager reports known prerequisite stages and only attaches explicit or exact stage-matched error artifacts, and tests cover false positives | Risks: skipped review wording and artifact attribution" FORCE_CODEX_REVIEW=1 CODEX_REVIEW_NON_INTERACTIVE=1 npm run review -- --manifest .runs/linear-a66fa065-3c6c-4063-b2ba-1121bf71f74f/cli/2026-04-24T09-43-00-650Z-90a71ad8/manifest.json --base origin/main --task linear-a66fa065-3c6c-4063-b2ba-1121bf71f74f --non-interactive`

## Approvals
- Product: Linear CO-346
- Engineering: parent provider worker plus same-issue child test lane
