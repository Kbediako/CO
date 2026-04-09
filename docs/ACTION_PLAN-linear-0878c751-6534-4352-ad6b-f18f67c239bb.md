# ACTION_PLAN - linear-0878c751-6534-4352-ad6b-f18f67c239bb

## Summary
- Goal: clear the isolated `CO-136` blocker by keeping the current quoted single-token `exec` behavior intact and making the affected source-entrypoint timeout budget truthful.
- Scope: docs-first packet, docs-review child stream, confirmation that the current bin-level `exec` parser already covers the quoted cases, targeted `cli-command-surface` timeout adjustments, focused regressions, and the normal validation/review handoff flow.
- Assumptions:
  - the slow `rlm` / `exec` failures are already functionally correct and only need truthful timeout coverage
  - the escaped-quote failure is a real parsing bug in the one-token `exec` path rather than a test harness artifact

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `tests/cli-command-surface.spec.ts`, `quoted single-token exec commands`, `CO-96`, and the requirement to keep the fix scoped to the CLI command-surface seam.
- Not done if: the quoted `exec` case still misparses, the affected tests still timeout, or the diff broadens into unrelated CLI work.
- Pre-implementation issue-quality review: approved. The lane is clearly narrower than a general CLI performance project and should stay on parsing plus truthful per-case timeout handling.

## Milestones & Sequencing
1. Create the CO-136 docs packet, checklist mirrors, local workpad source, and registry entries, then run audited `linear child-stream --pipeline docs-review`.
2. Trace the `exec` single-token path from `bin/codex-orchestrator.ts` through `execCliShell` and `execRuntime`, and only add parser code if the current workspace still fails the escaped-quote and backslash cases.
3. Update the affected `tests/cli-command-surface.spec.ts` cases to use a truthful source-entrypoint boot timeout without widening unrelated suite budgets.
4. Run focused regressions, then the required validation floor, standalone review, and explicit elegance pass before any review handoff.

## Dependencies
- `bin/codex-orchestrator.ts`
- `tests/cli-command-surface.spec.ts`

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-0878c751-6534-4352-ad6b-f18f67c239bb node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-136-docs-review --format json`
  - focused `vitest` coverage for `tests/cli-command-surface.spec.ts`
  - required repo validation floor after implementation
- Rollback plan:
  - revert the targeted test-timeout adjustments so the command-surface contract returns to the prior budget if this lane proves unnecessary

## Risks & Mitigations
- Risk: the issue description reflects an older parser snapshot and prompts unnecessary code churn.
  - Mitigation: treat the current workspace as authoritative, keep the existing bin-level parser untouched, and prove behavior with focused tests before changing runtime code.
- Risk: the timeout increase silently masks new regressions.
  - Mitigation: limit it to the known boot-heavy cases and keep the assertions on the exact failure messages.
- Risk: quoted exec coverage regresses later if the parser changes again.
  - Mitigation: retain and rerun the existing backslash-focused and escaped-quote command-surface tests alongside the timeout-adjusted cases.

## Approvals
- Reviewer: pending `codex-orchestrator docs-review` child stream for the new packet
- Date: 2026-04-10
