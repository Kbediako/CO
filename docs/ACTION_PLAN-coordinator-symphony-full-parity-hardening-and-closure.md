# ACTION_PLAN - Coordinator Symphony Full-Parity Hardening and Closure

## Added by Bootstrap (refresh as needed)

## Summary
- Goal: Keep the `1311` mirrors aligned to current branch truth after the bounded parity tranche, the March 21 review-fix tranche, and the manifest-persister fast-path hardening landed, and prevent optimistic parity-closeout wording.
- Scope: document the landed hardening tranche, the remaining real blockers, and the exact validation posture.
- Assumptions:
  - `/Users/kbediako/Code/symphony/SPEC.md` remains the parity authority when upstream spec and Elixir behavior differ
  - provider control-host continuation/retry handoff for active issues is materially covered on the current branch
  - full parity is still not closed

## Milestones & Sequencing
1. Landed on the current branch
   - deterministic workspace recreation plus prune
   - legacy resume deterministic workspace fallback
   - resume workspace-root confinement validation
   - startup immediate refresh
   - queued/null release fail-closed behavior
   - released-claim stability on rehydrate
   - released-claim cancel retry during skipped provider refresh without reopening overlapping refresh/cancel cycles
   - issue eligibility widened to `Todo` plus custom Linear `state_type=started` active states, with a Todo blocker rule that prefers Linear blocker `state.type`
   - terminal-only cleanup for provider-managed `.workspaces/<taskId>` on release/startup replay
   - explicit authenticated/manual refreshes queue one follow-up pass during in-flight provider handoff work
   - selected-run workspace fallback remains truthful under repo-local and external overridden runs roots
   - provider workspace cleanup stays bound to the real repo root when `CODEX_ORCHESTRATOR_RUNS_DIR` is outside the repository
   - forced manifest writes preempt same-tick scheduled persister waits instead of inheriting the heartbeat interval
   - selected child-manifest UI metadata truthfulness
   - compatibility `session_id` null handling
2. Remaining before truthful parity closeout
   - live observability must become an authoritative runtime snapshot for turn/retry/token/rate-limit counters, or those counters must be explicitly deferred
   - active-issue continuation after a normal success must move from fresh-child-run continuation to upstream-faithful same-session continuation
3. Validation posture to keep in the mirrors
   - `MCP_RUNNER_TASK_ID=1311-coordinator-symphony-full-parity-hardening-and-closure node scripts/delegation-guard.mjs` passed (`5` subagent manifests found)
   - `node scripts/spec-guard.mjs --dry-run` exited successfully but reported unrelated stale-review advisories for specs `0971`, `0972`, and `0974`
   - `npm run build` passed
   - `npm run lint` passed
   - the focused release-cancel retry regression pack passed `4/4` files and `61/61` tests
   - the persister fast-path regression pack passed `2/2` files and `16/16` tests
   - `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs` with the explicit March 21 override, and `npm run pack:smoke` passed
   - a trivial `CodexOrchestrator.start()` repro dropped from about `5.1s` to about `112ms`
   - local full `MCP_RUNNER_TASK_ID=1311-coordinator-symphony-full-parity-hardening-and-closure npm run test` is terminal again at `283/283` files and `2019/2019` tests in `199.49s`
4. Closeout rule
   - do not claim full hardened parity closed until the remaining blockers are resolved, even though the local suite is terminal green

## Dependencies
- `/Users/kbediako/Code/symphony/SPEC.md`
- `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex`
- `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/agent_runner.ex`
- `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/workspace.ex`
- existing CO provider/control-host surfaces in `orchestrator/src/cli/control*`

## Validation
- Verified checks to keep quoted consistently:
  - `npm run build`
  - the focused release-cancel retry regression pack: `4/4` files and `61/61` tests
  - the persister fast-path regression pack: `2/2` files and `16/16` tests
  - `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs` with the explicit March 21 override, and `npm run pack:smoke`
  - full `MCP_RUNNER_TASK_ID=1311-coordinator-symphony-full-parity-hardening-and-closure npm run test`: `283/283` files and `2019/2019` tests

## Risks & Mitigations
- Risk: stale docs reintroduce an optimistic parity-closeout claim.
  - Mitigation: keep the landed fixes, remaining blockers, and restored terminal full-suite status identical across all `1311` mirrors.
- Risk: focused validation passes get misread as a fully green branch.
  - Mitigation: keep the still-open architectural blockers explicit even though the local suite is green.
- Risk: the persister fix gets overstated into a full parity claim.
  - Mitigation: keep the fix scoped to local lifecycle timing truthfulness and leave the remaining architectural blockers explicit.
- Risk: same-session continuation gets overstated from fresh-child-run continuation behavior.
  - Mitigation: keep the continuation wording narrow and tie closure to upstream-faithful same-session ownership.

## Approvals
- Reviewer: Codex (top-level orchestrator; internal docs/state review only, PR review still in progress)
- Date: 2026-03-21
