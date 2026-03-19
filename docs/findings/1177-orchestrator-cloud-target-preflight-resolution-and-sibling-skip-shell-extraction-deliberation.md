# 1177 Deliberation - Orchestrator Cloud-Target Preflight Resolution And Sibling-Skip Shell Extraction

## Decision

- Choose the pre-execution target-resolution and sibling-skip cluster in `orchestratorCloudTargetExecutor.ts` as the next bounded seam after `1176`.

## Why this seam

- `1176` already isolated the post-executor completion shell, leaving the pre-execution control-wait, target-resolution, and sibling-skip cluster as the next coherent residue.
- The preamble is still behavior-bearing and smaller than any broader pre-execution refactor, so extracting it next reduces more inline policy without reopening request, running, or completion seams already separated.
- This keeps the cloud-target executor moving toward a Symphony-like controller/helper shape through adjacent, deterministic seams instead of a large recombination refactor.

## Explicit boundary

- Move only:
  - `wait_for_user_approval` pause / cancel handling
  - target-stage resolution via `resolveCloudTargetStage(...)`
  - invalid or missing target failure shaping
  - non-target sibling `manifest.commands` skip projection
- Keep out:
  - missing-env handling
  - request shaping and executor handoff
  - the already-extracted `running` and `onUpdate` shell
  - the already-extracted completion shell
  - orchestration changes in `orchestrator.ts`
