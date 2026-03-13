# Deliberation - Coordinator Symphony-Aligned Control Server Public Lifecycle Shell Extraction

## Decision

Approve docs-first registration for `1154-coordinator-symphony-aligned-control-server-public-lifecycle-shell-extraction`.

## Why this seam is next

- `1153` removed the higher-order ready-instance lifecycle internals from `controlServer.ts`.
- The remaining meaningful orchestration is now the public `ControlServer.start()/close()` shell.
- Nearby helpers such as `controlServerStartupInputPreparation.ts`, `controlServerReadyInstanceStartup.ts`, and `controlServerStartupSequence.ts` are already cohesive and would become churn-only micro-slices if split further.

## Boundaries

- Keep the public `ControlServer` contract unchanged.
- Do not reopen ready-instance internals or Telegram-local seams.
- Treat this as a public lifecycle shell extraction only, not a broader startup refactor.
