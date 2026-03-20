# ACTION_PLAN - Coordinator Symphony Full-Parity Hardening and Closure

## Added by Bootstrap (refresh as needed)

## Summary
- Goal: Keep the `1311` mirrors aligned to current branch truth after the bounded parity tranche plus the March 21 review-fix tranche landed, and prevent optimistic parity-closeout wording.
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
   - issue eligibility widened to `Todo` plus custom Linear `state_type=started` active states, with a Todo blocker rule that prefers Linear blocker `state.type`
   - terminal-only cleanup for provider-managed `.workspaces/<taskId>` on release/startup replay
   - explicit authenticated/manual refreshes queue one follow-up pass during in-flight provider handoff work
   - selected-run workspace fallback remains truthful under repo-local and external overridden runs roots
   - provider workspace cleanup stays bound to the real repo root when `CODEX_ORCHESTRATOR_RUNS_DIR` is outside the repository
   - selected child-manifest UI metadata truthfulness
   - compatibility `session_id` null handling
2. Remaining before truthful parity closeout
   - live observability must become an authoritative runtime snapshot for turn/retry/token/rate-limit counters, or those counters must be explicitly deferred
   - active-issue continuation after a normal success must move from fresh-child-run continuation to upstream-faithful same-session continuation
3. Validation posture to keep in the mirrors
   - `MCP_RUNNER_TASK_ID=1311-coordinator-symphony-full-parity-hardening-and-closure node scripts/delegation-guard.mjs` passed (`5` subagent manifests found)
   - `node scripts/spec-guard.mjs --dry-run` passed
   - `npm run build` passed
   - `npm run lint` passed
   - the March 21 review-fix regression pack passed `5/5` files and `70/70` tests
   - local full `MCP_RUNNER_TASK_ID=1311-coordinator-symphony-full-parity-hardening-and-closure npm run test` again reached all file-level green output through `tests/cli-orchestrator.spec.ts` and then hung without a terminal summary; CI Core Lane is the authoritative terminal result for this head
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
  - the focused 1311 regression pack: `11/11` files and `262/262` tests
  - full `MCP_RUNNER_TASK_ID=1311-coordinator-symphony-full-parity-hardening-and-closure npm run test`: `282/282` files and `1998/1998` tests

## Risks & Mitigations
- Risk: stale docs reintroduce an optimistic parity-closeout claim.
  - Mitigation: keep the landed fixes, remaining blockers, and hanging full-suite status identical across all `1311` mirrors.
- Risk: focused validation passes get misread as a fully green branch.
  - Mitigation: keep the still-open architectural blockers explicit even though the local suite is green.
- Risk: the current head gets described as locally terminal-green even though `npm run test` reproduced the post-green teardown hang.
  - Mitigation: keep CI Core Lane as the authoritative full-suite terminal gate for this head.
- Risk: same-session continuation gets overstated from fresh-child-run continuation behavior.
  - Mitigation: keep the continuation wording narrow and tie closure to upstream-faithful same-session ownership.

## Approvals
- Reviewer: Codex (top-level orchestrator)
- Date: 2026-03-21
