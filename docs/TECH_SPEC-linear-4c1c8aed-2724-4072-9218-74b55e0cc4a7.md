# TECH_SPEC: CO-264 backlog promotion snapshot retention policy

## Metadata

- Task id: `linear-4c1c8aed-2724-4072-9218-74b55e0cc4a7`
- Linear issue: `CO-264`
- Phase: docs
- Last review: `2026-04-20`
- Source anchor: `ctx:sha256:3a42ae593f1afd8a89a2ee9ef88ad1acfe18d4db4930d453565ab22e66e7433b#chunk:c000001`
- Declared shared source payload: `.runs/linear-4c1c8aed-2724-4072-9218-74b55e0cc4a7-docs-packet/cli/2026-04-19T18-52-58-375Z-f391d2b8/memory/source-0/source.txt`
- Parent source payload (worker-workspace relative): `../../.runs/linear-4c1c8aed-2724-4072-9218-74b55e0cc4a7/cli/2026-04-19T18-49-38-645Z-8e0e4d9a/memory/source-0/source.txt`
- Child-lane caveat: the copied shared payload path is absent in this checkout; the parent source payload contains run metadata only, so the technical contract below preserves the parent-provided issue terms.

## Scope

This child lane owns only the docs packet and registry mirrors. Parent implementation should later update the provider autopilot retention path and focused regressions.

Parent-owned likely implementation surfaces:

- `orchestrator/src/cli/control/providerOperatorAutopilot.ts`
- `orchestrator/src/cli/control/providerWorkflowConfigStore.ts`
- `orchestrator/src/cli/control/observabilityReadModel.ts`
- Focused provider autopilot/config/read-model tests selected by the parent.

This docs packet intentionally does not edit those surfaces.

## Selected Policy

`backlog_promotion_snapshots` are retained through temporary untracked cycles by default.

Pruning is allowed only when `resolveNextBacklogPromotionSnapshots` has explicit stale/permanent evidence. Evidence should be evaluated in this order:

1. Terminal evidence: a snapshot or read-model record proves the issue reached one of the configured `terminal workflow states`.
2. Permanent scope evidence: the issue is archived, trashed, out of the configured team/project/workspace scope, or otherwise permanently ineligible according to authoritative tracked-issue data.
3. Bounded stale counter: the issue has been absent across an explicit threshold of tracked-issue refresh cycles. The counter must require more than one missing page and must reset when the issue reappears.
4. Force path: an explicit force-prune or force-retain decision may override normal policy, but it must be recorded in audit/read-model output with actor/reason/status.

Blanket time-only deletion is not allowed. Age can contribute to a decision, but age alone is not stale/permanent evidence.

## Data Contract

`backlog_promotion_snapshots` remain the retained snapshot set. Each retained entry carries the promotion identity and bounded-missing-page counter:

- `issue_id`
- `issue_identifier`
- `target_state`
- `attempted_at`
- `issue_updated_at`
- `force_path_used`
- `untracked_cycles`

`resolveNextBacklogPromotionSnapshots` returns both the next retained snapshot set and a separate `backlog_promotion_snapshot_retention_records` decision list suitable for audit/read-model projection. Each decision record is machine-readable and includes:

- Snapshot identity: `issue_id`, `issue_identifier`, `target_state`, `attempted_at`, and `issue_updated_at`.
- Decision timing: `evaluated_at` and `age_ms`.
- Decision result: `decision` (`retained` or `pruned`) and `reason`.
- Cycle evidence: `untracked_cycles` and `max_untracked_cycles`.
- Tracked issue evidence: `issue_state`, `issue_state_type`, `issue_archived_at`, `issue_trashed`, and `issue_observed_updated_at`.
- Terminal and force-path evidence: `terminal_state_evidence` and `force_path_used`.

Live retention reasons emitted by `providerOperatorAutopilot.ts`:

- `temporarily_untracked`
- `stale_untracked_cycle_limit`
- `terminal_state`
- `tracked_archived_or_trashed`
- `tracked_non_backlog_non_target_state`
- `tracked_state_reset_untracked_cycles`

## Required Behavior

`resolveNextBacklogPromotionSnapshots` must:

1. Preserve existing snapshots when an issue is missing from one finite tracked-issue page.
2. Increment a bounded stale counter only when a complete refresh cycle cannot observe the issue.
3. Reset missing-cycle evidence when the issue reappears in tracked-issue data.
4. Prefer terminal workflow state evidence over missing-page inference.
5. Treat `manual Ready -> Backlog demotion` suppression from `CO-216` as still protected.
6. Keep retention/prune decisions auditable in provider autopilot audit output and visible through the read model.
7. Avoid deleting by age alone.

`resolveNextBacklogPromotionSnapshots` must not:

- Treat one missing tracked page as terminal evidence.
- Prune snapshots solely because `last_seen_at` is older than a threshold.
- Collapse force-retain and force-prune into generic stale behavior.
- Hide decision inputs from `observabilityReadModel.ts`.
- Change `CO-216` suppression without explicit regressions.

## Audit And Read Model Requirements

The parent implementation should expose the selected retention policy through:

- `providerOperatorAutopilot.ts`: computes decisions and writes audit records for `backlog_promotion_snapshots`.
- `providerWorkflowConfigStore.ts`: preserves config/payload shape for retention settings and last decision summaries.
- `observabilityReadModel.ts`: projects retention decisions with age, cycle count, terminal evidence, tracked-page visibility, and force-path status.

Minimum read-model fields:

```text
operator_autopilot.backlog_promotion.snapshots[].untracked_cycles
operator_autopilot.backlog_promotion.snapshot_retention.max_untracked_cycles
operator_autopilot.backlog_promotion.snapshot_retention.terminal_state_types[]
operator_autopilot.backlog_promotion.snapshot_retention_records[].decision
operator_autopilot.backlog_promotion.snapshot_retention_records[].reason
operator_autopilot.backlog_promotion.snapshot_retention_records[].age_ms
operator_autopilot.backlog_promotion.snapshot_retention_records[].untracked_cycles
operator_autopilot.backlog_promotion.snapshot_retention_records[].max_untracked_cycles
operator_autopilot.backlog_promotion.snapshot_retention_records[].terminal_state_evidence
operator_autopilot.backlog_promotion.snapshot_retention_records[].force_path_used
```

Exact field names may differ if parent implementation uses an existing payload convention, but the information must be machine-readable.

## Focused Regression Plan For Parent Lane

Parent should add focused regressions covering:

- Retain through one missing tracked page: an existing `backlog_promotion_snapshots` entry remains when finite tracked-issue paging omits the issue once.
- Reset stale counter on reappearance: a temporarily untracked issue returns before threshold and remains retained.
- Prune on terminal evidence: terminal workflow state evidence recorded on the snapshot/read model prunes the snapshot.
- Prune on bounded stale threshold: repeated absence beyond threshold prunes only after the threshold, not on the first missing page.
- Reject blanket time-only deletion: old snapshots with no terminal/permanent evidence remain pending-more-evidence.
- Preserve `CO-216` manual-demotion suppression until explicit retention policy regressions pass.
- Surface audit/read-model decision inputs, including age/cycle/terminal evidence and force-path status.

## Risks

- Treating finite tracked-issue paging absence as terminal could drop live queue context.
- Age-only pruning could remove evidence needed to explain backlog promotion or manual demotion behavior.
- Omitting force-path status would make manual/operator overrides impossible to audit.
- Weakening `CO-216` suppression before regressions could reintroduce manual Ready-to-Backlog demotion churn.

## Child-Lane Validation

This child lane should run only docs-scoped checks:

```bash
rg -n "backlog_promotion_snapshots|resolveNextBacklogPromotionSnapshots|providerOperatorAutopilot\\.ts|providerWorkflowConfigStore\\.ts|observabilityReadModel\\.ts|manual Ready -> Backlog demotion|finite tracked-issue paging|terminal workflow states|CO-216" docs/PRD-linear-4c1c8aed-2724-4072-9218-74b55e0cc4a7.md docs/TECH_SPEC-linear-4c1c8aed-2724-4072-9218-74b55e0cc4a7.md docs/ACTION_PLAN-linear-4c1c8aed-2724-4072-9218-74b55e0cc4a7.md tasks/specs/linear-4c1c8aed-2724-4072-9218-74b55e0cc4a7.md tasks/tasks-linear-4c1c8aed-2724-4072-9218-74b55e0cc4a7.md .agent/task/linear-4c1c8aed-2724-4072-9218-74b55e0cc4a7.md
node scripts/spec-guard.mjs --dry-run
npm run docs:check
npm run docs:freshness
node scripts/diff-budget.mjs
git diff --check -- docs/PRD-linear-4c1c8aed-2724-4072-9218-74b55e0cc4a7.md docs/TECH_SPEC-linear-4c1c8aed-2724-4072-9218-74b55e0cc4a7.md docs/ACTION_PLAN-linear-4c1c8aed-2724-4072-9218-74b55e0cc4a7.md tasks/specs/linear-4c1c8aed-2724-4072-9218-74b55e0cc4a7.md tasks/tasks-linear-4c1c8aed-2724-4072-9218-74b55e0cc4a7.md .agent/task/linear-4c1c8aed-2724-4072-9218-74b55e0cc4a7.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json
```
