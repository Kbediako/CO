# PRD - CO: Investigate Core Lane vitest teardown hang after visible full-suite pass

## Added by Bootstrap 2026-03-30

## Traceability
- Linear issue: `CO-38` / `1e1a879a-42d2-4321-9a43-3ecc0ee7ce60`
- Linear URL: https://linear.app/asabeko/issue/CO-38/co-investigate-core-lane-vitest-teardown-hang-after-visible-full-suite
- Branch: `co-38-vitest-teardown-hang`

## Summary
- Problem Statement: The repo still reproduces a provider-worker-blocking full-suite teardown hang even though the earlier CO-24 mitigation for Vite's default middleware websocket listener is already present on this tree (`server.ws = false` in `vitest.config.core.ts` and `vitest.config.ts`). Current evidence from CO-26 and the scrubbed local worker environment shows `npm run test` can reach a visible late-suite near-pass state, then leave `vitest` idle in the event loop with lingering `esbuild`/watcher activity, which keeps `Core Lane` stuck in the `Test` step. CO-38 therefore must remeasure the current owner on the live tree instead of assuming the earlier `24678` websocket listener remains the whole story.
- Desired Outcome: Capture the current lingering-handle or watcher owner with durable evidence, land the smallest fix that restores terminal full-suite exit without reducing intended coverage, and verify that provider-worker PR heads reach a terminal `Core Lane` result instead of stalling indefinitely in `Test`.

## Evidence Update - 2026-03-30
- Fresh scrubbed local runs on the current workspace, detached `HEAD` baseline, and the cited PR `#320` head (`8f0bbb63d`) all exited cleanly with terminal Vitest summaries, so the original local teardown-hang hypothesis is not currently reproducible on those trees.
- GitHub Actions run `23712103211` on the cited PR head failed a specific CI test instead: `tests/cli-command-surface.spec.ts > prints pr ready-review help`, where `node --loader ts-node/esm bin/codex-orchestrator.ts pr ready-review --help` was killed by the test timeout with `signal: SIGTERM`.
- Implementation for this run therefore follows the evidence-backed blocker: make the `pr` help path cheaper and the bounded PR-help tests slightly more resilient under slow CI source execution, rather than keep assuming a lingering-handle failure that fresh repros did not confirm.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): finish `CO-38` by turning the current teardown hang from a vague post-suite symptom into a concrete, reproducible owner plus a bounded fix that makes local `npm run test` and GitHub `Core Lane` truthful again for provider-worker lanes.
- Success criteria / acceptance:
  - reproduce the scrubbed full-suite hang locally on the current tree
  - identify the specific lingering watcher, handle, server, or child-process owner with process/code-path evidence
  - land the smallest defensible fix that restores clean post-suite exit without reducing coverage
  - confirm a fresh PR head reaches a terminal `Core Lane` result
- Constraints / non-goals:
  - do not assume the old CO-24 websocket listener diagnosis still explains the live failure
  - do not reduce test coverage or hide the hang behind a blanket quiet-window kill
  - do not widen into unrelated harness churn or merge-shepherding work until the bounded owner is known

## Goals
- Reproduce the stuck full-suite exit locally under the scrubbed worker environment.
- Capture the current lingering-handle or watcher owner with durable evidence.
- Determine whether the live hang is a regression of the old Vite websocket path or a new owner introduced elsewhere.
- Land the smallest fix that restores terminal `npm run test` / `Core Lane` behavior.

## Non-Goals
- Reopening the entire CO-24 task as if its shipped fix never existed.
- Reducing suite scope or silently terminating Vitest after an arbitrary timeout.
- Broadly rewriting Vitest, Vite, or provider-worker validation infrastructure without strong evidence.

## Stakeholders
- Product: CO operator depending on truthful provider-worker validation
- Engineering: Codex / CO maintainers
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - local `npm run test` emits a terminal Vitest summary and exits cleanly after the visible suite pass
  - the current lingering owner is named with process/code-path evidence
  - a fresh PR head reaches a terminal `Core Lane` result
- Guardrails / Error Budgets:
  - keep the diff narrowly scoped to the actual owner and its cleanup/regression surface
  - preserve intended full-suite coverage and changed-area validation expectations
  - do not claim the blocker is resolved while the suite still hangs non-terminally

## User Experience
- Personas:
  - provider-worker author waiting on `Core Lane`
  - operator reviewing whether a late-suite green-looking run is actually complete
  - maintainer debugging repo-wide validation truth
- User Journeys:
  - an author runs `npm run test` locally and receives a truthful terminal result instead of an idle process
  - a provider-worker PR reaches terminal `Core Lane` status rather than hanging in `Test`
  - a reviewer can inspect the lane docs and see the exact owner, bounded fix, and validation outcome

## Technical Considerations
- Architectural Notes:
  - current tree already contains the older CO-24 websocket suppression in `vitest.config.core.ts` and `vitest.config.ts`
  - current issue evidence points at lingering `esbuild`/watcher activity with `fsevents.node` still alive after the visible suite pass
  - likely owners still include watcher/server helper seams, Vite/Vitest integrations, and late-suite child-process surfaces, but the lane must follow fresh evidence rather than historical wording
- Dependencies / Integrations:
  - `vitest.config.core.ts`
  - `vitest.config.ts`
  - late-suite test helpers in `tests/**` and `orchestrator/tests/**`
  - GitHub Actions `Core Lane`
  - local process inspection tools such as `ps`, `sample`, and port/handle inspection

## Open Questions
- Is the current hang a regression of the old Vite middleware listener path, or a different watcher/handle owner that survives despite `server.ws = false`?
- Does the smallest correct fix live in test cleanup, Vite/Vitest config, or production/runtime shutdown code exercised by the late suite?

## Approvals
- Product: Self-approved from the Linear issue scope and acceptance criteria
- Engineering: Pending docs-review and implementation validation
- Design: N/A
