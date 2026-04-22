# TECH_SPEC Mirror - CO-304 degraded `co-status --format json` fallback

Canonical spec: `tasks/specs/linear-cb221338-8cdc-41ad-880b-3bcfae49d4a8.md`

## Summary
- Add a bounded `degraded-read fallback` when `/ui/data.json` times out but `provider-intake-state.json` is still fresh after `CO-296`.
- Keep `fail-closed freshness` and explicit degraded output markers.
- Keep UI layout, dashboard redesign, and unrelated control-host work out of scope.

## Validation
- Focused fresh/stale degraded-read regressions.
- Required docs/spec/review gates before handoff.
