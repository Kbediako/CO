# ACTION_PLAN - CO: Refactor docs-hygiene spark policy guard into parser-backed fixture harness

## Summary
- Goal: preserve CO-183 spark-policy behavior while refactoring docs-hygiene classification into a parser-backed helper and structured fixture harness.
- Scope: docs-first packet, classifier module, docs-catalog/docs-hygiene integration, structured spark-policy fixtures, table-driven tests, validation, review handoff.
- Assumptions:
  - CO-183's shipped behavior is the reference behavior for this lane.
  - `docs/guides/codex-version-policy.md` remains the current model posture source.
  - The child lane `fixture-seed` owns only the fixture JSON until the parent accepts, rejects, or invalidates its output.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `scripts/docs-hygiene.ts`, `tests/docs-hygiene.spec.ts`, `docs:check`, `explorer_fast`, `gpt-5.3-codex-spark`, `file/codebase search only`, `parser-backed classifier`, `structured fixture harness`.
- Not done if:
  - behavior changes without explicit fixture evidence;
  - the fixture harness and production rule diverge;
  - the phrase corpus remains inline in a single test body;
  - scope expands into docs:freshness or Codex 0.120 posture.
- Pre-implementation issue-quality review:
  - completed on 2026-04-15. The issue is a bounded maintainability refactor with clear protected surfaces and non-goals.

## Milestones & Sequencing
1. Bootstrap docs-first artifacts and registry mirrors, create/update the Linear workpad, and capture required parallelization evidence.
2. Run focused baseline docs-hygiene tests where feasible before production internals change.
3. Add the parser-backed classifier and route docs-catalog model posture checks through it.
4. Accept or reject the child `fixture-seed` patch, then wire structured fixtures into table-driven docs-hygiene tests.
5. Run focused tests, docs:check, scoped guardrails, full validation as feasible, standalone review, elegance pass, PR handoff, and ready-review drain.

## Dependencies
- Current docs-catalog posture helpers in `scripts/lib/docs-catalog.js`.
- Existing docs-hygiene test fixture setup in `tests/docs-hygiene.spec.ts`.
- Child lane `fixture-seed` for initial fixture JSON.
- Linear workpad and PR lifecycle helpers.

## Validation
- Checks / tests:
  - focused `tests/docs-hygiene.spec.ts`;
  - `npm run docs:check`;
  - `node scripts/delegation-guard.mjs`;
  - `node scripts/spec-guard.mjs --dry-run`;
  - `npm run build`;
  - `npm run lint`;
  - `npm run test`;
  - `node scripts/diff-budget.mjs`;
  - manifest-backed standalone review under `FORCE_CODEX_REVIEW=1`;
  - explicit elegance/minimality pass.
- Rollback plan:
  - revert classifier and fixture wiring together, leaving existing docs-hygiene behavior and tests intact.

## Risks & Mitigations
- Risk: accidentally weakening stale spark posture detection.
  - Mitigation: preserve existing tests and add structured forbidden/allowed/neutral fixtures before handoff.
- Risk: overbuilding a natural-language parser.
  - Mitigation: keep parser concepts bounded to marker, clause, assertion window, scope qualifier, forbidden usage, restrictive non-use, and neutral reference.
- Risk: child fixture output collides with parent test wiring.
  - Mitigation: parent avoids child-owned fixture path until disposition; any collision is resolved before accepting the child patch.

## Approvals
- Reviewer: pending
- Date: 2026-04-15
