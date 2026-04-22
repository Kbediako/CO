# PRD - CO-304 degraded `co-status --format json` fallback

## Summary
- `co-status --format json` can still time out on `/ui/data.json` while `provider-intake-state.json` is fresh and advancing after `CO-296`.
- The required outcome is a bounded `degraded-read fallback` rooted in `supervisor truth`, not UI or dashboard work.

## User Request Translation
- Fix the direct JSON read path only.
- Preserve the exact boundary between a timed-out `/ui/data.json` read and still-fresh `provider-intake-state.json`.
- Keep `CO-296` as the adjacent reference, not a reopened implementation lane.

## Protected Terms
- `co-status --format json`
- `/ui/data.json`
- `provider-intake-state.json`
- `CO-296`
- `supervisor truth`
- `degraded-read fallback`
- `fail-closed freshness`

## Scope
- Add a degraded JSON read when supervisor-backed intake truth is fresh enough.
- Keep stale or missing intake truth fail-closed.
- Stay out of UI layout, dashboard visual redesign, and unrelated control-host features.

## Acceptance Criteria
- Reproduce or characterize the timeout while provider-intake keeps advancing.
- Return a bounded degraded payload when freshness allows it.
- Keep stale intake on the hard-failure path.
- Add focused coverage for fresh and stale degraded-read cases.

## Not Done If
- `co-status --format json` still times out for 15s with fresh advancing intake and no degraded fallback.
- The fallback can emit stale `provider-intake-state.json` truth.
- The issue expands into UI layout or unrelated control-host work.
