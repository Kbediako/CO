# PRD - CO-499 classify terminal Codex connector failures in ready-review

## Traceability
- Linear issue: `CO-499`
- Linear issue id: `07fdd989-5c10-4b24-ab5d-10fa9bf3732f`
- Task id: `linear-07fdd989-5c10-4b24-ab5d-10fa9bf3732f`
- Canonical owner key: `pr-ready-review-codex-terminal-failure-clearance`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=pr-ready-review-codex-terminal-failure-clearance`
- Source issue: `CO-475`
- Source PR: `#767`
- Canonical task spec: `tasks/specs/linear-07fdd989-5c10-4b24-ab5d-10fa9bf3732f.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-07fdd989-5c10-4b24-ab5d-10fa9bf3732f.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-07fdd989-5c10-4b24-ab5d-10fa9bf3732f.md`
- Task checklist: `tasks/tasks-linear-07fdd989-5c10-4b24-ab5d-10fa9bf3732f.md`

## Summary
- Problem Statement: `codex-orchestrator pr ready-review` can keep reporting `bot_rereview_pending=codex` after `chatgpt-codex-connector` has already posted a terminal failure comment such as `Codex Review: Something went wrong. Try again later by commenting @codex review.` On CO-475 PR #767, all other review-readiness gates were clean, but the monitor had no distinct terminal-failure state for the Codex connector.
- Desired Outcome: `ready-review` distinguishes active Codex review work, terminal Codex connector failure, and clean/no-pending states. Terminal connector failure must not look like an indefinitely pending review, and operator-facing output must make the next action explicit without hiding real blockers.

## User Request Translation
- User intent / needs: The operator wants CO to notice when Codex review did not actually complete or did not auto-trigger, then orchestrate an explicit manual `@codex review` trigger when needed. The current lane owns the ready-review classifier for terminal Codex connector failures; the operator loop still owns manual pings using the existing one-ping-per-PR-head discipline.
- Success criteria / acceptance:
  - A fixture where a human requests `@codex review` and `chatgpt-codex-connector` responds with a terminal failure is classified separately from an active pending Codex review.
  - `ready-review` output names a distinct terminal failure reason, for example `bot_rereview_terminal_failure=codex(...)`, or an equivalent waiver/manual-trigger-needed state.
  - Active in-progress Codex reviews still block as `bot_rereview_pending=codex`.
  - Missing auto-trigger evidence remains operator-visible so the parent orchestrator can manually comment `@codex review` when appropriate.
  - Required checks, merge-state checks, unresolved review threads, unacknowledged bot feedback, `CHANGES_REQUESTED`, and CodeRabbit actionable feedback remain independent blockers.
- Constraints / non-goals:
  - Do not change CO-475 docs wording.
  - Do not delete, edit, or hide GitHub comments.
  - Do not ignore active in-progress Codex reviews.
  - Do not weaken CodeRabbit, required-check, unresolved-thread, or unacknowledged-feedback gates.
  - Do not automatically spam `@codex`; manual trigger policy remains at most one `@codex` ping per PR head SHA.

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `codex review hasn't been triggering`
  - `manually triggered`
  - `eyes emoji reaction`
  - `thumbs up`
  - `Codex Review: Something went wrong. Try again later by commenting @codex review.`
  - `bot_rereview_pending=codex`
- Protected terms / exact artifact and surface names:
  - `pr ready-review`
  - `codex-orchestrator pr ready-review`
  - `scripts/lib/pr-watch-merge.js`
  - `tests/pr-watch-merge.spec.ts`
  - `chatgpt-codex-connector`
  - `@codex review`
  - `bot_rereview_pending=codex`
  - `bot_rereview_terminal_failure`
  - `terminal failure comment`
  - `unknown error`
  - `CodeRabbit approval`
  - `local standalone review`
  - `unresolved_threads`
  - `unacknowledged_bot_feedback`
  - `CHANGES_REQUESTED`
- Nearby wrong interpretations to reject:
  - treating a terminal connector failure as a clean review approval
  - treating an active Codex review as terminal merely because an older failure comment exists
  - weakening or skipping required checks to move a PR through handoff
  - ignoring unresolved threads or unacknowledged bot feedback because the Codex connector failed
  - making CO-475 own the monitor implementation
  - deleting GitHub comments or manually resolving threads as a workaround
  - auto-triggering repeated `@codex` pings on the same PR head

## Ready-Review Classification Matrix
| Surface | Current truth | Reference truth | Target truth | Explicitly out of scope |
| --- | --- | --- | --- | --- |
| Active Codex review | `bot_rereview_pending=codex` is used for pending review work. | Pending review work must block handoff. | Active/in-progress Codex reviews continue to block. | Making pending Codex review advisory-only. |
| Terminal Codex connector failure | A terminal failure comment can leave the same pending reason active forever. | Terminal failure is not active review work and needs operator action or waiver. | Terminal failure is classified distinctly and does not masquerade as indefinite pending. | Treating failure as approval. |
| Missing auto-trigger reaction | Operators infer auto-trigger from the PR body `eyes` reaction and completion from `+1` or feedback. | Missing reaction means parent orchestration may need one manual trigger. | The implementation leaves enough output/state for the parent to decide on a manual `@codex review` trigger. | Automating repeated pings inside the watcher. |
| Required checks and merge state | Existing gates block independently. | Green checks and clean merge state are required but not sufficient if review blockers remain. | Existing check and merge blockers remain unchanged. | Broad required-check policy changes. |
| Review feedback | Unresolved threads, unacknowledged bot feedback, and `CHANGES_REQUESTED` block. | Real actionable feedback must stay blocking. | Existing feedback blockers remain unchanged. | Hiding or auto-resolving comments. |
| CodeRabbit approval | CodeRabbit status/review can be green while Codex failed. | CodeRabbit proof does not substitute for Codex connector state. | CodeRabbit gates stay separate and unchanged. | Reclassifying CodeRabbit behavior. |

## Not Done If
- `ready-review` can still wait forever on `bot_rereview_pending=codex` after the latest relevant `chatgpt-codex-connector` response is terminal failure.
- Active in-progress Codex reviews are treated as clean or terminal.
- Terminal failure is treated as approval.
- Unacknowledged bot feedback, unresolved threads, failed checks, dirty merge state, or `CHANGES_REQUESTED` reviews are hidden.
- Operator output does not make the manual-trigger or waiver-needed state visible.
- The implementation changes CO-475 wording or deletes/edits GitHub comments.

## Goals
- Add a deterministic terminal Codex connector failure classifier for `ready-review`.
- Keep active Codex review requests blocking until completion, feedback, or terminal failure evidence exists.
- Surface terminal failure as a distinct reason for operator action.
- Add focused regression coverage for the CO-475 PR #767 comment sequence shape.
- Preserve all existing independent review-readiness gates.

## Non-Goals
- No CO-475 docs wording changes.
- No broad review-wrapper or provider-worker redesign.
- No automatic repeated `@codex` pings.
- No CodeRabbit readiness changes.
- No required-check, merge-state, unresolved-thread, or unacknowledged-feedback policy changes.
- No GitHub comment deletion, editing, or thread manipulation as a workaround.

## Stakeholders
- Product: CO operators relying on `pr ready-review` for review handoff truth.
- Engineering: `pr-watch-merge` readiness logic, provider-worker closeout, PR lifecycle monitors.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - focused test proves terminal Codex connector failure no longer remains plain `bot_rereview_pending=codex`
  - focused test proves in-progress Codex review still blocks
  - existing feedback/check/merge-state tests remain green
  - operator-facing output includes a distinct terminal-failure/manual-action reason
- Guardrails / Error Budgets:
  - zero weakening of active review blocking
  - zero weakening of `unacknowledged_bot_feedback`
  - zero weakening of unresolved review-thread handling
  - zero weakening of required checks or merge-state gates

## Technical Considerations
- Architectural Notes:
  - The likely implementation surface is `scripts/lib/pr-watch-merge.js`, especially Codex entries in bot rereview request and response classification.
  - The likely test surface is `tests/pr-watch-merge.spec.ts` near existing `chatgpt-codex-connector` fixtures.
  - Prefer explicit failure phrase matching for the known connector response family, with conservative source checks for `chatgpt-codex-connector`.
  - Terminal failure should be request-order aware: old failures must not clear a newer in-progress or requested Codex review.
- Dependencies / Integrations:
  - GitHub issue comments and pull comments fetched by `ready-review`.
  - Existing CodeRabbit and Codex bot alias classification.
  - Existing PR body reaction heuristic remains an operator observation, not a watcher API contract in this lane.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Codex rereview pending classifier | Terminal connector failure is folded into generic pending state. | remove fallback | CO-499 | `chatgpt-codex-connector` posts known terminal failure after a request. | Existing ready-review behavior before 2026-05-05 | N/A after removal | N/A after removal | Classifier emits distinct terminal failure/manual-action state. | Focused `pr-watch-merge` regression. |
| Manual Codex trigger policy | Parent operator may need to comment `@codex review` when auto-trigger is absent or terminal failure says retry. | justify retaining fallback | CO-499 plus PR lifecycle SOP | Missing `eyes` reaction or terminal failure comment on current PR head. | Existing PR lifecycle practice | 2026-05-19 | Non-expiring operator safety policy unless GitHub connector exposes a deterministic API state. | Replace with a first-class connector state if available. | SOP/docs plus ready-review output make action visible. |
| Review readiness hard gates | Independent gates could be bypassed to avoid Codex connector waits. | justify retaining fallback | PR lifecycle / ready-review | Required checks, merge state, threads, feedback, CodeRabbit, or review decisions are not clean. | Existing ready-review contract | 2026-05-19 | Non-expiring correctness contract. | Replace only with stricter equivalent gate evidence. | Existing and new tests preserve blockers. |

- Durable retention evidence: `unacknowledged_bot_feedback`, unresolved review threads, required checks, merge state, CodeRabbit proof, and active Codex review state are retained readiness contracts, not temporary fallbacks.
- Large-refactor check: this is a narrow classifier and output-state fix inside existing `ready-review`; a larger review-state authority refactor is deferred unless implementation shows Codex request/response state cannot be separated safely.

## Open Questions
- Should terminal Codex connector failure block as `action_required` until an operator manually pings `@codex review`, or should it clear `bot_rereview_pending` while still returning non-ready with a distinct waiver-needed reason? The implementation must choose one explicitly.
- Should the known phrase set include only `Something went wrong. Try again later by commenting @codex review.` or a broader bounded connector-failure family?

## Approvals
- Product: Linear CO-499, pending
- Engineering: docs-review / parent implementation review, pending
- Design: N/A
