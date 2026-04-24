# PRD - CO-346 skipped review prerequisite-stage truth

## Traceability
- Linear issue: `CO-346` / `a66fa065-3c6c-4063-b2ba-1121bf71f74f`
- Linear URL: https://linear.app/asabeko/issue/CO-346/co-report-skipped-review-prerequisite-stage-truthfully-when-guard
- Task id: `linear-a66fa065-3c6c-4063-b2ba-1121bf71f74f`
- Canonical spec: `tasks/specs/linear-a66fa065-3c6c-4063-b2ba-1121bf71f74f.md`
- Evidence run: `.runs/linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb/cli/2026-04-21T05-10-37-588Z-4745098f/manifest.json`

## Summary
- Problem Statement: docs-review and implementation-gate runs can fail before review because a prerequisite guard stage failed, while the run summary still says `Review skipped: build stage failed.`
- Desired Outcome: skipped-review output names the actual failed prerequisite stage when known, keeps true build failures labeled as build failures, and points operators at available failure artifacts.

## User Request Translation
- User intent / needs: fix the observed CO bug through Linear-backed orchestration, without broadening into unrelated manifest-summary cleanup.
- Success criteria / acceptance:
  - skipped-review summaries name known failed prerequisite stages such as `delegation-guard`, `spec-guard`, `docs:check`, or `diff-budget`
  - skipped-review feedback includes a relevant error artifact path when one is available
  - ordinary build failures still report as build failures
  - focused tests cover one guard-stage skip and one true build-failure skip
- Constraints / non-goals:
  - no weakening of guard execution
  - no broad `CO-172` manifest-summary rewrite
  - no review-wrapper telemetry taxonomy changes unless directly needed for this wording fix

## Intent Checksum
- Protected terms / artifact names:
  - `Review skipped: build stage failed.`
  - `stage:delegation-guard:failed`
  - `errors/01-delegation-guard.json`
  - `orchestrator/src/manager.ts`
  - `orchestrator/src/cli/adapters/CommandBuilder.ts`
- Nearby wrong interpretations to reject:
  - treating every failed builder result as a compile/build failure
  - hiding guard-stage failures behind generic build wording
  - changing pipeline guard behavior
  - editing the dirty shared checkout

## Not Done If
- `delegation-guard` or similar prerequisite-stage failures still report as `build stage failed`
- build failures stop reporting as build failures
- available command error files are not surfaced to the review skip feedback
- tests only assert the old generic wording

## Goals
- Improve skipped-review truthfulness for prerequisite guard/stage failures.
- Preserve existing run-summary and review result shapes.
- Keep the diff small enough for direct review.

## Non-Goals
- No pipeline redesign.
- No change to command execution or guard semantics.
- No cleanup of stale historical run artifacts.

## Validation
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- `npm run test -- orchestrator/tests/TaskManager.test.ts`
- `npm run test -- orchestrator/tests/CommandBuilder.test.ts`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`

## Approvals
- Product: Linear CO-346
- Engineering: parent orchestrator plus subagent issue-framing validation
