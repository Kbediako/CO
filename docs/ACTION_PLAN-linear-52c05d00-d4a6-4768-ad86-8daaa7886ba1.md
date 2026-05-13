# ACTION_PLAN - CO: Restore unrelated eval:test baseline failing TypeScript smoke harness

## Added by Bootstrap (refresh as needed)

## Traceability
- Linear issue: `CO-58` / `52c05d00-d4a6-4768-ad86-8daaa7886ba1`
- Linear URL: https://linear.app/asabeko/issue/CO-58/co-restore-unrelated-evaltest-baseline-failing-typescript-smoke

## Summary
- Goal: finish `CO-58` by reproducing and repairing the TypeScript smoke scenario regression that is keeping `npm run eval:test` from a truthful green baseline.
- Scope: docs-first packet, child docs-review evidence, live evaluation-harness reproduction, minimal code fix or explicit blocker ownership, required validation, and review-ready workpad refreshes.
- Assumptions:
  - the live regression is still present on the current workspace branch until reproduced otherwise
  - the fix will likely live in the TypeScript smoke fixture, evaluation harness runner, or a direct dependency surface used by that scenario
  - a narrow repair is preferable to any broad evaluation-harness redesign
- Current status:
  - issue moved from `Ready` to `In Progress`
  - workspace switched from detached `HEAD` to `linear/co-58-restore-eval-test-baseline`
  - docs packet is being registered before live reproduction

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `Restore unrelated eval:test baseline failing TypeScript smoke harness`
  - `npm run eval:test`
  - `evaluation/tests/harness.test.ts`
  - `TypeScript smoke scenario`
- Not done if:
  - the exact failing goal statuses are not captured
  - the owner layer remains ambiguous
  - `npm run eval:test` stays red without explicit blocker ownership
- Pre-implementation issue-quality review:
  - the issue is scoped correctly as a distinct evaluation-baseline lane from `CO-46`; implementation should stay on the TypeScript smoke seam and use follow-up issues if new unrelated evaluation work appears

## Milestones & Sequencing
1. Register the `CO-58` docs-first packet, update `tasks/index.json`, refresh `docs/TASKS.md`, refresh `docs/docs-freshness-registry.json`, and mirror the checklist under `.agent/task/`.
2. Create the single required Linear workpad comment and launch the audited child `docs-review` stream for the new packet.
3. Reproduce `npm run eval:test`, capture the exact TypeScript smoke goal statuses, and narrow the regression to the harness, fixture, or another runtime dependency seam.
4. Implement the smallest truthful repair and rerun focused reproduction until the TypeScript smoke scenario is green.
5. Run the required validation floor for the final diff, then standalone review followed by an explicit elegance/minimality pass.
6. Refresh the workpad with the repair, validation, and review status, then open or update the PR and move toward review handoff only once all prerequisites are satisfied.

## Dependencies
- `evaluation/tests/harness.test.ts`
- `evaluation/scenarios/typescript-smoke.json`
- `evaluation/fixtures/typescript-smoke/**`
- `evaluation/harness/index.ts`
- `skills/linear/SKILL.md`

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1 node "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-58-docs-review --format json`
  - `MCP_RUNNER_TASK_ID=linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1 npm run eval:test`
  - focused reruns or direct scenario probes needed to capture goal-by-goal status details
  - `MCP_RUNNER_TASK_ID=linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1 node scripts/delegation-guard.mjs`
  - `MCP_RUNNER_TASK_ID=linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1 node scripts/spec-guard.mjs --dry-run`
  - `MCP_RUNNER_TASK_ID=linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1 npm run build`
  - `MCP_RUNNER_TASK_ID=linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1 npm run lint`
  - `MCP_RUNNER_TASK_ID=linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1 npm run test`
  - `MCP_RUNNER_TASK_ID=linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1 npm run docs:check`
  - `MCP_RUNNER_TASK_ID=linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1 npm run docs:freshness`
  - `MCP_RUNNER_TASK_ID=linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1 node scripts/diff-budget.mjs`
  - `MCP_RUNNER_TASK_ID=linear-52c05d00-d4a6-4768-ad86-8daaa7886ba1 FORCE_CODEX_REVIEW=1 npm run review`
- Rollback plan:
  - revert any change that weakens scenario truthfulness or breaks other evaluation scenarios
  - keep the issue active and record blocker ownership instead of forcing a misleading green report

## Risks & Mitigations
- Risk: the live failure shape has drifted since the 2026-04-01 observation.
  - Mitigation: start with fresh reproduction and capture exact goal statuses before code edits.
- Risk: the regression might come from an indirect runtime dependency rather than the harness itself.
  - Mitigation: inspect goal command output and fixture execution details before changing the harness contract.
- Risk: docs-review or review tooling may fail for reasons unrelated to the new packet.
  - Mitigation: keep truthful fallback notes with explicit manifests rather than stalling or inventing a clean result.

## Approvals
- Reviewer: Pending docs-review, implementation validation, and pre-handoff review/elegance gates
- Date: 2026-04-02
