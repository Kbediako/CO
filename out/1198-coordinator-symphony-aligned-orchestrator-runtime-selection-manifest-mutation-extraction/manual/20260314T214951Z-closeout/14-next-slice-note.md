# 1198 Next Slice Note

- Open `1199-coordinator-symphony-aligned-orchestrator-resume-token-validation-extraction` next.
- The next truthful seam is the real `validateResumeToken(...)` behavior still owned by `orchestrator/src/cli/orchestrator.ts`: file-read, missing-token, and mismatch semantics should move into a bounded service helper while keeping runtime-selection work, pre-start failure persistence, public command behavior, route/control-plane surfaces, and lifecycle orchestration out of scope.
- Likely implementation files: `orchestrator/src/cli/orchestrator.ts`, `orchestrator/src/cli/services/orchestratorResumePreparationShell.ts`, and a new helper such as `orchestrator/src/cli/services/orchestratorResumeTokenValidation.ts`.
- Likely focused tests: `orchestrator/tests/OrchestratorResumePreparationShell.test.ts` plus a new dedicated helper test file for the isolated validation contract.
