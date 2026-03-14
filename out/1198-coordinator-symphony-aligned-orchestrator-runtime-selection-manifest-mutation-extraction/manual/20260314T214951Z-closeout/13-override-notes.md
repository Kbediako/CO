# 1198 Override Notes

- `diff-budget` required the standard stacked-branch waiver: `DIFF_BUDGET_OVERRIDE_REASON="1198 stacked-branch symphony alignment lane"`.
- The docs-first registration turn recorded a separate `docs-review` wrapper override in `out/1198-coordinator-symphony-aligned-orchestrator-runtime-selection-manifest-mutation-extraction/manual/20260314T213941Z-docs-first/05-docs-review-override.md` after the wrapper stopped at `Run delegation guard`. That earlier registration stop did not block final-tree correctness validation.
- The delegated guard-side diagnostics run `2026-03-14T21-50-04-059Z-50ee2893` failed on its own generic `npm run test` stage. It served only as delegation evidence for `1198`; final-tree correctness used the main lane’s committed-tree validations, and `node scripts/delegation-guard.mjs --task 1198-coordinator-symphony-aligned-orchestrator-runtime-selection-manifest-mutation-extraction` passed against that manifest evidence.
