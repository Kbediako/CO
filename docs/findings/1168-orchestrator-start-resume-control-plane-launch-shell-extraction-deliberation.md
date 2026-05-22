# 1168 Deliberation Findings

- Date: 2026-03-14
- Task: `1168-coordinator-symphony-aligned-orchestrator-start-resume-control-plane-launch-shell-extraction`

## Decision

Proceed with a narrow extraction of the shared `start()` / `resume()` control-plane launch shell into one adjacent helper.

## Why This Slice

- The duplicated lifecycle wrapper in `start()` and `resume()` is still real after `1167`.
- The shared steps are cohesive: emitter selection, control-plane startup, `runEvents` creation, `performRunLifecycle(...)`, and guaranteed close.
- The only meaningful divergence is `resume()`'s pre-start failure persistence path, which fits a small optional hook instead of keeping the entire wrapper duplicated.
- Existing CLI and cleanup-order coverage makes this seam verifiable without reopening broader lifecycle or routing refactors.

## Guardrails

- Do not move start/resume preparation into the new helper.
- Do not alter `resume-pre-start-failed` status persistence behavior.
- Do not change control-plane startup ordering or cleanup ordering.
- Keep the helper narrow and adjacent to the public-entry shell.
