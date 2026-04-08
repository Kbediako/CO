# Task Checklist - linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd

- Linear Issue: `CO-101` / `6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd`
- MCP Task ID: `linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd`
- Primary PRD: `docs/PRD-linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd.md`
- TECH_SPEC: `tasks/specs/linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd.md`

## Docs
- [x] Docs packet created and mirrored in `docs/`, `tasks/`, `.agent/`, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`. Evidence: `docs/PRD-linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd.md`, `docs/TECH_SPEC-linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd.md`, `docs/ACTION_PLAN-linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd.md`, `tasks/specs/linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd.md`, `tasks/tasks-linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd.md`, `.agent/task/linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd.md`.
- [x] docs-review child-stream evidence recorded after the repo-supported `docs/TASKS.md` trim; the rerun passed `spec-guard` and `docs:check` and then failed only on the standing repo-wide `docs:freshness` stale-doc baseline. Evidence: `.runs/linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd-co-101-docs-review-rerun/cli/2026-04-08T02-39-52-501Z-2a53de89/manifest.json`, `out/linear-6f843dbc-a129-411a-9ba2-9bcd4a5bc1bd/manual/20260408T024100Z-docs-review-fallback.md`.
- [x] Exactly one persistent Linear workpad comment is current. Evidence: Linear comment `e5f14bce-7a82-4b55-b609-0b74bb8f07cc`.

## Implementation
- [ ] Packaged `linear` CLI exposes one parent-only ordinary-worker parallelisation decision helper with bounded decision and reason codes.
- [ ] Provider-worker proof hydration reconstructs the latest decision from existing audit truth and keeps live proof refreshes deterministic.
- [ ] `provider_debug_snapshot` exposes the current decision, reason, summary, and recorded child-lane count so explicit serial/no-go truth is visible when `child_lanes` is empty.
- [ ] Ordinary provider-worker turn completion fails closed when no decision exists or when `parallelize_now` records no child lane.
- [ ] Worker prompt contract explicitly requires the current-turn decision and ties `parallelize_now` to actual child-lane launch.

## Validation
- [ ] Focused regressions cover decision validation, proof hydration, debug projection, and fail-closed launch/non-launch behavior.
- [ ] Ordinary replay artifacts prove both `parallelize_now` and explicit serial/no-go outcomes.
- [ ] `node scripts/delegation-guard.mjs`
- [ ] `node scripts/spec-guard.mjs --dry-run`
- [ ] `npm run build`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run docs:check`
- [ ] `npm run docs:freshness`
- [ ] `node scripts/diff-budget.mjs`
- [ ] `FORCE_CODEX_REVIEW=1 npm run review`
- [ ] Explicit elegance pass recorded before review handoff.
- [ ] `npm run pack:smoke`

## Handoff
- [ ] PR attached to the issue.
- [ ] Latest `origin/main` merged into the branch before review-state transition.
- [ ] PR checks green and `pr ready-review` drain clean before review-state transition.
- [ ] Unresolved actionable review threads: `0` (or explicit waiver plus evidence recorded here before handoff).
- [ ] Issue moved to `In Review`.
