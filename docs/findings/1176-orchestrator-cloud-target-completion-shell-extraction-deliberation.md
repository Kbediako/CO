# 1176 Deliberation - Orchestrator Cloud-Target Completion Shell Extraction

## Decision

- Choose the post-executor completion block in `orchestratorCloudTargetExecutor.ts` as the next bounded seam after `1175`.

## Why this seam

- `1175` already isolated the pre-executor running-state and `onUpdate` shell, leaving the final `cloudResult` application cluster as the next coherent residue.
- The completion block is denser and more behavior-bearing than the remaining target-selection preamble, so extracting it next reduces more inline lifecycle policy without widening scope.
- The completion shell has a clear precedent in prior Symphony-aligned completion-surface extractions elsewhere in the repo.

## Explicit boundary

- Move only:
  - final `manifest.cloud_execution` assignment
  - `targetEntry.log_path`, `completed_at`, `exit_code`, `status`, and `summary`
  - failure-only `manifest.status_detail` and `appendSummary(...)`
  - final forced persist
  - `stageCompleted` emission
- Keep out:
  - target-stage resolution and sibling skip-marking
  - missing-env handling
  - request shaping and executor handoff
  - the already-extracted `running` and `onUpdate` shell
  - cloud/local lifecycle unification
