# TECH_SPEC - Coordinator Read-Only Transport Surface Pilot

- Canonical TECH_SPEC: `tasks/specs/0997-coordinator-readonly-transport-surface-pilot.md`.
- Owner: Codex.
- Last Reviewed: 2026-03-05.

## Summary
- Scope: implemented `status_only` transport slice for downstream adapters, with post-closeout mirror synchronization.
- Allowed contract: `delegate.status` inbound + optional outbound status/event notifications.
- Deny posture: hard deny mutating transport controls/actions in `status_only` mode.
- Authority boundary: unchanged from 0994/0995/0996; CO remains execution authority.

## Requirements
- Enforce `status_only` mode semantics with explicit allowlist/denylist behavior.
- Permit inbound `delegate.status` only, with auditable metadata requirements.
- Permit optional outbound status/event projections only.
- Explicitly deny mutating actions (`pause`, `resume`, `cancel`, `fail`, `rerun`) in this slice.
- Preserve codex-autorunner extraction boundaries documented in 0994/0995.
- Preserve qmd posture from 0996:
  - direct runtime adoption HOLD,
  - sidecar docs retrieval optional GO,
  - mutating transport controls HOLD/NO-GO unless explicitly approved.
- Keep docs/task mirrors and task registry pointers aligned to implementation-gate terminal evidence.

## Acceptance
- 0997 PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror are synchronized to implementation-complete wording.
- `tasks/index.json` and `docs/TASKS.md` point to implementation-gate terminal run `2026-03-05T00-44-50-509Z-75da1233`.
- Validation artifacts cite:
  - `.runs/0997-coordinator-readonly-transport-surface-pilot/cli/2026-03-05T00-44-50-509Z-75da1233/manifest.json`
  - `out/0997-coordinator-readonly-transport-surface-pilot/manual/20260305T003024Z-terminal-closeout/16-implementation-gate-rerun.log`
  - `out/0997-coordinator-readonly-transport-surface-pilot/manual/20260305T003024Z-terminal-closeout/18-manual-status-only-rerun.log`
  - mirror-sync post-closeout docs validation and parity evidence.
- Mutating controls remain explicitly HOLD under 0996 policy and are not promoted by 0997.
