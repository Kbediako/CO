# TECH_SPEC - Coordinator Control Bridge Slice 4 + Discord/Telegram Mutating Control Promotion Readiness

- Canonical TECH_SPEC: `tasks/specs/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness.md`.
- Owner: Codex.
- Last Reviewed: 2026-03-05.

## Summary
- Scope: docs-first planning for transport mutating-control promotion readiness.
- Extension scope: residual-r4 through residual-r10 closeout evidence plus post-closeout P1 cancel-confirmation transport-scope remediation under existing task 0996, with residual-r9/r10 and post-closeout P1 treated as resolved prerequisites.
- qmd posture: direct runtime adoption remains HOLD in qmd scope, sidecar docs retrieval GO-now optional, read-only adapter pilot later/non-blocking.
- Authority boundary: CO remains execution authority; coordinator is intake/control only.

## Requirements
- qmd timing/placement is explicit in docs/checklists.
- HOLD -> GO acceptance gates are explicit for identity binding, replay protection, idempotency index/window, traceability schema, and kill-switch/rollback drills.
- Residual-r4 replay traceability parity requirement is explicit: replayed transport events must source actor/transport metadata from replay context, not `latest_action` from unrelated later actions.
- Residual-r5 nonce requirements are explicit:
  - P1: cancel replay branch consumes nonce on idempotent replay path (`orchestrator/src/cli/control/controlServer.ts`).
  - P2: nonce consumption ordering is durable-safe and does not burn nonce before successful persist (`orchestrator/src/cli/control/controlServer.ts`).
- Residual-r6 traceability requirement is explicit:
  - P2: cancel replay idempotent responses include canonical `traceability` payload (`orchestrator/src/cli/control/controlServer.ts`) so replay actor/transport metadata cannot drift to caller fallback values.
- Residual-r7 replay ID canonicalization requirements are explicit:
  - P1: preserve canonical IDs in cancel replay traceability (`orchestrator/src/cli/control/controlServer.ts`) so canonical `null` IDs are not overwritten by fallback caller input.
  - P1: keep replay audit IDs sourced from replay index (`orchestrator/src/cli/control/controlServer.ts`) so replay traceability does not inherit unrelated IDs from `snapshot.latest_action`.
- Residual-r9 transport replay-safety requirements are explicit (run `3d002f4b`):
  - P1: reject transport metadata without a transport discriminator (`orchestrator/src/cli/control/controlServer.ts`).
  - P2: require transport-scoped replay match for cancel requests (`orchestrator/src/cli/control/controlServer.ts`).
- Residual-r10 delegation fail-closed requirement is explicit (run `09e690f6`):
  - P1: reject metadata-only transport calls before delegation forwarding (`orchestrator/src/cli/delegationServer.ts`) so transport metadata cannot bypass discriminator enforcement by being silently dropped.
- Post-closeout cancel-confirmation transport-scope requirement is explicit:
  - P1: reject cancel confirmation scope mismatches and bind confirmed transport scope when top-level transport metadata is omitted.
- Residual-r9/r10 and post-closeout P1 closure evidence are recorded as resolved and no longer treated as active blockers.
- Technical state was NO-GO for mutating-control promotion until explicit HOLD -> GO approval was recorded on 2026-03-05; current 0996 promotion-readiness state is GO-approved/closed. Kill-switch/rollback promotion drills are evidenced in `out/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/manual/20260304T231451Z-killswitch-rollback-drill/08-drill-summary.md`.
- Checklist notes include mandatory subagent standalone/elegance cadence for implementation streams.
- Registry/snapshot artifacts include 0996 docs paths.

## Acceptance
- 0996 PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror are synchronized.
- `tasks/index.json` and `docs/TASKS.md` include 0996 task/spec snapshot state.
- `docs/docs-freshness-registry.json` includes 0996 artifact entries.
- docs-review/docs checks/standalone-review/elegance checkpoint evidence is recorded in the 0996 checklist notes.
- kill-switch/rollback drill summary + hold-go approval record artifacts are recorded in `out/.../20260304T231451Z-killswitch-rollback-drill/08-drill-summary.md` and `out/.../20260304T231451Z-killswitch-rollback-drill/09-hold-go-approval-record.md`.
- Residual-r5 through residual-r10 checklist evidence is linked, with residual-r9/r10 and post-closeout P1 explicitly marked resolved in-stream.
- Promotion decision was HOLD/NO-GO until explicit GO approval evidence was added on 2026-03-05; current state is GO-approved/closed.
