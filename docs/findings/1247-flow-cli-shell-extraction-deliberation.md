# 1247 Deliberation

- Trigger: `1246` closed as a truthful no-op freeze after confirming the broader doctor family was already split across stable owners.
- Next truthful candidate: the inline `flow` command shell in `bin/codex-orchestrator.ts`.
- Why this is a real extraction lane instead of another reassessment:
  - `handleFlow(...)` still owns command-entry orchestration for the `docs-review` to `implementation-gate` sequence
  - `resolveFlowTargetStageSelection(...)` remains flow-specific target-selection logic in the same top-level CLI file
  - focused command-surface tests already exercise the flow contract, so parity can be verified without inventing new ownership
- Shared helpers such as `maybeCaptureAutoIssueLog(...)`, `withAutoIssueLogContext(...)`, `resolveTaskFilter(...)`, and the generic run-output helpers are intentionally not the primary seam here because they are still shared with `start`.
- Alternate nearby candidate considered: doctor CLI shell extraction around `handleDoctor(...)`. It remains plausible, but the `--apply` path widens into delegation setup, DevTools setup, and skill-install mutation, so it is not the next bounded shell slice on the current tree.
- Deliberation result: proceed with a docs-first extraction lane for the `flow` CLI shell.
