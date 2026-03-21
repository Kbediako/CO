# PRD - Coordinator Symphony Full-Parity Hardening and Closure

## Added by Bootstrap 2026-03-20

## Summary
- Problem Statement: `1311` is an in-progress hardening lane, not a truthful parity closeout. The current branch has now landed the bounded provider/workspace/eligibility/test-teardown tranche, the March 21 review-follow-up tranche, the same-tick manifest-persister force-preempt fix, the released-claim cancel-retry follow-up for skipped provider refreshes through per-manifest deduped background retry, the missing-state started and legacy resume recovery hardening, the detached-run reattachment corrections for current-attempt issue timing and synthetic task-id `run_id` fallback, and the released queued-or-active child cancel retry fix for later ready refreshes after transient cancel failure, but full Symphony parity is still not closed against `/Users/kbediako/Code/symphony/SPEC.md` and the current Elixir reference.
- Desired Outcome: Keep the packet aligned to verified branch truth: provider control-host continuation/retry handoff for active issues is materially covered, issue eligibility and provider-managed terminal workspace cleanup are hardened, explicit refreshes no longer drop behind startup `rehydrate()`, selected-run workspace fallback stays truthful under overridden runs roots, forced manifest writes no longer wait behind a same-tick scheduled persist, and the remaining real blockers stay explicit.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): use a docs-first lane to harden the real remaining Symphony parity gaps against the current SPEC and Elixir reference, while keeping the packet truthful if full parity still is not actually closed.
- Success criteria / acceptance:
  - landed fixes are recorded explicitly: deterministic workspace recreation plus prune; legacy resume deterministic workspace fallback; resume workspace-root confinement validation; startup immediate refresh; queued/null release fail-closed behavior; released-claim stability on rehydrate; released-claim cancel retry during skipped provider refresh; selected child-manifest UI metadata truthfulness; compatibility `session_id` null handling
  - landed fixes now also include active-issue eligibility for `Todo` plus Linear `state_type=started` issues, a Todo blocker rule that uses Linear blocker `state.type` when present (falling back to blocker state names), and terminal-only cleanup for provider-managed `.workspaces/<taskId>` on release/startup replay
  - landed fixes now also include queued follow-up refresh for authenticated/manual refresh requests that arrive during in-flight provider handoff work, selected-run workspace fallback for child CLI manifests under repo-local and external overridden runs roots, and real repo-root provider workspace cleanup when `CODEX_ORCHESTRATOR_RUNS_DIR` is outside the repository
  - landed fixes now also include started-issue eligibility when the provider leaves `state=null` but still reports `state_type=started`, legacy provider resume fallback that recovers the task id from the resolved run path when manifest `task_id` is missing, and startup refresh wrapping that keeps sync-throwing injected callbacks on the catch/finally path
  - released claims now also retry queued or active child cancellation on a later ready refresh after a transient release-cancel failure instead of stopping at the early return before the fallback resume/start path
  - provider control-host continuation/retry handoff for active issues is described as materially covered, but full parity remains open
  - remaining blockers stay explicit: live observability is not yet an authoritative runtime snapshot for turn/retry/token/rate-limit counters, and active-issue continuation after a normal success still starts a fresh child run instead of continuing the same session
  - validation is described truthfully: `MCP_RUNNER_TASK_ID=1311-coordinator-symphony-full-parity-hardening-and-closure node scripts/delegation-guard.mjs` passed with `5` subagent manifests found; `node scripts/spec-guard.mjs --dry-run` exited successfully but reported unrelated stale-review advisories for specs `0971`, `0972`, and `0974`; `npm run build` and `npm run lint` passed; the current detached-run hardening regression pack passed `5/5` files and `79/79` tests across `ProviderIssueHandoff`, `ProviderIssueHandoffRefreshSerialization`, `ProviderIntakeState`, `ControlServerSeedLoading`, and `ControlServerStartupInputPreparation`; the persister fast-path regression pack passed `2/2` files and `16/16` tests; a trivial `CodexOrchestrator.start()` repro dropped from about `5.1s` to about `112ms`; the latest local full `MCP_RUNNER_TASK_ID=1311-coordinator-symphony-full-parity-hardening-and-closure npm run test` is terminal green at `283/283` files and `2046/2046` tests in `202.70s`; `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs`, and `npm run pack:smoke` passed on the current head; and the local review obligation is closed via `out/1311-coordinator-symphony-full-parity-hardening-and-closure/manual/20260321T070133Z-closeout/14-review-stall-override.md`
- Constraints / non-goals:
  - do not claim full hardened parity closed on this branch
  - do not treat focused validation passes as equivalent to a terminal-green full suite
  - do not reframe tracker-write ownership as a parity blocker

## Goals
- Keep the `1311` packet truthful about what is already landed.
- Keep the remaining blockers explicit enough to prevent optimistic parity or closeout language.
- Preserve the careful continuation wording: materially covered for active issues at the scheduler boundary, but not same-session parity closure.

## Non-Goals
- Re-litigating `1310`; it remains the truthful audit/rebaseline lane.
- Claiming full Symphony parity while authoritative live counters and same-session continuation still diverge from upstream.
- Treating green local tests as proof that the remaining architectural parity gaps are gone.

## Stakeholders
- Product: CO operator
- Engineering: Codex
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - the docs state the landed fix set exactly and do not regress to a "full parity closed" claim
  - the remaining blockers stay explicit: non-authoritative live observability counters and missing same-session continuation
  - validation sections report the current terminal-green full suite counts without inflating them into parity closure
- Guardrails / Error Budgets:
  - parity claims stay governed by `/Users/kbediako/Code/symphony/SPEC.md` when the Elixir tree is richer or drifted
  - continuation/retry wording stays narrow and does not imply the same-session continuation gap is solved
  - no review or closeout statement may assume the remaining architectural blockers are gone just because the local suite is green

## Technical Considerations
- Current branch truth:
  - deterministic workspace recreation plus prune is landed
  - legacy resume deterministic workspace fallback is landed
  - resume workspace-root confinement validation is landed
  - startup immediate refresh is landed
  - queued/null release fail-closed behavior is landed
  - released-claim stability on rehydrate is landed
  - released claims retry child cancellation during skipped provider refresh without reopening overlapping refresh/cancel cycles
  - issue eligibility now covers `Todo` plus Linear `state_type=started` issues, including the `state=null` edge when the provider still marks the issue as `started`, with a Todo blocker rule that prefers Linear blocker `state.type` over display-name matching
  - legacy resume fallback now recovers the deterministic workspace task from the resolved run path when manifest `task_id` is absent
  - injected startup refresh callbacks stay on the catch/finally path even if they throw synchronously
  - terminal-only cleanup for provider-managed `.workspaces/<taskId>` is landed on release/startup replay
  - explicit refreshes now queue one follow-up pass instead of being dropped behind an in-flight `refresh()` or `rehydrate()`
  - selected-run workspace fallback remains truthful under repo-local and external overridden runs roots
  - provider workspace cleanup now uses the real repo root even when `CODEX_ORCHESTRATOR_RUNS_DIR` is outside the repository
  - forced manifest writes now preempt same-tick scheduled persister waits instead of inheriting the full heartbeat window
  - released claims now retry queued or active child cancellation on a later ready refresh after transient cancel failure instead of stopping at the early return before the fallback resume/start path
  - selected child-manifest UI metadata truthfulness is landed
  - compatibility `session_id` null handling is landed
- Remaining blockers:
  - live observability is still not an authoritative runtime snapshot for turn/retry/token/rate-limit counters
  - active-issue continuation after a normal success still starts a fresh child run instead of continuing the same session
- Dependencies / Integrations:
  - `/Users/kbediako/Code/symphony/SPEC.md`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/agent_runner.ex`
  - `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/workspace.ex`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`
  - `orchestrator/src/cli/control/selectedRunProjection.ts`
  - `orchestrator/src/cli/control/observabilityReadModel.ts`

## Validation Status
- `MCP_RUNNER_TASK_ID=1311-coordinator-symphony-full-parity-hardening-and-closure node scripts/delegation-guard.mjs` passed (`5` subagent manifests found).
- `node scripts/spec-guard.mjs --dry-run` exited successfully but reported unrelated stale-review advisories for specs `0971`, `0972`, and `0974`.
- `npm run build` passed.
- `npm run lint` passed.
- The current detached-run hardening regression pack passed `5/5` files and `79/79` tests across `orchestrator/tests/ProviderIssueHandoff.test.ts`, `orchestrator/tests/ProviderIssueHandoffRefreshSerialization.test.ts`, `orchestrator/tests/ProviderIntakeState.test.ts`, `orchestrator/tests/ControlServerSeedLoading.test.ts`, and `orchestrator/tests/ControlServerStartupInputPreparation.test.ts`.
- The persister fast-path regression pack passed `2/2` files and `16/16` tests.
- `npm run docs:check`, `npm run docs:freshness`, `node scripts/diff-budget.mjs` with the explicit March 21 override, and `npm run pack:smoke` passed on the current head.
- A trivial `CodexOrchestrator.start()` repro dropped from about `5.1s` to about `112ms` after the persister fix.
- The prior P2 PRD/docs mirror drift is addressed in the current packet, and the local review obligation is closed via `out/1311-coordinator-symphony-full-parity-hardening-and-closure/manual/20260321T070133Z-closeout/14-review-stall-override.md`.
- The latest local `MCP_RUNNER_TASK_ID=1311-coordinator-symphony-full-parity-hardening-and-closure npm run test` is terminal green on this head at `283/283` files and `2046/2046` tests in `202.70s`.

## Approvals
- Product: Self-approved to keep the `1311` packet truthful to the current branch.
- Engineering: Internal docs/state review refreshed on 2026-03-21 against the verified March 21 branch facts; the prior P2 PRD/docs mirror drift is addressed in the current packet, the final current-head review step is closed via `out/1311-coordinator-symphony-full-parity-hardening-and-closure/manual/20260321T070133Z-closeout/14-review-stall-override.md`, and merge-readiness still depends on the GitHub PR loop reaching zero unresolved actionable threads on the pushed head.
- Design: N/A
