# PRD - CO STATUS: prune stale in_progress provider rows when released terminal claim has no live worker

## Added by Bootstrap 2026-04-15

## Traceability
- Linear issue: `CO-192` / `34b60caa-258b-4f18-8d67-cdad3f6352cf`
- Linear URL: https://linear.app/asabeko/issue/CO-192
- Task id: `linear-34b60caa-258b-4f18-8d67-cdad3f6352cf`
- Canonical spec: `tasks/specs/linear-34b60caa-258b-4f18-8d67-cdad3f6352cf.md`
- Source anchor: `ctx:sha256:4988a9186e7944a1d681ff5093420160eb74c672f2c5a221f19b80c33cae1199#chunk:c000001`
- Source payload: `.runs/linear-34b60caa-258b-4f18-8d67-cdad3f6352cf-docs-packet/cli/2026-04-15T15-17-13-513Z-1f05f920/memory/source-0/source.txt`
- Origin manifest: `.runs/linear-34b60caa-258b-4f18-8d67-cdad3f6352cf-docs-packet/cli/2026-04-15T15-17-13-513Z-1f05f920/manifest.json`

## Summary
`CO-192` closes the stale active-row class left after terminal release pruning. A provider-worker run can leave historical `in_progress` manifests or proofs behind after the authoritative provider-intake claim has been released as not-active, the live issue state is terminal completed, the worker PID is dead, and the associated PR is merged. `co-status --format json` must classify that shape as non-active instead of letting stale manifest/proof evidence dominate terminal provider-intake truth.

## User Request Translation
- Make `CO STATUS` active projection trust terminal released provider-intake truth over stale `in_progress` manifests/proofs when there is no live worker.
- Treat `provider-intake-state.json` released/not-active plus `issue_state_type: completed`, dead worker PID, and merged PR as non-active for `co-status --format json`.
- Preserve `CO-182` terminal-release pruning and `CO-189` released-pending-reopen visibility when a same-issue worker is genuinely live.
- Preserve historical/audit access to stale manifests and proofs without letting them drive active status surfaces.

## Intent Checksum
- Protected terms and surfaces:
  - `CO STATUS`
  - `co-status --format json`
  - `provider-intake-state.json`
  - `provider_issue_released:not_active`
  - `provider_issue_released_pending_reopen`
  - `issue_state_type: completed`
  - `in_progress`
  - dead worker PID
  - merged PR
  - `counts.issues`
  - `counts.running`
  - `issues[]`
  - `provider_debug_snapshot.claim`
- Nearby wrong interpretations to reject:
  - delete stale manifests or proofs instead of changing active projection precedence
  - count all stale `in_progress` manifests as live worker truth
  - hide a genuinely live same-issue worker covered by `CO-189`
  - weaken `CO-182` terminal-release pruning
  - mutate Linear state, workpads, PR lifecycle, provider admission, or scheduler policy from this lane

## Parity / Alignment Matrix

| Surface | Current | Target |
| --- | --- | --- |
| Provider-intake terminal truth | Released/not-active completed rows can be retained for audit. | Released/not-active plus terminal issue truth remains authoritative for non-active projection when no live worker exists. |
| Stale run manifests/proofs | Historical `in_progress` data can still look active to status projection. | Historical `in_progress` data is audit-only when worker PID is dead and the PR is merged. |
| CO STATUS JSON | Active counts/rows can be dominated by stale manifests. | `counts.issues`, `counts.running`, `issues[]`, and `provider_debug_snapshot.claim` exclude the stale terminal no-live-worker row. |
| CO-182 behavior | Terminal released completed rows are pruned. | Preserved and extended to conflict cases where stale active-looking proofs remain. |
| CO-189 behavior | Released pending-reopen rows can rehydrate when same-issue worker evidence is live. | Preserved; genuinely live same-issue workers remain visible and counted while intake catches up. |
| Audit/debug history | Stale manifests/proofs are useful for postmortem. | Historical access remains; only active status surfaces stop treating them as current work. |

## Acceptance Criteria
- `co-status --format json` classifies a provider-intake `released` / `provider_issue_released:not_active` row with `issue_state_type: completed`, dead worker PID, and merged PR as non-active.
- Stale `in_progress` manifest or proof evidence does not restore that row into `counts.issues`, `counts.running`, active `issues[]`, or active-looking `provider_debug_snapshot.claim`.
- `CO-182` terminal released-row pruning remains intact for completed/canceled terminal rows.
- `CO-189` released-pending-reopen behavior remains intact when the same issue has a genuinely live provider-worker process/run.
- Historical manifests, proofs, and provider-intake rows remain inspectable for audit/debug.
- The correction is implemented in active projection/reconciliation semantics, not by deleting local state.

## Non-Goals
- No implementation or test edits from this docs-only child lane.
- No Linear mutation, workpad mutation, PR mutation, or provider admission change from this child lane.
- No deletion, rewriting, or garbage collection of stale `.runs` artifacts as the fix.
- No broad `CO STATUS` renderer redesign.
- No renewed issue-by-id request burn for already terminal no-live-worker rows.

## Not Done If
- A released/not-active completed provider-intake row with dead worker PID and merged PR still appears as active work.
- Stale `in_progress` manifests or proofs outrank terminal provider-intake truth after the worker is dead.
- `provider_debug_snapshot.claim` presents the stale terminal row as active.
- A genuinely live same-issue worker covered by `CO-189` is hidden.
- `CO-182` terminal-release pruning regresses.
- The solution depends on destructive local artifact cleanup or Linear mutation.

## Metrics & Guardrails
- Primary success metrics:
  - `co-status --format json` active counts exclude stale terminal no-live-worker rows.
  - live same-issue workers remain counted and visible.
  - audit artifacts remain available after pruning from active projection.
- Guardrails:
  - active-row classification must require live worker evidence before stale `in_progress` data can override a released terminal claim.
  - terminal provider-intake truth must be explicit, not inferred from missing Linear data alone.
  - no private Linear payloads, auth tokens, or raw secrets leak through debug output.

## User Experience
- Operators reading `CO STATUS` no longer see completed, merged, dead-worker issues as active because stale manifests remain on disk.
- Reviewers can still inspect stale manifests/proofs for provenance while relying on JSON active counts for current work.
- Parent issue workers can distinguish terminal no-live-worker residue from the inverse `CO-189` case where a released-pending-reopen claim still has a live same-issue worker.

## Technical Considerations
- The likely owner is the status/read-model projection that merges provider-intake claims, run manifests/proofs, process liveness, and PR/issue terminal evidence.
- A shared active classification should drive `counts.issues`, `counts.running`, active `issues[]`, and `provider_debug_snapshot.claim` so the surfaces cannot drift.
- Stale manifests/proofs should be retained as historical candidates but demoted when contradicted by terminal released intake plus dead worker and merged PR evidence.
- Unknown or unavailable liveness/PR/Linear state should be handled conservatively without treating missing evidence alone as terminal.

## Open Questions
- Which existing projection helper should own the stale-manifest-vs-terminal-intake precedence rule?
- What minimum process-liveness proof should define a dead worker PID for fixtures and live checks?
- Should a pruned stale claim still appear in a debug-only historical subsection, or should this slice keep JSON debug snapshots aligned to active projection only?

## Approvals
- Product: Linear issue `CO-192`
- Engineering: pending parent docs-review and implementation validation
- Design: N/A
