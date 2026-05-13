# ACTION_PLAN - CO Make Linear Child-Stream JSON Parsing Robust to Wrapper Prelude Logs

## Added by Bootstrap (refresh as needed)

## Traceability
- Linear issue: `CO-37` / `97aef5e3-dadb-4909-9b00-68c698f10f93`
- Linear URL: https://linear.app/asabeko/issue/CO-37/co-make-linear-child-stream-json-parsing-robust-to-wrapper-prelude

## Summary
- Goal: finish Linear issue `CO-37` by making `linear child-stream --format json` robust to wrapper prelude logs without changing the returned success payload contract.
- Scope: docs-first registration, baseline audit, pre-implementation docs-review child stream, bounded child-stream parser/tests changes, validation, review/elegance gates, and normal PR handoff.
- Assumptions:
  - the narrowest durable fix is to extract the final JSON object from stdout after optional prelude logs, then keep current validation unchanged
  - malformed or missing final JSON should remain a hard failure
  - downstream callers depend on the existing success payload shape and should not need updates

## Milestones & Sequencing
1) Register the CO-37 docs-first packet, capture the baseline audit note, update `tasks/index.json`, update `docs/TASKS.md`, and mirror the task checklist.
2) Run `docs-review` through the audited `linear child-stream` path and record the manifest-backed approval before implementation.
3) Patch `orchestrator/src/cli/providerLinearChildStreamShell.ts` so the parser accepts a valid trailing JSON object after optional prelude logs without changing downstream validation.
4) Add focused regressions for successful prelude-log parsing plus malformed-output rejection in `orchestrator/tests/ProviderLinearChildStreamShell.test.ts`.
5) Run required validation plus standalone review and explicit elegance review, then refresh the workpad for PR handoff.

## Dependencies
- `orchestrator/src/cli/providerLinearChildStreamShell.ts`
- `orchestrator/tests/ProviderLinearChildStreamShell.test.ts`
- `orchestrator/src/cli/delegationServer.ts` (reference-only extraction posture)

## Validation
- Checks / tests:
  - `node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --format json`
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - focused `vitest` coverage for `orchestrator/tests/ProviderLinearChildStreamShell.test.ts`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - manifest-backed standalone review plus explicit elegance review before handoff
  - `npm run pack:smoke`
- Rollback plan:
  - revert the parser/test change if it admits malformed child output or changes the success payload shape
  - revert docs/task updates together if the implementation is abandoned before review handoff

## Risks & Mitigations
- Risk: a permissive extractor could parse the wrong object from mixed stdout.
  - Mitigation: keep extraction bounded to a valid trailing object and retain the existing field/path validation after parse.
- Risk: the parser fix changes success payload fields or path resolution behavior.
  - Mitigation: leave normalization and path confinement logic unchanged and add regression assertions on returned fields.
- Risk: the docs-review child-stream still fails in this run because the current bug reproduces before the fix lands.
  - Mitigation: record the underlying successful child manifest directly in an override note if the helper still returns output-invalid while the child run itself succeeds.

## Approvals
- Reviewer: docs-review approved via `.runs/linear-97aef5e3-dadb-4909-9b00-68c698f10f93-docs-review/cli/2026-03-30T06-50-00-271Z-a27a59eb/manifest.json`
- Date: 2026-03-30

## Manifest Evidence
- Baseline audit: `out/linear-97aef5e3-dadb-4909-9b00-68c698f10f93/manual/20260330T064305Z-baseline-audit.md`
- Docs-review manifest: `.runs/linear-97aef5e3-dadb-4909-9b00-68c698f10f93-docs-review/cli/2026-03-30T06-50-00-271Z-a27a59eb/manifest.json`
- Docs-review override note: `out/linear-97aef5e3-dadb-4909-9b00-68c698f10f93/manual/20260330T065459Z-docs-review-override.md`
