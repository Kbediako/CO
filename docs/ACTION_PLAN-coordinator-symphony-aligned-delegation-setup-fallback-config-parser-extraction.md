# ACTION_PLAN: Coordinator Symphony-Aligned Delegation Setup Fallback Config Parser Extraction

1. Isolate the fallback parser helpers currently inline in `delegationSetup.ts`.
2. Move them into one dedicated utility adjacent to the CLI helper surface.
3. Rewire `delegationSetup.ts` to consume that utility while preserving current orchestration behavior.
4. Add focused parser/setup fallback regressions.
5. Validate the bounded lane and sync closeout evidence.
