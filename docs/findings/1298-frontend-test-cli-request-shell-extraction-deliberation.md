# Findings: 1298 Frontend-Test CLI Request Shell Extraction

- `1297` confirmed a real binary-facing frontend-test request-shaping seam remains in `handleFrontendTest(...)`.
- The bounded extraction target is the request layer only: format/runtime/devtools shaping, repo-config policy application, extra-argument advisory, and request metadata handoff.
- `orchestrator/src/cli/frontendTestCliShell.ts` should continue to own lower frontend-testing pipeline execution and devtools env lifecycle.
- The truthful next move is extraction, not another reassessment or a deeper runtime refactor.
