# 1263 Override Notes

- Delegation guard used the explicit override `1263 used bounded collab subagent scouting instead of a delegation MCP manifest-backed stream.` because this lane used bounded collab scouts rather than a delegation MCP manifest.
- `node scripts/spec-guard.mjs --dry-run` surfaced only the pre-existing repo-global stale-spec warnings and was treated as informational dry-run output.
- `npm run build` remains non-green because of the unrelated pre-existing `orchestrator/src/cli/rlmRunner.ts` missing-symbol failure.
- `node scripts/diff-budget.mjs` required the standard stacked-branch override because the branch diff against `origin/main` is far larger than the task-local lane.
