# PRD - Coordinator Tracker Dispatch Pilot (Non-Authoritative) (1000)

## Summary
- Problem Statement: task 0998 deferred tracker-driven autonomous dispatch to a dedicated pilot lane because dispatch introduces higher authority and blast-radius risk than the completed read-only compatibility slice.
- Desired Outcome: define a docs-first, advisory-only pilot for tracker dispatch where coordinator suggestions are observable but never authoritative.
- Scope Status: implementation-complete on 2026-03-05 under task `1000-coordinator-tracker-dispatch-pilot-non-authoritative`, with authoritative closeout and mirror-sync evidence recorded.

## User Request Translation
- User intent: finalize task-1000 mirrors to implementation-complete using authoritative evidence while preserving non-authoritative control boundaries.
- Required outcomes:
  - close 1000 artifacts (PRD/TECH_SPEC/ACTION_PLAN/spec/checklists + `.agent` mirror) to implementation-complete state,
  - preserve hard constraints: advisory-only/non-authoritative, no scheduler authority transfer, no mutating control promotion,
  - preserve 0996 mutating-control HOLD/NO-GO unchanged,
  - record full ordered gate pass, manual dispatch/no-mutation simulations, and residual-risk remediation evidence,
  - capture final implementation-gate rerun manifest success and shared-checkout override reasons,
  - update task/spec/docs snapshots and rerun mirror-sync docs/parity validations.

## Authoritative Closeout Evidence
- Implementation-gate manifest: `.runs/1000-coordinator-tracker-dispatch-pilot-non-authoritative/cli/2026-03-05T06-43-58-994Z-7bfd5f4d/manifest.json`
- Terminal closeout bundle: `out/1000-coordinator-tracker-dispatch-pilot-non-authoritative/manual/20260305T060714Z-terminal-closeout/`
- Mirror-sync closeout bundle: `out/1000-coordinator-tracker-dispatch-pilot-non-authoritative/manual/20260305T070340Z-mirror-sync-post-closeout/`

## In Scope (1000 Docs-First Pilot Contract)
- Advisory tracker-dispatch pilot framing and constraints.
- Non-authoritative dispatch proposal shape and observability expectations.
- Explicit GO/NO-GO conditions for any future pilot execution stream.
- Docs/task/checklist registry updates for task 1000.

## Out of Scope
- Scheduler authority transfer from CO to coordinator/tracker logic.
- Mutating control promotion (`pause`, `resume`, `cancel`, `fail`, `rerun`).
- Any HOLD -> GO policy decision for task 0996.
- Runtime implementation changes in this stream.

## Hard Constraints (Must Hold)
- 1000 remains advisory and non-authoritative only.
- 0996 remains HOLD/NO-GO for mutating-control promotion until explicit approval evidence exists.
- No scheduler authority transfer is permitted.
- No mutating control promotion is permitted.
- Pilot capability remains default-off until explicit gate approval.
- Kill-switch and rollback drill evidence is required before any pilot on-state recommendation.

## Pilot Operating Model (Non-Authoritative)
- Tracker signals may produce candidate dispatch recommendations.
- Recommendations are recorded as advisory artifacts only.
- Execution authority remains in CO control surfaces and existing policy gates.
- Any recommendation path must fail closed when policy, identity, or scope checks are missing.
- Manual simulation acceptance for this pilot requires explicit no-mutation proof in all scenarios.

## GO / NO-GO Criteria
### GO (for implementation closeout)
- Advisory-only contract is explicitly encoded and testable.
- Default-off gating and kill-switch/rollback acceptance criteria are documented and simulated.
- Ordered gate-chain, manual dispatch/no-mutation simulations, and residual-risk remediations are evidenced.
- Final implementation-gate rerun is terminal `succeeded`.

### NO-GO
- Any path allows tracker/coordinator to execute or promote mutating actions directly.
- Any contract implies scheduler authority transfer.
- Pilot activation lacks explicit default-off gate, kill-switch, and rollback evidence.
- Any wording weakens or bypasses 0996 HOLD/NO-GO posture.
- Any simulation introduces control-action side effects (mutation) in advisory dispatch flows.

## Acceptance Criteria
1. 1000 PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror are synchronized to implementation-complete status.
2. Advisory/non-authoritative constraints are explicit across all 1000 artifacts.
3. 0996 HOLD/NO-GO boundary remains explicit and unchanged.
4. `tasks/index.json` and `docs/TASKS.md` include 1000 as completed with the authoritative implementation-gate manifest.
5. Ordered gates, manual dispatch/no-mutation simulations, residual-risk remediation evidence, and explicit override reasons are captured in 1000 closeout artifacts.
6. Mirror-sync reruns of `npm run docs:check`, `npm run docs:freshness`, and checklist parity diff are captured under the mirror-sync closeout bundle.
