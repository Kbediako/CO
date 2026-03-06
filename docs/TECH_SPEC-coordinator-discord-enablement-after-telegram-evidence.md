# TECH_SPEC - Coordinator Discord Enablement After Telegram Evidence (1011)

- Canonical TECH_SPEC: `tasks/specs/1011-coordinator-discord-enablement-after-telegram-evidence.md`.
- Owner: Codex.
- Last Reviewed: 2026-03-06.

## Summary
- Scope: docs-first implementation planning for Discord enablement after Telegram evidence closure.
- Boundary: CO execution authority remains unchanged; Coordinator remains intake/control bridge only; no scheduler ownership transfer.
- Dependency: `1009` completion is required; `1010` status is tracked as adjacent advisory context.

## Requirements
- Create docs-first artifacts for 1011:
  - `docs/PRD-coordinator-discord-enablement-after-telegram-evidence.md`
  - `docs/TECH_SPEC-coordinator-discord-enablement-after-telegram-evidence.md`
  - `docs/ACTION_PLAN-coordinator-discord-enablement-after-telegram-evidence.md`
  - `tasks/specs/1011-coordinator-discord-enablement-after-telegram-evidence.md`
  - `tasks/tasks-1011-coordinator-discord-enablement-after-telegram-evidence.md`
  - `.agent/task/1011-coordinator-discord-enablement-after-telegram-evidence.md`
  - `docs/findings/1011-discord-enablement-deliberation.md`
- Update registries:
  - `tasks/index.json` with 1011 `items[]` and `specs[]` entries,
  - `docs/TASKS.md` snapshot entry for 1011,
  - `docs/docs-freshness-registry.json` entries for all 1011 artifacts.

## Dependency Contract
- `1009` completion evidence must be present and referenced explicitly.
- `1010` remains in-progress advisory lane and must not be treated as scheduler/authority transfer.
- 1011 must preserve closure truth for 1009 and non-authoritative semantics for 1010.

## Authority + Safety Constraints
- CO remains execution authority for all control-state transitions.
- Coordinator remains intake/control bridge only.
- Scheduler ownership transfer is prohibited.

## Auth/Token and Event Contract
- Auth/token boundaries:
  - fail closed on missing/expired/replayed/malformed token envelopes,
  - transport/context allowlist checks for Discord route.
- Idempotency:
  - duplicate/replayed intents are deduped deterministically.
- Traceability + auditable event outputs:
  - include correlation id, dependency state (`1009` closure + `1010` status), transport, intent, allow/deny reason,
  - outputs remain deterministic for auditing.

## Manual Mock Test Requirements
1. Missing/expired/replayed/malformed token envelopes reject with deterministic reasons.
2. Discord context binding enforces allowlisted ingress and deterministic deny outputs.
3. Duplicate/replay intents are idempotent with deterministic event outputs.
4. Dependency checks explicitly prove 1009 completion and report 1010 status.
5. Trace fields are complete and stable for every accept/reject path.
6. Auditable event outputs are emitted for both success and failure paths.
7. No scheduler ownership transfer fields/events appear.

## Exact Validation Gate Order (Policy)
1. `node scripts/delegation-guard.mjs`
2. `node scripts/spec-guard.mjs --dry-run`
3. `npm run build`
4. `npm run lint`
5. `npm run test`
6. `npm run docs:check`
7. `npm run docs:freshness`
8. `node scripts/diff-budget.mjs`
9. `npm run review`
10. `npm run pack:smoke` (required when touching CLI/package/skills/review-wrapper paths intended for downstream npm users)

## Docs-First Stream Validation (This Lane)
- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- `diff -u tasks/tasks-1011-coordinator-discord-enablement-after-telegram-evidence.md .agent/task/1011-coordinator-discord-enablement-after-telegram-evidence.md`
- Logs captured under `out/1011-coordinator-discord-enablement-after-telegram-evidence/manual/<timestamp>-docs-first/`.

## Placeholder Gate Manifests (Future)
- docs-review: `.runs/1011-coordinator-discord-enablement-after-telegram-evidence/cli/<docs-review-run-id>/manifest.json`
- implementation-gate: `.runs/1011-coordinator-discord-enablement-after-telegram-evidence/cli/<implementation-gate-run-id>/manifest.json`
