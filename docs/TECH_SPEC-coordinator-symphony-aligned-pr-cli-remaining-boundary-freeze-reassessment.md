# TECH_SPEC: Coordinator Symphony-Aligned PR CLI Remaining Boundary Freeze Reassessment

## Scope

Bounded reassessment of the remaining local `pr` wrapper surface after `1264`.

## In-Scope Files

- `bin/codex-orchestrator.ts`
- `orchestrator/src/cli/prCliShell.ts`
- `scripts/lib/pr-watch-merge.js`
- adjacent PR task/docs artifacts only if needed to record the freeze-or-go decision

## Requirements

1. Reinspect the remaining local `pr` pocket without widening into broader top-level CLI helpers.
2. Record an explicit freeze result if only local help gating and wrapper-only shell delegation remain.
3. Only open another implementation slice if reassessment finds a real bounded ownership split.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`

## Exit Conditions

- `done`: the post-`1264` local `pr` pocket is explicitly frozen or a single truthful follow-on seam is named
- `abort`: reassessment requires cross-command widening to say anything truthful
