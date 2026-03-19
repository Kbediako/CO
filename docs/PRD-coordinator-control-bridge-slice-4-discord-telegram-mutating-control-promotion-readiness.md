# PRD - Coordinator Control Bridge Slice 4 + Discord/Telegram Mutating Control Promotion Readiness (0996)

## Summary
- Problem Statement: 0995 locked transport policy and residual remediations, but mutating Discord/Telegram controls were initially treated as HOLD until the promotion-readiness contract and 2026-03-05 GO approval were recorded.
- Desired Outcome: docs-first promotion-decision closeout that keeps HOLD -> GO acceptance gates explicit, confirms qmd placement/timing, and records gate-by-gate evidence status for a truthful historical HOLD/NO-GO lineage and final GO closeout.
- Scope Status: docs/task-planning lane under existing task `0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness`; no new task id is introduced for follow-up documentation, and residual-r9/r10 plus post-closeout cancel-confirmation transport-scope implementation findings are treated as resolved evidence rather than active blockers.

## User Request Translation
- User intent: create the approved 0996 next slice focused on transport-control promotion readiness for Discord/Telegram mutating controls.
- Required outcomes:
  - produce full docs-first artifacts (PRD, TECH_SPEC, ACTION_PLAN, spec, checklist, `.agent` mirror),
  - update registry/snapshot artifacts (`tasks/index.json`, `docs/TASKS.md`, docs freshness registry),
  - encode qmd decisions and timing explicitly,
  - preserve CO authority invariants,
  - define implementation-checkable HOLD -> GO acceptance gates,
  - capture docs/review validation evidence and elegance checkpoint notes.

## Lineage (0993 -> 0994 -> 0995 -> 0996)
- 0993 delivered Coordinator -> CO control bridge behavior and core traceability patterns.
- 0994 established bounded extraction policy and Discord/Telegram HOLD defaults.
- 0995 remediated residual findings and locked transport-policy boundaries.
- 0996 is the next approved slice: promotion-readiness planning for mutating transport controls only.

## Residual-r4 Follow-up Scope (P2 Replay Traceability Metadata Parity)
- Trigger: latest 0996 terminal-closeout-r3 review reported a P2 replay traceability mismatch where replayed transport actions can inherit `latest_action` actor/transport context.
- Requirement intent: the replay trace payload for replayed transport actions must stay bound to replay-request context (`request_id`/actor/transport parity), not the most recent unrelated action snapshot.
- Docs-first scope in this stream: open and document the residual-r4 implementation lane under existing 0996 artifacts/checklists only.
- Out of scope in this stream: runtime code edits under `orchestrator/src/**`; implementation remains a later stream.

## Residual-r5 Follow-up Scope (Nonce Replay + Durable Persist Ordering)
- Trigger: implementation-gate run `2026-03-04T06-05-35-005Z-d9f360c2` review confirmed two new residuals in `controlServer.ts`.
- P1 residual: consume nonce on transport cancel replay path (`orchestrator/src/cli/control/controlServer.ts`) so replayed cancel intents cannot bypass nonce consumption and reuse nonce later.
- P2 residual: avoid consuming transport nonce before durable persist (`orchestrator/src/cli/control/controlServer.ts`) so transient `persist.control()` failures do not irreversibly burn nonce and block safe retry.
- Docs-first scope in this stream: open and document residual-r5 implementation lane under existing 0996 artifacts/checklists only.
- Out of scope in this stream: runtime code edits under `orchestrator/src/**`; implementation remains a later stream.

## Residual-r6 Follow-up Scope (Cancel Replay Response Traceability Canonicalization)
- Trigger: implementation-gate run `2026-03-04T08-00-10-026Z-66338252` review identified a P2 traceability gap in cancel replay responses (`orchestrator/src/cli/control/controlServer.ts`).
- P2 residual: replayed transport cancel responses must include canonical `traceability` payload (actor/transport/request parity) in the idempotent replay branch instead of returning snapshot-only payload.
- Docs-first scope in this stream: open and document residual-r6 implementation lane under existing 0996 artifacts/checklists only.
- Out of scope in this stream: runtime code edits under `orchestrator/src/**`; implementation remains a later stream.

## Residual-r7 Follow-up Scope (Replay ID Canonicalization in Cancel Replay Paths)
- Trigger: implementation-gate run `2026-03-04T09-23-36-723Z-0ef17be6` review identified two new P1 replay-ID canonicalization defects in `controlServer.ts`.
- P1 residual: preserve canonical IDs in cancel replay traceability (`orchestrator/src/cli/control/controlServer.ts`) so canonical `null` `request_id`/`intent_id` values are not overwritten by caller fallback values during replay.
- P1 residual: keep replay audit IDs sourced from replay index (`orchestrator/src/cli/control/controlServer.ts`) so replay traceability does not inherit unrelated IDs from `snapshot.latest_action`.
- Docs-first scope in this stream: open and document residual-r7 implementation lane under existing 0996 artifacts/checklists only.
- Out of scope in this stream: runtime code edits under `orchestrator/src/**`; implementation remains a later stream.

## Residual-r9 Closeout Status (Transport Discriminator + Transport-Scoped Cancel Replay Match)
- Originating review run `2026-03-04T11-29-27-215Z-3d002f4b` identified P1/P2 replay-safety findings in `controlServer.ts`.
- Closeout status: implementation + targeted/manual validation evidence now show both residual-r9 findings resolved in-stream.
- Evidence bundle: `out/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/manual/2026-03-04T12-15-26Z-r9-impl-transport-discriminator-replay-scope/`, `out/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/manual/20260305T092559-post-p1-terminal-closeout/11-authoritative-run.json`.
- Promotion implication: residual-r9 is no longer an active blocker; mutating-control promotion historically remained HOLD pending explicit approval + remaining policy gates before GO approval was recorded on 2026-03-05.

## Residual-r10 Closeout Status (Delegation Metadata Discriminator Fail-Closed)
- Originating review run `2026-03-04T12-47-18-555Z-09e690f6` identified a P1 delegation-path fail-open finding in `delegationServer.ts`.
- Closeout status: residual-r10 P1 fix is implemented and validated, with postfix P2 cap enforcement also resolved in-stream.
- Evidence bundle: `out/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/manual/20260304T133029Z-r10-impl-delegation-metadata-discriminator/`, `out/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/manual/20260304T134651Z-r10-residual-p2-controlstate-cap-enforcement/`, `out/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/manual/20260305T092559-post-p1-terminal-closeout/11-authoritative-run.json`.
- Promotion implication: residual-r10 is no longer an active blocker; mutating-control promotion historically remained HOLD pending explicit approval + remaining policy gates before GO approval was recorded on 2026-03-05.

## Post-Closeout P1 Remediation Status (Cancel Confirmation Transport-Scope Bind)
- Trigger: post-closeout follow-up stream identified a P1 control hardening gap around cancel confirmation scope binding when top-level transport metadata mismatches or is omitted.
- Closeout status: implementation + targeted/manual validation evidence show mismatch rejection and confirmed-scope transport binding behavior are now enforced in-stream.
- Evidence bundle: `out/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/manual/20260304T221505Z-p1-cancel-confirmation-transport-scope-bind/targeted-controlserver-tests.log`, `out/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/manual/20260304T221505Z-p1-cancel-confirmation-transport-scope-bind/manual-sim.log`, `out/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/manual/20260304T221505Z-p1-cancel-confirmation-transport-scope-bind/standalone-review-summary.txt`, `out/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/manual/20260305T092559-post-p1-terminal-closeout/11-authoritative-run.json`.
- Promotion implication: post-closeout P1 remediation is no longer an active blocker; mutating-control promotion historically remained HOLD pending explicit approval + remaining policy gates before GO approval was recorded on 2026-03-05.

## qmd Decision Placement + Timing
| qmd decision | Placement in 0996 | Timing | Effect on 0996 scope |
| --- | --- | --- | --- |
| Direct runtime adoption | Explicit HOLD in spec + checklist | Defer until all control hardening gates are proven | Not allowed in this slice |
| Sidecar research retrieval for docs/tasks/specs | Optional delegated docs stream | GO now | Supports requirements/evidence authoring without mutating control enablement |
| Read-only adapter pilot | Later gate under transport rollout planning | After control security hardening baseline | Non-blocking to mutating-control hardening |

## Hard Invariants (Must Hold)
- CO remains the only execution authority for control-state transitions and scheduler actions.
- Coordinator remains intake/control plane only; no direct runtime authority transfer to external transport adapters.
- External transport adapters may request control intents only through CO control APIs and must fail closed on validation/auth failures.

## HOLD -> GO Acceptance Gates (Mutating Controls)
1. Identity binding:
- Every mutating action must bind to an approved actor identity source and scoped transport principal.
- Actor identity mismatch/failure must hard-fail with auditable reason codes.

2. Nonce + expiry replay protection:
- Mutating actions require nonce issuance + expiry enforcement.
- Replayed/expired nonce usage must be rejected and observable.
- Transport cancel replay paths must consume nonce in the replay branch before returning idempotent replay responses.
- Transport metadata payloads must be rejected when transport discriminator fields are missing/invalid.

3. Idempotency window + index:
- Duplicate intents within configured windows must resolve deterministically via request/intent index lookups.
- Idempotent replay behavior must persist state and avoid control drift.
- Nonce consumption and idempotency index writes must not become durable until control state persist succeeds (or must be rolled back atomically on persist failure).
- Cancel replay matching must remain transport-scoped and must not resolve request replays across transport boundaries.

4. Full traceability schema:
- Each action must persist and expose: `actor_id`, `transport`, `intent_id`, `request_id`, `task_id`, `run_id`, `manifest_path`, `action`, `decision`, `timestamps`.
- Trace fields must map to a canonical source of truth for closeout and audit replay.
- Replayed transport actions must preserve replay-request actor/transport metadata parity and must not inherit unrelated `latest_action` context.
- Replayed transport cancel idempotent responses must return canonical `traceability` metadata so downstream consumers cannot attribute replayed actions to caller-supplied actor fallback data.
- Replayed cancel responses must preserve canonical `request_id`/`intent_id` values from replay index records, including canonical `null` IDs for request-only or intent-only actions.
- Replay audit IDs must remain replay-index sourced and must not fall back to unrelated `snapshot.latest_action` IDs.

5. Kill-switch + rollback drills:
- Feature flag defaults remain off until explicit GO.
- Kill-switch and rollback drills must be executed and evidenced before GO promotion.

## Goals
- Define promotion-readiness requirements for Discord/Telegram mutating controls as implementation-checkable gates.
- Make qmd placement/timing explicit so future streams do not conflate optional docs retrieval with runtime adoption.
- Preserve strict authority boundaries between CO core and external transport surfaces.
- Open a bounded residual-r4 implementation lane for replay traceability metadata parity under existing 0996 ownership.
- Open a bounded residual-r5 implementation lane for nonce replay-consumption and durable-persist ordering under existing 0996 ownership.
- Open a bounded residual-r6 implementation lane for cancel replay response traceability canonicalization under existing 0996 ownership.
- Open a bounded residual-r7 implementation lane for replay ID canonicalization in cancel replay traceability/audit paths under existing 0996 ownership.
- Preserve residual-r9/r10 and post-closeout P1 closure evidence as resolved prerequisites and keep the historical HOLD/NO-GO decision lineage explicit until approval evidence was recorded on 2026-03-05.

## Non-Goals
- Enabling mutating Discord/Telegram controls in this slice.
- Direct runtime adoption in this slice.
- Shipping read-only adapter pilot in this slice.
- Editing runtime implementation files under `orchestrator/src` in this docs planning stream.

## Metrics & Guardrails
- Success metrics:
  - all 0996 docs/mirrors exist and are synchronized,
  - qmd timing decisions appear in PRD/spec/action plan/checklist notes,
  - HOLD -> GO gates are explicit and testable,
  - docs/review evidence paths are recorded in checklist notes,
  - residual-r4 replay traceability parity scope is explicitly documented as an in-progress follow-up lane.
  - residual-r5 nonce replay/persist-ordering scope is explicitly documented as an in-progress follow-up lane with historical NO-GO state until fixed.
  - residual-r6 cancel replay response traceability scope is explicitly documented as an in-progress follow-up lane with historical NO-GO state until fixed.
  - residual-r7 replay ID canonicalization scope is explicitly documented as an in-progress follow-up lane with historical NO-GO state until fixed.
  - residual-r9 transport discriminator/replay-match closure evidence is linked and marked resolved.
  - residual-r10 delegation metadata discriminator fail-closed closure evidence is linked and marked resolved.
- Guardrails:
  - authority invariants are explicit and unchanged,
  - direct runtime adoption remains HOLD in qmd posture (separate from 0996 promotion-readiness closeout),
  - read-only pilot remains non-blocking and later-gated,
  - kill-switch/rollback promotion drills are evidenced in `out/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/manual/20260304T231451Z-killswitch-rollback-drill/08-drill-summary.md`,
  - technical state was NO-GO for mutating-control promotion until explicit HOLD -> GO approval was recorded on 2026-03-05; current 0996 promotion-readiness state is GO-approved/closed.

## Approvals
- Product: user-requested 0996 docs-first planning slice on 2026-03-04.
- Engineering: docs-first planning scope approved for 0996.
- Design: n/a.
