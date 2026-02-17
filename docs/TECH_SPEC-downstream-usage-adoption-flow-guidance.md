# TECH_SPEC - Downstream Usage Adoption + Guardrail Flow + Setup Guidance (0968)

## Summary
- Add post-`exec` adoption nudges using `doctorUsage` recommendations.
- Add a low-friction flow command that runs `docs-review` then `implementation-gate`.
- Add setup-time policy/skills guidance references in setup summary output.

## Design

### 1) Post-exec usage nudge
- Touchpoint: `bin/codex-orchestrator.ts` in `handleExec`.
- Behavior:
  - After `executeExecCommand(...)` completes, call `runDoctorUsage` with a short window (7 days).
  - In text mode, print one concise recommendation when adoption guidance exists.
  - Keep JSON mode output stable (no extra text noise).

### 2) Docs->implementation flow command
- Touchpoint: command dispatch + new handler in `bin/codex-orchestrator.ts`.
- Behavior:
  - Add `flow` command (with optional alias) to run two pipeline starts in sequence:
    1. `docs-review`
    2. `implementation-gate`
  - Reuse existing run UI and output formatting.
  - Stop on first failure and return non-zero exit code.

### 3) Setup guidance injection
- Touchpoints:
  - `bin/codex-orchestrator.ts` setup payload builder.
  - `orchestrator/src/cli/skills.ts` setup/skills summary formatting.
- Behavior:
  - Add explicit guidance references to policy/skills docs in setup plan/summary.
  - Keep setup idempotent; this is messaging/discoverability only.

## Validation
- Automated:
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
- Manual:
  - Run `codex-orchestrator exec ...` and verify guidance appears only in text mode when recommendation exists.
  - Run `codex-orchestrator flow --task <id>` and verify sequential docs-review -> implementation-gate behavior.
  - Run `codex-orchestrator setup --format json` and verify policy/skills guidance is present.
