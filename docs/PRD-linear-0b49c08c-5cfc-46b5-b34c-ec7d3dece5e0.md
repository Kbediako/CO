# PRD - CO: Repo-wide cleanup of stale compatibility debt, contradictory docs, and placeholder surfaces

## Added by Rework Reset 2026-04-11

## Traceability
- Linear issue: `CO-88` / `0b49c08c-5cfc-46b5-b34c-ec7d3dece5e0`
- Linear URL: https://linear.app/asabeko/issue/CO-88/co-repo-wide-cleanup-of-stale-compatibility-debt-contradictory-docs
- Source issue: `CO-77` / `da28812d-8367-4d94-a273-d0652535f818`

## Summary
- Problem Statement: current `main` still carries the stale surfaces called out in `CO-88`: the dead selected-run presenter seam plus stale references around it, duplicate uppercase task templates beside `.agent/task/templates/*`, old historical/instruction/archive wording, `gpt-5.3-*` alignment defaults that do not match the repo's `gpt-5.4` posture, a static status UI bundle that still assumes historical demo data, placeholder design-system/design-reference surfaces that still read like delivered capability, and an SDK exec artifact contract whose `eventsPath` / `stderrPath` lifetime remains misleading for callers.
- Desired Outcome: re-land a smaller, truthful cleanup pass from fresh `origin/main` that removes dead surfaces, documents the compatibility seams that still have live consumers, and updates the touched docs/specs/tasks/instructions in the same lane.

## User Request Translation
- Treat `CO-88` as a repo-wide truthfulness lane, not a narrow bugfix and not a docs-only wording sweep.
- Prefer deletion or collapse where a surface is actually dead.
- If a seam stays, name the live consumer and why the compatibility path still exists.
- Keep the lane out of `CO-82` provider-worker observability work and `CO-83` CO STATUS telemetry work.
- The fresh attempt starts after a second full Rework reset: stale replay PR `#425` was closed, the old Linear workpad was deleted, and branch `linear/co-88-repo-cleanup-truthfulness-r4` was recreated from fresh `origin/main`.

## Intent Checksum
- Preserve these phrases and expectations:
  - `repo-wide cleanup`
  - `stale compatibility debt`
  - `contradictory docs`
  - `placeholder surfaces`
  - `truthfulness lane`
  - `prefer deletion/collapse`
- Protected surfaces:
  - `orchestrator/src/cli/control/`
  - `.agent/task/templates/*`
  - uppercase templates under `.agent/task/`
  - `scripts/lib/review-launch-attempt.ts`
  - `scripts/run-review.ts`
  - `orchestrator/src/cli/rlm/alignment.ts`
  - `orchestrator/src/cli/rlmRunner.ts`
  - `docs/AGENTS.md`
  - `.agent/AGENTS.md`
  - `archives/`
  - `packages/orchestrator-status-ui/app.js`
  - `packages/sdk-node/src/orchestrator.ts`
  - `eventsPath`
  - `stderrPath`
  - `packages/design-system/**`
  - `tasks/design-reference-pipeline.md`
  - `tasks/hi-fi-design-toolkit.md`
  - `docs/design/specs/**`
  - `orchestrator/src/sync/**`
  - `packages/shared/streams/stdio.ts`
  - `pipelineResolver.ts`
  - `rlmCodexRuntimeShell.ts`
  - `requiresCloud`
  - `requires_cloud`
  - `CO-82`
  - `CO-83`
- Wrong interpretations to reject:
  - only fixing README wording
  - replaying the earlier wide branch with unrelated control-host, provider-worker, exec-runtime, or test-harness churn
  - keeping placeholder package claims because they are off the hot path
  - leaving ambiguous compatibility seams undocumented

## Parity / Alignment Matrix
- Current truth:
  - the dead selected-run presenter seam, uppercase templates, and the stale MCP report archive still exist on `main`
  - the RLM defaults still point at `gpt-5.3-*` even though active docs say `gpt-5.4`
  - `packages/design-system` remains a placeholder scaffold while nearby design docs still read like live package capability
  - `packages/sdk-node/src/orchestrator.ts` still exposes `eventsPath` / `stderrPath` as if they were stable caller-owned artifacts
  - `packages/orchestrator-status-ui/app.js` still needs truthful static-bundle data-source behavior
- Reference truth:
  - current code, active docs, task packets, and package surfaces should describe the same present-tense repo behavior
  - placeholder or historical surfaces should be marked historical or removed
  - compatibility seams that remain should have an explicit reason and live consumer
- Target truth:
  - dead surfaces are removed
  - surviving compatibility surfaces are documented truthfully
  - touched docs/specs/tasks/instructions are updated in the same lane
- Explicitly out of scope:
  - `CO-82`
  - `CO-83`
  - new runtime modes, UI redesign, or release automation work

## Goals
- Remove or collapse the highest-confidence stale surfaces still present on fresh `main`.
- Make the design-system/design-reference story truthful.
- Correct the SDK artifact contract without a silent compatibility break.
- Leave a smaller, reviewable diff than the earlier rejected branch.

## Non-Goals
- Reopening the old broad CO-88 attempt or replaying unrelated changes from the closed `r2` branch / PR `#405` or the stale `r3` handoff / PR `#425`.
- Provider-worker observability, STATUS telemetry, or merge-closeout feature work.
- New product features or new runtime behavior beyond truthful compatibility cleanup.

## Not Done If
- stale code is removed but active docs/specs/tasks/instructions still describe it as current
- the design-system/design-reference contradiction remains
- the SDK artifact contract still promises files that disappear underneath the caller without documented compatibility behavior
- compatibility leftovers remain ambiguous
- the lane expands back into non-CO-88 codepaths
