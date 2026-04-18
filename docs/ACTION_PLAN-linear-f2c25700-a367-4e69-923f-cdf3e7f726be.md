# ACTION_PLAN - CO: remove clean-tree CLI test dependency on prebuilt dist entrypoint

## Summary
- Goal: remove the clean-tree `dist/bin/codex-orchestrator.js` dependency from the CLI command-surface suite without changing the product-level direct-dist delegation setup contract.
- Scope: docs-first packet, focused cold-state reproduction, one bounded harness fix in `tests/cli-command-surface.spec.ts`, focused reruns, and final clean-tree `npm run test`.
- Assumptions:
  - the cold failure remains isolated to the four setup/delegation apply-path tests already reproduced on this branch
  - warmed validation passing after `npm run build` is evidence of a missing-artifact dependency, not a broader product regression
  - a test-harness stub/setup fix is sufficient unless current-tree evidence disproves it

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `tests/cli-command-surface.spec.ts`
  - `npm run test`
  - `clean-tree`
  - `prebuilt dist`
  - `dist/bin/codex-orchestrator.js`
  - `Delegation MCP requires a built dist entrypoint for stdio startup`
- Not done if:
  - clean-tree `npm run test` still fails because `dist/bin/codex-orchestrator.js` is missing
  - the fix only hides the failure without making the test path hermetic or intentionally staged
  - the lane drifts into `CO-229` or broader delegation behavior changes
- Pre-implementation issue-quality review:
  - 2026-04-18: live reproduction shows the issue is narrower than a product delegation regression. The failing cases only need the direct-dist path to exist while using fake Codex wiring, so the first implementation target is the test harness, not the runtime contract.

## Milestones & Sequencing
1. Keep the single workpad current, record the required parallelization evidence, and finish the bounded docs-only child lane.
2. Create the docs-first packet and registry/task mirrors before source edits.
3. Run `linear child-stream --pipeline docs-review` for pre-implementation review evidence.
4. Implement the smallest harness fix in `tests/cli-command-surface.spec.ts`.
5. Rerun focused cold-state coverage after `npm run clean:dist`.
6. Rerun full clean-tree `npm run test`.
7. Run the required validation floor, then standalone review and elegance review if the final diff is non-trivial.

## Dependencies
- Shared source anchor: `ctx:sha256:55bbd81d18cf34c96d4d069e257260e0ca3c460478c7cbafb7ed3e1372bb3ade#chunk:c000001`
- Current origin manifest: `.runs/linear-f2c25700-a367-4e69-923f-cdf3e7f726be/cli/2026-04-18T10-17-30-911Z-84ff6b3d/manifest.json`
- Focused seam files:
  - `tests/cli-command-surface.spec.ts`
  - `orchestrator/src/cli/delegationSetup.ts`
  - `orchestrator/src/cli/utils/delegationMcpHealth.ts`
- Required workflow artifacts:
  - `out/linear-f2c25700-a367-4e69-923f-cdf3e7f726be/manual/workpad.md`
  - docs-review manifest under `.runs/linear-f2c25700-a367-4e69-923f-cdf3e7f726be-*/`

## Validation
- Focused reproduction and fix checks:
  - `npm run clean:dist`
  - `npm run test:orchestrator -- tests/cli-command-surface.spec.ts`
- Final issue checks:
  - `npm run clean:dist`
  - `npm run test`
- Full handoff floor:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - `codex-orchestrator review`
  - `npm run pack:smoke`
- Rollback plan:
  - revert the test-only artifact helper if it masks a real delegation setup/runtime defect or causes cross-test contamination

## Risks & Mitigations
- Risk: the helper hides a real product failure rather than only the harness dependency.
  - Mitigation: keep the direct-dist command-line assertions intact and rerun the full clean-tree suite, not just the isolated tests.
- Risk: synthetic `dist` cleanup interferes with other tests.
  - Mitigation: only create the stub when missing and only delete the synthetic file created by the current test.
- Risk: docs-first drift delays the issue by overdesigning the fix.
  - Mitigation: keep the spec explicit that the primary implementation target is the harness unless contradicted by new evidence.

## Approvals
- Reviewer: pending parent docs-review + implementation review
- Date: 2026-04-18
