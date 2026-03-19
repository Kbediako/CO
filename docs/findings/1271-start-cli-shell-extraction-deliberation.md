# Findings: 1271 Start CLI Shell Extraction

- After `1270` extracted the local `exec` shell, `handleStart(...)` is the next stronger nearby binary-facing shell candidate.
- `handleStart(...)` still owns real shell responsibilities above `orchestrator.start(...)`: help gating, format plus execution/runtime-mode resolution, repo-policy application, `rlm`-specific env and warning handling, task-id shaping, `withRunUi(...)`, auto issue-log capture, output emission, exit-code mapping, and the post-success adoption-hint follow-on.
- Nearby alternatives like `self-check` should stay frozen because they are just local print glue, while `frontend-test` is smaller and can wait behind the broader `start` shell.
- Result: open `1271` as a bounded start CLI shell extraction lane.
