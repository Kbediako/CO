# Override Notes

## docs-review
- The registered docs-review manifest `.runs/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh/cli/2026-03-06T09-16-58-040Z-fb4db1e5/manifest.json` reached terminal `failed` only because `npm run review` drifted into the known local review-wrapper tail after `delegation-guard`, `spec-guard`, `docs:check`, and `docs:freshness` passed.
- That override was already recorded before implementation in `out/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh/manual/20260306T091813Z-docs-review-override/00-summary.md`.

## diff-budget
- `node scripts/diff-budget.mjs` still fails against `origin/main` because the branch intentionally carries accumulated in-flight coordinator work beyond the per-slice threshold.
- For this closeout the explicit override reason is: `1017 is closing on top of an intentionally accumulated in-flight branch; the slice itself is scoped and validated with targeted + full-suite evidence.`

## standalone review
- A forced standalone review was run for `1017` with bounded `180s` total timeout and `90s` stall timeout.
- The review never returned findings before the hard timeout, so it is recorded as an explicit override rather than as a successful reviewer verdict.
- Evidence:
  - `.runs/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh/cli/2026-03-06T09-16-58-040Z-fb4db1e5/review/output.log`
  - `.runs/1017-coordinator-symphony-aligned-projection-boundary-and-live-linear-refresh/cli/2026-03-06T09-16-58-040Z-fb4db1e5/review/telemetry.json`
