---
id: 20260330-linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60
title: CO: Investigate Core Lane vitest teardown hang after visible full-suite pass
relates_to: docs/PRD-linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60.md
risk: high
owners:
  - Codex
last_review: 2026-03-30
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60.md`
- PRD: `docs/PRD-linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60.md`
- Task checklist: `tasks/tasks-linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60.md`

## Traceability
- Linear issue: `CO-38` / `1e1a879a-42d2-4321-9a43-3ecc0ee7ce60`
- Linear URL: https://linear.app/asabeko/issue/CO-38/co-investigate-core-lane-vitest-teardown-hang-after-visible-full-suite

## Summary
- Objective: Reproduce and remove the current lingering-handle path that leaves full-suite `npm run test` and GitHub `Core Lane` stuck after the visible suite pass, starting from a tree where the earlier CO-24 websocket-listener mitigation is already present.
- Scope:
  - docs-first registration for `CO-38`
  - fresh scrubbed-environment repro and durable owner evidence
  - bounded comparison against the earlier CO-24 fix baseline
  - the smallest fix plus focused regressions and full validation
  - normal PR/review handoff once terminal behavior is restored
- Constraints:
  - keep the lane narrowly focused on the current owner
  - preserve test coverage and authoritative validation semantics
  - do not replace a real fix with a silent timeout/kill workaround

## Evidence Update - 2026-03-30
- Fresh scrubbed local runs on the current workspace, detached `HEAD` baseline, and the cited PR `#320` head all exited cleanly with terminal summaries.
- GitHub run `23712103211` failed a specific command-surface test instead: `tests/cli-command-surface.spec.ts > prints pr ready-review help`, where `node --loader ts-node/esm bin/codex-orchestrator.ts pr ready-review --help` was killed by the test timeout with `signal: SIGTERM`.
- The live implementation target for this run is therefore the bounded PR help path / test-timeout seam, not a locally reproducible lingering-handle hang.

## Technical Requirements
- Functional requirements:
  - reproduce the current hang locally using the scrubbed worker environment described in the issue
  - capture concrete evidence for the lingering owner using process/handle/code-path inspection
  - determine whether the current owner is the prior Vite websocket path regressing or a different lingering watcher/handle
  - implement the smallest responsible fix that restores clean full-suite exit
  - prove the fix with focused seam validation, full `npm run test`, and a fresh PR head `Core Lane` result
- Non-functional requirements (performance, reliability, security):
  - keep teardown deterministic in non-interactive worker/CI runs
  - avoid broad harness rewrites or weakening validation truth
  - keep artifacts and state transitions auditable via docs, workpad, manifests, and logs
- Interfaces / contracts:
  - `npm run test` remains the authoritative local equivalent of `Core Lane` for this lane
  - `Core Lane` must reach a terminal success/failure result on the fresh PR head
  - any residual limitation must be explicit in docs/workpad evidence rather than hidden by wrapper logic

## Architecture & Data
- Architecture / design adjustments:
  - treat the earlier CO-24 websocket suppression as baseline, not as proof that the current owner is solved
  - inspect late-suite watcher/server/child-process seams first because current evidence points at lingering `esbuild`/watcher activity
  - prefer exact teardown cleanup or config suppression at the proven owner over outer supervision or blanket process termination
- Data model changes / migrations:
  - none expected
- External dependencies / integrations:
  - Vitest / Vite middleware-mode runtime
  - Node process and filesystem watcher behavior on macOS
  - GitHub Actions `Core Lane`

## Validation Plan
- Tests / checks:
  - `linear child-stream --pipeline docs-review` before implementation
  - scrubbed local repro with process/handle capture
  - focused regressions for the identified owner
  - full repo validation floor, including `npm run test`
  - manifest-backed standalone review and explicit elegance pass before review handoff
- Rollout verification:
  - local `npm run test` prints a terminal Vitest footer and exits
  - no lingering known owner remains after the suite exits
  - fresh PR head `Core Lane` reaches a terminal result
- Monitoring / alerts:
  - durable manual notes under `out/linear-1e1a879a-42d2-4321-9a43-3ecc0ee7ce60/manual/`
  - workpad refreshed after docs-first, repro, fix, and handoff milestones

## Open Questions
- Which exact watcher or handle keeps the event loop alive on the current tree?
- Is the fix purely config/test cleanup, or does a production-owned runtime lifecycle seam still leak into the suite?

## Approvals
- Reviewer: Pending docs-review
- Date: 2026-03-30
