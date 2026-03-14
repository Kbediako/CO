# 1194 Override Notes

- `diff-budget` required the standard stacked-branch waiver: `DIFF_BUDGET_OVERRIDE_REASON="1194 stacked-branch symphony alignment lane"`.
- The docs-first registration turn recorded a separate `docs-review` wrapper override in `out/1194-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction/manual/20260314T153716Z-docs-first/05-docs-review-override.md` after the wrapper stopped at `Run delegation guard`. That earlier registration-stop did not block final-tree correctness validation.
- The forced bounded `npm run review` widened from the three touched paths into adjacent runtime/test surfaces such as `orchestrator/tests/OrchestratorCloudAutoScout.test.ts` and `orchestrator/src/cli/runtime/codexCommand.ts`, then failed to return a diff-local `1194` verdict. After an explicit watch window, that review was terminated and recorded as a low-signal review-surface override rather than treated as a clean pass.
