---
id: 20260409-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0
title: CO: Repo-wide cleanup of stale compatibility debt, contradictory docs, and placeholder surfaces
status: in_progress
owner: Codex
created: 2026-04-09
last_review: 2026-04-09
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md
related_action_plan: docs/ACTION_PLAN-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md
related_tasks:
  - tasks/tasks-linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0.md
review_notes:
  - 2026-04-09: Opened from Linear issue `CO-88` in the provider-worker workspace after rechecking live CO team states with the packaged `linear issue-context` helper, moving the issue from `Ready` to `In Progress`, recording the required same-turn `stay_serial` / `overlapping_scope` parallelization decision, and switching the detached workspace at `d47f219ef` onto branch `linear/co-88-repo-cleanup-truthfulness`.
  - 2026-04-09: Initial source-backed audit confirms the issue is a real integrated truthfulness lane, not just docs wording. Historical selected-run, review-launch, design-system, SDK, instruction/template, and archive surfaces still disagree with current repo posture.
  - 2026-04-09: Current tree audit shows uppercase legacy task templates still coexist with `.agent/task/templates/*`, `packages/design-system` still carries placeholder-style scripts, the old MCP code-mode report still states older migration-router claims, and active docs/task packets still point at selected-run-era control-host seams.
  - 2026-04-09: `docs/TASKS.md` is already at the 450-line budget before the CO-88 snapshot is added, so the repo-supported archive fallback must run immediately after packet registration to restore `docs:check` headroom.
---

# Technical Specification

## Context
CO's active code and its truth surfaces have drifted apart. Some of the drift is code-level dead or compatibility-only seams, but much of it is task packets, instructions, package surfaces, and archive residue that still describe the older story. This lane needs to remove or collapse the obvious stale surfaces and then tighten the touched docs/specs/tasks/instructions so the repo stops describing placeholder, historical, or compatibility-only behavior as current reality.

## Requirements
1. Remove or collapse the highest-confidence stale or orphaned surfaces called out in `CO-88` where there is no live consumer justification.
2. When a compatibility seam remains, document the current consumer and reason to keep it instead of leaving it ambiguous.
3. Update or archive the touched docs/specs/tasks/instructions in the same lane so they no longer contradict the current codepaths.
4. Correct misleading surfaced contracts such as SDK artifact return values and placeholder design-system claims.
5. Keep the cleanup lane explicitly out of `CO-82` provider-worker observability and `CO-83` CO STATUS telemetry work.
6. Preserve current runtime behavior unless a stale/dead compatibility surface can be removed safely.
7. Focused tests and validation must cover the touched codepaths and docs/task registry integrity.
8. Pre-review handoff must include standalone review and an explicit elegance/minimality pass because this diff is inherently non-trivial and cross-cutting.

## Design
- Cleanup clusters:
  - control-host truth surfaces:
    - reconcile historical claims about the removed legacy selected-run presenter module against the current `uiDataController.ts`, `operatorDashboardPresenter.ts`, `selectedRunProjection.ts`, and compatibility/read-model seams
    - remove or rewrite stale docs/task references that still present the selected-run presenter as current `/ui/data.json` authority
  - task/instruction/template truth:
    - remove duplicate uppercase `.agent/task/*_TEMPLATE.md` files if nothing still consumes them
    - update `docs/AGENTS.md` and `.agent/AGENTS.md` so historical wording is explicitly historical or removed
  - review-wrapper compatibility:
    - re-audit `scripts/lib/review-launch-attempt.ts` and `scripts/run-review.ts`
    - keep only the compatibility behavior that still has a live scoped/non-interactive reviewer need and document the rationale if retained
  - runtime/model compatibility:
    - remove stale `gpt-5.3-*` defaults or posture claims where the repo now targets `gpt-5.4`
    - keep legitimate historical findings/docs historical instead of present-tense
  - SDK and package truth:
    - correct the `packages/sdk-node` return contract for deleted artifacts
    - make `packages/design-system` and related design-reference task/docs truthful about what is actually shipped today
    - remove fixed historical demo residue from `packages/orchestrator-status-ui/app.js`
  - compatibility candidates:
    - audit `orchestrator/src/sync/**`, the deprecated shared stdio shim, `pipelineResolver.ts`, `rlmCodexRuntimeShell.ts`, review classifiers, `requiresCloud` vs `requires_cloud`, and nearby orphan types
    - delete where dead; otherwise preserve with explicit rationale in the touched docs/spec/task packet

## Implementation Surface
- Expected codepaths:
  - `orchestrator/src/cli/control/operatorDashboardPresenter.ts`
  - `orchestrator/src/cli/control/uiDataController.ts`
  - `orchestrator/src/persistence/**`
  - `orchestrator/src/cli/services/pipelineResolver.ts`
  - `orchestrator/src/cli/rlm/rlmCodexRuntimeShell.ts`
  - `orchestrator/src/cli/rlm/alignment.ts`
  - `orchestrator/src/cli/rlmRunner.ts`
  - `orchestrator/src/types.ts`
  - `scripts/lib/review-launch-attempt.ts`
  - `scripts/run-review.ts`
  - `packages/sdk-node/src/orchestrator.ts`
  - `packages/design-system/**`
  - `packages/orchestrator-status-ui/app.js`
  - the deprecated shared stdio shim (retained for published import compatibility)
- Expected docs/task/instruction surfaces:
  - `docs/AGENTS.md`
  - `.agent/AGENTS.md`
  - uppercase legacy task templates under `.agent/task/`
  - `tasks/design-reference-pipeline.md`
  - `.agent/task/design-reference-pipeline.md`
  - `tasks/hi-fi-design-toolkit.md`
  - `.agent/task/hi-fi-design-toolkit.md`
  - `docs/design/specs/**`
  - stale MCP code-mode report archive
  - `docs/README.md`

## Protected Expectations
- This remains a repo-wide cleanup and truthfulness lane, not a narrow bugfix.
- Prefer deletion or collapse over preserving compatibility by default.
- If a compatibility seam stays, the live consumer and reason to keep it must be named explicitly.
- Touched docs/specs/tasks/instructions must be updated in the same lane as the code changes.
- Keep `CO-82` and `CO-83` explicitly out of scope.

## Reject These Wrong Interpretations
- Only fixing wording in README or active docs.
- Deleting one obvious file and leaving the rest of the contradictions.
- Treating placeholder packages or stale instruction surfaces as acceptable because they are not runtime-critical.
- Folding CO STATUS telemetry or provider-worker observability work into this lane.
- Leaving compatibility aliases ambiguous after the cleanup.

## Current Truth
- Historical selected-run docs/task packets still describe a removed legacy selected-run presenter module as current even though the newer control-host truth surfaces now center on `uiDataController.ts`, `operatorDashboardPresenter.ts`, `selectedRunProjection.ts`, and compatibility/read-model seams.
- The repo still tracks uppercase `.agent/task/*_TEMPLATE.md` files alongside `.agent/task/templates/*`.
- `packages/design-system` still contains placeholder-oriented scripts while older design-reference tasks/docs describe a more delivered toolkit/regression capability.
- `packages/sdk-node/src/orchestrator.ts` needs a compatibility-safe contract for `eventsPath` and `stderrPath` so those fields stay truthful without becoming a silent breaking change.
- The old MCP code-mode report plus `docs/AGENTS.md` and `.agent/AGENTS.md` still carry stale present-tense historical claims.
- Several compatibility aliases and deprecated seams still exist without fresh keep-or-delete rationale.

## Proposed Design
- Audit each named cleanup cluster and classify it as:
  - delete/collapse now
  - retain with explicit rationale and live-consumer evidence
  - carve out as a follow-up when the work would genuinely exceed the lane
- Apply the smallest truthful code change per cluster:
  - remove dead files or return values entirely where safe
  - rewrite docs/task/instruction claims to current canonical references
  - reduce duplicate or placeholder surfaces to canonical references or archived/historical notes
- Keep historical records honest:
  - old findings and archive docs may remain, but stale present-tense wording must become explicit historical wording
- Keep registry/docs integrity:
  - update the task packet, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`
  - use the repo-supported `docs:archive-tasks` fallback immediately if the new snapshot pushes `docs/TASKS.md` over budget

## Non-Goals
- `CO-82` provider-worker observability or stall-debug work.
- `CO-83` CO STATUS telemetry/rate-limit/session work.
- New runtime modes, new product features, or a dashboard redesign.
- Broad release workflow changes unless directly required by the stale surfaces under cleanup.

## Parity / Alignment Matrix
- Current truth:
  - code, docs, task packets, package surfaces, and archive/instruction surfaces disagree in several named places
  - placeholder or compatibility-only surfaces are still described as current capabilities
- Reference truth:
  - the repo should present one coherent current story across code, docs, tasks, and package surfaces
  - historical notes should be historical, not current instructions
  - compatibility seams that remain should be explained explicitly
- Target truth / intended delta:
  - the named stale surfaces are removed or rewritten to the current canonical story
  - the package and SDK surfaces stop promising behavior they do not currently deliver
  - retained compatibility seams are documented clearly enough that future agents can understand why they still exist
- Explicitly out-of-scope differences:
  - CO STATUS telemetry expansion
  - provider-worker observability and stall-debug expansion
  - unrelated feature work

## Not Done If
- touched docs/specs/tasks/instructions still describe removed or stale seams as active
- the design-system/design-reference and SDK artifact contradictions remain
- ambiguous compatibility surfaces remain without rationale
- the lane broadens into `CO-82` or `CO-83`
- stale active instruction, template, or archive-report surfaces remain uncorrected

## Validation Plan
- `MCP_RUNNER_TASK_ID=linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0 node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-88-docs-review --format json`
- focused tests for the touched runtime/package/review seams
- `MCP_RUNNER_TASK_ID=linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0 node scripts/delegation-guard.mjs`
- `MCP_RUNNER_TASK_ID=linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0 node scripts/spec-guard.mjs --dry-run`
- `MCP_RUNNER_TASK_ID=linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0 npm run build`
- `MCP_RUNNER_TASK_ID=linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0 npm run lint`
- `MCP_RUNNER_TASK_ID=linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0 npm run test`
- `MCP_RUNNER_TASK_ID=linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0 npm run docs:check`
- `MCP_RUNNER_TASK_ID=linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0 npm run docs:freshness`
- `MCP_RUNNER_TASK_ID=linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0 node scripts/diff-budget.mjs`
- `MCP_RUNNER_TASK_ID=linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0 FORCE_CODEX_REVIEW=1 npm run review`
- `MCP_RUNNER_TASK_ID=linear-0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0 npm run pack:smoke` when touched surfaces remain downstream-facing

## Approvals
- Reviewer: pending docs-review
- Date: 2026-04-09
