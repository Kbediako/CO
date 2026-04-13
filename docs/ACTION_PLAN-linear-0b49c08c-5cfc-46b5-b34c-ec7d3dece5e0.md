# ACTION_PLAN - CO: Repo-wide cleanup of stale compatibility debt, contradictory docs, and placeholder surfaces

## Added by Rework Reset 2026-04-11

## Summary
- Goal: re-land CO-88 from fresh `origin/main` with a smaller truthful cleanup batch.
- Reset facts:
  - closed stale replay PR `#425`
  - deleted the old Linear workpad
  - recreated branch `linear/co-88-repo-cleanup-truthfulness-r4` from fresh `origin/main`
  - replayed the substantive CO-88 cleanup into `r4` while preserving newer `origin/main` packet-registry/test state
  - recorded the current-turn parallelization decision as `forbid_parallel` / `parent_only_mutation` for the reset phase

## Issue Readiness Gate
- This remains a repo-wide truthfulness lane, not a narrow bugfix.
- The fresh attempt is intentionally narrower than the closed branch and excludes unrelated control-host, provider-worker, exec-runtime, and harness churn.
- Not done if code is cleaned but the touched docs/specs/tasks/instructions still tell the older story.

## Milestones
1. Recreate the docs packet, checklist mirrors, registry entries, and fresh workpad on top of `origin/main`.
2. Run audited docs-review for the `r4` packet and fold any packet-only corrections into the replay before final validation.
3. Implement the narrowed cleanup batch:
   - remove stale selected-run/template/archive surfaces
   - update RLM defaults and historical/design docs
   - make the static status UI bundle truthful
   - fix the SDK artifact lifetime contract
4. Run focused tests plus the full validation floor, then standalone review and an explicit elegance pass before reopening PR handoff.

## Risks
- The earlier rejected branch can tempt scope replay.
  - Mitigation: re-check every file against the issue boundary and keep only direct CO-88 truthfulness targets.
- Some compatibility seams may still have live consumers.
  - Mitigation: retain only when the spec names the consumer and reason.
- `docs/TASKS.md` budget is tight.
  - Mitigation: keep the snapshot to one line and only archive if the file exceeds policy.

## Validation
- `MCP_RUNNER_TASK_ID=linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0 "/opt/homebrew/Cellar/node/25.2.1/bin/node" "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-88-docs-review-r4 --format json`
- focused SDK/status-ui truthfulness tests
- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `FORCE_CODEX_REVIEW=1 npm run review`
- `npm run pack:smoke` if downstream-facing surfaces are touched
