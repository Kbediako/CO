# TECH_SPEC - CO: remove clean-tree CLI test dependency on prebuilt dist entrypoint

## Summary
- Objective: make the `tests/cli-command-surface.spec.ts` setup/delegation apply-path coverage hermetic from a clean checkout while preserving the intended direct-dist delegation setup contract.
- Scope:
  - docs-first packet and registry/task mirrors
  - current-truth reproduction for the cold failure
  - one bounded command-surface test-harness fix
  - focused validation proving both cold and warmed paths still behave correctly
- Constraints:
  - preserve the exact protected issue wording
  - keep `CO-229` separate
  - do not change delegation setup away from the direct dist entrypoint contract

## Traceability
- Linear issue: `CO-236` / `f2c25700-a367-4e69-923f-cdf3e7f726be`
- Canonical spec: `tasks/specs/linear-f2c25700-a367-4e69-923f-cdf3e7f726be.md`
- Workpad source: `out/linear-f2c25700-a367-4e69-923f-cdf3e7f726be/manual/workpad.md`
- Source anchor: `ctx:sha256:55bbd81d18cf34c96d4d069e257260e0ca3c460478c7cbafb7ed3e1372bb3ade#chunk:c000001`
- Current origin manifest: `.runs/linear-f2c25700-a367-4e69-923f-cdf3e7f726be/cli/2026-04-18T10-17-30-911Z-84ff6b3d/manifest.json`

## Current Truth
- `npm run clean:dist` removes `dist`, including `dist/bin/codex-orchestrator.js`.
- Focused cold reproduction on the current branch is already confirmed:
  - `npm run test:orchestrator -- tests/cli-command-surface.spec.ts`
  - result: `115` tests run, `4` failures
  - failing cases:
    - `setup --yes keeps existing skill files by default`
    - `setup --yes --refresh-skills overwrites existing skill files`
    - `delegation setup --yes preserves explicit repo pin in mcp add command`
    - `delegation setup --yes reconfigures unpinned fallback entries when mcp get is unavailable`
  - repeated stderr: `Delegation MCP requires a built dist entrypoint for stdio startup; missing /Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js.`
- The failure path is test-surface-specific:
  - the four failing cases use `runCli(...)`, which executes the CLI in-process through `runEntrypointLikeExec(...)`
  - apply-mode setup enters `runDelegationSetup({ apply: true, ... })`
  - `runDelegationSetup(...)` calls `resolveDelegationServerInvocation({ allowMissingDist: false, ... })`
  - `resolveDelegationServerInvocation(...)` throws when `dist/bin/codex-orchestrator.js` is absent
- Warmed validation passes because `npm run build` restores `dist/bin/codex-orchestrator.js`, satisfying the apply-path existence guard.

## Issue-Shaping Contract
- User-request translation carried forward: this lane is about removing the hidden clean-tree prebuilt-dist dependency from CLI command-surface coverage, not about changing the delegation setup product contract and not about the `CO-229` doctor timeout cluster.
- Protected terms / exact artifact and surface names:
  - `tests/cli-command-surface.spec.ts`
  - `npm run clean:dist`
  - `npm run test`
  - `dist/bin/codex-orchestrator.js`
  - `Delegation MCP requires a built dist entrypoint for stdio startup`
- Nearby wrong interpretations to reject:
  - a product runtime change is required for delegation setup itself
  - the failing tests should be deleted or materially weakened
  - `CO-236` reopens the `CO-229` doctor timeout cluster
- Explicit non-goals carried forward:
  - no doctor-suite work
  - no direct-dist transport redesign
  - no unrelated delegation feature changes

## Proposed Design
- Add a narrow test helper that writes a functional synthetic `dist/bin/codex-orchestrator.js` proxy for the clean-tree apply-path tests in `tests/cli-command-surface.spec.ts`.
- Keep the helper local to the affected apply-path tests:
- mock the delegation direct-dist invocation only inside the four apply-path tests so they keep asserting the `dist/bin/codex-orchestrator.js` command shape without touching the repo `dist/` tree
- Preserve the current command-surface assertions:
  - tests still assert that the logged `codex mcp add delegation -- ...` command contains `dist/bin/codex-orchestrator.js`
  - apply-mode delegation setup still behaves as a direct-dist contract from the product perspective
- Keep the unrelated doctor direct-dist readiness test hermetic with a temp-local direct-dist responder script that exercises the real startup probe without depending on the repo `dist/` tree.
- Prefer the smallest edit surface:
  - primary owner file: `tests/cli-command-surface.spec.ts`
  - supporting owner file: `orchestrator/tests/Doctor.test.ts`
  - no production runtime code change unless a current-tree contradiction proves the harness-only fix insufficient

## Technical Requirements
- Functional requirements:
  1. Cold focused `tests/cli-command-surface.spec.ts` passes after `npm run clean:dist` without a manual build.
  2. The four apply-path tests keep their direct-dist command-line assertions.
  3. The test-only invocation mock does not mask real failures outside the missing-artifact dependency.
  4. Warmed coverage after `npm run build` still passes unchanged.
  5. Full clean-tree `npm run test` passes without the missing-dist failure.
- Non-functional requirements:
  - keep the diff reviewable and local to the command-surface harness where possible
  - do not introduce cross-worker filesystem races on the repo `dist/` tree
  - preserve existing temporary-directory cleanup behavior
- Interfaces / contracts:
  - `tests/cli-command-surface.spec.ts`
  - `orchestrator/tests/Doctor.test.ts`
  - `orchestrator/src/cli/delegationSetup.ts`
  - `orchestrator/src/cli/utils/delegationMcpHealth.ts`

## Architecture & Data
- Design adjustments:
  - use a test-only `resolveDelegationServerInvocation(...)` mock in the four apply-path tests rather than loosening the production existence check
  - keep the repo `dist/` tree untouched during the command-surface suite so other workers do not observe transient synthetic artifacts
  - keep the doctor direct-dist readiness test isolated from the repo `dist/` tree with a temp-local direct-dist responder that still exercises the real startup probe parsing path
- Data / artifact expectations:
  - clean-tree command-surface coverage stays source-only except for the mocked direct-dist command-line contract inside the four apply-path tests
  - the doctor test can materialize a temp-local executable under `dist/bin/codex-orchestrator.js`, but only inside its temp directory
- Out-of-scope differences:
  - delegation setup transport semantics
  - the `CO-229` doctor timeout cluster
  - `setup` behavior outside the tested clean-tree harness

## Validation Plan
- Reproduction:
  - `npm run clean:dist`
  - `npm run test:orchestrator -- tests/cli-command-surface.spec.ts`
- Focused post-fix checks:
  - rerun the same focused cold-state spec after `npm run clean:dist`
  - rerun the overlapping clean-tree surface for `tests/cli-command-surface.spec.ts`, `orchestrator/tests/Doctor.test.ts`, and `tests/cli-build-config.spec.ts`
- Final issue-closing checks:
  - `npm run clean:dist`
  - `npm run test`
  - required repo validation floor before handoff if the final diff remains non-trivial

## Approvals
- Reviewer: parent lane + docs-review before implementation
- Date: 2026-04-18
- Docs-review: `.runs/linear-f2c25700-a367-4e69-923f-cdf3e7f726be-co-236-docs-review/cli/2026-04-18T10-30-59-859Z-92e540e9/manifest.json` (`review/telemetry.json`: `status=succeeded`, `review_outcome=clean-success`)
