# ACTION_PLAN - CO: Deduplicate child-lane trailing JSON-tail parsing with shared helper

## Added by Bootstrap (refresh as needed)

## Traceability
- Linear issue: `CO-68` / `11672de5-eb62-4942-bfdf-1d8282d786d2`
- Linear URL: https://linear.app/asabeko/issue/CO-68/co-deduplicate-child-lane-trailing-json-tail-parsing-with-shared
- Source issue: `CO-50` / `6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5`

## Summary
- Goal: finish `CO-68` by moving child-lane trailing JSON-tail parsing onto the shared helper from `CO-50` without changing child-lane payload normalization or confinement behavior.
- Scope: docs-first registration, audited docs-review child stream, narrow child-lane helper adoption, focused regressions, required validation, and review/elegance handoff gates.
- Assumptions:
  - `orchestrator/src/cli/utils/trailingJsonObject.ts` is already the canonical shared helper from `CO-50`
  - child-lane parsing should stay on the helper’s strict default mode because the issue explicitly wants the looser local behavior removed
  - focused child-lane tests are sufficient proof; no broader provider-worker behavior change is required

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `providerLinearChildLaneShell.ts`
  - `trailing JSON-tail parser`
  - `shared helper`
  - `fail-closed`
  - `returned payload contract`
- Not done if:
  - duplicate parser logic still exists in `providerLinearChildLaneShell.ts`
  - malformed final payloads are accepted by the child-lane seam
  - child-lane payload normalization or confinement behavior changes
- Pre-implementation issue-quality review:
  - the issue is narrowly about deduplicating the child-lane parse seam left behind after `CO-50`; it is not asking for broader provider-worker parsing cleanup or child-lane contract redesign

## Milestones & Sequencing
1. Register the docs-first packet for `CO-68`, update the task registry, mirror the checklist, and create the single active workpad before code edits.
2. Run the audited `linear child-stream --pipeline docs-review` lane and record the manifest-backed result or a concrete unrelated-blocker fallback.
3. Replace the local child-lane parser with the shared helper and keep normalization plus confinement logic unchanged.
4. Add focused child-lane regressions for prelude-log success and malformed-final-payload failure.
5. Run the required validation floor, then standalone review and explicit elegance review, and only proceed to review handoff if the lane is clean.

## Dependencies
- `orchestrator/src/cli/providerLinearChildLaneShell.ts`
- `orchestrator/src/cli/utils/trailingJsonObject.ts`
- `orchestrator/tests/ProviderLinearChildLaneShell.test.ts`

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-11672de5-eb62-4942-bfdf-1d8282d786d2 node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-68-docs-review --format json`
  - focused `vitest` coverage for `orchestrator/tests/ProviderLinearChildLaneShell.test.ts`
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - manifest-backed standalone review plus explicit elegance review
  - `npm run pack:smoke`
- Rollback plan:
  - revert the child-lane shared-helper adoption and focused test updates together if the stricter helper changes behavior beyond the issue scope
  - revert docs/task registry updates together if the lane is abandoned before handoff

## Risks & Mitigations
- Risk: the shared helper rejects an output shape that the local child-lane parser previously accepted.
  - Mitigation: preserve the required prelude-log success case in focused tests and keep malformed-final-payload coverage explicit so the stricter contract is deliberate and reviewable.
- Risk: touching the parse seam accidentally broadens path or run-root acceptance.
  - Mitigation: keep normalization and confinement logic unchanged, and do not edit the expected run-root checks outside the parser handoff.
- Risk: docs-review or validation hits unrelated baseline debt.
  - Mitigation: record the exact blocker separately and do not misclassify unrelated baseline failures as child-lane parser regressions.

## Approvals
- Reviewer: `codex-orchestrator docs-review`
- Date: 2026-04-03
