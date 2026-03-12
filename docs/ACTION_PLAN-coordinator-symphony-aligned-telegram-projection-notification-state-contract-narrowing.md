# ACTION_PLAN - Coordinator Symphony-Aligned Telegram Projection Notification State Contract Narrowing

## Objective

Narrow the projection-notification controller contract so the controller stops accepting/returning the full bridge state, while preserving queue ownership and full-state assembly in `telegramOversightBridge.ts`.

## Steps

1. Identify the minimum notification-state input actually needed by the controller.
2. Replace the full-state return with a smaller push-state or patch-style result.
3. Keep `telegramOversightBridge.ts` responsible for full-state assembly, persistence, and queue ownership.
4. Preserve push dedupe/cooldown semantics exactly.
5. Update focused controller tests and integrated bridge push tests as needed.

## Guardrails

- Do not reopen lifecycle or ingress work.
- Do not move persistence or queue ownership out of the bridge.
- Do not redesign Telegram transport or read presentation.
- Keep the slice contract-focused and bounded.
