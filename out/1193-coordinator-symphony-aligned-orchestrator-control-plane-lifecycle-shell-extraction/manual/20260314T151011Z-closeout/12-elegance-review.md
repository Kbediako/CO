# 1193 Elegance Review

The first extracted shell was already behaviorally correct, but it still carried two avoidable seams:

- a test-only `createRunEventPublisher` injection/export that broadened the helper API beyond the production boundary
- a duplicate `runId` argument even though the shell already had `manifest.run_id`

Those were removed in the final tree. The resulting shape is appropriately minimal:

- `orchestrator.ts` delegates one bounded control-plane lifecycle shell
- the shell keeps only one production injection point (`startLifecycle`) for seam-local lifecycle control
- run-event publisher construction is private to the shell again

No remaining material minimality issues were found after those trims.
