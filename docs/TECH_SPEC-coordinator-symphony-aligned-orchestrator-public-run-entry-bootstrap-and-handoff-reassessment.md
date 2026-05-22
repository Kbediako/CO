# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Public Run-Entry Bootstrap-and-Handoff Reassessment

- Date: 2026-03-14
- Owner: Codex (top-level agent)
- Task: `1165-coordinator-symphony-aligned-orchestrator-public-run-entry-bootstrap-and-handoff-reassessment`
- Status: Draft

## Background

`performRunLifecycle(...)` is no longer the right place to keep extracting helpers after `1164`. The remaining meaningful design pressure is now the public run-entry lifecycle shared by `start()` and `resume()`.

Both entrypoints still perform a similar high-level sequence:

1. prepare or load run state
2. resolve runtime-mode intent
3. prepare/persist manifest state
4. start the control plane
5. create run-event publishing
6. hand off to `performRunLifecycle(...)`
7. close lifecycle resources

However, `resume()` also mutates previously persisted manifest state before the control plane restarts. That makes it the highest-risk boundary and the least safe place to force a fake shared helper.

## Scope

- Reassess the remaining public run-entry bootstrap / handoff shape across `start()` and `resume()`
- Compare:
  - prepare/load ownership
  - manifest / persister setup
  - runtime-mode application
  - control-plane startup
  - run-event publisher creation
  - `performRunLifecycle(...)` handoff
  - teardown / cleanup
- Inspect current public coverage for those entrypoints, especially `resume()` failure semantics
- Record the next truthful implementation seam or contract lane

## Out of Scope

- Another helper extraction inside `performRunLifecycle(...)`
- Any behavior change to `start()` or `resume()` during this reassessment
- Control-plane lifecycle extraction follow-ups already closed in `1155`
- Shared local/cloud execution lifecycle or routing work from `1156` / `1159`
- Executor, runtime selection, or fallback policy changes

## Proposed Approach

1. Compare the current `start()` and `resume()` entrypoint sequences in `orchestrator/src/cli/orchestrator.ts`.
2. Cross-check recent extracted helpers and current public tests to distinguish real overlap from merely similar ordering.
3. Identify the highest-risk uncovered public lifecycle contract.
4. Decide whether the next truthful move is:
   - a shared public bootstrap / handoff helper,
   - a narrower `resume()` lifecycle contract lane,
   - or an explicit no-shared-helper conclusion with targeted coverage/fix follow-up.
5. Record the result in task docs and the next-slice note without reopening completed seams.

## Validation

- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- manifest-backed `docs-review` or an explicit override

## Risks

- Forcing a shared helper across materially different `start()` vs `resume()` semantics would be a design regression, not progress.
- Treating the uncovered `resume()` failure path as “just a test gap” could hide a real manifest-lifecycle correctness issue.
- Reopening prior extraction seams would erase the value of the recent Symphony-aligned narrowing work.
