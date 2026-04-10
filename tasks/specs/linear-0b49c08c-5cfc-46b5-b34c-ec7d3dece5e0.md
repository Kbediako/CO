---
id: 20260410-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0
title: CO: Repo-wide cleanup of stale compatibility debt, contradictory docs, and placeholder surfaces
status: in_progress
owner: Codex
created: 2026-04-10
last_review: 2026-04-10
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md
related_action_plan: docs/ACTION_PLAN-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md
related_tasks:
  - tasks/tasks-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md
review_notes:
  - 2026-04-10: Rework reset started from issue state `Rework` after rechecking live team workflow state with the packaged `linear issue-context` helper.
  - 2026-04-10: The stale prior handoff was explicitly reset: replay PR `#405` was closed, the old Linear workpad was deleted, and branch `linear/co-88-repo-cleanup-truthfulness-r3` was recreated from fresh `origin/main` at `7644a02d4`.
  - 2026-04-10: Current-turn parallelization was recorded as `forbid_parallel` / `parent_only_mutation` because the reset required parent-owned PR/workpad/branch mutation before any child lane would be safe.
  - 2026-04-10: Fresh-main audit confirms the highest-confidence CO-88 seams still exist: the dead selected-run presenter seam, uppercase templates, stale RLM defaults, the MCP code-mode report archive, placeholder design-system wording, misleading SDK artifact lifetime, and static status UI historical-data assumptions.
  - 2026-04-10: The fresh `r3` packet was rerun through audited `docs-review`; `spec-guard` and `docs:check` passed, and `docs:freshness` failed only on the standing repo-wide baseline (`missing registry entries: 21`, `stale docs: 119`; Task Packet `85`, Task Mirror `17`, Report Only `17`), so implementation is approved with a truthful fallback note rather than a packet-local blocker.
---

# Technical Specification

## Context
The first CO-88 attempt mixed valid truthfulness cleanup with unrelated implementation churn and was moved to `Rework`. This fresh attempt starts from clean `origin/main` and re-lands only the surfaces that are still clearly inside the issue: stale selected-run/template/archive artifacts, contradictory design-system/instruction wording, outdated RLM defaults, the status UI static bundle data-source contract, and the SDK exec artifact lifetime contract.

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
- `MCP_RUNNER_TASK_ID=linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0 "/opt/homebrew/Cellar/node/25.2.1/bin/node" "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-88-docs-review-r3 --format json`
- Manual fallback note if the fresh rerun reaches only the existing repo-wide stale-doc baseline after packet-local fixes.
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
