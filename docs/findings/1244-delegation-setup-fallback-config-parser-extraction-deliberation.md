# 1244 Deliberation

## Decision

Open a docs-first implementation lane.

## Why

After `1243` froze the devtools pocket, the next truthful seam is inside `orchestrator/src/cli/delegationSetup.ts`: fallback config parsing still lives inline beside setup-shell orchestration. The parser cluster is cohesive and bounded:

- `readDelegationFallbackConfig`
- `readDelegationArgsFromConfig`
- `readDelegationEnvVarsFromConfig`

That is a stronger, more concrete seam than a speculative frontend-testing runner reassessment.

## Evidence

- `orchestrator/src/cli/delegationSetup.ts`
- `orchestrator/tests/DelegationSetup.test.ts`
- `out/1243-coordinator-symphony-aligned-devtools-readiness-boundary-freeze-reassessment/manual/20260316T115918Z-closeout/14-next-slice-note.md`
