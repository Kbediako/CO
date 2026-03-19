# 1073 Closeout Summary

`1073` is complete. [`orchestrator/src/cli/control/controlServer.ts`](../../../../../../orchestrator/src/cli/control/controlServer.ts) now delegates child-run question-resolution adapter assembly directly to [`orchestrator/src/cli/control/controlQuestionChildResolution.ts`](../../../../../../orchestrator/src/cli/control/controlQuestionChildResolution.ts), while keeping request admission, expiry/bootstrap ownership, Telegram/helper sequencing, and authenticated-route dispatch explicit in the server shell.

The extracted module stays bounded to the intended Symphony-aligned seam:
- `createControlQuestionChildResolutionAdapter(...)` now owns the live control-context composition for allowed run roots/hosts, delegation-token validation, parent-run identity lookup, and fallback audit emission.
- [`orchestrator/src/cli/control/questionChildResolutionAdapter.ts`](../../../../../../orchestrator/src/cli/control/questionChildResolutionAdapter.ts) still owns the generic child-resolution behavior, including outcome mapping, child-control endpoint calls, and manifest/control-state checks.
- `controlServer.ts` now calls the extracted seam directly from expiry lifecycle bootstrap, Telegram question reads, and authenticated-route handling instead of retaining a server-local wrapper.

The final tree also applies the explicit elegance trims surfaced during closeout: the leftover one-line server forwarder was removed, and server-level fallback regressions now pin both answered and expired child-resolution failures. Focused final-tree regressions passed `98/98` in [`05b-targeted-tests.log`](./05b-targeted-tests.log), deterministic gates passed (`delegation-guard`, `spec-guard`, `build`, `lint`, `docs:check`, `docs:freshness`, `diff-budget`, `review`, `pack:smoke`), and the manual/mock seam check in [`11-manual-question-child-resolution-check.json`](./11-manual-question-child-resolution-check.json) confirms direct server usage plus preserved answered/expired fallback audit coverage.

The recorded non-green item is explicit rather than implied away:
- `npm run test` again hit the recurring quiet tail after the late full-suite lines `✓ tests/cli-orchestrator.spec.ts  (7 tests) 46555ms` and `✓ tests/run-review.spec.ts  (64 tests) 98007ms` in [`05-test.log`](./05-test.log), so closeout relies on that partial full-suite evidence plus the refreshed final-tree regressions.
