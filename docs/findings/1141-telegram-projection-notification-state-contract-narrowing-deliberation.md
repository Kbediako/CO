# 1141 Deliberation - Telegram Projection Notification State Contract Narrowing

- Date: 2026-03-13
- Task: `1141-coordinator-symphony-aligned-telegram-projection-notification-state-contract-narrowing`

## Why this slice

- `1140` completed the truthful outbound branch extraction.
- The remaining Telegram width is now the controller contract itself, not another mixed branch.
- Narrowing the state contract is the smallest next step that continues the Symphony-aligned runtime-thinning direction without reopening lifecycle work.

## In Scope

- Narrowing input/output state shape for the projection-notification controller.
- Small bridge-side assembly adjustments needed to keep full-state ownership in the bridge.
- Focused controller and bridge regressions for unchanged dedupe/cooldown/send semantics.

## Out of Scope

- Queue ownership, lifecycle, or ingress work.
- Transport redesign.
- Read presentation redesign.
- Linear runtime changes.

## Recommendation

- Proceed with a contract-narrowing slice only.
- Keep the bridge as the whole-state owner.
- Keep the controller on notification-local state only.
