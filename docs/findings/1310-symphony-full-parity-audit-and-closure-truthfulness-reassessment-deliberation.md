# Findings - 1310 Symphony Full-Parity Audit and Closure Truthfulness Reassessment

## Decision
- GO for a truthfulness rebaseline plus bounded fixes.
- NO-GO for claiming full Symphony closure on the current tree.

## Why
- The upstream audit disproves the current broad "full parity" posture. Several core lifecycle and workspace behaviors remain larger architectural divergences.
- The current tree still has bounded parity bugs worth fixing now, so the truthful result is not docs-only.

## Parity Matrix

| Surface | Classification | Notes |
| --- | --- | --- |
| Provider-driven intake host lifecycle | aligned | `codex-orchestrator control-host` provides a persistent local intake host and restart-safe ledgers. |
| Issue eligibility model | real parity gap | Symphony scheduler applies richer issue eligibility and routing rules; CO intake currently reduces eligibility to configured scope plus `state_type=started` on accepted events. |
| Claim / running / retry / completed bookkeeping | real parity gap | CO has issue claims and run mapping, and the bounded fresh-event hard-gate fix is live-proven, but a March 20, 2026 `CO-2` rerun still finished `status=succeeded` while `provider-intake-state.json` kept the claim `state=running`, proving the broader settle/reconcile loop remains missing. |
| Issue-to-run mapping | aligned | CO persists provider issue identity on manifests and uses that for deterministic start/resume lookup. |
| Workspace identity / confinement | real parity gap | Symphony requires per-issue workspaces; CO still launches provider child runs in the shared repo root. |
| Repeated worker-turn semantics while issue remains active | real parity gap | Symphony continues after normal worker exit; CO currently needs another accepted event and does not own true internal continuation. |
| Reconciliation when issue state changes mid-run | real parity gap | Symphony polls and terminates non-active/terminal work; CO reacts only at intake/webhook boundaries. |
| Stop/release behavior for terminal and non-active states | real parity gap | Current CO tree lacks a provider-owned running-issue stop/release loop. |
| Tracker read vs write authority | aligned | Orchestrator-managed tracker writes are not a required Symphony core contract. |
| Ticket state transitions/comments/PR links ownership | aligned | Upstream places these in the worker/workflow/helper layer rather than the orchestrator. |
| Worker-visible tracker-write primitives | intentionally divergent but acceptable | Symphony workflow expects worker-visible write tooling, but the core spec treats `linear_graphql` as optional and first-class orchestrator writes as future work, so missing repo-owned primitives are not a core orchestrator parity blocker by themselves. |
| Observability API contract | aligned | CO already exposes `/api/v1/state`, `/api/v1/<issue>`, and `/api/v1/refresh`, with `/api/v1/dispatch` kept as a CO extension. |
| Dashboard / TUI richness and freshness | real parity gap | CO UI surfaces are still generic run monitors without Symphony's richer issue/workspace/turn presentation, even though the bounded stale-summary freshness bug is fixed in this lane and the live `CO-2` issue API now collapses the succeeded summary to `Guardrails: spec-guard succeeded (1 passed).` instead of replaying stale failure text. |
| Telegram / dispatch / status behavior | intentionally divergent but acceptable | Read-only dispatch/status plus bounded control actions are compatible with the non-prescriptive upstream UI stance. |
| Control-host / auth / background monitor surfaces | real parity gap | Host/auth surfaces exist, but there is no true running-issue reconcile loop; the same live `CO-2` proof showed the control host could accept a fresh newer event and launch a new child run, yet did not settle the claim after that child run completed. |
| SSH / remote worker behavior | intentionally divergent but acceptable | The SPEC treats SSH hosts as an optional extension even though the Elixir reference implements them. |
| Scheduler ownership and execution authority boundaries | aligned | CO retains execution authority; the narrower issue-eligibility model is already called out separately as its own real parity gap. |

## Implementable-Now Work
- Remove the provider-intake hard gate that treats a previously succeeded child run as a permanent ignore for the next fresh accepted active-issue event.
- Keep failed relaunch claims out of the completed-run freshness baseline so same-timestamp retries still relaunch after transient launch failures.
- Fix selected-run/status summary freshness so a succeeded child manifest no longer surfaces stale failure text.

## Larger Architectural Divergences
- Per-issue workspace creation and confinement.
- True repeated-turn continuation after normal success without waiting for a fresh accepted provider event.
- Running-issue reconcile/stop behavior when the issue leaves `started`.

## Live Proof Notes
- After restarting the current-branch control host on March 20, 2026, the issue endpoint `GET /api/v1/linear-856c1318-524f-4db3-8d4a-b357ec51c304` reported the older succeeded child run with `status=succeeded` and `summary=Guardrails: spec-guard succeeded (1 passed).`, proving the stale-summary cleanup is live.
- A replay with unchanged `issue_updated_at` remained pinned to the earlier completed child run with `provider_issue_run_already_completed`, so equal/non-increasing updates no longer trigger duplicate reruns.
- A fresh newer `issue_updated_at` from a real `CO-2` state transition launched new child run `2026-03-20T07-29-36-397Z-acb7e8c2`, and that child run reached `status=succeeded` through `delegation-guard`, `build`, `lint`, `test`, and `spec-guard`.
- Even after that rerun completed, `provider-intake-state.json` still showed `CO-2` as `state=running` with `reason=provider_issue_run_already_active`, which is why this lane remains a truthful rebaseline plus bounded fixes rather than a full parity closure.

## Recommendation
- Merge a truthful rebaseline plus the bounded fixes now.
- Track the larger lifecycle/workspace closure as follow-up architectural work instead of hiding it behind optimistic parity language.
