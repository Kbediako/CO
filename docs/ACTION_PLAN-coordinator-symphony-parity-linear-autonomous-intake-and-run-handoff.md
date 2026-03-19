# ACTION_PLAN: Coordinator Symphony-Parity Provider-Driven Autonomous Intake and Run Handoff

## Summary

- Goal: register the final provider-driven autonomy gap as a docs-first lane and make the missing Symphony-parity requirements explicit.
- Scope: planning-only packet for autonomous provider intake, persistent control hosting, and issue-to-run handoff; runtime implementation remains downstream.
- Assumptions: `1302` closed provider setup and advisory smoke, but not autonomous ticket execution.

## Milestones & Sequencing

1. Confirm the current-tree boundary:
   - `1302` proved live provider setup and advisory surfacing,
   - current Linear and Telegram paths remain advisory or read-only,
   - no provider surface currently owns or exposes autonomous `start work` semantics,
   - full provider-driven autonomy is still missing.
2. Define the target autonomy contract:
   - persistent intake host,
   - accepted-issue policy,
   - issue-to-run mapping,
   - start versus resume semantics,
   - idempotent claim and replay handling.
3. Define the remaining parity requirements that must ship with the autonomy lane:
   - restart rehydration,
   - webhook/polling coexistence,
   - auditability and rollback,
   - Telegram and `/dispatch` coherence,
   - multi-run ambiguity handling.
4. Register the next implementation-ready lane in docs/task mirrors and capture docs-first validation evidence.

## Dependencies

- `1302` provider setup and smoke evidence
- existing Linear advisory resolver and webhook ingress
- existing Telegram `/dispatch` read path
- prior findings that intentionally deferred unattended or tracker-authoritative behavior
- local Codex CLI baseline verified at `codex-cli 0.115.0`
- local Symphony checkout `/Users/kbediako/Code/symphony` synced to `1f86bac53a84eb0e9f10d6546e3f19a5724a5b09`

## Validation

- Checks / tests:
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - `npm run docs:freshness`
- Rollback plan:
  - planning-only lane; no runtime behavior changes in this turn

## Risks & Mitigations

- Risk: under-scoping the final parity gap to a simple “start from Linear” shortcut.
  - Mitigation: explicitly include persistent hosting, idempotency, claim/release, and restart semantics in the packet.
- Risk: silently breaking CO’s authority model.
  - Mitigation: keep CO execution authority explicit and make any provider-driven action an intake trigger rather than scheduler ownership transfer.
- Risk: assuming Telegram or webhook routing is already production-ready for autonomy.
  - Mitigation: call out runtime-hosting and poller/ingress coexistence as first-class design requirements.

## Implementation Decision Record

- Persistent host: implement a dedicated `codex-orchestrator control-host` command instead of trying to stretch the existing run-scoped control lifecycle into a long-lived daemon.
- Intake state: keep autonomous claim/replay state in a separate `provider-intake-state.json` ledger rather than overloading `linear-advisory-state.json`.
- Accepted start semantics: gate provider-driven handoff on live Linear `state_type=started`; keep `/dispatch` advisory-only and preserve the existing Telegram read surfaces.
- Run identity: persist provider issue identity directly on child manifests and use that identity for start/resume replay discovery.
- Task mapping: use a stable provider-id fallback task id until the live Linear issue projection exposes an explicit issue-level CO task-id carrier.
