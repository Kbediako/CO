# 1249 Deliberation

- Trigger: `1248` closed the remaining flow pocket as a truthful freeze.
- Next truthful candidate: the inline `setup` bootstrap shell in `bin/codex-orchestrator.ts`.
- Why this is a real extraction lane:
  - `handleSetup(...)` still mixes plan/apply branching with user-facing output shaping
  - the handler composes `installSkills(...)`, `runDelegationSetup(...)`, and `runDevtoolsSetup(...)`, but those underlying modules already exist outside the top-level CLI file
  - setup guidance building and rendering are still co-located with the bootstrap shell
  - focused command-surface coverage already exists around setup plan/apply behavior
- Nearby alternatives considered:
  - `handleFrontendTest(...)` currently appears thinner and closer to a same-owner wrapper
  - `handleExec(...)` already delegates to `executeExecCommand(...)` and looks like a thin adapter
- Deliberation result: proceed with a docs-first extraction lane for the `setup` bootstrap shell.
