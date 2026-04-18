# PRD - CO: remove clean-tree CLI test dependency on prebuilt dist entrypoint

## Added by Parent Lane 2026-04-18

## Traceability
- Linear issue: `CO-236` / `f2c25700-a367-4e69-923f-cdf3e7f726be`
- Task id: `linear-f2c25700-a367-4e69-923f-cdf3e7f726be`
- Canonical TECH_SPEC: `tasks/specs/linear-f2c25700-a367-4e69-923f-cdf3e7f726be.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-f2c25700-a367-4e69-923f-cdf3e7f726be.md`
- Task checklist: `tasks/tasks-linear-f2c25700-a367-4e69-923f-cdf3e7f726be.md`
- Active workpad source: `out/linear-f2c25700-a367-4e69-923f-cdf3e7f726be/manual/workpad.md`
- Shared source anchor: `ctx:sha256:55bbd81d18cf34c96d4d069e257260e0ca3c460478c7cbafb7ed3e1372bb3ade#chunk:c000001`
- Origin manifest: `.runs/linear-f2c25700-a367-4e69-923f-cdf3e7f726be/cli/2026-04-18T10-17-30-911Z-84ff6b3d/manifest.json`

## Summary
- Problem Statement: after `npm run clean:dist`, a cold command-surface run fails in `tests/cli-command-surface.spec.ts` because four setup/delegation apply-path cases hit `Delegation MCP requires a built dist entrypoint for stdio startup; missing .../dist/bin/codex-orchestrator.js.` even though a warmed suite after `npm run build` passes.
- Desired Outcome: clean-tree `npm run test` no longer depends on a prebuilt `dist/bin/codex-orchestrator.js` for the CLI command-surface coverage that uses fake Codex wiring, while the product contract that delegation setup plans the direct dist entrypoint remains explicit and covered.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): keep `CO-236` tightly scoped to the clean-tree CLI validation cluster, reproduce the failure with current evidence, explain why warmed validation passes, and land the smallest fix that makes `tests/cli-command-surface.spec.ts` hermetic without deleting tests or reopening the `CO-229` doctor timeout work.
- Success criteria / acceptance:
  - reproduce the cold failure from the current workspace after `npm run clean:dist`
  - explain the cold-vs-warm split around `dist/bin/codex-orchestrator.js`
  - remove the hidden prebuilt-dist dependency from the intended test path
  - keep `CO-229` explicitly separate from this CLI test-surface follow-up
- Constraints / non-goals:
  - do not reopen `CO-229` doctor-suite timeout investigation
  - do not weaken coverage by deleting or watering down the failing tests
  - do not broaden into unrelated delegation feature or runtime behavior changes

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `tests/cli-command-surface.spec.ts`
  - `npm run test`
  - `clean-tree`
  - `prebuilt dist`
  - `dist/bin/codex-orchestrator.js`
- Protected terms / exact artifact and surface names:
  - `tests/cli-command-surface.spec.ts`
  - `npm run clean:dist`
  - `npm run test`
  - `dist/bin/codex-orchestrator.js`
  - `Delegation MCP requires a built dist entrypoint for stdio startup`
- Nearby wrong interpretations to reject:
  - this reopens the `CO-229` `Doctor.test.ts` timeout cluster
  - this means warmed full-suite validation is still failing in the same doctor cases
  - this should be solved by deleting the failing setup/delegation tests
  - this should change delegation setup away from the direct dist transport contract

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth |
| --- | --- | --- | --- |
| Cold command-surface coverage | After `npm run clean:dist`, focused `tests/cli-command-surface.spec.ts` fails 4 apply-path cases because `dist/bin/codex-orchestrator.js` is missing. | The command-surface suite should be runnable from a clean source checkout without a prebuilt dist artifact. | Cold focused coverage passes without requiring a manual `npm run build`. |
| Warmed coverage | `npm run build` restores `dist/bin/codex-orchestrator.js`, so the same suite passes. | Warmed coverage should continue to pass. | Warmed coverage still passes, but it is no longer required just to satisfy the hermetic CLI test path. |
| Delegation setup contract | Apply-mode delegation setup intentionally plans `node .../dist/bin/codex-orchestrator.js delegate-server --repo ...`. | The product contract should stay explicit that delegation MCP uses the direct dist entrypoint. | Tests keep asserting the direct dist command line while providing their own hermetic artifact/setup for fake apply scenarios. |
| Issue scope | The failing cluster sits in setup/delegation apply tests, not the old doctor timeout cases. | `CO-229` remains a separate doctor-suite stabilization issue. | `CO-236` closes only the clean-tree CLI coverage dependency without absorbing doctor timeout work. |

## Acceptance Criteria
- Reproduce the clean-tree `tests/cli-command-surface.spec.ts` failure with concrete current-workspace evidence.
- Explain why warmed validation passes while cold validation depends on `dist/bin/codex-orchestrator.js`.
- Land a bounded fix so the intended test path is hermetic or explicitly staged, with no accidental hidden dependency on a prebuilt `dist` entrypoint.
- Keep `CO-229` scoped to doctor-suite stabilization rather than absorbing this separate CLI validation cluster.

## Non-Goals
- No reopening of the `CO-229` doctor-suite timeout investigation.
- No change to the product-level delegation transport contract away from `dist/bin/codex-orchestrator.js`.
- No deletion or weakening of the setup/delegation command-surface assertions.
- No unrelated delegation feature, runtime, or control-host work.

## Not Done If
- A clean `npm run test` after `npm run clean:dist` still fails because `dist/bin/codex-orchestrator.js` is missing.
- The fix only masks the missing build artifact without making the CLI tests hermetic or intentionally staged.
- The change drifts into doctor-suite behavior or broader delegation behavior instead of the CLI command-surface cluster.

## Goals
- Preserve the direct-dist delegation setup command-line expectations.
- Make the clean-tree CLI command-surface tests self-sufficient.
- Keep the fix narrow enough that the likely implementation lives in the test harness rather than production runtime code.

## Technical Considerations
- Architectural Notes:
  - `tests/cli-command-surface.spec.ts` runs the failing cases through the in-process `runCli(...)` helper.
  - Apply-mode `runDelegationSetup(...)` calls `resolveDelegationServerInvocation({ allowMissingDist: false })`, which throws when `dist/bin/codex-orchestrator.js` is absent.
  - The failing tests use `writeFakeCodexBinary(...)` to log `codex mcp add ...`; they assert the planned direct-dist command line but do not actually need a built delegate-server implementation.
- Dependencies / Integrations:
  - `tests/cli-command-surface.spec.ts`
  - `tests/helpers/inProcessEntrypoint.ts`
  - `orchestrator/src/cli/delegationSetup.ts`
  - `orchestrator/src/cli/utils/delegationMcpHealth.ts`

## Open Questions
- Resolved during investigation unless current-tree evidence disagrees: prefer a test-harness artifact/staging fix over a product behavior change if that preserves the direct-dist contract and removes the clean-tree dependency.
