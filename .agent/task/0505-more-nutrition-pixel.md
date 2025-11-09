# Task List — More Nutrition Pixel Archive (0505-more-nutrition-pixel)

## Context
- Source URL: https://more-nutrition.webflow.io/
- Goal: Capture a pixel-perfect hi-fi snapshot (DOM, CSS, tokens, style guide, reference HTML, and self-correction diffs) for archival + review.
- Checklist mirrors: `tasks/0505-more-nutrition-pixel.md`, `docs/TASKS.md` (0505 section).

### Checklist Convention
- Export `MCP_RUNNER_TASK_ID=0505-more-nutrition-pixel` prior to running orchestrator commands.
- Attach `.runs/0505-more-nutrition-pixel/cli/<run-id>/manifest.json` when flipping statuses; cite archive paths for artifact tasks.

## Execution Milestones
1. **Hi-fi pipeline run**
   - Command: `npx codex-orchestrator start hi-fi-design-toolkit --task 0505-more-nutrition-pixel --format json`.
   - Evidence: `.runs/0505-more-nutrition-pixel/cli/2025-11-09T12-25-49-931Z-decf5ae1/manifest.json` captures all stages (extract, tokens, reference, publish, spec-guard, artifact-writer).
   - [x] Status
2. **Artifact archive staged**
   - Tasks: Copy `.runs/0505-more-nutrition-pixel/2025-11-09T12-25-49-931Z-decf5ae1/artifacts/design-toolkit/**` into `.runs/0505-more-nutrition-pixel/archive/2025-11-09T12-25-49Z/` for desktop/mobile HTML, CSS, diffs, tokens, and style guide outputs.
   - [x] Status — Archive path recorded in docs + tasks.
3. **Findings + deltas logged**
   - Deliverable: `docs/findings/more-nutrition.md` with automated diff metrics (final error rate 2.59%) and residual action items.
   - [x] Status — Document references manifest + archive evidence.
4. **Doc mirrors refreshed**
   - Scope: `tasks/index.json`, `docs/TASKS.md`, `docs/PRD.md`, `docs/TECH_SPEC.md`, `docs/ACTION_PLAN.md` mention Task 0505, manifest, archive, and findings.
   - [x] Status (manifest + archive links in each file).

## Notes
- Motion capture quotas remain available (`advanced.ffmpeg.enabled = true`); enable `advanced.framer_motion.enabled` if future reruns need animation video outputs.
- Publish stage left disabled (`publish.update_* = false`) so toolkit outputs remain local-only; flip when integrating into `packages/design-system`.
