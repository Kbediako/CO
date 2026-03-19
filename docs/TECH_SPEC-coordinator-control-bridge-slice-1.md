# TECH_SPEC - Coordinator Control Bridge Slice 1

- Canonical TECH_SPEC: `tasks/specs/0993-coordinator-control-bridge-slice-1.md`.
- Owner: Codex.
- Last Reviewed: 2026-03-03.

## Summary
- Scope: docs-first contract definition for Coordinator forwarding of `pause`, `resume`, `cancel`, and `status` into CO.
- Authority boundary: CO remains execution/control/scheduler authority; Coordinator remains intake/control bridge.
- Core requirements: strict auth/token boundary, idempotent duplicate handling, and auditable trace chain (`intent_id -> task_id -> run_id -> manifest_path`).
- Realignment status: coordinator planning docs were reconciled with current CO runtime/policy defaults before implementation.

## Requirements
- Control action contracts are explicit and fail-closed on invalid auth/policy.
- Duplicate control intents/requests are idempotent with deterministic no-op/duplicate responses.
- Manifest/events/status outputs expose audit fields required for replay and incident analysis.
- Scheduler ownership remains solely in CO and is enforced as a hard invariant.

## Acceptance
- PRD/TECH_SPEC/ACTION_PLAN/checklist mirrors are complete and consistent.
- `tasks/index.json` and `docs/TASKS.md` registration entries exist for `0993`.
- Required realignment sections are present in PRD + canonical spec.
- Implementation/validation work remains pending until coding phase begins.
