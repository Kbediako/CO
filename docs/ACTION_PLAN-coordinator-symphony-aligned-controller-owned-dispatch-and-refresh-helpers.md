# ACTION_PLAN - Coordinator Symphony-Aligned Controller-Owned Dispatch + Refresh Helpers

1. Register `1029` docs-first artifacts, task mirrors, and freshness registry entries.
2. Capture docs-review approval for the bounded dispatch/refresh ownership move.
3. Refactor runtime to expose transport-neutral dispatch evaluation + refresh invalidation primitives only.
4. Move dispatch/refresh payload handling into controller-owned helpers and retarget Telegram dispatch reads.
5. Update tests to keep runtime assertions transport-neutral and server assertions route-shaped.
6. Run the full validation lane, manual simulated/mock dispatch-refresh checks, elegance review, and closeout sync.
