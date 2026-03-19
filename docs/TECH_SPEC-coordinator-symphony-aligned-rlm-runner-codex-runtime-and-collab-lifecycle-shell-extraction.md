# TECH_SPEC: Coordinator Symphony-Aligned RLM Runner Codex Runtime and Collab Lifecycle Shell Extraction

## Context

`orchestrator/src/cli/rlm/runner.ts` already owns the iterative loop and validator state machine, and `orchestrator/src/cli/rlm/symbolic.ts` already owns symbolic loop orchestration, deliberation integration, and alignment tracking. The remaining mixed boundary lives in `orchestrator/src/cli/rlmRunner.ts`, where runtime Codex command resolution, `codex exec` and JSONL launching, collab lifecycle parsing and validation, feature-key negotiation, and final loop handoff still sit together.

## Requirements

1. Extract the remaining Codex runtime and collab lifecycle shell from:
   - `orchestrator/src/cli/rlmRunner.ts`
2. Keep the already-separated cores in scope only as consumers and contract anchors:
   - `orchestrator/src/cli/rlm/runner.ts`
   - `orchestrator/src/cli/rlm/symbolic.ts`
3. Preserve:
   - runtime command resolution behavior
   - non-interactive env shaping
   - JSONL completion handling and agent-message extraction
   - collab lifecycle validation and role-policy handling
   - mode and feature-key policy behavior
4. Keep CLI parsing, top-level state writing, and final runner orchestration in `rlmRunner.ts`.
5. Cover the extraction with focused RLM regression tests rather than widening into unrelated subsystem tests.

## Validation Plan

- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- focused RLM regressions
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `npm run review`
- `npm run pack:smoke`

## Exit Conditions

- `go`: runtime Codex command resolution and collab lifecycle handling are extracted behind a bounded helper while focused RLM contracts stay green
- `no-go`: the attempted extraction would blur ownership or regress symbolic multi-agent lifecycle guarantees
