# 1017 Closeout Summary

## Outcome
- Extracted the selected-run projection boundary from `controlServer.ts` into `orchestrator/src/cli/control/selectedRunProjection.ts`.
- Kept route/auth/webhook/control-mutation ownership in `orchestrator/src/cli/control/controlServer.ts` while moving selected-run snapshot reading, display-state shaping, tracked Linear merge, compatibility payload builders, and request-scoped async dispatch evaluation behind the extracted boundary.
- Removed duplicate live Linear evaluation within the `/api/v1/dispatch` request path by reusing `selected.dispatchPilotEvaluation` through the projection reader instead of re-evaluating after `buildSelectedRunContext()`.

## Validation
- Green checks captured in this closeout directory:
  - `01-delegation-guard.log`
  - `02-spec-guard.log`
  - `03-build.log`
  - `04-lint.log`
  - `05-test.log`
  - `06-docs-check.log`
  - `07-docs-freshness.log`
  - `08-diff-budget.log`
  - `09-pack-smoke.log`
- Manual mock evidence is in `10-manual-projection-mock.json`. It verifies coherent selected-run/tracked payloads across `/ui/data.json`, `/api/v1/state`, and `/api/v1/:issue`, plus a single live Linear fetch inside `/api/v1/dispatch`.
- Delegated code review found no concrete regressions in the extraction; only low-risk future reuse/coverage gaps remain. The real-Symphony comparison confirmed the next step should be an observability-surface extraction rather than undoing `1017`.

## Overrides
- The registered docs-review lane had already failed only on the known local review-wrapper drift after deterministic docs guards passed. That override remains recorded in `../20260306T091813Z-docs-review-override/00-summary.md`.
- Branch-wide diff-budget still exceeds the threshold because this slice is closing on top of an intentionally accumulated in-flight branch. The override is explicit in `08-diff-budget.log`.
- Forced standalone review was executed for this slice and timed out after the configured `180s`, with telemetry saved to `.runs/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh/cli/2026-03-06T09-16-58-040Z-fb4db1e5/review/telemetry.json` and output in `.runs/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh/cli/2026-03-06T09-16-58-040Z-fb4db1e5/review/output.log`. This is recorded in `13-override-notes.md` instead of being treated as a clean review verdict.

## Next Slice
- The approved next step is a Symphony-inspired CO observability-surface extraction: move `/api/v1/state`, `/api/v1/:issue_identifier`, `/api/v1/refresh`, and `/ui/data.json` projection/error shaping behind a narrower presenter-style module while keeping `controlServer.ts` focused on routing, auth, webhook intake, and mutating controls. See `12-next-slice-observability-surface.md`.
