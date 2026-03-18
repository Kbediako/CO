# Findings: 1297 Frontend-Test CLI Boundary Reassessment Revisit

- Current-tree inspection shows `handleFrontendTest(...)` still owns request shaping above `runFrontendTestCliShell(...)`.
- The remaining wrapper-local logic is broader than thin parse/help glue because it still resolves output format, `--devtools`, runtime mode, repo-config-required policy, extra-argument warnings, and request metadata handoff.
- That makes `1297` a truthful `go` reassessment rather than a freeze.
- The next bounded nearby seam is a frontend-test request-shell extraction that leaves parse/help ownership in the binary and preserves lower pipeline execution inside `orchestrator/src/cli/frontendTestCliShell.ts`.
