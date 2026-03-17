# 1251 Deliberation

- Trigger: `1250` completed as a `go` reassessment instead of a freeze.
- Next truthful candidate: the remaining `handleDoctor(...)` block in `bin/codex-orchestrator.ts`.
- Why this is a real extraction lane:
  - the top-level CLI still owns doctor-specific orchestration above already-separated services
  - it aggregates readiness, usage, cloud-preflight, and issue-log work, then shapes user-facing JSON/text output
  - it still owns `--apply` planning and apply-mode coordination across `skills`, `delegation`, and `devtools` setup modules
  - focused command-surface behavior already exists around `doctor --apply`, cloud preflight JSON, and issue-log flows
- Nearby alternatives considered:
  - `handleDevtools(...)`, `handleDelegation(...)`, `handleCodex(...)`, and `handleSkills(...)` remain thinner wrappers over dedicated modules
  - `handleExec(...)` already delegates into `executeExecCommand(...)`
  - `handleFrontendTest(...)` still appears closer to a thin wrapper than the doctor shell
- Deliberation result: proceed with a docs-first extraction lane for the doctor command shell.
