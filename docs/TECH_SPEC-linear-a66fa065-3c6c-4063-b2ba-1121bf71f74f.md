---
id: 20260424-linear-a66fa065-3c6c-4063-b2ba-1121bf71f74f
title: "CO-346 skipped review prerequisite-stage truth"
relates_to: docs/PRD-linear-a66fa065-3c6c-4063-b2ba-1121bf71f74f.md
related_prd: docs/PRD-linear-a66fa065-3c6c-4063-b2ba-1121bf71f74f.md
related_action_plan: docs/ACTION_PLAN-linear-a66fa065-3c6c-4063-b2ba-1121bf71f74f.md
risk: medium
owners:
  - Codex
last_review: 2026-04-24
---

# TECH_SPEC - CO-346 skipped review prerequisite-stage truth

This mirror points to the canonical task spec at `tasks/specs/linear-a66fa065-3c6c-4063-b2ba-1121bf71f74f.md`.

## Implementation Summary
- Extend `BuildResult` additively with optional `failureStage` and `failureArtifactPath` diagnostics.
- Update `CommandBuilder` to derive a failed prerequisite stage from explicit `stage:*:failed` or `subpipeline:*:failed` `status_detail`, from `cloud:<target-stage>:failed` only when the same stage has failed command evidence, or from failed command records only when no non-empty status detail exists.
- Ignore skipped/advisory `allowFailure` command artifacts when deriving failed-stage truth.
- Include command error artifacts as build artifacts for operator evidence, while only setting `failureArtifactPath` for the actual failed stage/command.
- Update `TaskManager` so build-stage review skips can report a known prerequisite stage instead of always saying `build stage failed`.
- Keep true `build`, `test`, and `review` stages on existing generic skipped-review wording.
- Add focused tests for guard-stage review skips, true build skips, non-stage failure details, allow-failure artifact false positives, and unrelated artifact fallback.

## Evidence Requirements
- Preserve the CO-346 evidence run shape:
  - build `subtaskId`: `docs-review:delegation-guard`
  - manifest `status_detail`: `stage:delegation-guard:failed`
  - command error artifact: `errors/01-delegation-guard.json`
- Preserve Rework feedback truth from PR `#634`:
  - `cloud-env-missing` is non-stage failure detail and must not infer a prerequisite stage
  - skipped/advisory `allowFailure` command `error_file` values are artifacts, not failed-stage evidence
  - generic build skips must not attach unrelated error artifacts
  - `cloud:<stage>:failed` target-stage details are only promoted when the matching command actually failed
- Do not rely on reading historical `.runs` artifacts at runtime.

## Validation Contract
- Required targeted validation:
  - focused Vitest coverage for `CommandBuilder` and `TaskManager`, including cloud target-stage and artifact false-positive regressions
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
- Required review before handoff:
  - completed/accepted or rejected same-issue child test lane
  - manifest-backed standalone review
  - explicit elegance/minimality review
