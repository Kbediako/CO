# PRD: Coordinator Symphony-Aligned Orchestrator Public Run-Entry Bootstrap-and-Handoff Reassessment

- Date: 2026-03-14
- Owner: Codex (top-level agent)
- Task: `1165-coordinator-symphony-aligned-orchestrator-public-run-entry-bootstrap-and-handoff-reassessment`

## Background

After `1155`, `1156`, `1159`, and `1161` through `1164`, the remaining non-trivial orchestrator boundary is no longer inside `performRunLifecycle(...)`. That method is now thin enough that another extraction would be artificial.

The real remaining design question is the public run-entry surface shared across `start()` and `resume()` in `orchestrator/src/cli/orchestrator.ts`:

- prepare/load split
- manifest and persister setup
- runtime-mode application
- control-plane startup
- run-event publisher creation
- `performRunLifecycle(...)` handoff
- cleanup / teardown

The two entrypoints still look structurally similar, but their semantics differ materially. `start()` bootstraps a fresh run. `resume()` reloads and mutates persisted state before handoff. The next lane must determine whether any truthful shared seam remains, or whether the safer next move is a narrower contract around the uncovered `resume()` failure path.

## Goal

Reassess the remaining public run-entry bootstrap / handoff surface across `start()` and `resume()` and record the next truthful Symphony-aligned move, with explicit attention to the highest-risk uncovered lifecycle contract on `resume()`.

## Non-Goals

- Further micro-slicing inside `performRunLifecycle(...)`
- Reopening `orchestratorControlPlaneLifecycle.ts`
- Reopening `orchestratorExecutionLifecycle.ts`
- Reworking local/cloud executor routing or runtime selection policy
- Changing resume-token validation, manifest reset semantics, or execution-mode fallback behavior in this reassessment lane

## Success Criteria

- The docs compare the remaining `start()` and `resume()` phases and state where ownership still meaningfully overlaps versus where semantics diverge.
- The reassessment records whether a truthful shared public helper still exists.
- The highest-risk uncovered lifecycle contract is stated explicitly, including the current `resume()` failure path after manifest reset/persist but before control-plane restart.
- The next slice is named precisely enough to implement without reopening completed `1155`, `1156`, `1159`, or `1161` through `1164` boundaries.
