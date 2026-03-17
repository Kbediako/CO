# Findings: 1272 Frontend-Test CLI Shell Extraction

- After `1271` extracted the local `start` shell, `handleFrontendTest(...)` is the next truthful nearby binary-facing shell candidate.
- `handleFrontendTest(...)` still owns real shell responsibilities above `orchestrator.start(...)`: output-format and runtime-mode resolution, repo-policy application, the `CODEX_REVIEW_DEVTOOLS` env toggle and restore branch, `withRunUi(...)`, output emission, and exit-code mapping.
- The deeper frontend-testing runtime already lives in `orchestrator/src/cli/frontendTestingRunner.ts`, so the next bounded move is the binary-local shell rather than another runtime refactor.
- Result: open `1272` as a bounded frontend-test CLI shell extraction lane.
