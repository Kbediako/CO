# TECH_SPEC - Coordinator Control Bridge Slice 3 + Residual Risk Remediation + Transport Policy Alignment

- Canonical TECH_SPEC: `tasks/specs/0995-coordinator-control-bridge-slice-3-residual-risk-remediation-and-transport-policy-alignment.md`.
- Owner: Codex.
- Last Reviewed: 2026-03-03.

## Summary
- Scope: docs-only remediation for 0995 to remove stale claims and lock residual-risk + transport-policy requirements.
- Authority boundary: CO remains the only execution/control authority.
- Policy posture: notifications GO, mutating controls HOLD, explicit NO-GO set.

## Requirements
- Residual findings from 0994 are captured as explicit remediation targets with source evidence.
- Codex-autorunner extraction scope is bounded to transport-adapter concerns; core authority stays in CO.
- Discord/Telegram GO/HOLD/NO-GO matrix is explicit and implementation-checkable.
- HOLD promotion controls (security, reliability, traceability, rollback/promotion governance) are explicit.
- Checklist mirrors contain truthful docs-stream evidence only; implementation/final validation remain pending.

## Acceptance
- PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror are synchronized and truthful.
- `tasks/index.json` and `docs/TASKS.md` include 0995 registration/snapshot.
- docs-review evidence exists for pre-coding baseline and post-remediation state.
- standalone review evidence exists for this docs stream and checklist notes include an elegance/minimality pass note.
