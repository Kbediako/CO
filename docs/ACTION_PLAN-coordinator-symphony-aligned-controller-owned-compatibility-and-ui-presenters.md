# ACTION PLAN: 1028 Controller-Owned Compatibility + UI Presenters

1. Register `1028` across `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, task/spec/checklist mirrors, and findings.
2. Capture docs-review evidence for the extraction scope.
3. Remove selected-run presentation wrappers from `ControlRuntime`.
4. Retarget `controlServer.ts` and presenter helpers to own `/ui`, `/state`, and `/issue` payload shaping over `readSelectedRunSnapshot()`.
5. Run validation, capture elegance/manual evidence, sync the task state, and close the slice.

