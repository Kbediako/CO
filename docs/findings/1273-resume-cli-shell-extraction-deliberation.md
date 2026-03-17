# Findings: 1273 Resume CLI Shell Extraction

- After `1272` extracted the local `frontend-test` shell, `handleResume(...)` is the next truthful nearby binary-facing shell candidate.
- `handleResume(...)` still owns real shell responsibilities above `orchestrator.resume(...)`: help gating, run-id resolution, runtime-mode resolution, repo-policy application, `withRunUi(...)`, and output emission.
- `handleStatus(...)` is thinner and can wait behind `resume`, while the deeper resume-preparation lifecycle already lives under `orchestrator/src/cli/orchestrator.ts` and service shells.
- Result: open `1273` as a bounded resume CLI shell extraction lane.
