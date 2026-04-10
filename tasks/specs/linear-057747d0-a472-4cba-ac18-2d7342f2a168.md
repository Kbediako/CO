---
id: 20260409-linear-057747d0-a472-4cba-ac18-2d7342f2a168
title: CO prefer fresh source CLI execution in source checkouts after merge
relates_to: docs/PRD-linear-057747d0-a472-4cba-ac18-2d7342f2a168.md
risk: high
owners:
  - Codex
last_review: 2026-04-09
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-057747d0-a472-4cba-ac18-2d7342f2a168.md`
- PRD: `docs/PRD-linear-057747d0-a472-4cba-ac18-2d7342f2a168.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-057747d0-a472-4cba-ac18-2d7342f2a168.md`
- Task checklist: `tasks/tasks-linear-057747d0-a472-4cba-ac18-2d7342f2a168.md`

## Traceability
- Linear issue: `CO-113` / `057747d0-a472-4cba-ac18-2d7342f2a168`
- Linear URL: https://linear.app/asabeko/issue/CO-113/co-make-source-checkouts-prefer-fresh-cli-source-after-merge-without

## Summary
- Objective: make source checkouts authoritative for fresh CLI/runtime execution after merge while keeping packaged installs dist-only and self-contained.
- Scope:
  - checked-in bootstrap bin for `codex-orchestrator` / `codex-orch`
  - source-aware launch resolution for provider worker, provider child stream, provider child lane, and helper-command surfaces
  - explicit source-checkout config-fallback policy for repo-local validation paths
  - focused regressions plus `pack:smoke` updates
  - docs/workpad/task evidence for the chosen contract
- Constraints:
  - no `postinstall` / `prepare`
  - no git-hook-only solution
  - no reopening unrelated merge-closeout or provider-fallback ownership lanes

## Issue-Shaping Contract
- User-request translation carried forward: source checkouts must pick up merged TypeScript behavior after restart without a manual rebuild, and provider/delegation/helper surfaces must not silently keep using stale `dist`.
- Protected terms / exact artifact and surface names:
  - `codex-orchestrator`
  - `codex-orch`
  - `control-host`
  - provider child-stream
  - provider child-lane
  - delegation
  - `CODEX_ORCHESTRATOR_PACKAGE_ROOT`
  - `dist/`
- Nearby wrong interpretations to reject:
  - fix only the npm `bin` mapping and leave provider worker launches on stale `dist`
  - keep source-checkout package-config fallback ambient because packaged installs need fallback
  - require dev dependencies for published installs
- Explicit non-goals carried forward:
  - git-hook automation
  - `postinstall` / `prepare`
  - merge-closeout / review-policy rewrites

## Parity / Alignment Matrix
- Required for parity/alignment lanes; otherwise state `Not applicable`.
- Current truth:
  - top-level packaged bins point at built `dist`
  - source entrypoint exists but is not the default repo-root CLI/bin surface
  - provider child/delegation/helper surfaces still prefer `dist` when `CODEX_ORCHESTRATOR_PACKAGE_ROOT` is present
  - provider worker runner launch in `commandRunner` is hardwired to built `dist`
  - repo-local validation can still use packaged config fallback in source-checkout execution
- Reference truth:
  - source checkout should use source-backed execution after merge
  - packaged install should use dist-backed execution only
- Target truth / intended delta:
  - checked-in JS bootstrap chooses source in source checkout, dist in package installs
  - provider worker/child/helper surfaces route through the same contract
  - source-checkout config fallback becomes explicit or disabled by default for repo-local validation paths
- Explicitly out-of-scope differences:
  - package publishing layout beyond shipping the bootstrap bin
  - unrelated cloud/runtime/provider policy changes

## Readiness Gate
- Not done if:
  - any named source-checkout surface still resolves stale `dist` after merge
  - package-config fallback remains silent in the touched source-checkout validation seams
  - packaged installs need source files or `ts-node`
- Pre-implementation issue-quality review evidence:
  - the concrete stale-execution seams are already confirmed in the issue description and local audit: `package.json` bin mapping, provider child stream/lane launchers, helper-command guidance, and `commandRunner` provider worker stage resolution
  - adjacent `CO-42` work established a relevant boundary: repo-local validation must not silently inherit provider-only package-root/config state
- Safeguard ownership split:
  - this lane owns source-vs-dist resolution and explicit config-fallback posture
  - it does not own unrelated control-host dispatch/refresh logic or merge-closeout policies

## Technical Requirements
- Functional requirements:
  - `package.json` bin surfaces must route through a checked-in JS bootstrap that prefers source execution in a source checkout and falls back to `dist` in packaged installs
  - the bootstrap must emit an operator-visible warning when a source checkout cannot use source and falls back to `dist`
  - provider child stream and provider child lane launchers must invoke the checked-in bootstrap path (or an equivalent source-aware resolution) when `CODEX_ORCHESTRATOR_PACKAGE_ROOT` points at a source checkout
  - provider worker helper-command guidance must reference the checked-in bootstrap path instead of a hardwired `dist` bin path
  - `commandRunner` must resolve the provider worker runner from source in source checkouts and from built `dist` in packaged installs
  - the touched repo-local validation paths must not silently use packaged config fallback in source-checkout execution unless an explicit contract opts in
  - packaged installs must remain able to run without source files or dev dependencies
- Non-functional requirements (performance, reliability, security):
  - bootstrap overhead must remain bounded and transparent
  - warnings should only fire for source-checkout fallback, not normal packaged installs
  - the new contract must be testable in focused unit/integration coverage and downstream `pack:smoke`
- Interfaces / contracts:
  - `bin/codex-orchestrator.js` becomes the checked-in bootstrap contract
  - `package.json` bin mapping changes from `dist/bin/...` to the checked-in bootstrap
  - provider worker/child/helper surfaces use the bootstrap or equivalent source-aware runner resolution
  - config fallback remains explicit for packaged installs and explicit opt-in only when a source-checkout lane truly requires it

## Architecture & Data
- Architecture / design adjustments:
  - add a checked-in JS bootstrap under `bin/` that detects a source checkout by the presence of the source entrypoint and a resolvable local `ts-node/esm` loader, then spawns either the source entrypoint or built `dist`
  - update provider child stream/lane resolution to call `node <packageRoot>/bin/codex-orchestrator.js ...` instead of `node <packageRoot>/dist/bin/codex-orchestrator.js ...`
  - update provider worker helper-command text to point at the checked-in bootstrap path
  - replace the `commandRunner` provider worker runner hardwire with the same source-aware source-vs-dist decision for `providerLinearWorkerRunner`
  - tighten config fallback so touched source-checkout validation seams do not silently consume package-root config unless an explicit contract declares it
- Data model changes / migrations:
  - none; this is execution-path and config-fallback contract work
- External dependencies / integrations:
  - local `ts-node/esm` availability in source checkouts only
  - npm packaging via `files`/`bin`
  - existing provider-worker proof and prompt surfaces

## Validation Plan
- Tests / checks:
  - run audited child `docs-review` after packet registration and record the manifest-backed result or truthful fallback
  - focused command-runner/provider child/provider prompt tests for source-aware invocation
  - focused config-fallback tests for source-checkout validation paths
  - focused CLI bootstrap/packaging tests plus `npm run pack:smoke`
  - required repo validation floor for the final diff
- Rollout verification:
  - prove source-checkout restart picks up fresh TypeScript without a manual rebuild
  - prove packaged install still resolves the shipped JS entrypoint without source files or `ts-node`
  - refresh the single Linear workpad after docs, implementation, validation, and handoff
- Monitoring / alerts:
  - keep manual artifacts under `out/linear-057747d0-a472-4cba-ac18-2d7342f2a168/manual/`
  - preserve explicit fallback warnings and review notes in the workpad/task packet

## Open Questions
- Whether the explicit source-checkout package-fallback contract should be an env flag, a targeted call-site option, or both for the touched seams.

## Approvals
- Reviewer: Rework rerun docs gates are clean after the repo-supported `docs/TASKS.md` archive trim, but the child stream forced review ended `failed-other` with `termination_boundary: null` because the selected model was at capacity; manual docs-review fallback recorded in `out/linear-057747d0-a472-4cba-ac18-2d7342f2a168/manual/20260409T095801Z-docs-review-fallback.md`. Implementation validation, full-suite rerun, standalone review, `pack:smoke`, and explicit elegance pass are now clean; PR/handoff pending.
- Date: 2026-04-09
