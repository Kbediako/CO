# PRD - Coordinator Symphony Full-Parity Hardening and Closure

## Added by Bootstrap 2026-03-20

## Summary
- Problem Statement: `1311` is an in-progress hardening lane, not a truthful parity closeout. The current branch has now landed the bounded provider/workspace/eligibility/test-teardown tranche plus the March 21 review-follow-up tranche, but full Symphony parity is still not closed against `/Users/kbediako/Code/symphony/SPEC.md` and the current Elixir reference.
- Desired Outcome: Keep the packet aligned to verified branch truth: provider control-host continuation/retry handoff for active issues is materially covered, issue eligibility and provider-managed terminal workspace cleanup are hardened, explicit refreshes no longer drop behind startup `rehydrate()`, selected-run workspace fallback stays truthful under overridden runs roots, and the remaining real blockers stay explicit.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): use a docs-first lane to harden the real remaining Symphony parity gaps against the current SPEC and Elixir reference, while keeping the packet truthful if full parity still is not actually closed.
- Success criteria / acceptance:
  - landed fixes are recorded explicitly: deterministic workspace recreation plus prune; legacy resume deterministic workspace fallback; resume workspace-root confinement validation; startup immediate refresh; queued/null release fail-closed behavior; released-claim stability on rehydrate; selected child-manifest UI metadata truthfulness; compatibility `session_id` null handling
  - landed fixes now also include active-issue eligibility for `Todo` plus Linear `state_type=started` issues, a Todo blocker rule that uses Linear blocker `state.type` when present (falling back to blocker state names), and terminal-only cleanup for provider-managed `.workspaces/<taskId>` on release/startup replay
  - landed fixes now also include queued follow-up refresh for authenticated/manual refresh requests that arrive during in-flight provider handoff work, selected-run workspace fallback for child CLI manifests under repo-local and external overridden runs roots, and real repo-root provider workspace cleanup when `CODEX_ORCHESTRATOR_RUNS_DIR` is outside the repository
  - provider control-host continuation/retry handoff for active issues is described as materially covered, but full parity remains open
  - remaining blockers stay explicit: live observability is not yet an authoritative runtime snapshot for turn/retry/token/rate-limit counters, and active-issue continuation after a normal success still starts a fresh child run instead of continuing the same session
  - validation is described truthfully: delegation guard, spec guard, `npm run build`, and `npm run lint` passed; the March 21 review-fix pack passed `5/5` files and `70/70` tests; local full `MCP_RUNNER_TASK_ID=1311-coordinator-symphony-full-parity-hardening-and-closure npm run test` again reached all file-level green output and then hung without a terminal summary, so CI Core Lane remains the authoritative full-suite terminal result
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
  - issue eligibility now covers `Todo` plus Linear `state_type=started` issues, with a Todo blocker rule that prefers Linear blocker `state.type` over display-name matching
  - terminal-only cleanup for provider-managed `.workspaces/<taskId>` is landed on release/startup replay
  - explicit refreshes now queue one follow-up pass instead of being dropped behind an in-flight `refresh()` or `rehydrate()`
  - selected-run workspace fallback remains truthful under repo-local and external overridden runs roots
  - provider workspace cleanup now uses the real repo root even when `CODEX_ORCHESTRATOR_RUNS_DIR` is outside the repository
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
- `node scripts/spec-guard.mjs --dry-run` passed.
- `npm run build` passed.
- `npm run lint` passed.
- The March 21 review-fix regression pack passed `5/5` files and `70/70` tests.
- Local `MCP_RUNNER_TASK_ID=1311-coordinator-symphony-full-parity-hardening-and-closure npm run test` again reached all file-level green output through `tests/cli-orchestrator.spec.ts` and then stopped emitting output without a terminal summary; CI Core Lane remains the authoritative full-suite terminal result for this head.

## Approvals
- Product: Self-approved to keep the `1311` packet truthful to the current branch.
- Engineering: Current state re-reviewed on 2026-03-21 against the verified branch facts for the March 21 review-fix tranche.
- Design: N/A
