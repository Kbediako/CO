# 1248 Deliberation

- Trigger: `1247` moved the flow-owned target-stage resolution and sequencing shell into `orchestrator/src/cli/flowCliShell.ts`.
- Reassessment question: does any truthful flow-boundary extraction still remain nearby?
- Current evidence says the remaining surface is parser/help glue in `bin/codex-orchestrator.ts` plus shared helpers that were explicitly excluded from `1247`.
- The bounded scout result agrees with local inspection: the next truthful move is likely a freeze, not another implementation slice.
- Deliberation result: open a docs-first freeze reassessment lane and only proceed to implementation if reassessment finds a real remaining seam.
