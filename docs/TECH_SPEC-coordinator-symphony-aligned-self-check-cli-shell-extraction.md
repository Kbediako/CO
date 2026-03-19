# TECH_SPEC: Coordinator Symphony-Aligned Self-Check CLI Shell Extraction

## Scope

Bounded extraction of the binary-facing `self-check` output shell from `bin/codex-orchestrator.ts`.

## In-Scope Files

- `bin/codex-orchestrator.ts`
- `orchestrator/src/cli/selfCheck.ts`
- new `self-check` CLI shell/helper under `orchestrator/src/cli/`
- focused self-check CLI tests

## Requirements

1. Move `self-check` format selection and text/json output emission out of `handleSelfCheck(...)`.
2. Keep binary ownership limited to shared `parseArgs(...)`, top-level command dispatch, and any help gating if needed.
3. Preserve the current `buildSelfCheckResult()` payload and the exact text-mode field emission order.
4. Avoid widening into unrelated CLI families or changing the lower self-check data helper.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused self-check CLI/helper coverage
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `codex-orchestrator review`
- `npm run pack:smoke`

## Exit Conditions

- `done`: the `self-check` output shell is extracted with focused parity evidence
- `abort`: the remaining `handleSelfCheck(...)` ownership is shown to be too small or same-owner glue rather than a real shell boundary
