# ACTION_PLAN - CO: Make provider-worker closeout reporting authoritative and suppress deterministic invalid retries

## Traceability
- Linear issue: `CO-79` / `486fd104-53d7-4657-b26f-c477f7e730a3`
- Source issue: `CO-78`

## Plan
1. Register the docs packet, task mirrors, and single Linear workpad.
2. Run `docs-review` and keep the packet aligned with the approved scope.
3. Land the smallest code seam that makes provider-worker closeout truthful, suppresses deterministic invalid retries, and excludes proof-harness noise.
4. Add focused regressions, then run the repo validation floor.
5. Run standalone review plus elegance review, open a PR, drain automated feedback, and hand off only when review-ready.

## Final Validation
- docs-review child stream approved
- delegation-guard and spec-guard green
- build, lint, full test suite, docs:check, docs:freshness, and pack:smoke green
- diff-budget override recorded for the final docs-first plus implementation diff
- review wrapper executed but ended in explicit failed-boundary telemetry; manual fallback review found and fixed stale review-telemetry reuse across attempts

## Rollback
- Revert the shared truth helper and its call sites if closeout classification regresses healthy runs.
- Keep deterministic invalid mutation handling fail-closed rather than weakening validation contracts.
