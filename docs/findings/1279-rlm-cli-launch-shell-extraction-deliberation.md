# Deliberation Findings - 1279 RLM CLI Launch Shell Extraction

- `1278` closed as a real extraction but did not exhaust the local `rlm` wrapper.
- The remaining truthful nearby seam is the launch/start path still inline in `handleRlm(...)`: goal validation, task/env shaping, `orchestrator.start(...)`, `Run started` output, and handoff into the extracted completion helper.
- Binary-facing help/parse ownership should remain in `bin/codex-orchestrator.ts`; deeper RLM runtime ownership stays out of scope.
