# TECH_SPEC - Coordinator Control Bridge Slice 2 + Residual Risk Closure + External Transport-Surface Extraction

- Canonical TECH_SPEC: `tasks/specs/0994-coordinator-control-bridge-slice-2-residual-risk-closure-and-external-transport-surface-extraction.md`.
- Owner: Codex.
- Last Reviewed: 2026-03-03.

## Summary
- Scope: docs-first follow-up slice that closes residual risks after 0993, defines codex-autorunner extraction boundaries, and sets explicit Discord/Telegram decision criteria.
- Authority boundary: CO remains execution/control/scheduler authority.
- Review discipline: delegated implementation streams must follow mandatory standalone/elegance cadence.

## Requirements
- Residual-risk closure objectives are explicit and implementation-testable.
- Codex-autorunner extraction lane is bounded to transport-facing adapters and preserves CO invariants.
- Discord/Telegram criteria are explicit and enforceable as go/no-go gates.
- Mandatory standalone/elegance review cadence is documented for delegated implementation streams.

## Acceptance
- PRD/TECH_SPEC/ACTION_PLAN/checklist mirrors are complete and consistent.
- `tasks/index.json` and `docs/TASKS.md` include 0994 registration and snapshot.
- docs-review and standalone review evidence are captured for this docs stream.
- Findings artifact captures codex-autorunner GO (bounded) and Discord/Telegram HOLD decisions with residual-risk closure evidence (`docs/findings/0994-codex-autorunner-extraction-and-transport-go-hold.md`).
