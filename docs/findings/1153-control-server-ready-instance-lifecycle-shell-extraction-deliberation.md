# 1153 Deliberation - Control Server Ready Instance Lifecycle Shell Extraction

## Why this seam is next

- `1152` removed the remaining inline generic bootstrap start sequencing from the bootstrap lifecycle wrapper.
- The highest-value startup surface still inline is now the higher-order ready-instance lifecycle shell in `controlServer.ts`.
- Cutting deeper into bootstrap or Telegram-local helpers from this baseline would be lower-value churn than separating the remaining startup/rollback and owned shutdown orchestration.

## Bounded target

- Primary file: `orchestrator/src/cli/control/controlServer.ts`
- Adjacent collaborators:
  - `orchestrator/src/cli/control/controlServerReadyInstanceStartup.ts`
  - `orchestrator/src/cli/control/controlServerStartupSequence.ts`
- Primary behavior:
  - pending instance request-shell binding
  - ready-instance startup with rollback on failure
  - owned shutdown ordering

## Constraints

- Preserve lazy request-shell reads while the instance is still pending
- Preserve bootstrap-owned runtime handle publication before ready-instance startup begins
- Preserve close-on-failure rollback behavior
- Preserve owned shutdown ordering for expiry lifecycle, bootstrap lifecycle, SSE clients, and HTTP server close
- Avoid widening `ControlServer` constructor/public contract just to move orchestration out of line

## Validation focus

- `orchestrator/tests/ControlServer.test.ts`
- Adjacent startup tests only if a collaborator surface moves:
  - `orchestrator/tests/ControlServerReadyInstanceStartup.test.ts`
  - `orchestrator/tests/ControlServerStartupSequence.test.ts`

## Decision

Proceed with a docs-first slice named `1153-coordinator-symphony-aligned-control-server-ready-instance-lifecycle-shell-extraction`.
