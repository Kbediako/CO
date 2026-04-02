# ACTION_PLAN - CO: Deduplicate trailing JSON-tail parsing across child-stream and delegation server

## Added by Bootstrap (refresh as needed)

## Traceability
- Linear issue: `CO-50` / `6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5`
- Linear URL: https://linear.app/asabeko/issue/CO-50/co-deduplicate-trailing-json-tail-parsing-across-child-stream-and
- Source issue: `CO-37` / `97aef5e3-dadb-4909-9b00-68c698f10f93`
- Source PR: `#325`

## Summary
- Goal: finish `CO-50` by extracting a shared trailing JSON-tail parser for the provider-worker child-stream and delegation-server spawn seams without changing either seam’s returned payload contract.
- Scope: docs-first registration, docs-review child stream, narrow helper extraction, focused seam regressions, required validation, and review/elegance handoff gates.
- Assumptions:
  - the provider-worker helper already reflects the stricter contract the issue wants to preserve
  - delegation-server can adapt a `null` shared-helper result back to `{}` without altering external behavior only if the shared helper still preserves delegation’s footer-log tolerance
  - focused seam tests are sufficient proof; no broader end-to-end behavior change is required for this follow-up

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `Deduplicate trailing JSON-tail parsing across child-stream and delegation server`
  - `Preserve existing fail-closed behavior`
  - `parseSpawnOutput`, `parseTrailingJsonObject`, `linear child-stream`
- Not done if:
  - duplicate parser logic still exists in both call sites
  - fail-closed handling regresses for malformed or non-object output
  - either seam’s returned payload contract changes
- Pre-implementation issue-quality review:
  - the issue is not asking for broader provider-worker or delegation-server redesign; it is a bounded shared-helper extraction plus regression coverage follow-up to `CO-37`

## Milestones & Sequencing
1) Register the docs-first packet for `CO-50`, update the task registry, and mirror the checklist before code edits.
2) Run the audited `linear child-stream --pipeline docs-review` lane and record the manifest-backed result or an explicit fallback if the child fails for unrelated repo-wide reasons.
3) Extract the shared helper and update `providerLinearChildStreamShell.ts` plus `delegationServer.ts` to use it without changing their returned payload shapes.
4) Update focused seam regressions so both provider-worker and delegation-server paths prove prelude-log success and malformed-output failure, and so delegation-server additionally proves footer-log success without widening the provider-worker seam.
5) Run the required validation floor, then the standalone review and explicit elegance pass, refresh the workpad, and proceed to PR handoff only once the lane is clean.

## Dependencies
- `orchestrator/src/cli/providerLinearChildStreamShell.ts`
- `orchestrator/src/cli/delegationServer.ts`
- `orchestrator/tests/ProviderLinearChildStreamShell.test.ts`
- `orchestrator/tests/DelegationServer.test.ts`

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-6efa7c09-7f2b-4a12-9d3f-69a6a7ff4db5 node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-50-docs-review --format json`
  - focused `vitest` coverage for `orchestrator/tests/ProviderLinearChildStreamShell.test.ts`
  - focused `vitest` coverage for `orchestrator/tests/DelegationServer.test.ts`
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
  - revert the shared helper plus the two call-site updates together if either seam changes behavior beyond the intended deduplication
  - revert docs/task registry updates together if the implementation is abandoned before review handoff

## Risks & Mitigations
- Risk: the shared helper subtly changes delegation-server behavior by dropping previously tolerated footer log lines after the JSON payload.
  - Mitigation: keep the shared helper caller-configurable so delegation-server preserves footer-log tolerance while provider-worker remains on the stricter final-tail contract, and cover both seams in tests.
- Risk: changing the helper location causes import churn or low-signal abstraction growth.
  - Mitigation: use a small shared CLI utility module with no additional policy or wrapper layers.
- Risk: docs-review or repo validation still hits unrelated baseline debt.
  - Mitigation: record the concrete blocker or fallback note separately and do not misclassify unrelated baseline issues as parser regressions.

## Approvals
- Reviewer: `codex-orchestrator docs-review`
- Date: 2026-04-02
