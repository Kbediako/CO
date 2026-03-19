# ACTION_PLAN - Coordinator Symphony-Aligned Standalone Review Execution State Extraction

## Phase 1 - Docs / Boundary Confirmation

- Refresh PRD / TECH_SPEC / ACTION_PLAN / task mirrors for `1058`.
- Record the structural lesson from real Symphony as “single state owner plus thin controller/projection layers,” not a literal wrapper port.
- Keep the slice explicitly separate from the active `1057` control-action controller work.

## Phase 2 - Execution State Extraction

- Add a dedicated review execution state/monitor module.
- Refactor `scripts/run-review.ts` to consume that module for live enforcement, checkpoints, telemetry persistence, and failure summaries.
- Keep the wrapper shell responsible for prompt/runtime/launch/retry orchestration only.

## Phase 3 - Validation / Closeout

- Add direct snapshot/projection tests plus targeted wrapper regressions.
- Revalidate downstream pack-smoke behavior because the review-wrapper surface ships to npm users.
- Sync docs/task mirrors to completed and record any remaining review-policy follow-up separately if needed.
