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
   - legacy resume deterministic workspace fallback, including task recovery from the resolved run path when manifest `task_id` is missing
   - resume workspace-root confinement validation
   - startup immediate refresh, including sync-throw-safe injected refresh wrapping
   - queued/null release fail-closed behavior
   - released-claim stability on rehydrate
   - released-claim cancel retry during skipped provider refresh without reopening overlapping refresh/cancel cycles
   - issue eligibility widened to `Todo` plus custom Linear `state_type=started` active states, including the missing-state started edge, with a Todo blocker rule that prefers Linear blocker `state.type`
   - terminal-only cleanup for provider-managed `.workspaces/<taskId>` on release/startup replay
   - explicit authenticated/manual refreshes queue one follow-up pass during in-flight provider handoff work
   - selected-run workspace fallback remains truthful under repo-local and external overridden runs roots
   - provider workspace cleanup stays bound to the real repo root when `CODEX_ORCHESTRATOR_RUNS_DIR` is outside the repository
   - forced manifest writes preempt same-tick scheduled persister waits instead of inheriting the heartbeat interval
   - detached released/handoff-failed claims only reattach to child runs that actually started after the launch anchor when manifest `started_at` is present, instead of trusting a later terminal `updated_at`
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
   - the current detached-run hardening regression pack passed `5/5` files and `72/72` tests
   - the persister fast-path regression pack passed `2/2` files and `16/16` tests
   - `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs` with the explicit March 21 override, and `npm run pack:smoke` passed
   - a trivial `CodexOrchestrator.start()` repro dropped from about `5.1s` to about `112ms`
   - the latest uncommitted `npm run review` terminated on the startup-anchor boundary after pre-anchor `codex-skills`/`codex-memories` reads without a concrete finding
   - the latest local full `MCP_RUNNER_TASK_ID=1311-coordinator-symphony-full-parity-hardening-and-closure npm run test` reruns reached the post-`tests/cli-frontend-test.spec.ts` quiet tail without a terminal summary on this head
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
  - the current detached-run hardening regression pack: `5/5` files and `72/72` tests
  - the persister fast-path regression pack: `2/2` files and `16/16` tests
  - `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs` with the explicit March 21 override, and `npm run pack:smoke`
  - the latest uncommitted `npm run review` startup-anchor termination with no concrete finding
  - the latest local full `MCP_RUNNER_TASK_ID=1311-coordinator-symphony-full-parity-hardening-and-closure npm run test` quiet-tail recurrence after `tests/cli-frontend-test.spec.ts`, without a terminal summary on this head

## Risks & Mitigations
- Risk: stale docs reintroduce an optimistic parity-closeout claim.
  - Mitigation: keep the landed fixes, remaining blockers, and current non-terminal full-suite/review status identical across all `1311` mirrors.
- Risk: focused validation passes get misread as a fully green branch.
  - Mitigation: keep the still-open architectural blockers explicit and record that the latest local full-suite reruns are non-terminal on this head.
- Risk: the persister fix gets overstated into a full parity claim.
  - Mitigation: keep the fix scoped to local lifecycle timing truthfulness and leave the remaining architectural blockers explicit.
- Risk: same-session continuation gets overstated from fresh-child-run continuation behavior.
  - Mitigation: keep the continuation wording narrow and tie closure to upstream-faithful same-session ownership.

## Approvals
- Reviewer status: the earlier Codex reviewer-request/waiver contingency is superseded by the successful 2026-03-21 uncommitted review rerun; PR loop closeout still depends on GitHub reruns settling and unresolved actionable threads reaching zero on the pushed head.
- Date: 2026-03-21
