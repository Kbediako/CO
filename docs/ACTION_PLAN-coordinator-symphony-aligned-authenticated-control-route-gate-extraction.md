# ACTION_PLAN - Coordinator Symphony-Aligned Authenticated Control Route Gate Extraction

## Phase 1 - Docs / Boundary Confirmation

- Refresh PRD / TECH_SPEC / ACTION_PLAN / task mirrors for `1062`.
- Record the next `controlServer.ts` seam as the authenticated control-route gate after `1057`.
- Preserve the explicit CO authority boundary in the task docs instead of copying Symphony literally.

## Phase 2 - Gate Extraction

- Add a dedicated authenticated control-route gate module under `orchestrator/src/cli/control/`.
- Move auth token resolution, unauthorized rejection mapping, CSRF enforcement, and runner-only gating into that module.
- Reduce `controlServer.ts` to public-route ordering, gate invocation, and controller dispatch.

## Phase 3 - Validation / Closeout

- Add direct gate coverage and confirm targeted `ControlServer` regressions still pass.
- Run the standard validation lane and record any honest delegation/docs-review/review overrides.
- Sync task/docs mirrors to completed and record the next bounded seam after the gate extraction.
