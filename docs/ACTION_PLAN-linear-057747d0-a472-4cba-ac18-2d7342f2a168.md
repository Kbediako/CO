# ACTION_PLAN - CO: Prefer fresh source CLI execution in source checkouts after merge

## Added by Bootstrap 2026-04-09

## Traceability
- Linear issue: `CO-113` / `057747d0-a472-4cba-ac18-2d7342f2a168`
- Linear URL: https://linear.app/asabeko/issue/CO-113/co-make-source-checkouts-prefer-fresh-cli-source-after-merge-without

## Summary
- Goal: finish `CO-113` by making source checkouts the authoritative execution surface after merge without breaking packaged installs.
- Scope: docs-first packet, audited child docs-review, source-aware bootstrap/runner implementation, focused regressions, `pack:smoke`, required validation, review/elegance passes, and workpad refreshes.
- Assumptions:
  - the source entrypoint already exists and only needs a checked-in bootstrap contract plus downstream launch alignment
  - packaged installs should continue to rely on built JS only
  - the package-root/config-fallback seam can be fixed narrowly without reopening unrelated fallback policy

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - preserve `codex-orchestrator`, `codex-orch`, `control-host`, provider child-stream, provider child-lane, delegation, `CODEX_ORCHESTRATOR_PACKAGE_ROOT`, `dist/`, and `npm run build`
  - reject "just rebuild automatically" and "top-level CLI only"
- Not done if:
  - any named source-checkout surface still executes stale `dist`
  - silent packaged config fallback remains in the touched source-checkout validation seams
  - packaged installs need repo-only source/dev tooling
- Pre-implementation issue-quality review:
  - the live issue plus local audit already identify the bounded seams: npm bin mapping, provider child launchers, provider worker runner resolution, helper-command guidance, and package-config fallback

## Milestones & Sequencing
1. Register the `CO-113` docs-first packet, task registry entry, docs freshness registry entries, task mirror, and initial workpad source file.
2. Run `linear child-stream --pipeline docs-review --stream co-113-docs-review --format json` and record the manifest-backed result or truthful fallback if only repo-baseline docs freshness blocks.
3. Implement the checked-in bootstrap bin plus source-aware runner resolution for provider worker, child stream, child lane, and helper-command surfaces.
4. Tighten the touched source-checkout config-fallback seam so repo-local validation paths do not silently consume packaged config or inherited provider snapshots.
5. Add or update focused regressions for bootstrap selection, provider launch consistency, helper-command text, provider worker runner resolution, and config-fallback behavior.
6. Update packaging/downstream coverage so `pack:smoke` proves packaged installs remain dist-only and self-contained.
7. Run required validation, standalone review, and elegance review, then refresh the workpad for PR/review handoff.

## Dependencies
- `package.json`
- `bin/codex-orchestrator.ts`
- `orchestrator/src/cli/services/commandRunner.ts`
- `orchestrator/src/cli/providerLinearChildStreamShell.ts`
- `orchestrator/src/cli/providerLinearChildLaneShell.ts`
- `orchestrator/src/cli/providerLinearWorkerRunner.ts`
- `orchestrator/src/cli/config/userConfig.ts`
- `scripts/pack-audit.mjs`
- `scripts/pack-smoke.mjs`

## Validation
- Checks / tests:
  - `MCP_RUNNER_TASK_ID=linear-057747d0-a472-4cba-ac18-2d7342f2a168 "/opt/homebrew/Cellar/node/25.2.1/bin/node" "/Users/kbediako/Code/CO/dist/bin/codex-orchestrator.js" linear child-stream --pipeline docs-review --stream co-113-docs-review --format json`
  - focused Vitest coverage for provider child stream/lane and provider worker runner prompt/launch resolution
  - focused config-fallback coverage for source-checkout validation seams
  - `MCP_RUNNER_TASK_ID=linear-057747d0-a472-4cba-ac18-2d7342f2a168 node scripts/delegation-guard.mjs`
  - `MCP_RUNNER_TASK_ID=linear-057747d0-a472-4cba-ac18-2d7342f2a168 node scripts/spec-guard.mjs --dry-run`
  - `MCP_RUNNER_TASK_ID=linear-057747d0-a472-4cba-ac18-2d7342f2a168 npm run build`
  - `MCP_RUNNER_TASK_ID=linear-057747d0-a472-4cba-ac18-2d7342f2a168 npm run lint`
  - `MCP_RUNNER_TASK_ID=linear-057747d0-a472-4cba-ac18-2d7342f2a168 npm run test`
  - `MCP_RUNNER_TASK_ID=linear-057747d0-a472-4cba-ac18-2d7342f2a168 npm run docs:check`
  - `MCP_RUNNER_TASK_ID=linear-057747d0-a472-4cba-ac18-2d7342f2a168 npm run docs:freshness`
  - `MCP_RUNNER_TASK_ID=linear-057747d0-a472-4cba-ac18-2d7342f2a168 node scripts/diff-budget.mjs`
  - `MCP_RUNNER_TASK_ID=linear-057747d0-a472-4cba-ac18-2d7342f2a168 FORCE_CODEX_REVIEW=1 npm run review`
  - `MCP_RUNNER_TASK_ID=linear-057747d0-a472-4cba-ac18-2d7342f2a168 npm run pack:smoke`
- Rollback plan:
  - revert the bootstrap/runner resolution change if packaged-install self-containment regresses
  - keep the issue active until all named source-checkout surfaces use the same contract and the config-fallback seam is explicit

## Risks & Mitigations
- Risk: fixing only the top-level bin leaves provider worker or child launchers on stale `dist`.
  - Mitigation: cover provider worker stage resolution plus child stream/lane launchers in the same lane and focused tests.
- Risk: tightening fallback policy breaks packaged-install compatibility.
  - Mitigation: keep packaged installs on the shipped bootstrap/dist contract and validate with `pack:smoke`.
- Risk: source-checkout fallback warnings become noisy.
  - Mitigation: emit warnings only when the checkout looks like a source checkout but the source runtime is unavailable and the launcher must fall back to `dist`.

## Approvals
- Reviewer: Docs-review approval is recorded via rerun child-stream manifest `.runs/linear-057747d0-a472-4cba-ac18-2d7342f2a168-co-113-docs-review-rerun/cli/2026-04-09T09-58-01-151Z-f0aa9682/manifest.json`; forced review telemetry `.runs/linear-057747d0-a472-4cba-ac18-2d7342f2a168-co-113-docs-review-rerun/cli/2026-04-09T09-58-01-151Z-f0aa9682/review/telemetry.json` ended `failed-other` after docs gates cleared, so the accepted fallback note is `out/linear-057747d0-a472-4cba-ac18-2d7342f2a168/manual/20260409T095801Z-docs-review-fallback.md`. Review-thread follow-up validation is in progress on PR `#393`.
- Date: 2026-04-09
