# Task Checklist - 0102-slimdown-cycle-2 (0102)

> Set `MCP_RUNNER_TASK_ID=0102-slimdown-cycle-2` for orchestrator commands. Mirror status with `tasks/tasks-0102-slimdown-cycle-2.md` and `docs/TASKS.md`. Flip `[ ]` to `[x]` only with appropriate evidence (file existence for drafting; manifests for runs/guardrails/deletions).

## Foundation
- [ ] PRD drafted - Evidence: `docs/PRD-slimdown-cycle-2.md`.
- [ ] Tech spec drafted - Evidence: `docs/TECH_SPEC-slimdown-cycle-2.md`.
- [ ] Action plan drafted - Evidence: `docs/ACTION_PLAN-slimdown-cycle-2.md`.
- [ ] Freshness registry updated - Evidence: `docs/docs-freshness-registry.json`.

## Planning
- [ ] Baseline manifests captured (diagnostics + docs-review).
- [ ] Inventory subagent run captured.
- [ ] Phase 1 candidate deletions recorded with evidence (repo-wide `rg "<candidate>" -g'!.runs/**' -g'!dist/**' -g'!build/**'` excluding definition file(s), plus `.runs/**` scan + date/initials).

## Phase 0 Evidence
- [ ] Diagnostics manifest captured (baseline) - Evidence: `.runs/0102-slimdown-cycle-2/cli/<run-id>/manifest.json` (record pipeline name + run id).
- [ ] docs-review manifest captured (baseline) - Evidence: `.runs/0102-slimdown-cycle-2/cli/<run-id>/manifest.json` (record pipeline name + run id).
- [ ] implementation-gate manifest captured (optional baseline) - Evidence: `.runs/0102-slimdown-cycle-2/cli/<run-id>/manifest.json` (record pipeline name + run id).
- [ ] Baseline pack file list captured (`npm pack --dry-run`) - Evidence: task doc entry or note.

## Phase 1 Runbook (dead surface pruning)
1) Confirm two proofs of disuse (no references + no .runs usage).
2) Update docs/workflows/package scripts in the same PR.
3) Run full guardrails and capture manifests.
4) If an alias is introduced, run old + new pipeline IDs once each and record alias window start/end.

## Phase 2 Runbook (indirection cleanup)
1) Remove one low-fan-in barrel/shim directory (fan-in ≤ 5; measure with repo-wide `rg` on import path).
2) Confirm the barrel/shim is not part of published entrypoints/exports; record proof.
3) Update imports mechanically only.
4) Run full guardrails and capture manifests.

## Phase 3 Runbook (CLI scaffolding consolidation)
1) Add characterization tests for CLI output (assert exit code, stdout/stderr routing, normalize run IDs/timestamps).
2) Extract one helper at a time; preserve output strings.
3) Run full guardrails and capture manifests.

## Phase 4 Runbook (packaging + workflow contraction)
1) Tighten pack allowlists; run pack smoke + record before/after `npm pack --dry-run` diff with justified removals.
2) Consolidate workflow setup via reusable workflows; verify trigger/permissions parity, stable wrappers, and check contexts (workflow name + job display names).
3) Run full guardrails and capture manifests.

## Phase 4 Evidence
- [ ] Pack file list diff recorded + removals justified - Evidence: before/after `npm pack --dry-run` list note.
- [ ] Workflow check contexts preserved (workflow `name:` + job display names unchanged; wrapper filenames unchanged) - Evidence: before/after list or YAML diff note.

## Delegation
- [ ] Subagent inventory run captured - Evidence: `.runs/0102-slimdown-cycle-2-inventory/cli/<run-id>/manifest.json`.

## Validation + Handoff
- [ ] docs-review manifest captured - Evidence: `.runs/0102-slimdown-cycle-2/cli/<run-id>/manifest.json`.
- [ ] Mirrors updated in `docs/TASKS.md`, `tasks/tasks-0102-slimdown-cycle-2.md`, `.agent/task/0102-slimdown-cycle-2.md`.
