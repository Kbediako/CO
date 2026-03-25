# Baseline Audit - CO-11

## Scope
- Symphony baseline: `/Users/kbediako/Code/symphony/SPEC.md`, `/Users/kbediako/Code/symphony/elixir/README.md`, `/Users/kbediako/Code/symphony/elixir/WORKFLOW.md`
- Current CO contract: `AGENTS.md`, `skills/standalone-review/SKILL.md`, `skills/elegance-review/SKILL.md`, `skills/linear/SKILL.md`, `docs/standalone-review-guide.md`
- Implementation seam: `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- Test seams: `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`, `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`

## Findings
- The current provider-worker prompt already enforces live-state inspection, queued-state transition, single-workpad discipline, PR feedback sweep, PR attachment before review handoff, green validation, latest `origin/main`, and green PR checks.
- The current provider-worker prompt does not explicitly require a standalone-review pass before PR create/update intended for review handoff.
- The current provider-worker prompt does not explicitly require an elegance/minimality pass after standalone-review findings are addressed and before handoff.
- The current provider-worker prompt does not define the default non-trivial heuristic (`2+ files` or about `40+ changed lines`) or require explicit skip justification for trivial diffs.
- The current provider-worker prompt does not require the workpad to record the review goal, findings or fallback, and final clean or justified status before handoff.
- Current prompt coverage in `ProviderLinearWorkerRunner.test.ts` asserts the existing handoff rules but does not yet assert the new review-gate contract.

## Conclusion
- `CO-11` is a real prompt-contract gap, not a duplicate of the recent state-routing and merge-loop parity work.
- The smallest implementation seam is the provider-worker prompt builder plus focused prompt/lifecycle regressions, with docs aligned to the new contract.
