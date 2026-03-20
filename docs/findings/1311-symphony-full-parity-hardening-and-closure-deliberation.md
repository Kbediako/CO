# Findings - 1311 Symphony Full-Parity Hardening and Closure

## Decision
- GO for a new delivery lane that closes the remaining real parity blockers.
- Do not reopen `1303` or widen `1310`; use `1311` as the architecture and implementation lane.

## Why
- `1310` already proved that full parity was not closed and should remain the accepted truthful rebaseline.
- The remaining blockers are now specific and evidence-backed: issue eligibility, authoritative lifecycle bookkeeping, deterministic per-issue workspaces, true continuation while active, running-issue reconcile/stop behavior, and richer operator surfaces where current Elixir behavior still materially exceeds CO.

## Closure Matrix

| Surface | Current state | 1311 action |
| --- | --- | --- |
| Issue eligibility | real parity gap | widen from accepted-event plus `started` semantics toward upstream scheduler eligibility |
| Claim / running / retry / completed bookkeeping | real parity gap | make provider lifecycle state authoritative and restart-safe |
| Workspace identity / confinement | real parity gap | introduce deterministic per-issue workspaces and remove shared repo-root execution |
| Repeated worker-turn continuation while issue remains active | real parity gap | add control-host-owned continuation without waiting for a fresh provider event |
| Reconcile / stop on issue state changes | real parity gap | add running-issue poll-plus-reconcile and release semantics |
| Tracker-write ownership | aligned | keep out of blocker scope; do not widen orchestrator authority unnecessarily |
| Observability API contract | partially aligned | preserve routes, but upgrade payloads to expose authoritative lifecycle/workspace state |
| Dashboard / TUI richness | gap for current Elixir parity | add issue/workspace/turn/lifecycle context after backend truth lands |
| Host / auth / background monitor surfaces | gap for current Elixir parity | expose worker-host, refresh, and runtime monitor state where required for closure claims |

## Delivery Sequence
1. Open `1311` docs-first packet and record the closure strategy.
2. Land the workspace substrate so provider child runs become workspace-confined.
3. Land the lifecycle engine: reconcile, stop/release, retry, and continuation.
4. Land observability/UI parity on top of the authoritative backend state.
5. Validate locally, live-prove against the existing control host, then close through PR and merge.

## Upstream Guidance
- Use `/Users/kbediako/Code/symphony/SPEC.md` as the parity authority when the Elixir tree drifts.
- Treat the current Elixir reference as the richer operational benchmark for dashboard and host-monitor behavior if `1311` aims to match not just the base SPEC contract but the present upstream operator experience.

## Recommendation
- Open `1311` immediately and keep the implementation slices explicit.
- Do not make any new full-parity claim until workspace confinement and lifecycle reconcile are both live-proven.
