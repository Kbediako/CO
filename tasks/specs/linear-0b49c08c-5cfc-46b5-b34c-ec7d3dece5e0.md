---
id: 20260410-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0
title: CO: Repo-wide cleanup of stale compatibility debt, contradictory docs, and placeholder surfaces
status: done
owner: Codex
created: 2026-04-10
last_review: 2026-05-13
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md
related_action_plan: docs/ACTION_PLAN-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md
related_tasks:
  - tasks/tasks-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md
review_notes:
  - 2026-04-11: Current worker run rechecked live team workflow state with the packaged `linear issue-context` helper while the issue remained in `Rework`. Evidence root: `../../.runs/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0/cli/2026-04-10T15-23-29-613Z-26aa3f5c/`.
  - 2026-04-11: The stale prior handoff was reset again: replay PR `#425` was closed, the old Linear workpad was deleted, and branch `linear/co-88-repo-cleanup-truthfulness-r4` was recreated from fresh `origin/main` at `16223531e`.
  - 2026-04-11: Current-turn parallelization was recorded as `forbid_parallel` / `parent_only_mutation` because the reset required parent-owned PR/workpad/branch mutation before any child lane would be safe. Evidence: `../../.runs/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0/cli/2026-04-10T15-23-29-613Z-26aa3f5c/provider-linear-worker-linear-audit.jsonl`.
  - 2026-04-11: Fresh-main audit still confirms the highest-confidence CO-88 seams exist and can be replayed narrowly on `r4`: the dead selected-run presenter seam, uppercase templates, stale RLM defaults, the MCP code-mode report archive, placeholder design-system wording, misleading SDK artifact lifetime, and static status UI historical-data assumptions.
  - 2026-04-11: The first fresh `docs-review` rerun failed only because `docs/docs-freshness-registry.json` still referenced the deleted uppercase template files; removing those three stale registry entries made `docs:freshness` truthful again.
  - 2026-04-11: Fresh `docs-review` evidence was rerun for the `r4` packet and succeeded at `.runs/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0-co-88-docs-review-r4/cli/2026-04-10T15-37-42-440Z-832ca68d/manifest.json`; the forced review telemetry recorded `status: succeeded` and `review_outcome: bounded-success` via `relevant-reinspection-dwell`, which counts as successful bounded review completion rather than wrapper failure.
  - 2026-04-11: The required validation floor is green on `r4`, including focused SDK/RLM checks, full `build`/`lint`/`test`, `docs:check`, `docs:freshness`, diff-budget override acceptance, and `pack:smoke`. Evidence: `out/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0/manual/validation-summary.md`.
  - 2026-04-11: The standalone review wrapper reached review launch but ended as `failed-boundary` because the bounded reviewer launched a validation suite (`termination_boundary.kind=command-intent`, `provenance=validation-suite`), so `r4` records a manual fallback review with no actionable findings instead of overstating wrapper success. Evidence: `../../.runs/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0/cli/2026-04-10T15-23-29-613Z-26aa3f5c/review/telemetry.json`, `out/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0/manual/standalone-review.md`.
  - 2026-04-11: The explicit elegance/minimality pass for `r4` is recorded and did not identify any further simplification that would preserve the required mirrored truth surfaces. Evidence: `out/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0/manual/elegance-review.md`.
  - 2026-05-13: CO-523 live Linear audit verified CO-88 is Done/completed; reclassified this task spec as inactive done metadata for strict spec-guard evidence. Evidence: out/linear-8573da42-d9f9-44ce-a24e-224984539044/manual/20260512T1850Z-baseline/live-linear-states.json.
---

# Technical Specification

## Context
The first CO-88 attempt mixed valid truthfulness cleanup with unrelated implementation churn and was moved to `Rework`. The later `r3` replay reached review handoff but was also returned to `Rework`, so the current `r4` attempt starts from fresh `origin/main` again and re-lands only the surfaces that are still clearly inside the issue: stale selected-run/template/archive artifacts, contradictory design-system/instruction wording, outdated RLM defaults, the status UI static bundle data-source contract, and the SDK exec artifact lifetime contract.

## Requirements
1. Remove the highest-confidence dead surfaces still present on fresh `main`.
2. Update touched docs/specs/tasks/instructions in the same lane.
3. Correct the SDK artifact contract without silently breaking compatibility consumers.
4. Keep compatibility candidates outside the narrowed code diff unless their live consumer or deletion decision is essential to truthful closeout.
5. Keep the lane out of `CO-82` and `CO-83`.
6. Run docs-review before implementation and the normal validation/review gates before handoff.

## Design
- Delete:
  - the deleted selected-run presenter seam files under orchestrator/src/cli/control and orchestrator/tests
  - the deleted uppercase task template duplicates under .agent/task
  - the deleted stale archive report at archives/REPORT.mcp_code_mode.md
- Rewrite truth surfaces:
  - update `docs/AGENTS.md` and `.agent/AGENTS.md` to remove stale task-specific historical blocks from repo-wide instructions
  - update `docs/README.md`, design PRDs/specs, and paired task mirrors to mark design-system/package claims as historical where the code is still placeholder
  - update `packages/orchestrator-status-ui/app.js` so the static bundle no longer points at a fixed historical data file
  - update RLM defaults to match active `gpt-5.4` posture
- Retain with rationale:
  - `packages/shared/streams/stdio.ts` stays only as a deprecated published shim for importer compatibility
  - broader review-launch and compatibility alias surfaces stay audit-only unless the narrowed pass proves they can be removed without reopening unrelated behavior
- SDK contract:
  - keep `eventsPath` / `stderrPath` available while the associated handle/result remains reachable
  - add deterministic cleanup semantics so callers are not handed disappearing compatibility files

## Implementation Surface
- Code:
  - the removed selected-run presenter seam files
  - `orchestrator/src/cli/rlm/alignment.ts`
  - `orchestrator/src/cli/rlmRunner.ts`
  - `packages/orchestrator-status-ui/app.js`
  - `packages/sdk-node/src/orchestrator.ts`
  - `packages/sdk-node/tests/orchestrator.exec.test.ts`
  - `packages/shared/streams/stdio.ts`
- Docs/tasks/instructions:
  - `docs/AGENTS.md`
  - `.agent/AGENTS.md`
  - `.agent/task/design-reference-pipeline.md`
  - `.agent/task/hi-fi-design-toolkit.md`
  - `docs/README.md`
  - `docs/design/PRD-design-reference-pipeline.md`
  - `docs/design/PRD-hi-fi-design-toolkit.md`
  - `docs/design/specs/DESIGN_REFERENCE_PIPELINE.md`
  - `docs/design/specs/HI_FI_DESIGN_TOOLKIT.md`
  - `docs/guides/ci-integration.md`
  - `tasks/design-reference-pipeline.md`
  - `tasks/hi-fi-design-toolkit.md`
  - `docs/PRD-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`
  - `docs/TECH_SPEC-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`
  - `docs/ACTION_PLAN-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`
  - `tasks/tasks-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`
  - `.agent/task/linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md`
  - `tasks/index.json`
  - `docs/TASKS.md`
  - `docs/docs-freshness-registry.json`

## Protected Expectations
- This is still a repo-wide truthfulness lane.
- The rework attempt must be smaller and more defensible than the closed branch.
- If a compatibility seam stays, the reason must be explicit.
- Code and the describing docs move together.

## Validation Plan
- `MCP_RUNNER_TASK_ID=linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0 "/opt/homebrew/Cellar/node/25.2.1/bin/node" "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-88-docs-review-r4 --format json`
- Manual fallback note if the fresh `r4` rerun reaches only the existing repo-wide stale-doc baseline after packet-local fixes.
- focused SDK/status-ui tests
- `MCP_RUNNER_TASK_ID=linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0 node scripts/delegation-guard.mjs`
- `MCP_RUNNER_TASK_ID=linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0 node scripts/spec-guard.mjs --dry-run`
- `MCP_RUNNER_TASK_ID=linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0 npm run build`
- `MCP_RUNNER_TASK_ID=linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0 npm run lint`
- `MCP_RUNNER_TASK_ID=linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0 npm run test`
- `MCP_RUNNER_TASK_ID=linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0 npm run docs:check`
- `MCP_RUNNER_TASK_ID=linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0 npm run docs:freshness`
- `MCP_RUNNER_TASK_ID=linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0 node scripts/diff-budget.mjs`
- `MCP_RUNNER_TASK_ID=linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0 FORCE_CODEX_REVIEW=1 npm run review`
- `MCP_RUNNER_TASK_ID=linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0 npm run pack:smoke` when downstream-facing surfaces are touched
