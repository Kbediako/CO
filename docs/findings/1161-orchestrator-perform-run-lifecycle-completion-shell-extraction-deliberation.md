# 1161 Deliberation - Orchestrator Perform-Run-Lifecycle Completion Shell Extraction

## Why This Slice

`1160` removed the execution-registration shell from `performRunLifecycle(...)`, leaving the next dense inline cluster immediately after successful execution. That remaining block is cohesive: it finalizes the scheduler plan, projects runtime/control metadata into the run summary, persists the summary, emits the completion event, and returns the final lifecycle payload.

## In Scope

- One bounded helper/service for the post-execution completion cluster
- Scheduler finalization
- Run-summary apply/projection steps
- Run-summary persistence
- Completion event emission
- Final `{ manifest, runSummary }` return assembly

## Out of Scope

- Control-plane guard execution
- Scheduler plan creation
- `manager.execute(...)` ownership or error-path `runError(...)` emission
- Public `start()` / `resume()` entrypoints
- Any Telegram / Linear / ControlServer work

## Why This Is Truthful

This is the smallest next seam adjacent to `1160`. It is downstream of execution, already grouped by behavior, and can be extracted without reopening upstream lifecycle ownership. A broader `performRunLifecycle(...)` refactor would collapse multiple distinct seams and make the slice less auditable.
