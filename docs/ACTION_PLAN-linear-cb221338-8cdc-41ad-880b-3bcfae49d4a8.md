# ACTION_PLAN - CO-304 degraded `co-status --format json` fallback

## Goal
- Add the smallest truthful fallback for `/ui/data.json` timeouts while `provider-intake-state.json` still proves live supervisor progress after `CO-296`.

## Steps
1. Confirm the timeout path still exists with fresh provider-intake advancement.
2. Add a `degraded-read fallback` in the direct JSON read path only.
3. Gate fallback output with explicit `fail-closed freshness`.
4. Add focused fresh/stale regressions and run the required validation/review loop.

## Validation
- Focused reproduction of the timeout path.
- Focused fresh-supervisor degraded-read test.
- Focused stale-supervisor fail-closed test.
- Required repo validation and review gates before handoff.

## Boundaries
- No UI layout or dashboard redesign.
- No unrelated control-host features.
- No stale supervisor truth presented as current.
