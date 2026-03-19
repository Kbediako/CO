# TECH_SPEC: Coordinator Symphony-Parity Provider-Driven Autonomous Intake and Run Handoff

## Context

The remaining gap after `1302` is no longer provider setup. It is provider-driven autonomous intake: turning a selected or accepted provider issue into a deterministic CO run lifecycle without human start commands, while preserving CO as execution authority.

## Scope

- define the persistent intake/control-runtime shape required for autonomous provider-driven work pickup,
- define the provider issue acceptance and issue-to-run handoff contract, starting with Linear,
- define the missing parity requirements beyond simple “start from ticket” behavior,
- keep the current authority posture explicit: Linear can trigger intake, but CO still owns execution.

## Implementation Context

- Local Codex baseline for the implementation lane is `codex-cli 0.115.0`.
- Local Symphony reference checkout is `/Users/kbediako/Code/symphony`, synced to `1f86bac53a84eb0e9f10d6546e3f19a5724a5b09` before this handoff.
- Implementation should use the synced Symphony checkout as the upstream comparison surface for orchestrator/runtime hosting, tracker integration, and status/presenter shaping, while preserving CO's explicit execution-authority boundary.

## Requirements

1. Define a persistent runtime or intake host that can keep Linear and Telegram surfaces alive without depending on an already-running task lane.
2. Define provider-originated work-start semantics that do not exist today:
   - what counts as an accepted issue or start signal,
   - which provider surfaces are allowed to originate intake,
   - how provider-originated intake differs from `pause`, `resume`, `cancel`, and `fail`.
3. Define a deterministic mapping from accepted provider issue to CO task/run identity:
   - new run versus resume existing run,
   - idempotent replay handling,
   - issue claim or lease semantics,
   - duplicate suppression and stale-event rejection.
4. Define the minimum intake policy needed for Symphony parity:
   - what counts as an accepted issue,
   - how accepted issues are ordered or selected,
   - how autonomous starts are gated,
   - how manual override or rollback interrupts the lane.
5. Preserve CO execution authority and explicit safety boundaries:
   - no scheduler ownership transfer,
   - no silent mutation expansion,
   - no implicit provider-authoritative control actions outside the defined handoff contract.
6. Keep Telegram and observability surfaces coherent after autonomy:
   - `/dispatch` and `/status` remain explainable,
   - Telegram read-only responses reflect autonomous selections and active runs,
   - duplicate pollers, single-run assumptions, or multi-run ambiguity are addressed by design rather than left implicit.
7. Include anything else still missing for full Symphony parity in this area, not just the raw Linear trigger:
   - persistent control-plane hosting,
   - active-item claim/release policy,
   - rehydration after restart,
   - webhook/polling coexistence policy,
   - audit and rollback evidence requirements.

## Validation Plan

- docs-first planning validation:
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - `npm run docs:freshness`
- downstream implementation expectations captured in the packet:
  - autonomous intake contract tests,
  - idempotency/replay tests,
  - issue-to-run mapping tests,
  - persistent-host bootstrap and restart tests,
  - live Linear plus Telegram end-to-end smoke once implemented.

## Implementation Notes

- The landed persistent host surface is a dedicated `codex-orchestrator control-host` CLI command rather than a run-scoped control-plane side effect. It persists host state under `.runs/local-mcp/cli/control-host/` so the host stays outside normal task-run discovery while still keeping audit files local and restart-safe.
- The provider-authoritative intake contract is intentionally narrow: only accepted Linear issues whose live `state_type` resolves to `started` can originate autonomous handoff, and the handoff only launches bounded CO `start` or `resume` commands. Provider events still do not own scheduler decisions or arbitrary control mutations.
- Run manifests now persist `issue_provider`, `issue_id`, `issue_identifier`, and `issue_updated_at` so replay, resume discovery, and post-restart rehydration can match the same provider issue deterministically across child runs.
- The first implementation uses a stable provider-id-derived fallback task id (`linear-<opaque-provider-id>`) when no explicit issue-level CO task-id carrier exists in the current live Linear projection. That keeps handoff deterministic without widening provider authority to infer task ids from mutable human identifiers.
