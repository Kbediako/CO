# 1250 Deliberation

- Trigger: `1249` completed the setup bootstrap shell extraction.
- Next truthful candidate: the remaining `handleDoctor(...)` readiness plus `--apply` mutation surface in `bin/codex-orchestrator.ts`.
- Why this is a reassessment lane rather than an immediate extraction:
  - the remaining doctor block still mixes advisory/readiness output with `--apply` mutation through `installSkills(...)`, `runDelegationSetup(...)`, and `runDevtoolsSetup(...)`
  - prior doctor-family reassessment already showed that the doctor surface widens quickly into shared setup owners
  - post-`1249`, this is still the strongest nearby candidate, but the new smaller top-level CLI surface needs a fresh `go` vs `freeze` decision before another implementation slice is justified
- Nearby alternatives considered:
  - `handleDevtools(...)`, `handleDelegation(...)`, `handleCodex(...)`, and `handleSkills(...)` remain relatively thin wrappers over dedicated modules
  - `handleExec(...)` already delegates into `executeExecCommand(...)`
  - `handleFrontendTest(...)` still appears thinner and closer to a same-owner wrapper than the doctor branch
- Deliberation result: open a docs-first reassessment lane for the remaining doctor apply/readiness boundary and do not force an extraction upfront.
