# TECH_SPEC: Coordinator Symphony-Aligned Init CLI Remaining Boundary Freeze Reassessment

## Scope

Bounded reassessment of the remaining binary-facing `init` pocket after `1268`.

## In-Scope Files

- `bin/codex-orchestrator.ts`
- `orchestrator/src/cli/initCliShell.ts`
- nearby `init` help text ownership in the binary
- task/docs artifacts for the reassessment result

## Requirements

1. Reinspect the remaining local `init` pocket without widening into broader top-level CLI helpers.
2. Record an explicit freeze result if only shared parse/help glue and wrapper-only shell delegation remain.
3. Keep the already-extracted `initCliShell`, `init.ts`, and `codexCliSetup.ts` behavior out of scope.
4. Only open another implementation slice if reassessment finds a real bounded ownership split.

## Validation Plan

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`

## Exit Conditions

- `done`: the post-`1268` local `init` pocket is explicitly frozen or a single truthful follow-on seam is named
- `abort`: reassessment requires cross-command widening to say anything truthful
