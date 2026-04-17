# PRD - CO: clear stale shared-root merge-closeout residue once CO-211 / PR #506 are merged and live Linear truth is Done

## Traceability
- Linear issue: `CO-214` / `50e8a891-2b2f-4a67-b4d0-a2706870ddec`
- Task id: `linear-50e8a891-2b2f-4a67-b4d0-a2706870ddec`
- Canonical spec: `tasks/specs/linear-50e8a891-2b2f-4a67-b4d0-a2706870ddec.md`
- Docs packet child lane origin manifest: `.runs/linear-50e8a891-2b2f-4a67-b4d0-a2706870ddec-docs-packet/cli/2026-04-17T05-33-52-283Z-922f6714/manifest.json`
- Source anchor: `ctx:sha256:b7ad1828659a1c10272a7b9a6baa0ec33f1474751d0357cb894bd66f92c391c0#chunk:c000001`

## Summary
`CO-214` is the stale merged-closeout residue follow-up after `CO-211` / `PR #506`. The reproduced issue shape is not a Ready reclaim problem and not a docs/spec-guard interpretation problem. Merged PR truth and live Linear `Done` truth can already be authoritative, while local `provider-intake-state.json` still retains older `Merging` closeout residue such as `issue_state=Merging`, `state=handoff_failed`, `provider_issue_merge_closeout_action_required`, `merge_closeout.status=action_required`, `pending_shared_root_reconciliation`, `shared_root_not_on_main`, and `linear_transition=null`.

That stale residue can keep `fresh discovery suppression` active, pollute `CO STATUS active/backoff projection`, and in the worst case keep feeding `provider_refresh_lifecycle_stuck` / `restart_required` handling even though the real issue is merged and Done. The repair must make merged PR truth plus live Linear Done truth dominate stale local closeout residue when that residue is no longer current, while preserving real current `pending_shared_root_reconciliation` behavior for actually live `Merging` lanes.

## User Request Translation
- Create the docs-first packet and registry mirrors for `CO-214`.
- Preserve the exact issue checksum anchored on `CO-211`, `PR #506`, merged PR truth, live Linear Done truth, `provider-intake-state.json`, stale `Merging` action-required residue, `provider_refresh_lifecycle_stuck`, `restart_required`, `CO STATUS active/backoff projection`, and `fresh discovery suppression`.
- Keep this lane separate from `CO-212 Ready reclaim`.
- Keep this lane separate from any spec-guard-only or docs-only reinterpretation.
- Define the parent implementation as stale-residue cleanup or supersession in the provider handoff / active-projection seams, not manual file editing and not shared-root policy redesign.

## Intent Checksum
- Exact wording and protected surfaces to preserve:
  - `CO-211`
  - `PR #506`
  - `merged PR truth`
  - `live Linear Done truth`
  - `provider-intake-state.json`
  - `issue_state=Merging`
  - `state=handoff_failed`
  - `provider_issue_merge_closeout_action_required`
  - `merge_closeout.status=action_required`
  - `pending_shared_root_reconciliation`
  - `shared_root_not_on_main`
  - `linear_transition=null`
  - `provider_refresh_lifecycle_stuck`
  - `restart_required`
  - `CO STATUS active/backoff projection`
  - `fresh discovery suppression`
- Nearby wrong interpretations to reject:
  - this is just `CO-212 Ready reclaim`
  - this is only a `CO STATUS` presentation problem
  - this is only a spec-guard/docs-freshness follow-up
  - the fix is manual `provider-intake-state.json` cleanup
  - all `pending_shared_root_reconciliation` outcomes should be cleared automatically

## Parity / Alignment Matrix

| Surface | Current Truth | Target Truth |
| --- | --- | --- |
| Local intake closeout state | Merged PR truth and live Linear Done truth can coexist with stale local `issue_state=Merging`, `state=handoff_failed`, and `merge_closeout.status=action_required` residue. | Merged PR truth plus newer Linear Done truth dominate stale local `Merging` residue once that residue is no longer current. |
| Fresh discovery | Stale handoff-failed closeout residue can still behave like active suppression. | Stale merged/Done residue does not keep `fresh discovery suppression` active. |
| `CO STATUS` projection | The stale issue can still look active or backoff-adjacent even though the issue is merged and Done. | `CO STATUS active/backoff projection` treats the stale merged/Done shape as non-active while preserving historical evidence. |
| Refresh health | The stale residue can still interact with `provider_refresh_lifecycle_stuck` / `restart_required` handling. | Genuine refresh-health failures still surface those signals, but stale merged/Done residue does not manufacture them. |
| Scope | The issue can be misread as Ready reclaim or docs-only cleanup. | The lane stays bounded to stale merged-closeout residue after merged PR truth and live Linear Done truth are authoritative. |

## Acceptance Criteria
- Docs packet and registry mirrors exist for the declared `CO-214` files.
- Parent implementation can reproduce the `CO-211` / `PR #506` shape where merged PR truth and live Linear Done truth coexist with stale local `Merging` action-required residue.
- That stale residue no longer keeps `fresh discovery suppression` active.
- `CO STATUS active/backoff projection` no longer treats the stale merged/Done issue as live work.
- Truly current `pending_shared_root_reconciliation` behavior remains visible when the issue is actually still `Merging`.
- Archived or trashed terminal issues that refresh as `provider_issue_released:not_mutable` follow the same stale-claim supersession rule without weakening truly current `pending_shared_root_reconciliation` behavior.
- Missing or unknown timestamp freshness stays conservative: stale merge-closeout authority is only cleared when live terminal truth is explicitly `equal` or `newer`, and otherwise remains action-required.
- Genuine `provider_refresh_lifecycle_stuck` / `restart_required` truth remains visible for actual unhealthy refresh lifecycles.
- The repair does not drift into `CO-212 Ready reclaim`, shared-root policy redesign, or spec-guard-only cleanup.

## Non-Goals
- No live Linear mutation or workpad mutation from this child lane.
- No shared-root reconciliation redesign or forced shared-root mutation.
- No Ready reclaim redesign from `CO-212`.
- No manual `provider-intake-state.json` deletion as the steady-state fix.
- No docs-only/spec-guard-only reinterpretation of a provider handoff/runtime problem.
- No implementation or test edits in this child lane.

## Not Done If
- Merged PR truth plus live Linear Done truth can still leave the issue suppressed by stale local `Merging` action-required residue.
- `fresh discovery suppression` still depends on stale merged/Done residue.
- `CO STATUS active/backoff projection` still reports the stale merged/Done issue as live work.
- The repair hides genuine `provider_refresh_lifecycle_stuck` / `restart_required` states.
- The lane drifts into `CO-212 Ready reclaim` or generic docs/spec-guard cleanup.

## Validation Contract
- Parent runs focused provider handoff / refresh serialization regressions for the stale merged-closeout residue shape.
- Parent runs focused `CO STATUS` projection regressions for active/backoff suppression of that stale merged/Done shape.
- Parent proves that real current `pending_shared_root_reconciliation` behavior remains intact for actually live `Merging` lanes.
- Child lane runs only scoped docs checks: JSON parse, protected-term grep, and `git diff --check` over the touched docs files.
