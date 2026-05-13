# Findings - 1017 Projection Boundary + Live Linear Refresh Deliberation

## Decision
- Proceed with a projection-boundary extraction slice before any broader downstream-user surface expansion.

## Why This Slice Now
- `1015` and `1016` delivered the behavior we need, but the selected-run projection still lives inside `controlServer.ts`.
- The real Symphony reference reinforces a layered poll-and-project model, not more webhook or Telegram surface area.
- The user explicitly endorsed the async live Linear path and approved future slices, larger refactors when justified, and continued Telegram/Linear work under CO control.

## Accepted Direction
- Extract the selected-run projection logic into a dedicated control module.
- Keep async live Linear evaluation inside that boundary.
- Reuse the same boundary for `/api/v1/state`, `/api/v1/:issue`, `/ui/data.json`, and the dispatch read path.
- Keep Telegram and Linear authority unchanged.

## Rejected Alternatives
- Another provider-first slice:
  - rejected because the next quality gap is layering and reuse, not another transport feature.
- Copying Symphony's tracker-authoritative or unattended workflow:
  - rejected because it conflicts with CO's control posture.
- A broad Telegram refactor in the same slice:
  - rejected because it would expand scope before the projection boundary is stable.

## Risks To Watch
- Payload shape drift across state, issue, UI, and dispatch responses.
- Duplicate live Linear provider fetches if the extraction does not memoize correctly within a build path.
- Overfitting to Symphony's structure instead of CO's stricter authority boundaries.

## Pre-Implementation Approval
- Approved for docs-first implementation once delegated read-only scout evidence is captured and docs-review passes or records a narrow override.
- Reviewer: Codex.
- Date: 2026-03-06.
