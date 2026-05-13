# Findings - 1014 Symphony-Aligned Telegram + Linear Adapter Deliberation

- Date: 2026-03-06
- Task: `1014-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters`
- Scope: decide the smallest correct runtime slice that combines Symphony-like operator context with CO's existing control and advisory boundaries.

## Decision Summary

| Area | Decision | Rationale |
| --- | --- | --- |
| Symphony carry-over | Borrow active-item/event-projection behavior only | That is the useful operator UX without importing desktop inventory or weak approval defaults. |
| Telegram transport | Implement polling adapter now | No public CO endpoint exists yet; polling works with the prepared bot token and preserves local control-server authority. |
| Telegram mutations | Limit to `/pause` and `/resume` | Bounded control is enough for the first real operator surface; `/cancel` stays deferred to avoid expanding confirmation/UI complexity. |
| Linear integration | Implement live advisory lookup now | The static pilot is already in place; the missing piece is the real provider-backed resolver. |
| Linear authority | Keep advisory-only | Existing `1000` contract and user intent both require non-authoritative behavior. |
| Multi-run/global bot routing | Defer | The smallest coherent slice is one bot attached to one active CO run, matching Symphony's single selected-item model. |

## Evidence Base
- `0998` Symphony inclusion boundary and rejected lower-guardrail defaults:
  - `docs/PRD-coordinator-readonly-observability-surface-hardening-and-symphony-inclusion-plan.md`
  - `docs/findings/0998-openai-symphony-adoption-timing-and-slice-map.md`
- `0994` adapter-only extraction boundary:
  - `docs/PRD-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction.md`
- `1000` non-authoritative dispatch pilot closure:
  - `tasks/specs/1000-coordinator-tracker-dispatch-pilot-non-authoritative.md`
- `1009` and `1010` setup lanes leaving runtime/provider work downstream:
  - `docs/PRD-coordinator-telegram-setup-canary-and-runbook-implementation.md`
  - `docs/PRD-coordinator-linear-advisory-setup-and-runbook-implementation.md`
- `1013` hardened app-server control core:
  - `docs/TASKS.md`

## Subagent Synthesis
- Symphony analysis:
  - useful traits are selected-item focus, event-stream projection, and concise workspace/run context around one active item.
  - do not import the local SQLite repo/group/agent inventory or force-approve execution posture.
- CO gap analysis:
  - the control core already exists,
  - Telegram exists only as normalized transport semantics,
  - Linear exists only as a static fail-closed advisory parser,
  - the remaining gap is real provider adapter/runtime work.

## Scope Decision
- One new adapter-only task is sufficient.
- In scope:
  - Telegram polling ingress + operator projection,
  - live Linear-backed advisory recommendation synthesis,
  - tracked provider metadata projection into compatibility payloads,
  - provider-scoped validation, canary, rollback, and closeout evidence.
- Out of scope:
  - public webhook ingress,
  - global multi-run Telegram control plane,
  - Linear mutation,
  - scheduler ownership transfer,
  - Discord expansion.

## Risk Callouts
1. Authority creep
- The easiest failure mode is letting Telegram or Linear bypass the existing CO control/advisory boundary.

2. Replay/auth mismatch
- Telegram and Linear provider events must be mapped carefully onto CO's request/intent/nonce model; adapter shortcuts would weaken the boundary.

3. Identity drift
- CO's authoritative active item remains the run/task; live Linear issue identity must stay attached as tracked context rather than replacing it.

4. Runtime coupling
- The new Telegram adapter should depend only on the existing local control server and env-scoped provider config so it does not require a public endpoint or cloud-only runtime.

## Decision
- GO for task `1014` as a bounded runtime implementation lane.
- Preserve all pre-existing authority boundaries unchanged.
