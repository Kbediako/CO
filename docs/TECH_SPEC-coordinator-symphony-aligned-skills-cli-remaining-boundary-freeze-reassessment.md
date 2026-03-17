# TECH_SPEC: Coordinator Symphony-Aligned Skills CLI Remaining Boundary Freeze Reassessment

## Scope

Bounded reassessment of the remaining local skills wrapper surface after `1257`.

## In-Scope Files

- `bin/codex-orchestrator.ts`
- `orchestrator/src/cli/skillsCliShell.ts`
- `orchestrator/src/cli/skills.ts`
- adjacent skills task/docs artifacts only if needed to record the freeze-or-go decision

## Requirements

1. Reinspect the remaining local skills pocket without widening into broader top-level CLI helpers.
2. Record an explicit freeze result if only shared parse/help glue and wrapper-only shell delegation remain.
3. Only open another implementation slice if reassessment finds a real bounded ownership split.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`

## Exit Conditions

- `done`: the post-`1257` skills pocket is explicitly frozen or a single truthful follow-on seam is named
- `abort`: reassessment requires cross-command widening to say anything truthful
