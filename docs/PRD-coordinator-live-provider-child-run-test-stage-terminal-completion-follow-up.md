# PRD - Coordinator Live Provider Child-Run Test-Stage Terminal Completion Follow-Up

## Added by Bootstrap 2026-03-20

## Summary
- Problem Statement: `1306` fixed the concrete `04-test` assertion regressions, and focused suites plus `delegation-guard`, `spec-guard`, `build`, and `lint` now pass on the current tree. Fresh follow-up validation refined the blocker: [`tests/cli-orchestrator.spec.ts`](../tests/cli-orchestrator.spec.ts) exits cleanly on its own, but the long quiet tail in `npm run test` remains concentrated in [`tests/cli-command-surface.spec.ts`](../tests/cli-command-surface.spec.ts), which keeps spawning real `codex-orchestrator.ts` child commands under ambient runtime selection. Under full-suite load, the same run also surfaced one timing-sensitive audit-log assertion in [`orchestrator/tests/CloudSyncWorker.test.ts`](../orchestrator/tests/CloudSyncWorker.test.ts), so this lane first removes ambient runtime drag from command-surface subprocess coverage and then re-evaluates any residual blocker.
- Desired Outcome: Register a truthful new follow-up lane that makes the CLI subprocess tests hermetic with respect to runtime selection, restores a clean terminal `npm run test`, and reruns the live provider-started child run until it moves beyond the current test-stage boundary or exposes the next exact blocker.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): Carry the next provider follow-up lane end to end, stay docs-first, use delegated read-only analysis early, fix the smallest real cause of the post-`1306` test-stage non-return, and only claim success if the live provider-started child run gets further than the current `test` stage.
- Success criteria / acceptance:
  - a new truthful follow-up lane exists as `1307`
  - the lane describes the blocker as test-stage terminal completion / hermetic CLI subprocess coverage, not as a reopened provider contract defect
  - `npm run test` returns cleanly on the implementation tree
  - the live provider-started child run still clears `delegation-guard`, `build`, `lint`, and `test`, or the next downstream blocker is captured exactly
- Constraints / non-goals:
  - do not reopen provider setup, provider-intake authority, or the `1305`/`1306` contract fixes unless fresh evidence forces that
  - do not weaken runtime-provider behavior in shipped code just to speed tests
  - do not claim a green lane without a fresh live rerun or exact blocker evidence

## Goals
- Restore a clean, terminal `npm run test` gate on top of the `1306` tree.
- Keep CLI subprocess command-surface tests deterministic and independent of the operator's live appserver/login state unless a test explicitly opts into that behavior.
- Push the live provider-started child run beyond the current `test`-stage boundary.

## Non-Goals
- Redesigning runtime selection or appserver preflight semantics for production flows.
- Reopening the provider-intake claim contract or `delegation-guard` proof model.
- Broad test-suite performance work outside the concrete terminal-completion blocker.

## Stakeholders
- Product: CO operator
- Engineering: Codex
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - `npm run test` returns terminal success on the implementation tree
  - isolated CLI subprocess coverage no longer depends on ambient appserver/login state
  - the live provider child run progresses beyond the prior `stage:test:*` boundary
- Guardrails / Error Budgets:
  - runtime-provider behavior remains covered by the dedicated runtime/provider tests rather than ambient subprocess behavior
  - any runtime pinning stays in test harnesses or other non-production surfaces unless stronger evidence requires a runtime-code fix
  - stop at the first new downstream blocker after the current `test` stage

## User Experience
- Personas: CO operator validating the real provider-driven autonomous run path
- User Journeys:
  - the local repo validation floor finishes without a manual kill after `npm run test`
  - CLI command-surface tests run under a deterministic runtime posture unless they explicitly override it
  - the real provider-started child run either gets beyond `test` or records the exact next blocker

## Technical Considerations
- Architectural Notes:
  - the strongest current signal is still in [`tests/cli-command-surface.spec.ts`](../tests/cli-command-surface.spec.ts), where `runCli(...)` launches subprocesses through `node --loader ts-node/esm bin/codex-orchestrator.ts ...`
  - fresh split-run evidence shows that the quiet long tail is in the command-surface suite, not in [`tests/cli-orchestrator.spec.ts`](../tests/cli-orchestrator.spec.ts), and that command-surface subprocesses continue to spawn real child commands such as `codex --help`, `start --help`, and `flow --task ...` while the parent Vitest worker remains active
  - those subprocesses currently inherit the default runtime-selection path from [`orchestrator/src/cli/runtime/provider.ts`](../orchestrator/src/cli/runtime/provider.ts), so ordinary CLI coverage can still trigger appserver/login probes even when the test is only checking CLI surface behavior
  - dedicated runtime-provider coverage already exists in [`orchestrator/tests/RuntimeProvider.test.ts`](../orchestrator/tests/RuntimeProvider.test.ts) and related runtime-shell tests, so command-surface tests do not need ambient appserver selection to preserve contract coverage
  - if hermetic runtime pinning is insufficient, the next most likely follow-up surfaces are either a genuinely slow command-surface subprocess path or a full-suite-only timing assertion such as the cloud-sync audit-log wait window
- Dependencies / Integrations:
  - current `1306` branch state
  - [`tests/cli-command-surface.spec.ts`](../tests/cli-command-surface.spec.ts)
  - [`orchestrator/src/cli/runtime/provider.ts`](../orchestrator/src/cli/runtime/provider.ts)
  - [`orchestrator/tests/RuntimeProvider.test.ts`](../orchestrator/tests/RuntimeProvider.test.ts)
  - live provider state under `.runs/local-mcp/cli/control-host/` and the reused provider child-run manifests under `.runs/linear-*/`

## Open Questions
- After hermetic runtime pinning in the CLI subprocess tests, does any residual long-tail or full-suite-only assertion failure remain in `npm run test`?
- Once the local `test` stage returns cleanly, does the live provider child run stop at `docs:check`, `docs:freshness`, `review`, `pack:smoke`, or complete cleanly?

## Approvals
- Product: Self-approved from operator directive and fresh isolated-test evidence
- Engineering: Codex docs-review approved on 2026-03-19. Evidence: `.runs/1307-coordinator-live-provider-child-run-test-stage-terminal-completion-follow-up/cli/2026-03-19T23-03-46-459Z-587c5d05/manifest.json`
- Design: N/A
