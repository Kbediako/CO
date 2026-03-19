# 1207 Closeout Summary

- Outcome: `1207` closes with a bounded standalone-review prompt/context extraction, not a broader run-review runtime or telemetry refactor.
- [`scripts/lib/review-prompt-context.ts`](/Users/kbediako/Code/CO/scripts/lib/review-prompt-context.ts) now owns task-index and checklist resolution, audit and architecture task-context assembly, active closeout root resolution, generated `NOTES` fallback, and the prompt scaffold for diff, audit, and architecture surfaces.
- [`scripts/run-review.ts`](/Users/kbediako/Code/CO/scripts/run-review.ts) now delegates that prompt/context support through the helper while retaining scope collection, large-scope advisories, runtime selection, execution-state monitoring, and review launch ownership.
- The helper preserves the existing architecture-surface path contract and keeps active closeout provenance lines separate from the prompt scaffold so `run-review` can still inject them after scope notes.
- Focused helper coverage passed in [`tests/review-prompt-context.spec.ts`](/Users/kbediako/Code/CO/tests/review-prompt-context.spec.ts), and focused wrapper coverage passed in [`tests/run-review.spec.ts`](/Users/kbediako/Code/CO/tests/run-review.spec.ts), including the generated `NOTES` fallback contract.
- `delegation-guard`, `spec-guard`, `build`, `lint`, focused helper tests, focused wrapper tests, `docs:check`, `docs:freshness`, diff-budget with explicit stacked-branch override, and `pack:smoke` all passed on the final tree.
- Independent read-only review found no material defects and judged the helper boundary appropriately minimal.
- The explicit non-green items are recorded honestly as overrides rather than hidden: the recurring full-suite `npm run test` quiet-tail after the final visible `tests/cli-orchestrator.spec.ts` suite, and the bounded `npm run review` drift into speculative packaging/lint classification after it had already inspected the direct diff.
