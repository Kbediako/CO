# 1199 Override Notes

- `diff-budget` required the standard stacked-branch waiver: `DIFF_BUDGET_OVERRIDE_REASON="1199 stacked-branch symphony alignment lane"`.
- The docs-first registration turn recorded a separate `docs-review` wrapper override in `out/1199-coordinator-symphony-aligned-orchestrator-resume-token-validation-extraction/manual/20260314T220224Z-docs-first/05-docs-review-override.md` after the wrapper stopped at `Run delegation guard`. That earlier registration stop did not block final-tree correctness validation.
- The delegated guard-side diagnostics run `2026-03-14T22-11-20-427Z-f9262239` failed on its own generic `npm run test` stage. It served only as delegation evidence for `1199`; final-tree correctness used the main lane’s committed-tree validations, and `node scripts/delegation-guard.mjs --task 1199-coordinator-symphony-aligned-orchestrator-resume-token-validation-extraction` passed against that manifest evidence.
