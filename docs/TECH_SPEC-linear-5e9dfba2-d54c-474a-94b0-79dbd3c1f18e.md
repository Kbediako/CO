---
id: 20260518-linear-5e9dfba2-d54c-474a-94b0-79dbd3c1f18e
title: CO-515 control-host source freshness recheck after main advances
relates_to: docs/PRD-linear-5e9dfba2-d54c-474a-94b0-79dbd3c1f18e.md
risk: high
owners:
  - Codex
last_review: 2026-05-18
related_action_plan: docs/ACTION_PLAN-linear-5e9dfba2-d54c-474a-94b0-79dbd3c1f18e.md
task_checklists:
  - tasks/tasks-linear-5e9dfba2-d54c-474a-94b0-79dbd3c1f18e.md
---

# TECH_SPEC Mirror - CO-515 control-host source freshness recheck after main advances

Canonical spec: `tasks/specs/linear-5e9dfba2-d54c-474a-94b0-79dbd3c1f18e.md`; PRD: `docs/PRD-linear-5e9dfba2-d54c-474a-94b0-79dbd3c1f18e.md`; action plan: `docs/ACTION_PLAN-linear-5e9dfba2-d54c-474a-94b0-79dbd3c1f18e.md`.

## Contract
The resident supervised control-host must recheck `control-host source freshness` against local `origin/main` before projecting current status through `co-status --format json` or `/ui/data.json`. Freshness evidence must keep `observed_at`, `source_checkout.head`, upstream, and behind/ahead data tied to the comparison that produced the verdict. Shared-root posture and `provider-intake-state.json` evidence remain separate surfaces and must not be used to hide stale source truth.

## Not Done If
- `co-status --format json` can still show stale current status after `origin/main` advances.
- `observed_at` or `source_checkout.head` is copied from stale startup/persisted owner state while the verdict says current.
- A clean shared root is treated as proof that the long-running control-host source root is current.
- The fix edits `provider-intake-state.json`, restarts the host as the answer, hides source freshness evidence, or changes provider-worker WIP/Linear lifecycle behavior.
- CO-556 auto-restart/fail-closed policy is implemented before CO-515 makes stale-source detection trustworthy.

## Validation
Parent owns focused source freshness recheck coverage, including a CO-555 recurrence fixture where local `origin/main` advances after the resident supervised control-host captured source freshness. The expected result is stale/warning source freshness with updated `observed_at`, stale `source_checkout.head`, and current upstream evidence. This child lane validates only JSON parsing, protected-term coverage, and diff hygiene for the declared docs files.

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Required decision table:

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Control-host source freshness projection | Cached or startup-time freshness can keep stale current status after `origin/main` advances. | remove fallback | CO-515 | Long-running resident supervised control-host source root is behind local `origin/main` while status/proof surfaces still say current. | Observed 2026-05-18 | 2026-05-18 | This issue | Source freshness rechecks local `origin/main` before reporting current and emits stale/warning with updated `observed_at` and `source_checkout.head` when behind. | CO-555 recurrence fixture plus focused source freshness/status projection tests. |

- For `justify retaining fallback`: Not applicable. CO-515 does not approve retaining stale current status.
- Large-refactor check: keep CO-515 bounded to trustworthy stale-source detection and projection. CO-556 owns auto-restart/fail-closed policy after this detection is reliable.
- Minor-seam decision: acceptable because the recheck is read-only against local refs, removes stale cached-current authority, and keeps resident source-root freshness separate from shared-root posture.
