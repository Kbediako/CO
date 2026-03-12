# 1129 Override Notes

## Delegation Guard

- `node scripts/delegation-guard.mjs --task 1129-coordinator-symphony-aligned-standalone-review-architecture-in-bounds-verdict-termination-boundary`
- Override reason: `bounded MCP subagent scout/review used for 1129; repo guard only recognizes manifest-backed orchestrator subruns`
- Why this is acceptable: the lane used bounded subagents for patch review and next-slice scouting, and the task also has a successful manifest-backed docs-review rerun at `.runs/1129-coordinator-symphony-aligned-standalone-review-architecture-in-bounds-verdict-termination-boundary/cli/2026-03-12T05-07-34-779Z-c01f9772/manifest.json`.

## Diff Budget

- `node scripts/diff-budget.mjs`
- Override reason: `stacked branch; bounded 1129 diff validated with focused tests and manual runtime review`

## Review Command Exit

- `npm run review` exited non-zero by design for the live architecture runtime proof.
- This is not treated as a reviewer-quality failure for `1129`; it is the intended validation result for the bounded no-verdict termination contract.
