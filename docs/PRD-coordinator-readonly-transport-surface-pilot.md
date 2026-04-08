# PRD - Coordinator Read-Only Transport Surface Pilot (0997)

## Summary
- Problem Statement: 0996 keeps Discord/Telegram mutating controls in HOLD, but downstream transport adapters still require a safe, auditable status surface.
- Delivered Outcome: task 0997 implemented and validated a bounded `status_only` delegation slice where `delegate.status` is available and mutating controls are blocked.
- Scope Status: implementation + terminal validation complete on 2026-03-05.

## User Request Translation
- User intent: sync 0997 docs/task mirrors to implemented reality after terminal closeout.
- Required outcomes:
  - frame 0997 as implemented read-only transport slice (not docs-only),
  - cite authoritative implementation-gate manifest and closeout logs,
  - keep mutating controls explicitly HOLD under 0996,
  - publish concise operator-facing `status_only` mode note.

## Implementation Outcome (2026-03-05)
- Authoritative implementation-gate manifest (terminal succeeded):
  - `.runs/0997-coordinator-readonly-transport-surface-pilot/cli/2026-03-05T00-44-50-509Z-75da1233/manifest.json`
- Terminal closeout summary and gate evidence:
  - `out/0997-coordinator-readonly-transport-surface-pilot/manual/20260305T003024Z-terminal-closeout/terminal-closeout-summary.md`
  - `out/0997-coordinator-readonly-transport-surface-pilot/manual/20260305T003024Z-terminal-closeout/16-implementation-gate-rerun.log`
- Manual `status_only` behavior verification:
  - `out/0997-coordinator-readonly-transport-surface-pilot/manual/20260305T003024Z-terminal-closeout/18-manual-status-only-rerun.log`

## Lineage (0994 -> 0995 -> 0996 -> 0997)
- 0994 established bounded codex-autorunner extraction and set Discord/Telegram interactive mutation to HOLD.
- 0995 locked extraction boundaries and GO/HOLD/NO-GO policy for transport surfaces.
- 0996 formalized qmd posture and promotion gates, keeping mutating controls HOLD/NO-GO pending explicit approval.
- 0997 implemented the bounded read-only status slice (`status_only`) without promoting mutation authority.

## Scope
### In Scope
- Implement and document `status_only` mode semantics for external transport adapters.
- Allow `delegate.status` as the only inbound delegation action.
- Allow optional outbound status/event notifications.
- Hard deny mutating transport actions/tools.
- Update docs/task mirrors, snapshots, and task registry pointers to terminal implementation-gate evidence.

### Out of Scope
- Enabling mutating transport actions (`pause`, `resume`, `cancel`, `fail`, `rerun`).
- Changing CO execution authority, runtime authority, or scheduler authority boundaries.
- Any 0996 HOLD -> GO promotion decision for mutating controls.

## Status-Only Contract (Implemented)
- Allowed inbound adapter request:
  - `delegate.status` with scoped transport identity and auditable request metadata.
- Optional outbound adapter projection:
  - status snapshots,
  - lifecycle/event notifications (for example: gate transitions, failure alerts, completion events).
- Mandatory denied inbound adapter requests:
  - all mutating control actions,
  - any tool/action outside explicit status contract,
  - malformed transport payloads.

## Hard Invariants (Must Hold)
- CO remains the only execution authority for control-state transitions and scheduler actions.
- Coordinator remains intake/control plane only.
- Transport adapters remain read-only observers in 0997 and fail closed outside `status_only` allowances.
- Mutating controls remain HOLD under 0996 unless explicit HOLD -> GO approval is recorded there.

## Acceptance Criteria
1. PRD/TECH_SPEC/ACTION_PLAN/spec/checklist artifacts are synchronized to implementation-complete 0997 state.
2. `status_only` contract explicitly allows `delegate.status` and optional outbound notifications only.
3. Mutating transport actions are explicitly denied; 0996 HOLD boundary remains unchanged.
4. `tasks/index.json` 0997 gate metadata points to terminal implementation-gate run `2026-03-05T00-44-50-509Z-75da1233`.
5. `docs/TASKS.md` top 0997 snapshot line uses implementation-complete wording with terminal evidence.
6. Task and `.agent` checklist mirrors remain byte-identical.
7. Validation evidence includes terminal implementation-gate + manual status-only logs and docs mirror-sync rerun logs (`docs:check`, `docs:freshness`, parity).

## Risks & Guardrails
- Risk: read-only status contract is misread as mutation approval.
  - Guardrail: explicit allowlist (`delegate.status`) and repeated 0996 HOLD linkage.
- Risk: adapter ownership assumptions blur CO authority boundaries.
  - Guardrail: reassert CO-only authority invariants in every 0997 artifact.
- Risk: documentation drift reintroduces docs-review-only framing after implementation.
  - Guardrail: anchor acceptance and snapshots to terminal implementation-gate manifest + closeout logs.

## Approvals
- Product: user-requested mirror-sync post-closeout update on 2026-03-05.
- Engineering: implementation-complete 0997 framing approved with 0996 HOLD boundary unchanged.
- Design: n/a.
