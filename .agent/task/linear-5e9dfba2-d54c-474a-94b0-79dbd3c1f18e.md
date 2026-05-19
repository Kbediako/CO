# Agent Task Mirror - linear-5e9dfba2-d54c-474a-94b0-79dbd3c1f18e

- Linear Issue: `CO-515` / `5e9dfba2-d54c-474a-94b0-79dbd3c1f18e`
- Task registry id: `20260518-linear-5e9dfba2-d54c-474a-94b0-79dbd3c1f18e`
- Primary checklist: `tasks/tasks-linear-5e9dfba2-d54c-474a-94b0-79dbd3c1f18e.md`
- PRD: `docs/PRD-linear-5e9dfba2-d54c-474a-94b0-79dbd3c1f18e.md`
- TECH_SPEC: `tasks/specs/linear-5e9dfba2-d54c-474a-94b0-79dbd3c1f18e.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-5e9dfba2-d54c-474a-94b0-79dbd3c1f18e.md`

## Agent-Facing Scope
- [x] Preserve protected terms from CO-515: `control-host source freshness`, `origin/main`, `observed_at`, `source_checkout.head`, stale current status, long-running control-host, shared-root posture, resident supervised control-host, `provider-intake-state.json`, and `co-status --format json`.
- [x] Keep resident supervised source-root freshness separate from shared-root posture.
- [x] Recheck cached resident source freshness after local `origin/main` advances before reporting current.
- [x] Preserve source labels and provenance in `co-status --format json` and provider-intake/status projection output.
- [x] Avoid manual provider-intake edits, restart-as-fix behavior, and CO-556 auto-restart/fail-closed policy work.

## Fallback Decision Table
- Large-refactor decision: not required; this lane removes the stale cached-current status path while preserving existing source freshness projection surfaces.
- Minor-seam decision: acceptable because the recheck remains read-only against local refs and keeps shared-root and resident-source authority separate.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Control-host source freshness projection | Cached or startup-time freshness can keep stale current status after `origin/main` advances. | `remove fallback` | CO-515 | Long-running resident supervised control-host source root is behind local `origin/main` while status/proof surfaces still say current. | Observed 2026-05-18 | 2026-05-18 | This issue | Source freshness rechecks local `origin/main` before reporting current and emits stale/warning with updated `observed_at` and `source_checkout.head` when behind. | CO-555 recurrence fixture plus focused source freshness/status projection tests. |

## Validation Snapshot
- [x] Same-issue docs child lane completed: `docs-packet`, run `2026-05-18T23-15-56-334Z-bed38666`.
- [x] Docs-review completed clean with valid enforced contract.
- [x] Focused source freshness and control-runtime regressions cover a long-running resident control-host after main fast-forwards.
- [x] Full provider-worker validation floor passed before PR #836 opened.
- [x] Standalone implementation gate completed clean with valid enforced contract.
- [x] Explicit elegance pass completed.
- [ ] PR ready-review drain and Linear handoff pending.
