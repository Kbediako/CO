# Findings: 1165 Orchestrator Public Run-Entry Bootstrap-and-Handoff Reassessment

## Decision

- Approved as a docs-first reassessment lane, not as another directly implementable extraction lane.

## Why This Lane

- After `1164`, `performRunLifecycle(...)` is thin enough that another micro-helper would be artificial.
- The remaining design question is now the public run-entry lifecycle shared across `start()` and `resume()`.
- The highest-risk uncovered lifecycle contract is the `resume()` failure path after manifest reset/persist but before control-plane restart.

## Why Not Another Extraction Yet

- `start()` and `resume()` still look structurally similar, but they do different things at a semantic level.
- `start()` bootstraps a fresh run.
- `resume()` reloads persisted state, mutates the manifest into an in-progress/resuming shape, and only then attempts lifecycle restart.
- Forcing a shared helper before reassessing that distinction would risk creating a fake abstraction.

## Boundaries

### In scope

- Reassessment of the remaining public run-entry bootstrap / handoff surface
- Comparison of `start()` and `resume()` ownership after `1155`, `1156`, `1159`, and `1161` through `1164`
- Identification of the highest-risk uncovered lifecycle contract
- Naming the next truthful implementation slice

### Out of scope

- Further `performRunLifecycle(...)` micro-slicing
- Reopening recent control-plane or execution-lifecycle helpers
- Runtime-selection or execution-routing policy changes
- Immediate behavior changes in this reassessment lane

## Initial Conclusion

- The strongest current coverage is on `start()`, while the main uncovered public lifecycle risk is on `resume()`.
- The likely next implementation move is a narrower `resume()` lifecycle contract lane rather than a shared bootstrap helper, but that conclusion should be recorded explicitly by this reassessment.

## Evidence

- `orchestrator/src/cli/orchestrator.ts`
- `tests/cli-orchestrator.spec.ts`
- `out/1164-coordinator-symphony-aligned-orchestrator-perform-run-lifecycle-execution-and-run-error-shell-extraction/manual/20260313T220010Z-closeout/14-next-slice-note.md`
- delegated scout findings recorded in the parent run
