# 1140 Next Slice Note

- Next bounded Telegram seam: narrow the projection-notification controller contract so the extracted controller no longer takes/returns the full bridge state and instead operates on a smaller push-state input/output or patch shape.
- Why this seam is next:
  - `1140` already isolated the branch-local outbound orchestration truthfully,
  - queue ownership, lifecycle, and persistence already stay in the bridge,
  - the remaining width is the state contract, not another mixed responsibility branch.
