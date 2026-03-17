# Findings: 1274 Status CLI Shell Extraction

- After `1273` extracted the local `resume` shell, `handleStatus(...)` is the next truthful nearby binary-facing shell candidate.
- `handleStatus(...)` still owns real shell responsibilities above `orchestrator.status(...)`: help gating, run-id resolution, watch and format parsing, interval parsing, the inline watch loop, and the terminal-status break condition.
- The lower-layer status service behavior already lives in `orchestrator/src/cli/orchestrator.ts` and its dedicated status shell, so the next bounded move is the binary-local wrapper rather than another service refactor.
- Result: open `1274` as a bounded status CLI shell extraction lane.
