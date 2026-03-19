# TECH_SPEC: Coordinator Symphony-Aligned Devtools CLI Remaining Boundary Freeze Reassessment

## Scope

Bounded reassessment of the remaining local `devtools` wrapper surface after `1266`.

## In-Scope Files

- `bin/codex-orchestrator.ts`
- `orchestrator/src/cli/devtoolsCliShell.ts`
- `orchestrator/src/cli/devtoolsSetup.ts`
- adjacent devtools task/docs artifacts only if needed to record the freeze-or-go decision

## Requirements

1. Reinspect the remaining local `devtools` pocket without widening into broader top-level CLI helpers.
2. Record an explicit freeze result if only shared parse/help glue and wrapper-only shell delegation remain.
3. Keep the already-frozen internal devtools readiness family out of scope.
4. Only open another implementation slice if reassessment finds a real bounded ownership split.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`

## Exit Conditions

- `done`: the post-`1266` local `devtools` pocket is explicitly frozen or a single truthful follow-on seam is named
- `abort`: reassessment requires cross-command widening to say anything truthful
