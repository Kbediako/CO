# TECH_SPEC - Downstream Usage Adoption + Guardrail Flow + Setup Guidance (0968)

## Summary
- Add post-`exec` adoption nudges using `doctorUsage` recommendations.
- Add a low-friction flow command that runs `docs-review` then `implementation-gate`.
- Add setup-time policy/skills guidance references in setup summary output.
- Post-merge hardening (2026-02-17): scope flow target alias matching by pipeline and block auto-merge when actionable bot inline feedback is unacknowledged.

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

### 2a) Scoped flow target correctness hardening (2026-02-17)
- Touchpoint: `bin/codex-orchestrator.ts` (`resolveFlowTargetStageSelection` + flow target matcher helpers).
- Behavior:
  - For scoped targets (`<pipeline>:<token>`), require pipeline scope alignment before alias/stage matching.
  - Continue to accept scoped aliases by matching the scoped stage token.
  - Keep unscoped suffix matching behavior unchanged.

### 3) Setup guidance injection
- Touchpoints:
  - `bin/codex-orchestrator.ts` setup payload builder.
  - `orchestrator/src/cli/skills.ts` setup/skills summary formatting.
- Behavior:
  - Add explicit guidance references to policy/skills docs in setup plan/summary.
  - Keep setup idempotent; this is messaging/discoverability only.

### 4) Merge safety hardening for reviewer feedback (2026-02-17)
- Touchpoint: `scripts/lib/pr-watch-merge.js`.
- Behavior:
  - During PR monitoring, fetch head-commit inline review comments and block ready-to-merge when actionable bot comments lack a human in-thread reply.
  - Fail closed when the inline feedback fetch fails (prevent auto-merge on uncertain reviewer state).

## Validation
- Automated:
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
- Regression:
  - `npx vitest run --config vitest.config.core.ts tests/cli-command-surface.spec.ts tests/pr-watch-merge.spec.ts`
- Manual:
  - Run `codex-orchestrator exec ...` and verify guidance appears only in text mode when recommendation exists.
  - Run `codex-orchestrator flow --task <id>` and verify sequential docs-review -> implementation-gate behavior.
  - Run `codex-orchestrator setup --format json` and verify policy/skills guidance is present.
