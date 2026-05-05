---
id: 20260505-linear-07fdd989-5c10-4b24-ab5d-10fa9bf3732f
title: "CO-499 classify terminal Codex connector failures in ready-review"
relates_to: docs/PRD-linear-07fdd989-5c10-4b24-ab5d-10fa9bf3732f.md
risk: high
owners:
  - Codex
last_review: 2026-05-05
related_action_plan: docs/ACTION_PLAN-linear-07fdd989-5c10-4b24-ab5d-10fa9bf3732f.md
task_checklists:
  - tasks/tasks-linear-07fdd989-5c10-4b24-ab5d-10fa9bf3732f.md
---

# TECH_SPEC - CO-499 classify terminal Codex connector failures in ready-review

This mirror intentionally matches the canonical task spec at `tasks/specs/linear-07fdd989-5c10-4b24-ab5d-10fa9bf3732f.md`.

## Summary
- Objective: make `codex-orchestrator pr ready-review` classify terminal `chatgpt-codex-connector` failure comments distinctly from active pending Codex review requests.
- Scope:
  - Codex request/response state classification in `scripts/lib/pr-watch-merge.js`
  - focused `tests/pr-watch-merge.spec.ts` fixtures for terminal connector failure and active in-progress review preservation
  - operator-facing status reason for terminal failure/manual-action-needed state
  - traceability packet and registry mirrors
- Constraints:
  - active in-progress Codex review remains blocking
  - terminal connector failure is not approval
  - required checks, merge state, unresolved threads, unacknowledged bot feedback, `CHANGES_REQUESTED`, and CodeRabbit gates remain unchanged
  - manual `@codex review` pings remain parent/operator lifecycle actions, not repeated watcher automation

## Issue-Shaping Contract
- User-request translation carried forward: the operator wants missing or failed Codex connector review to be recognized and manually retried when needed. This lane implements the ready-review classifier and output state needed to distinguish active pending Codex review from terminal connector failure without loosening handoff gates.
- Protected terms / exact artifact and surface names:
  - `codex review hasn't been triggering`
  - `eyes emoji reaction`
  - `thumbs up`
  - `pr ready-review`
  - `codex-orchestrator pr ready-review`
  - `scripts/lib/pr-watch-merge.js`
  - `tests/pr-watch-merge.spec.ts`
  - `chatgpt-codex-connector`
  - `@codex review`
  - `bot_rereview_pending=codex`
  - `bot_rereview_terminal_failure`
  - `terminal failure comment`
  - `CodeRabbit approval`
  - `local standalone review`
  - `unresolved_threads`
  - `unacknowledged_bot_feedback`
- Nearby wrong interpretations to reject:
  - terminal connector failure means the PR is clean
  - active in-progress Codex reviews can be ignored
  - any old Codex failure clears a newer Codex request
  - required checks, merge state, CodeRabbit feedback, unresolved threads, or unacknowledged feedback can be weakened
  - CO-475 should absorb monitor implementation scope
  - the watcher should repeatedly spam `@codex review`
- Explicit non-goals carried forward:
  - no CO-475 wording changes
  - no GitHub comment deletion/editing
  - no broad PR lifecycle rewrite
  - no CodeRabbit policy changes
  - no automatic repeated Codex pings

## Parity / Alignment Matrix
| Surface | Current truth | Reference truth | Target truth | Explicitly out-of-scope differences |
| --- | --- | --- | --- | --- |
| `bot_rereview_pending=codex` | Can remain after terminal connector failure. | Should represent active pending review work only. | Active pending remains blocking; terminal failure is distinct. | Removing Codex review waits entirely. |
| Terminal connector failure | Known failure comment says retry with `@codex review`. | Needs operator action or waiver. | Output carries terminal-failure/manual-trigger-needed reason. | Treating failure as approval. |
| Missing auto-trigger | Operators infer from PR body reactions. | Missing auto-trigger may need one manual ping. | Parent orchestration can use output and reaction evidence to decide one manual ping per head. | Building reaction polling as required logic here. |
| Other handoff gates | Required checks, merge state, unresolved threads, feedback, and review decisions block independently. | These gates remain hard blockers. | No policy weakening. | Broad ready-review refactor. |

## Technical Requirements
- Detect terminal connector failure comments authored by `chatgpt-codex-connector` after a relevant Codex rereview request.
- Treat a known failure comment such as `Codex Review: Something went wrong. Try again later by commenting @codex review.` as terminal failure for that request cycle.
- Preserve active/in-progress Codex review blocking when current evidence indicates review has started and not completed or failed.
- Ensure older terminal failures do not clear newer requests or current in-progress review evidence.
- Surface a distinct ready-review blocker or action-required reason for terminal Codex failure.
- Preserve all existing independent blockers for checks, merge state, threads, bot feedback, and review decisions.

## Fallback Expiry / Refactor Decision
| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Codex rereview pending classifier | Terminal connector failure can stay represented as generic pending review. | remove fallback | CO-499 | Known `chatgpt-codex-connector` terminal failure after current request. | Existing ready-review behavior before 2026-05-05 | N/A after removal | N/A after removal | Distinct terminal failure reason exists. | Focused `pr-watch-merge` tests. |
| Manual retry after connector failure | Operator comments `@codex review` when auto-trigger is absent or failure says retry. | justify retaining fallback | CO-499 / PR lifecycle SOP | Missing `eyes` reaction or terminal failure on current head. | Existing PR lifecycle practice | 2026-05-19 | Non-expiring until connector exposes first-class deterministic state. | Replace with first-class connector state when available. | SOP and output evidence. |
| Review readiness hard gates | Other blockers remain independent even when Codex connector fails. | justify retaining fallback | ready-review | Checks, merge state, threads, feedback, review decisions, CodeRabbit evidence. | Existing ready-review contract | 2026-05-19 | Non-expiring correctness contract. | Replace only with stricter equivalent proof. | Existing and new tests. |

## Validation Plan
- Focused `tests/pr-watch-merge.spec.ts` regression for terminal Codex connector failure after `@codex review`.
- Focused regression proving active/in-progress Codex review still blocks.
- Existing ready-review tests covering required checks, threads, bot feedback, and CodeRabbit behavior.
- `node scripts/spec-guard.mjs --dry-run`.
- `npm run docs:check`.
- Implementation lane to run broader gates before handoff.

## Open Questions
- Should terminal failure produce a blocking action-required reason until a manual retry occurs, or clear pending while requiring an explicit waiver?
- Should the phrase matcher include only the observed failure or a bounded list of Codex connector terminal failure phrasings?
