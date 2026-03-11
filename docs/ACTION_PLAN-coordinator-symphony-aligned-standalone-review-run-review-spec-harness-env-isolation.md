# ACTION_PLAN - Coordinator Symphony-Aligned Standalone Review Run-Review Spec Harness Env Isolation

1. Register `1117` across PRD / TECH_SPEC / ACTION_PLAN / findings / task checklist / `.agent` mirror / `tasks/index.json` / `docs/TASKS.md` / docs freshness registry.
2. Tighten the shared `tests/run-review.spec.ts` harness env builder so ambient fake-Codex control vars do not leak into unrelated tests.
3. Add a focused regression proving an ambient fake-Codex knob can no longer flip an unrelated baseline review test.
4. Keep the slice harness-only unless deterministic evidence forces a product change.
5. Run the docs-first guard bundle, then proceed into the bounded implementation lane.
