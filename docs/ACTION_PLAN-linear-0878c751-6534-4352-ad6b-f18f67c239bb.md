# ACTION_PLAN - linear-0878c751-6534-4352-ad6b-f18f67c239bb

## Summary
- Goal: restore truthful source-entrypoint coverage for the five CO-136 regressions without reopening runtime parser work.
- Scope: fresh docs packet, fresh workpad, audited docs-review child stream, a narrow `tests/cli-command-surface.spec.ts` patch, the required validation loop, and the normal review or handoff gates.
- Assumptions:
  - the runtime parser fix already present in `bin/codex-orchestrator.ts` stays untouched
  - only the targeted test seam needs repair because the current issue cases had drifted onto the in-process helper

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `tests/cli-command-surface.spec.ts`, `quoted single-token exec commands`, `CO-96`, and the requirement to keep the lane scoped to the command-surface seam.
- Not done if: the direct `exec` probe regresses, the five CO-136 source-entrypoint cases are no longer exercised truthfully, or the lane widens into unrelated CLI work.
- Pre-implementation issue-quality review: approved. Runtime behavior is already correct, so the lane should repair only the test truthfulness seam.

## Milestones & Sequencing
1. Recreate the CO-136 docs packet, checklist mirrors, and the single required workpad source on a fresh branch from `origin/main`.
2. Run audited `linear child-stream --pipeline docs-review` so delegation evidence exists for this attempt.
3. Reproduce the raw source-entrypoint timings and confirm the runtime parser path is already correct.
4. Patch only `tests/cli-command-surface.spec.ts`:
   - add a dedicated raw source-entrypoint subprocess helper
   - keep the broader in-process hot-suite helper unchanged
   - move the five CO-136 regressions onto the raw source-entrypoint helper with a `30s` budget
5. Validate the focused five-case subset and the full command-surface file, then continue through the required review and handoff gates.

## Dependencies
- `bin/codex-orchestrator.ts`
- `tests/cli-command-surface.spec.ts`
- `tests/helpers/inProcessEntrypoint.ts`

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-0878c751-6534-4352-ad6b-f18f67c239bb node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-136-docs-review-r2 --format json`
  - `/usr/bin/time -p /bin/bash -lc 'node --loader ts-node/esm bin/codex-orchestrator.ts rlm "write tests" --multi-agent true --collab false'`
  - `/usr/bin/time -p /bin/bash -lc 'node --loader ts-node/esm bin/codex-orchestrator.ts rlm'`
  - `/usr/bin/time -p /bin/bash -lc 'node --loader ts-node/esm bin/codex-orchestrator.ts exec'`
  - `node --loader ts-node/esm bin/codex-orchestrator.ts exec 'node -e "console.log(\"x y\")"' --json compact`
  - `npx vitest run --config vitest.config.core.ts tests/cli-command-surface.spec.ts -t 'rejects conflicting multi-agent and collab flag values|requires a goal for rlm runs|rejects exec without a command through the source entrypoint|preserves backslashes in quoted single-token exec commands|handles escaped quotes inside quoted single-token exec commands'`
  - `npx vitest run --config vitest.config.core.ts tests/cli-command-surface.spec.ts`
  - standalone review plus explicit elegance review before handoff
- Rollback plan:
  - revert only the `tests/cli-command-surface.spec.ts` source-entrypoint helper changes if they introduce regressions

## Risks & Mitigations
- Risk: the lane accidentally reopens broader hot-suite work.
  - Mitigation: keep `runEntrypointLikeExec` in place for the rest of the file and touch only the five issue cases.
- Risk: the restored source-entrypoint tests exceed the prior `15s` budget.
  - Mitigation: use an explicit `30s` source-entrypoint timeout backed by fresh raw timing evidence.
- Risk: the issue is misread as a runtime parser fix.
  - Mitigation: document that the runtime parser already worked and that this lane restores truthful validation coverage.

## Approvals
- Reviewer: pending `codex-orchestrator docs-review` child stream for the fresh packet
- Date: 2026-04-10
